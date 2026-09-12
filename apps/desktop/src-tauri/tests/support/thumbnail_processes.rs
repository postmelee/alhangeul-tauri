//! Best-effort live sampling of this test's job, not a process creation audit.
//! Never print executable paths, command lines, or arbitrary executable names.
use crate::{handle::OwnedHandle, process_spawn::Child};
use windows::{
    core::{BOOL, PWSTR},
    Win32::{
        Foundation::HANDLE,
        System::{JobObjects::*, Threading::*},
    },
};

const MAX_PROCESSES: usize = 64;

// ABI prefix and pointer-sized tail of JOBOBJECT_BASIC_PROCESS_ID_LIST.
#[repr(C)]
struct ProcessIds {
    assigned: u32,
    count: u32,
    ids: [usize; MAX_PROCESSES],
}

#[derive(Debug, Default)]
pub struct Observations {
    seen: Vec<(u32, Role)>,
    failed_samples: u32,
    capacity_reached: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Role {
    Application,
    ConsoleHost,
    OpenConsole,
    WebView,
    ThumbnailWorker,
    Other,
    Unavailable,
}

impl Observations {
    pub fn sample(&mut self, child: &Child) {
        let job = child.test_job_handle();
        let Some(ids) = process_ids(job) else {
            self.failed_samples = self.failed_samples.saturating_add(1);
            return;
        };
        for raw in ids.ids.into_iter().take(ids.count as usize) {
            let Ok(pid) = u32::try_from(raw) else {
                self.failed_samples = self.failed_samples.saturating_add(1);
                continue;
            };
            if let Some((_, role)) = self.seen.iter_mut().find(|(seen, _)| *seen == pid) {
                if *role == Role::Unavailable {
                    *role = process_role(pid, job);
                }
            } else if self.seen.len() < MAX_PROCESSES {
                self.seen.push((pid, process_role(pid, job)));
            } else {
                self.capacity_reached = true;
            }
        }
    }
}

fn process_ids(job: HANDLE) -> Option<ProcessIds> {
    let mut ids = ProcessIds {
        assigned: 0,
        count: 0,
        ids: [0; MAX_PROCESSES],
    };
    unsafe {
        QueryInformationJobObject(
            Some(job),
            JobObjectBasicProcessIdList,
            (&mut ids as *mut ProcessIds).cast(),
            std::mem::size_of_val(&ids) as u32,
            None,
        )
    }
    .ok()?;
    (ids.count as usize <= MAX_PROCESSES && ids.assigned == ids.count).then_some(ids)
}

fn process_role(pid: u32, job: HANDLE) -> Role {
    let Ok(handle) = (unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) }) else {
        return Role::Unavailable;
    };
    let process = OwnedHandle(handle);
    // A PID may exit/recycle between the job snapshot and OpenProcess.
    let mut belongs = BOOL::default();
    if unsafe { IsProcessInJob(process.0, Some(job), &mut belongs) }.is_err() || !belongs.as_bool()
    {
        return Role::Unavailable;
    }
    let mut path = [0u16; 32768];
    let mut length = path.len() as u32;
    if unsafe {
        QueryFullProcessImageNameW(
            process.0,
            PROCESS_NAME_WIN32,
            PWSTR(path.as_mut_ptr()),
            &mut length,
        )
    }
    .is_err()
    {
        return Role::Unavailable;
    }
    classify(&String::from_utf16_lossy(&path[..length as usize]))
}

fn classify(path: &str) -> Role {
    match path
        .rsplit(['\\', '/'])
        .next()
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "alhangeul.exe" => Role::Application,
        "conhost.exe" => Role::ConsoleHost,
        "openconsole.exe" => Role::OpenConsole,
        "msedgewebview2.exe" => Role::WebView,
        "alhangeulthumbnailworker.exe" => Role::ThumbnailWorker,
        _ => Role::Other,
    }
}

#[test]
fn process_list_prefix_matches_windows_abi() {
    assert_eq!(
        std::mem::offset_of!(ProcessIds, ids),
        std::mem::offset_of!(JOBOBJECT_BASIC_PROCESS_ID_LIST, ProcessIdList)
    );
    assert_eq!(std::mem::offset_of!(ProcessIds, count), 4);
}

#[test]
fn process_labels_do_not_expose_paths_or_unknown_names() {
    for (name, role) in [
        ("ALHANGEUL.exe", Role::Application),
        ("conhost.exe", Role::ConsoleHost),
        ("OpenConsole.exe", Role::OpenConsole),
        ("msedgewebview2.exe", Role::WebView),
        ("AlhangeulThumbnailWorker.exe", Role::ThumbnailWorker),
        ("private-name.exe", Role::Other),
        ("conhost.exe.backup", Role::Other),
    ] {
        assert_eq!(classify(&format!("C:\\private\\{name}")), role);
    }
    let summary = Observations {
        seen: vec![(123, classify("C:\\private\\private-name.exe"))],
        ..Default::default()
    };
    let text = format!("{summary:?}");
    assert!(text.contains("Other"));
    assert!(!text.contains("private"));
}
