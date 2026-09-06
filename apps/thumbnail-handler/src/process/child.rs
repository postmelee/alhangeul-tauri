use super::ProcessError;
use alhangeul_document_preview::limits::WORKER_MEMORY_LIMIT_BYTES;
use core::ffi::c_void;
use std::ffi::OsString;
use std::os::windows::ffi::{OsStrExt, OsStringExt};
use std::path::PathBuf;
use windows_sys::Win32::Foundation::{
    CloseHandle, GetLastError, SetHandleInformation, HANDLE, HANDLE_FLAG_INHERIT,
    INVALID_HANDLE_VALUE,
};
use windows_sys::Win32::Security::SECURITY_ATTRIBUTES;
use windows_sys::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
    SetInformationJobObject, TerminateJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
    JOB_OBJECT_LIMIT_ACTIVE_PROCESS, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    JOB_OBJECT_LIMIT_PROCESS_MEMORY,
};
use windows_sys::Win32::System::LibraryLoader::GetModuleFileNameW;
use windows_sys::Win32::System::Pipes::CreatePipe;
use windows_sys::Win32::System::Threading::{
    CreateProcessW, DeleteProcThreadAttributeList, InitializeProcThreadAttributeList, ResumeThread,
    TerminateProcess, UpdateProcThreadAttribute, CREATE_NO_WINDOW, CREATE_SUSPENDED,
    EXTENDED_STARTUPINFO_PRESENT, PROCESS_INFORMATION, PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
    STARTF_USESTDHANDLES, STARTUPINFOEXW,
};

pub(super) struct Pipes {
    pub parent_input: OwnedHandle,
    pub parent_output: OwnedHandle,
    pub parent_error: OwnedHandle,
    pub child_input: OwnedHandle,
    pub child_output: OwnedHandle,
    pub child_error: OwnedHandle,
}

impl Pipes {
    pub fn create() -> Result<Self, ProcessError> {
        let (child_input, parent_input) = create_pipe()?;
        let (parent_output, child_output) = create_pipe()?;
        let (parent_error, child_error) = create_pipe()?;
        set_not_inherited(parent_input.raw())?;
        set_not_inherited(parent_output.raw())?;
        set_not_inherited(parent_error.raw())?;
        Ok(Self {
            parent_input,
            parent_output,
            parent_error,
            child_input,
            child_output,
            child_error,
        })
    }
}

pub(super) struct Child {
    _process: OwnedHandle,
    job: OwnedHandle,
}

impl Child {
    pub fn spawn(pipes: &Pipes) -> Result<Self, ProcessError> {
        let job = create_job()?;
        let handles = [
            pipes.child_input.raw(),
            pipes.child_output.raw(),
            pipes.child_error.raw(),
        ];
        let attributes = AttributeList::new(&handles)?;
        let startup = startup_info(&handles, attributes.pointer)?;
        let application = wide(worker_path()?.as_os_str());
        let mut info = PROCESS_INFORMATION::default();
        let flags = CREATE_NO_WINDOW | CREATE_SUSPENDED | EXTENDED_STARTUPINFO_PRESENT;
        let created = unsafe {
            CreateProcessW(
                application.as_ptr(),
                core::ptr::null_mut(),
                core::ptr::null(),
                core::ptr::null(),
                1,
                flags,
                core::ptr::null(),
                core::ptr::null(),
                &startup.StartupInfo,
                &mut info,
            )
        };
        if created == 0 {
            return Err(last_error());
        }
        let process = OwnedHandle::new(info.hProcess)?;
        let thread = OwnedHandle::new(info.hThread)?;
        if unsafe { AssignProcessToJobObject(job.raw(), process.raw()) } == 0 {
            unsafe { TerminateProcess(process.raw(), 1) };
            return Err(last_error());
        }
        if unsafe { ResumeThread(thread.raw()) } == u32::MAX {
            return Err(last_error());
        }
        Ok(Self {
            _process: process,
            job,
        })
    }

    pub fn terminate(&mut self) {
        let _ = unsafe { TerminateJobObject(self.job.raw(), 1) };
    }
}

fn startup_info(
    handles: &[HANDLE; 3],
    attributes: *mut c_void,
) -> Result<STARTUPINFOEXW, ProcessError> {
    let mut startup = STARTUPINFOEXW::default();
    startup.StartupInfo.cb = u32::try_from(core::mem::size_of::<STARTUPINFOEXW>())
        .map_err(|_| ProcessError::Protocol)?;
    startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
    startup.StartupInfo.hStdInput = handles[0];
    startup.StartupInfo.hStdOutput = handles[1];
    startup.StartupInfo.hStdError = handles[2];
    startup.lpAttributeList = attributes;
    Ok(startup)
}

