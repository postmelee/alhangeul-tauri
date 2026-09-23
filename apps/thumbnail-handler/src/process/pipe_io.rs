use super::child::{last_error, OwnedHandle};
use super::ProcessError;
use alhangeul_document_preview::limits::FRAME_HEADER_BYTES;
use alhangeul_document_preview::protocol::{decode_frame, decode_frame_header, Frame, FrameKind};
use std::sync::mpsc::{self, Receiver};
use std::sync::Arc;
use std::thread;
use windows_sys::Win32::Foundation::HANDLE;
use windows_sys::Win32::Storage::FileSystem::{ReadFile, WriteFile};

pub fn spawn_writer(
    input: OwnedHandle,
    header: [u8; FRAME_HEADER_BYTES],
    bytes: Arc<[u8]>,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let _ = write_all(input.raw(), &header).and_then(|()| write_all(input.raw(), &bytes));
    })
}

pub fn spawn_reader(
    output: OwnedHandle,
) -> (
    Receiver<Result<Frame, ProcessError>>,
    thread::JoinHandle<()>,
) {
    let (sender, receiver) = mpsc::channel();
    let thread = thread::spawn(move || loop {
        let result = read_frame(output.raw());
        let complete = matches!(&result, Ok(frame) if frame.kind == FrameKind::Complete);
        if sender.send(result).is_err() || complete {
            break;
        }
    });
    (receiver, thread)
}

fn read_frame(handle: HANDLE) -> Result<Frame, ProcessError> {
    let mut header = [0_u8; FRAME_HEADER_BYTES];
    read_exact(handle, &mut header)?;
    let decoded = decode_frame_header(&header).map_err(|_| ProcessError::Protocol)?;
    let mut encoded = Vec::with_capacity(FRAME_HEADER_BYTES + decoded.payload_len);
    encoded.extend_from_slice(&header);
    encoded.resize(FRAME_HEADER_BYTES + decoded.payload_len, 0);
    read_exact(handle, &mut encoded[FRAME_HEADER_BYTES..])?;
    decode_frame(&encoded).map_err(|_| ProcessError::Protocol)
}

fn read_exact(handle: HANDLE, mut buffer: &mut [u8]) -> Result<(), ProcessError> {
    while !buffer.is_empty() {
        let request = u32::try_from(buffer.len()).unwrap_or(u32::MAX);
        let mut read = 0_u32;
        if unsafe {
            ReadFile(
                handle,
                buffer.as_mut_ptr(),
                request,
                &mut read,
                core::ptr::null_mut(),
            )
        } == 0
        {
            return Err(last_error());
        }
        if read == 0 {
            return Err(ProcessError::WorkerUnavailable);
        }
        let (_, rest) =
            buffer.split_at_mut(usize::try_from(read).map_err(|_| ProcessError::Protocol)?);
        buffer = rest;
    }
    Ok(())
}

fn write_all(handle: HANDLE, mut buffer: &[u8]) -> Result<(), ProcessError> {
    while !buffer.is_empty() {
        let request = u32::try_from(buffer.len()).unwrap_or(u32::MAX);
        let mut written = 0_u32;
        if unsafe {
            WriteFile(
                handle,
                buffer.as_ptr(),
                request,
                &mut written,
                core::ptr::null_mut(),
            )
        } == 0
        {
            return Err(last_error());
        }
        if written == 0 {
            return Err(ProcessError::WorkerUnavailable);
        }
        buffer = &buffer[usize::try_from(written).map_err(|_| ProcessError::Protocol)?..];
    }
    Ok(())
}
