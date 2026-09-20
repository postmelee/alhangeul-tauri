//! Atomic UI ownership/result publication around the bounded native service.
use super::{
    protocol::Operation,
    results::ChildResult,
    service::{DiagnosticService, ServiceError, Snapshot, Status, WorkPermit},
};
use serde::Serialize;
use std::{sync::Mutex, time::Instant};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct View {
    #[serde(flatten)]
    pub snapshot: Snapshot,
    pub operation: Operation,
    pub result: Option<ChildResult>,
}

struct Entry {
    owner: String,
    view: View,
}

#[derive(Default)]
struct State {
    service: DiagnosticService,
    entry: Option<Entry>,
}

#[derive(Default)]
pub struct UiService(Mutex<State>);

impl UiService {
    /// Inspect reconnects a reloaded owner to its active request, never starts
    /// another suite. Terminal entries may be replaced with a fresh inspection.
    pub fn begin(
        &self,
        owner: &str,
        operation: Operation,
        consent: bool,
    ) -> Result<(View, Option<WorkPermit>), ServiceError> {
        let mut state = self.0.lock().map_err(|_| ServiceError::Unavailable)?;
        if let Some(entry) = &state.entry {
            if entry.owner == owner
                && operation == Operation::Inspect
                && matches!(
                    entry.view.snapshot.status,
                    Status::Running | Status::Cancelling
                )
            {
                return Ok((entry.view.clone(), None));
            }
        }
        let permit = state
            .service
            .begin(owner, operation, consent, Instant::now())?;
        let view = View {
            snapshot: state.service.snapshot(owner, permit.request_id)?,
            operation,
            result: None,
        };
        state.entry = Some(Entry {
            owner: owner.into(),
            view: view.clone(),
        });
        Ok((view, Some(permit)))
    }

    pub fn snapshot(&self, owner: &str, id: Uuid) -> Result<View, ServiceError> {
        let state = self.0.lock().map_err(|_| ServiceError::Unavailable)?;
        state.service.snapshot(owner, id)?;
        Ok(state
            .entry
            .as_ref()
            .ok_or(ServiceError::Unavailable)?
            .view
            .clone())
    }

    pub fn cancel(&self, owner: &str, id: Uuid) -> Result<(), ServiceError> {
        let mut state = self.0.lock().map_err(|_| ServiceError::Unavailable)?;
        state.service.cancel(owner, id)?;
        let snapshot = state.service.snapshot(owner, id)?;
        state
            .entry
            .as_mut()
            .ok_or(ServiceError::Unavailable)?
            .view
            .snapshot = snapshot;
        Ok(())
    }

    pub fn close_owner(&self, owner: &str) {
        if let Ok(mut state) = self.0.lock() {
            if let Some(entry) = &state.entry {
                if entry.owner != owner {
                    return;
                }
                let id = entry.view.snapshot.request_id;
                if state.service.cancel(owner, id).is_ok() {
                    if let Ok(snapshot) = state.service.snapshot(owner, id) {
                        if let Some(entry) = &mut state.entry {
                            entry.view.snapshot = snapshot;
                        }
                    }
                }
            }
        }
    }

    /// Worker completion only, after suite cleanup. Publication and releasing
    /// the active slot are atomic so a later request cannot inherit old results.
    pub fn finish(&self, id: Uuid, status: Status, result: Option<ChildResult>) {
        if let Ok(mut state) = self.0.lock() {
            if state.service.finish(id, status, Instant::now()).is_err() {
                return;
            }
            let Some(entry) = &state.entry else {
                return;
            };
            let Ok(snapshot) = state.service.snapshot(&entry.owner, id) else {
                return;
            };
            if let Some(entry) = &mut state.entry {
                entry.view.snapshot = snapshot;
                entry.view.result = result;
            }
        }
    }
}

pub fn error_code(error: ServiceError) -> &'static str {
    match error {
        ServiceError::ConsentRequired => "consent-required",
        ServiceError::Busy => "busy",
        ServiceError::NotOwner => "not-owner",
        _ => "unavailable",
    }
}

#[cfg(test)]
#[path = "ui_service_tests.rs"]
mod tests;
