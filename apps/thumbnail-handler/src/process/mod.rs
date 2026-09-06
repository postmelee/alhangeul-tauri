mod child;
mod pipe_io;

use alhangeul_document_preview::limits::{
    bounded_requested_edge, validate_input_len, FRAME_SELECTION_DEADLINE_MS,
};
use alhangeul_document_preview::protocol::{encode_request_header, Frame, FrameKind};
use child::{Child, Pipes};
use pipe_io::{spawn_reader, spawn_writer};
use std::fmt;
use std::sync::mpsc::{Receiver, RecvTimeoutError};
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BitmapData {
    pub width: u32,
    pub height: u32,
    pub bgra: Vec<u8>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProcessError {
    InvalidInput,
    Windows(u32),
    Protocol,
    WorkerUnavailable,
}

impl fmt::Display for ProcessError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidInput => formatter.write_str("invalid worker input"),
            Self::Windows(code) => write!(formatter, "Windows worker error: {code}"),
            Self::Protocol => formatter.write_str("invalid worker protocol"),
            Self::WorkerUnavailable => formatter.write_str("worker unavailable"),
        }
    }
}

pub fn render_thumbnail(bytes: Arc<[u8]>, requested_edge: u32) -> Result<BitmapData, ProcessError> {
    let started = Instant::now();
    validate_input_len(bytes.len()).map_err(|_| ProcessError::InvalidInput)?;
    let edge = bounded_requested_edge(requested_edge).map_err(|_| ProcessError::InvalidInput)?;
    let request = encode_request_header(&bytes, edge).map_err(|_| ProcessError::Protocol)?;
    let pipes = Pipes::create()?;
    let mut child = Child::spawn(&pipes)?;
    let writer = spawn_writer(pipes.parent_input, request, Arc::clone(&bytes));
    let (receiver, reader) = spawn_reader(pipes.parent_output);
    drop(pipes.child_input);
    drop(pipes.child_output);
    drop(pipes.child_error);
    drop(pipes.parent_error);
    let result = await_result(receiver, started);
    child.terminate();
    let _ = writer.join();
    let _ = reader.join();
    result
}

fn await_result(
    receiver: Receiver<Result<Frame, ProcessError>>,
    started: Instant,
) -> Result<BitmapData, ProcessError> {
    await_result_until(
        receiver,
        started + Duration::from_millis(FRAME_SELECTION_DEADLINE_MS),
    )
}

fn await_result_until(
    receiver: Receiver<Result<Frame, ProcessError>>,
    deadline: Instant,
) -> Result<BitmapData, ProcessError> {
    let mut selector = FrameSelector::default();
    loop {
        let wait = deadline.saturating_duration_since(Instant::now());
        if wait.is_zero() {
            return selector.fallback();
        }
        match receiver.recv_timeout(wait) {
            Ok(Ok(frame)) => match selector.accept(frame)? {
                Some(bitmap) => return Ok(bitmap),
                None => continue,
            },
            Ok(Err(_)) | Err(RecvTimeoutError::Disconnected) => return selector.fallback(),
            Err(RecvTimeoutError::Timeout) => return selector.fallback(),
        }
    }
}

#[derive(Default)]
struct FrameSelector {
    candidate: Option<BitmapData>,
    terminal: bool,
}

impl FrameSelector {
    fn accept(&mut self, frame: Frame) -> Result<Option<BitmapData>, ProcessError> {
        if self.terminal {
            return Err(ProcessError::Protocol);
        }
        match frame.kind {
            FrameKind::PreviewCandidate if self.candidate.is_none() => {
                self.candidate = Some(bitmap_data(frame));
                Ok(None)
            }
            FrameKind::DirectBitmap => {
                self.terminal = true;
                Ok(Some(bitmap_data(frame)))
            }
            FrameKind::DirectFailed | FrameKind::Complete => {
                self.terminal = true;
                self.fallback().map(Some)
            }
            _ => Err(ProcessError::Protocol),
        }
    }

    fn fallback(&mut self) -> Result<BitmapData, ProcessError> {
        self.candidate.take().ok_or(ProcessError::WorkerUnavailable)
    }
}

fn bitmap_data(frame: Frame) -> BitmapData {
    BitmapData {
        width: frame.width,
        height: frame.height,
        bgra: frame.payload,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;

    #[test]
    fn direct_bitmap_replaces_candidate() {
        let mut selector = FrameSelector::default();
        assert_eq!(
            selector.accept(bitmap(FrameKind::PreviewCandidate, 1)),
            Ok(None)
        );
        let selected = selector
            .accept(bitmap(FrameKind::DirectBitmap, 2))
            .unwrap()
            .unwrap();
        assert_eq!(selected.bgra, vec![2; 4]);
    }

    #[test]
    fn direct_failure_uses_only_validated_candidate() {
        let mut selector = FrameSelector::default();
        selector
            .accept(bitmap(FrameKind::PreviewCandidate, 7))
            .unwrap();
        let selected = selector
            .accept(Frame::control(FrameKind::DirectFailed).unwrap())
            .unwrap()
            .unwrap();
        assert_eq!(selected.bgra, vec![7; 4]);
        assert_eq!(
            FrameSelector::default().fallback(),
            Err(ProcessError::WorkerUnavailable)
        );
    }

    #[test]
    fn repeated_candidate_is_protocol_violation() {
        let mut selector = FrameSelector::default();
        selector
            .accept(bitmap(FrameKind::PreviewCandidate, 1))
            .unwrap();
        assert_eq!(
            selector.accept(bitmap(FrameKind::PreviewCandidate, 2)),
            Err(ProcessError::Protocol)
        );
    }

    #[test]
    fn timeout_uses_only_the_validated_candidate() {
        let (sender, receiver) = mpsc::channel();
        sender
            .send(Ok(bitmap(FrameKind::PreviewCandidate, 9)))
            .unwrap();
        let selected =
            await_result_until(receiver, Instant::now() + Duration::from_millis(1)).unwrap();
        assert_eq!(selected.bgra, vec![9; 4]);
        drop(sender);
    }

    #[test]
    fn worker_disconnect_without_candidate_fails_closed() {
        let (sender, receiver) = mpsc::channel();
        drop(sender);
        assert_eq!(
            await_result_until(receiver, Instant::now() + Duration::from_millis(10),),
            Err(ProcessError::WorkerUnavailable)
        );
    }

    #[test]
    fn expired_process_deadline_fails_before_accepting_late_frames() {
        let (sender, receiver) = mpsc::channel();
        sender.send(Ok(bitmap(FrameKind::DirectBitmap, 4))).unwrap();
        let now = Instant::now();
        let expired = now.checked_sub(Duration::from_millis(1)).unwrap_or(now);
        assert_eq!(
            await_result_until(receiver, expired),
            Err(ProcessError::WorkerUnavailable)
        );
    }

    fn bitmap(kind: FrameKind, value: u8) -> Frame {
        Frame::bitmap(kind, 1, 1, vec![value; 4]).unwrap()
    }
}
