use super::{
    handle::OwnedHandle, local_file, process_pipes::Pipes, protocol::CHILD_FLAG,
    transport::TransportError,
};
use std::{os::windows::ffi::OsStrExt, path::Path};
use windows::{
    core::{PCWSTR, PWSTR},
    Win32::{
        Foundation::*,
        System::{JobObjects::*, Threading::*},
    },
};

pub struct Child {
    pub process: OwnedHandle,
    job: OwnedHandle,
}

impl Child {
    pub fn spawn(pipes: &Pipes) -> Result<Self, TransportError> {
        let executable = std::env::current_exe().map_err(|_| TransportError::Invalid)?;
        let executable =
            local_file::local_path(&executable).map_err(|_| TransportError::Invalid)?;
        Self::at(&executable, pipes, CHILD_FLAG)
    }

    fn at(executable: &Path, pipes: &Pipes, arguments: &str) -> Result<Self, TransportError> {
        let job = job()?;
        let handles = pipes.child.each_ref().map(|handle| handle.0);
        let attributes = Attributes::new(&handles)?;
        let startup = startup(&handles, attributes.pointer);
        let application: Vec<u16> = executable.as_os_str().encode_wide().chain([0]).collect();
        // argv[0] is a fixed placeholder: lpApplicationName selects the exact EXE.
        let mut command: Vec<u16> = format!("Alhangeul.exe {arguments}")
            .encode_utf16()
            .chain([0])
            .collect();
        let mut info = PROCESS_INFORMATION::default();
        unsafe {
            CreateProcessW(
                PCWSTR(application.as_ptr()),
                Some(PWSTR(command.as_mut_ptr())),
                None,
                None,
                true,
                CREATE_NO_WINDOW | CREATE_SUSPENDED | EXTENDED_STARTUPINFO_PRESENT,
                None,
                PCWSTR::null(),
                &startup.StartupInfo,
                &mut info,
            )
        }
        .map_err(|_| TransportError::Invalid)?;
        let process = OwnedHandle(info.hProcess);
        let thread = OwnedHandle(info.hThread);
        if unsafe { AssignProcessToJobObject(job.0, process.0) }.is_err() {
            let _ = unsafe { TerminateProcess(process.0, 1) };
            return Err(TransportError::Invalid);
        }
        let child = Self { process, job };
        if unsafe { ResumeThread(thread.0) } == u32::MAX {
            return Err(TransportError::Invalid);
        }
        Ok(child)
    }

    #[cfg(test)]
    #[allow(dead_code)] // Used by integration tests, not the library unit-test target.
    pub fn test_executable(
        executable: &Path,
        pipes: &Pipes,
        arguments: &str,
    ) -> Result<Self, TransportError> {
        Self::at(executable, pipes, arguments)
    }

    #[cfg(test)]
    #[allow(dead_code)] // Used by integration tests, not the library unit-test target.
    pub fn test_total_processes(&self) -> Option<u32> {
        let mut accounting = JOBOBJECT_BASIC_ACCOUNTING_INFORMATION::default();
        unsafe {
            QueryInformationJobObject(
                Some(self.job.0),
                JobObjectBasicAccountingInformation,
                (&mut accounting as *mut JOBOBJECT_BASIC_ACCOUNTING_INFORMATION).cast(),
                std::mem::size_of_val(&accounting) as u32,
                None,
            )
        }
        .ok()?;
        Some(accounting.TotalProcesses)
    }

    #[cfg(test)]
    #[allow(dead_code)] // Read-only observation by the real-EXE integration test.
    pub fn test_job_handle(&self) -> HANDLE {
        self.job.0
    }

    pub fn exited(&self) -> Result<Option<u32>, TransportError> {
        match unsafe { WaitForSingleObject(self.process.0, 0) } {
            WAIT_OBJECT_0 => {
                let mut code = 0;
                unsafe { GetExitCodeProcess(self.process.0, &mut code) }
                    .map_err(|_| TransportError::Invalid)?;
                Ok(Some(code))
            }
            WAIT_TIMEOUT => Ok(None),
            _ => Err(TransportError::Invalid),
        }
    }

