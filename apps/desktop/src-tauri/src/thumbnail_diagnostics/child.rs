//! Early headless entry: no application initialization, logging or UI fallback.
use super::{
    child_input, dispatch,
    entry::{self, Route},
    protocol, transport,
};
use std::{
    fs::File,
    io::Write,
    os::windows::io::FromRawHandle,
    sync::mpsc,
    time::{Duration, Instant},
};
use windows::Win32::{
    Foundation::{DuplicateHandle, DUPLICATE_SAME_ACCESS, HANDLE},
    Storage::FileSystem::{GetFileType, FILE_TYPE_PIPE},
    System::{
        Console::{GetStdHandle, STD_HANDLE, STD_INPUT_HANDLE, STD_OUTPUT_HANDLE},
        Threading::GetCurrentProcess,
    },
};

pub fn entry() -> Option<i32> {
    match entry::route(std::env::args_os()) {
        Route::Application => None,
        Route::Invalid => Some(2),
        Route::Child => {
            // A panic must never print a private path or exception to IPC/stderr.
            // This is only the dedicated process, which main exits immediately.
            std::panic::set_hook(Box::new(|_| {}));
            Some(
                std::panic::catch_unwind(run)
                    .ok()
                    .and_then(Result::ok)
                    .map_or(1, |_| 0),
            )
        }
    }
}

fn run() -> Result<(), ()> {
    let watchdog = Watchdog::start()?;
    let input = pipe(STD_INPUT_HANDLE)?;
    let mut output = pipe(STD_OUTPUT_HANDLE)?;
    let request = child_input::read(input).map_err(|_| ())?;
    let seconds = match request.operation {
        protocol::Operation::Inspect => protocol::STATE_TIMEOUT_SECONDS,
        protocol::Operation::Suite => {
            protocol::SUITE_TIMEOUT_SECONDS + protocol::CLEANUP_TIMEOUT_SECONDS
        }
        protocol::Operation::Cleanup => protocol::CLEANUP_TIMEOUT_SECONDS,
        _ => protocol::PROBE_TIMEOUT_SECONDS,
    };
    watchdog.arm(seconds)?;
    let result = dispatch::execute(&request)?;
    let bytes = transport::encode(&request, result).map_err(|_| ())?;
    output
        .write_all(&bytes)
        .and_then(|_| output.flush())
        .map_err(|_| ())?;
    // main exits this process; dropping the watchdog ends its receiver cleanly.
    Ok(())
}

fn pipe(kind: STD_HANDLE) -> Result<File, ()> {
    let handle = unsafe { GetStdHandle(kind) }.map_err(|_| ())?;
    if handle.is_invalid() || unsafe { GetFileType(handle) } != FILE_TYPE_PIPE {
        return Err(());
    }
    let mut owned = HANDLE::default();
    unsafe {
        DuplicateHandle(
            GetCurrentProcess(),
            handle,
            GetCurrentProcess(),
            &mut owned,
            0,
            false,
            DUPLICATE_SAME_ACCESS,
        )
    }
    .map_err(|_| ())?;
    // File owns only the duplicate, not a borrowed process standard handle.
    Ok(unsafe { File::from_raw_handle(owned.0) })
}

struct Watchdog(mpsc::Sender<Instant>);
impl Watchdog {
    fn start() -> Result<Self, ()> {
        let (sender, receiver) = mpsc::channel::<Instant>();
        std::thread::Builder::new()
            .name("thumbnail-deadline".into())
            .spawn(move || {
                let mut deadline =
                    Instant::now() + Duration::from_secs(protocol::STATE_TIMEOUT_SECONDS);
                loop {
                    match receiver.recv_timeout(deadline.saturating_duration_since(Instant::now()))
                    {
                        Ok(next) => deadline = next,
                        Err(mpsc::RecvTimeoutError::Disconnected) => return,
                        // Only this dedicated child; never process-name termination.
                        Err(mpsc::RecvTimeoutError::Timeout) => std::process::exit(124),
                    }
                }
            })
            .map_err(|_| ())?;
        Ok(Self(sender))
    }

    fn arm(&self, seconds: u64) -> Result<(), ()> {
        self.0
            .send(Instant::now() + Duration::from_secs(seconds))
            .map_err(|_| ())
    }
}