fn create_pipe() -> Result<(OwnedHandle, OwnedHandle), ProcessError> {
    let mut read = core::ptr::null_mut();
    let mut write = core::ptr::null_mut();
    let attributes = SECURITY_ATTRIBUTES {
        nLength: u32::try_from(core::mem::size_of::<SECURITY_ATTRIBUTES>())
            .map_err(|_| ProcessError::Protocol)?,
        lpSecurityDescriptor: core::ptr::null_mut(),
        bInheritHandle: 1,
    };
    if unsafe { CreatePipe(&mut read, &mut write, &attributes, 0) } == 0 {
        return Err(last_error());
    }
    Ok((OwnedHandle::new(read)?, OwnedHandle::new(write)?))
}

fn set_not_inherited(handle: HANDLE) -> Result<(), ProcessError> {
    if unsafe { SetHandleInformation(handle, HANDLE_FLAG_INHERIT, 0) } == 0 {
        return Err(last_error());
    }
    Ok(())
}

fn create_job() -> Result<OwnedHandle, ProcessError> {
    let job = OwnedHandle::new(unsafe { CreateJobObjectW(core::ptr::null(), core::ptr::null()) })?;
    let mut limits = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
    limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_ACTIVE_PROCESS
        | JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        | JOB_OBJECT_LIMIT_PROCESS_MEMORY;
    limits.BasicLimitInformation.ActiveProcessLimit = 1;
    limits.ProcessMemoryLimit =
        usize::try_from(WORKER_MEMORY_LIMIT_BYTES).map_err(|_| ProcessError::Protocol)?;
    let size =
        u32::try_from(core::mem::size_of_val(&limits)).map_err(|_| ProcessError::Protocol)?;
    let set = unsafe {
        SetInformationJobObject(
            job.raw(),
            JobObjectExtendedLimitInformation,
            (&limits as *const JOBOBJECT_EXTENDED_LIMIT_INFORMATION).cast(),
            size,
        )
    };
    if set == 0 {
        return Err(last_error());
    }
    Ok(job)
}

struct AttributeList {
    pointer: *mut c_void,
    _storage: Vec<usize>,
}

impl AttributeList {
    fn new(handles: &[HANDLE]) -> Result<Self, ProcessError> {
        let mut bytes = 0_usize;
        unsafe { InitializeProcThreadAttributeList(core::ptr::null_mut(), 1, 0, &mut bytes) };
        let words = bytes.div_ceil(core::mem::size_of::<usize>());
        let mut storage = vec![0_usize; words];
        let pointer = storage.as_mut_ptr().cast();
        if unsafe { InitializeProcThreadAttributeList(pointer, 1, 0, &mut bytes) } == 0 {
            return Err(last_error());
        }
        let updated = unsafe {
            UpdateProcThreadAttribute(
                pointer,
                0,
                PROC_THREAD_ATTRIBUTE_HANDLE_LIST as usize,
                handles.as_ptr().cast(),
                core::mem::size_of_val(handles),
                core::ptr::null_mut(),
                core::ptr::null(),
            )
        };
        if updated == 0 {
            unsafe { DeleteProcThreadAttributeList(pointer) };
            return Err(last_error());
        }
        Ok(Self {
            pointer,
            _storage: storage,
        })
    }
}

impl Drop for AttributeList {
    fn drop(&mut self) {
        unsafe { DeleteProcThreadAttributeList(self.pointer) };
    }
}

pub(super) struct OwnedHandle(HANDLE);

unsafe impl Send for OwnedHandle {}

impl OwnedHandle {
    fn new(handle: HANDLE) -> Result<Self, ProcessError> {
        if handle.is_null() || handle == INVALID_HANDLE_VALUE {
            Err(last_error())
        } else {
            Ok(Self(handle))
        }
    }

    pub fn raw(&self) -> HANDLE {
        self.0
    }
}

impl Drop for OwnedHandle {
    fn drop(&mut self) {
        unsafe { CloseHandle(self.0) };
    }
}

fn worker_path() -> Result<PathBuf, ProcessError> {
    let mut buffer = vec![0_u16; 32_768];
    let length = unsafe {
        GetModuleFileNameW(
            crate::module_handle(),
            buffer.as_mut_ptr(),
            u32::try_from(buffer.len()).map_err(|_| ProcessError::Protocol)?,
        )
    };
    if length == 0 || usize::try_from(length).map_err(|_| ProcessError::Protocol)? >= buffer.len() {
        return Err(last_error());
    }
    buffer.truncate(usize::try_from(length).map_err(|_| ProcessError::Protocol)?);
    let module = PathBuf::from(OsString::from_wide(&buffer));
    let directory = module.parent().ok_or(ProcessError::WorkerUnavailable)?;
    Ok(directory.join(crate::registration::WORKER_FILENAME))
}

fn wide(value: &std::ffi::OsStr) -> Vec<u16> {
    value.encode_wide().chain(core::iter::once(0)).collect()
}

pub(super) fn last_error() -> ProcessError {
    ProcessError::Windows(unsafe { GetLastError() })
}
