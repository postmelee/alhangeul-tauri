use super::{handle::OwnedHandle, transport::TransportError};
use std::{fs::File, io::Write, os::windows::io::FromRawHandle, thread::JoinHandle};
use windows::Win32::{
    Foundation::*,
    Security::SECURITY_ATTRIBUTES,
    Storage::FileSystem::ReadFile,
    System::Pipes::{CreatePipe, PeekNamedPipe},
};

pub struct Pipes {
    pub input: OwnedHandle,
    pub output: OwnedHandle,
    pub error: OwnedHandle,
    pub child: [OwnedHandle; 3],
}

impl Pipes {
    pub fn create() -> Result<Self, TransportError> {
        let (child_input, input) = pair()?;
        let (output, child_output) = pair()?;
        let (error, child_error) = pair()?;
        for handle in [&input, &output, &error] {
            // SAFETY: valid owned handles; parent endpoints are never inherited.
            unsafe { SetHandleInformation(handle.0, HANDLE_FLAG_INHERIT.0, HANDLE_FLAGS(0)) }
                .map_err(|_| TransportError::Invalid)?;
        }
        Ok(Self {
            input,
            output,
            error,
            child: [child_input, child_output, child_error],
        })
    }
}

fn pair() -> Result<(OwnedHandle, OwnedHandle), TransportError> {
    let (mut read, mut write) = (HANDLE::default(), HANDLE::default());
    let attributes = SECURITY_ATTRIBUTES {
        nLength: std::mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
        lpSecurityDescriptor: std::ptr::null_mut(),
        bInheritHandle: true.into(),
    };
    // SAFETY: output storage and attributes live through this call.
    unsafe { CreatePipe(&mut read, &mut write, Some(&attributes), 32768) }
        .map_err(|_| TransportError::Invalid)?;
    Ok((OwnedHandle(read), OwnedHandle(write)))
}

pub fn write_request(handle: OwnedHandle, bytes: Vec<u8>) -> std::io::Result<JoinHandle<bool>> {
    // Transfer unique ownership to File, which is Send; no unsafe Send impl is needed.
    let raw = handle.0 .0;
    std::mem::forget(handle);
    let mut file = unsafe { File::from_raw_handle(raw) };
    std::thread::Builder::new()
        .name("thumbnail-diagnostic-input".into())
        .spawn(move || {
            file.write_all(&bytes).is_ok()
            // Closing the only writer delivers EOF even when the request is truncated.
        })
}

/// The parent is the sole reader. Only consume bytes PeekNamedPipe says are
/// available, so ReadFile cannot wait for a child to produce another byte.
pub fn drain(
    handle: &OwnedHandle,
    output: &mut Vec<u8>,
    maximum: usize,
) -> Result<bool, TransportError> {
    let mut available = 0;
    let peek = unsafe { PeekNamedPipe(handle.0, None, 0, None, Some(&mut available), None) };
    if let Err(error) = peek {
        return if error.code() == windows::core::HRESULT::from_win32(ERROR_BROKEN_PIPE.0) {
            Ok(true)
        } else {
            Err(TransportError::Invalid)
        };
    }
    if output.len().saturating_add(available as usize) > maximum {
        return Err(TransportError::Size);
    }
    if available == 0 {
        return Ok(false);
    }
    let mut buffer = [0u8; 4096];
    let count = (available as usize).min(buffer.len());
    let mut read = 0;
    unsafe { ReadFile(handle.0, Some(&mut buffer[..count]), Some(&mut read), None) }
        .map_err(|_| TransportError::Invalid)?;
    output.extend_from_slice(&buffer[..read as usize]);
    Ok(read == 0)
}
