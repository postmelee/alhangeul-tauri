//! Bounded polling, no unbounded wait/join and no process-name based termination.
use super::{
    process_pipes::{self, Pipes},
    process_spawn::Child,
    protocol::{self, Operation, Request},
    service::{Status, WorkPermit},
    transport::{self, TransportError},
};
use serde::de::DeserializeOwned;
use std::{
    os::windows::io::AsRawHandle,
    thread::JoinHandle,
    time::{Duration, Instant},
};
use windows::Win32::{Foundation::HANDLE, System::IO::CancelSynchronousIo};

pub fn run<T: DeserializeOwned>(
    request: &Request,
    permit: &WorkPermit,
    nested: bool,
) -> Result<T, TransportError> {
    protocol::validate_request(request, nested).map_err(|_| TransportError::Invalid)?;
    let encoded = serde_json::to_vec(request).map_err(|_| TransportError::Invalid)?;
    if encoded.len() > protocol::MAX_REQUEST_BYTES {
        return Err(TransportError::Size);
    }
    let deadline = Instant::now()
        + Duration::from_secs(match request.operation {
            Operation::Inspect => protocol::STATE_TIMEOUT_SECONDS,
            Operation::Suite => protocol::SUITE_TIMEOUT_SECONDS,
            Operation::Cleanup => protocol::CLEANUP_TIMEOUT_SECONDS,
            _ => protocol::PROBE_TIMEOUT_SECONDS,
        });
    check_stop(permit, deadline)?;
    run_child(request, permit, encoded, deadline)
}

fn run_child<T: DeserializeOwned>(
    request: &Request,
    permit: &WorkPermit,
    encoded: Vec<u8>,
    deadline: Instant,
) -> Result<T, TransportError> {
    let (child, mut channels, writer) = launch(encoded, permit)?;
    let result = poll(&child, &mut channels, permit, deadline).and_then(|code| {
        if code == 124 {
            Err(TransportError::TimedOut)
        } else {
            transport::decode(&channels.bytes, request, code)
        }
    });
    complete(
        &child,
        writer,
        permit,
        (request.operation, deadline),
        result,
    )
}

fn launch(
    encoded: Vec<u8>,
    permit: &WorkPermit,
) -> Result<(Child, Channels, JoinHandle<bool>), TransportError> {
    let pipes = Pipes::create()?;
    let child = Child::spawn(&pipes)?;
    let Pipes {
        input,
        output,
        error,
        child: child_ends,
    } = pipes;
    drop(child_ends);
    let writer = match process_pipes::write_request(input, encoded) {
        Ok(writer) => writer,
        Err(_) => {
            child.terminate();
            if finish(&child, None, permit.cleanup_deadline(Instant::now())).is_none() {
                return Err(TransportError::Cleanup);
            }
            return Err(TransportError::Invalid);
        }
    };
    let channels = Channels {
        output,
        error,
        bytes: Vec::new(),
        errors: Vec::new(),
        output_closed: false,
        error_closed: false,
    };
    Ok((child, channels, writer))
}

fn complete<T>(
    child: &Child,
    writer: JoinHandle<bool>,
    permit: &WorkPermit,
    operation: (Operation, Instant),
    result: Result<T, TransportError>,
) -> Result<T, TransportError> {
    // Also kill any still-running descendants after the root exits normally.
    child.terminate();
    let cleanup_start = Instant::now();
    let cleanup_deadline = if operation.0 == Operation::Cleanup || result.is_ok() {
        operation
            .1
            .min(permit.deadline())
            .min(Instant::now() + Duration::from_secs(protocol::CLEANUP_TIMEOUT_SECONDS))
    } else {
        permit.cleanup_deadline(Instant::now())
    };
    match finish(child, Some(writer), cleanup_deadline) {
        None => {
            permit.cleanup_deadline(cleanup_start);
            return Err(TransportError::Cleanup);
        }
        Some(false) if result.is_ok() => {
            permit.cleanup_deadline(cleanup_start);
            return Err(TransportError::Invalid);
        }
        _ => {}
    }
    result
}

struct Channels {
    output: super::handle::OwnedHandle,
    error: super::handle::OwnedHandle,
    bytes: Vec<u8>,
    errors: Vec<u8>,
    output_closed: bool,
    error_closed: bool,
}

fn poll(
    child: &Child,
    channels: &mut Channels,
    permit: &WorkPermit,
    deadline: Instant,
) -> Result<u32, TransportError> {
    loop {
        check_stop(permit, deadline)?;
        if !channels.output_closed {
            channels.output_closed = process_pipes::drain(
                &channels.output,
                &mut channels.bytes,
                protocol::MAX_RESULT_BYTES,
            )?;
        }
        if !channels.error_closed {
            channels.error_closed =
                process_pipes::drain(&channels.error, &mut channels.errors, 4096)?;
        }
        if !channels.errors.is_empty() {
            return Err(TransportError::Invalid);
        }
        if let Some(code) = child.exited()? {
            // Closing the job stops a descendant holding inherited stdout open.
            child.terminate();
            if channels.output_closed && channels.error_closed {
                return Ok(code);
            }
        }
        std::thread::sleep(Duration::from_millis(10));
    }
}

fn check_stop(permit: &WorkPermit, deadline: Instant) -> Result<(), TransportError> {
    let now = Instant::now();
    match permit.stop_reason(now) {
        Some(Status::Cancelled) => Err(TransportError::Cancelled),
        Some(_) => Err(TransportError::TimedOut),
        None if now >= deadline => Err(TransportError::TimedOut),
        None => Ok(()),
    }
}

fn finish(child: &Child, writer: Option<JoinHandle<bool>>, deadline: Instant) -> Option<bool> {
    while Instant::now() < deadline {
        if writer.as_ref().is_none_or(|writer| writer.is_finished()) && child.quiescent() {
            return Some(writer.is_none_or(|writer| writer.join().unwrap_or(false)));
        }
        // The thread handle stays valid while JoinHandle is owned. Cancellation
        // may race with WriteFile starting, so retry within the cleanup budget.
        if let Some(writer) = writer.as_ref().filter(|writer| !writer.is_finished()) {
            let _ = unsafe { CancelSynchronousIo(HANDLE(writer.as_raw_handle())) };
        }
        std::thread::sleep(Duration::from_millis(10));
    }
    // Do not join an unresponsive writer. Its owned File/buffer stay alive on
    // that thread; report failed cleanup rather than pretending it was reclaimed.
    None
}