    pub fn terminate(&self) {
        let _ = unsafe { TerminateJobObject(self.job.0, 1) };
    }

    pub fn quiescent(&self) -> bool {
        let mut accounting = JOBOBJECT_BASIC_ACCOUNTING_INFORMATION::default();
        let result = unsafe {
            QueryInformationJobObject(
                Some(self.job.0),
                JobObjectBasicAccountingInformation,
                (&mut accounting as *mut JOBOBJECT_BASIC_ACCOUNTING_INFORMATION).cast(),
                std::mem::size_of_val(&accounting) as u32,
                None,
            )
        };
        result.is_ok()
            && accounting.ActiveProcesses == 0
            && self.exited().is_ok_and(|code| code.is_some())
    }
}

fn startup(handles: &[HANDLE; 3], attributes: LPPROC_THREAD_ATTRIBUTE_LIST) -> STARTUPINFOEXW {
    let mut startup = STARTUPINFOEXW::default();
    startup.StartupInfo.cb = std::mem::size_of::<STARTUPINFOEXW>() as u32;
    startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
    startup.StartupInfo.hStdInput = handles[0];
    startup.StartupInfo.hStdOutput = handles[1];
    startup.StartupInfo.hStdError = handles[2];
    startup.lpAttributeList = attributes;
    startup
}

fn job() -> Result<OwnedHandle, TransportError> {
    let job = OwnedHandle(
        unsafe { CreateJobObjectW(None, PCWSTR::null()) }.map_err(|_| TransportError::Invalid)?,
    );
    let mut limits = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
    limits.BasicLimitInformation.LimitFlags =
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_PROCESS_MEMORY;
    limits.ProcessMemoryLimit = 1024 * 1024 * 1024;
    // Do not set ActiveProcessLimit=1: a suite owns probe children, and the verified
    // in-process handler may start its worker. OS-launched dllhost is not our child.
    unsafe {
        SetInformationJobObject(
            job.0,
            JobObjectExtendedLimitInformation,
            (&limits as *const JOBOBJECT_EXTENDED_LIMIT_INFORMATION).cast(),
            std::mem::size_of_val(&limits) as u32,
        )
    }
    .map_err(|_| TransportError::Invalid)?;
    Ok(job)
}

struct Attributes {
    pointer: LPPROC_THREAD_ATTRIBUTE_LIST,
    _storage: Vec<usize>,
}

impl Attributes {
    fn new(handles: &[HANDLE; 3]) -> Result<Self, TransportError> {
        let mut bytes = 0;
        let _ = unsafe { InitializeProcThreadAttributeList(None, 1, None, &mut bytes) };
        if bytes == 0 || bytes > 65536 {
            return Err(TransportError::Invalid);
        }
        let mut storage = vec![0usize; bytes.div_ceil(std::mem::size_of::<usize>())];
        let pointer = LPPROC_THREAD_ATTRIBUTE_LIST(storage.as_mut_ptr().cast());
        unsafe { InitializeProcThreadAttributeList(Some(pointer), 1, None, &mut bytes) }
            .map_err(|_| TransportError::Invalid)?;
        let attributes = Self {
            pointer,
            _storage: storage,
        };
        unsafe {
            UpdateProcThreadAttribute(
                pointer,
                0,
                PROC_THREAD_ATTRIBUTE_HANDLE_LIST as usize,
                Some(handles.as_ptr().cast()),
                std::mem::size_of_val(handles),
                None,
                None,
            )
        }
        .map_err(|_| TransportError::Invalid)?;
        Ok(attributes)
    }
}

impl Drop for Attributes {
    fn drop(&mut self) {
        unsafe { DeleteProcThreadAttributeList(self.pointer) };
    }
}
