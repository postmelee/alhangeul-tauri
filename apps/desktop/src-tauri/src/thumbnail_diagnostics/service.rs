//! Request ownership and deadlines, independent of Tauri and Windows execution.
use super::protocol::{Operation, STATE_TIMEOUT_SECONDS, SUITE_TIMEOUT_SECONDS};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use uuid::Uuid;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum Status {
    Running,
    Cancelling,
    Completed,
    Cancelled,
    TimedOut,
    Failed,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub request_id: Uuid,
    pub sequence: u64,
    pub status: Status,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ServiceError {
    InvalidOperation,
    ConsentRequired,
    Busy,
    NotOwner,
    Unavailable,
    InvalidTransition,
}

pub struct WorkPermit {
    pub request_id: Uuid,
    cancelled: Arc<AtomicBool>,
    deadline: Instant,
    cleanup_started: Mutex<Option<Instant>>,
}

impl WorkPermit {
    pub fn isolated(request_id: Uuid, deadline: Instant) -> Self {
        Self {
            request_id,
            cancelled: Arc::new(AtomicBool::new(false)),
            deadline,
            cleanup_started: Mutex::new(None),
        }
    }

    pub fn deadline(&self) -> Instant {
        self.deadline
    }

    /// One shared grace period for process reclamation AND scratch cleanup.
    /// Repeated errors/cancellation must not renew it.
    pub fn cleanup_deadline(&self, now: Instant) -> Instant {
        let Ok(mut started) = self.cleanup_started.lock() else {
            return now;
        };
        let start = *started.get_or_insert(now.min(self.deadline));
        start + Duration::from_secs(super::protocol::CLEANUP_TIMEOUT_SECONDS)
    }

    pub fn stop_reason(&self, now: Instant) -> Option<Status> {
        if self.cancelled.load(Ordering::Acquire) {
            Some(Status::Cancelled)
        } else if now >= self.deadline {
            Some(Status::TimedOut)
        } else {
            None
        }
    }
}

struct Entry {
    owner: String,
    snapshot: Snapshot,
    cancelled: Arc<AtomicBool>,
    deadline: Instant,
    active: bool,
}

#[derive(Default)]
pub struct DiagnosticService {
    entry: Mutex<Option<Entry>>,
}

impl DiagnosticService {
    pub fn begin(
        &self,
        owner: &str,
        operation: Operation,
        consent: bool,
        now: Instant,
    ) -> Result<WorkPermit, ServiceError> {
        if owner.is_empty() || !matches!(operation, Operation::Inspect | Operation::Suite) {
            return Err(ServiceError::InvalidOperation);
        }
        if operation == Operation::Suite && !consent {
            return Err(ServiceError::ConsentRequired);
        }
        let mut current = self.entry.lock().map_err(|_| ServiceError::Unavailable)?;
        if current.as_ref().is_some_and(|entry| entry.active) {
            return Err(ServiceError::Busy);
        }
        let seconds = if operation == Operation::Inspect {
            STATE_TIMEOUT_SECONDS
        } else {
            SUITE_TIMEOUT_SECONDS
        };
        let deadline = now + Duration::from_secs(seconds);
        let cancelled = Arc::new(AtomicBool::new(false));
        let request_id = Uuid::new_v4();
        *current = Some(Entry {
            owner: owner.into(),
            snapshot: Snapshot {
                request_id,
                sequence: 1,
                status: Status::Running,
            },
            cancelled: cancelled.clone(),
            deadline,
            active: true,
        });
        Ok(WorkPermit {
            request_id,
            cancelled,
            deadline,
            cleanup_started: Mutex::new(None),
        })
    }

    pub fn snapshot(&self, owner: &str, id: Uuid) -> Result<Snapshot, ServiceError> {
        let current = self.entry.lock().map_err(|_| ServiceError::Unavailable)?;
        let entry = owned_entry(current.as_ref(), owner, id)?;
        Ok(entry.snapshot.clone())
    }

    pub fn cancel(&self, owner: &str, id: Uuid) -> Result<(), ServiceError> {
        let mut current = self.entry.lock().map_err(|_| ServiceError::Unavailable)?;
        owned_entry(current.as_ref(), owner, id)?;
        if let Some(entry) = current.as_mut() {
            if entry.active && entry.snapshot.status != Status::Cancelling {
                entry.cancelled.store(true, Ordering::Release);
                entry.snapshot.status = Status::Cancelling;
                entry.snapshot.sequence += 1;
            }
        }
        Ok(())
    }

    /// Called by the worker only AFTER child and scratch cleanup. Cancellation
    /// alone must not release the single-operation slot for another window.
    pub fn finish(&self, id: Uuid, status: Status, now: Instant) -> Result<(), ServiceError> {
        if matches!(status, Status::Running | Status::Cancelling) {
            return Err(ServiceError::InvalidTransition);
        }
        let mut current = self.entry.lock().map_err(|_| ServiceError::Unavailable)?;
        let entry = current.as_mut().ok_or(ServiceError::NotOwner)?;
        if entry.snapshot.request_id != id || !entry.active {
            return Err(ServiceError::NotOwner);
        }
        entry.snapshot.status = if status == Status::Failed {
            Status::Failed
        } else if entry.cancelled.load(Ordering::Acquire) {
            Status::Cancelled
        } else if now >= entry.deadline {
            Status::TimedOut
        } else {
            status
        };
        entry.snapshot.sequence += 1;
        entry.active = false;
        Ok(())
    }
}

fn owned_entry<'a>(
    entry: Option<&'a Entry>,
    owner: &str,
    id: Uuid,
) -> Result<&'a Entry, ServiceError> {
    entry
        .filter(|entry| entry.owner == owner && entry.snapshot.request_id == id)
        .ok_or(ServiceError::NotOwner)
}
