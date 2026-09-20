//! Tauri adapters accept no path, owner label, executable or arbitrary operation.
#[cfg(windows)]
use crate::thumbnail_diagnostics::{
    dispatch::NativeBackend,
    protocol::Operation,
    results::ChildResult,
    service::{Status, WorkPermit},
    suite::{self, Backend},
    ui_service::{self, UiService},
};
use serde_json::Value;
#[cfg(windows)]
use std::sync::Arc;
#[cfg(windows)]
use tauri::Manager;
use tauri::{AppHandle, WebviewWindow};

#[tauri::command]
pub fn thumbnail_diagnostics_inspect(
    window: WebviewWindow,
    app: AppHandle,
) -> Result<Value, &'static str> {
    begin(window, app, false, false)
}

#[tauri::command]
pub fn thumbnail_diagnostics_start(
    window: WebviewWindow,
    app: AppHandle,
    consent: bool,
) -> Result<Value, &'static str> {
    begin(window, app, true, consent)
}

fn begin(
    window: WebviewWindow,
    app: AppHandle,
    suite: bool,
    consent: bool,
) -> Result<Value, &'static str> {
    #[cfg(windows)]
    {
        if !cfg!(target_arch = "x86_64") {
            return Err("unsupported");
        }
        let state = app.state::<Arc<UiService>>().inner().clone();
        let operation = if suite {
            Operation::Suite
        } else {
            Operation::Inspect
        };
        let (view, permit) = state
            .begin(window.label(), operation, consent)
            .map_err(ui_service::error_code)?;
        if let Some(permit) = permit {
            tauri::async_runtime::spawn_blocking(move || execute(state, permit, operation));
        }
        serde_json::to_value(view).map_err(|_| "unavailable")
    }
    #[cfg(not(windows))]
    {
        let _ = (window, app, suite, consent);
        Err("unsupported")
    }
}

#[cfg(windows)]
fn execute(state: Arc<UiService>, permit: WorkPermit, operation: Operation) {
    let mut backend = NativeBackend;
    let (status, result) = if operation == Operation::Suite {
        let result = suite::run(&mut backend, &permit);
        (result.status, Some(ChildResult::Suite(Box::new(result))))
    } else {
        let request = suite::request(Operation::Inspect, permit.request_id);
        match backend.invoke(&request, &permit) {
            Ok(result @ ChildResult::Inspection(_)) => (Status::Completed, Some(result)),
            Err(error) => (error.status(), None),
            _ => (Status::Failed, None),
        }
    };
    state.finish(permit.request_id, status, result);
}

#[tauri::command]
pub fn thumbnail_diagnostics_get_state(
    window: WebviewWindow,
    app: AppHandle,
    request_id: String,
) -> Result<Value, &'static str> {
    #[cfg(windows)]
    {
        let id = uuid::Uuid::parse_str(&request_id).map_err(|_| "not-owner")?;
        let view = app
            .state::<Arc<UiService>>()
            .snapshot(window.label(), id)
            .map_err(ui_service::error_code)?;
        serde_json::to_value(view).map_err(|_| "unavailable")
    }
    #[cfg(not(windows))]
    {
        let _ = (window, app, request_id);
        Err("unsupported")
    }
}

#[tauri::command]
pub fn thumbnail_diagnostics_cancel(
    window: WebviewWindow,
    app: AppHandle,
    request_id: String,
) -> Result<(), &'static str> {
    #[cfg(windows)]
    {
        let id = uuid::Uuid::parse_str(&request_id).map_err(|_| "not-owner")?;
        app.state::<Arc<UiService>>()
            .cancel(window.label(), id)
            .map_err(ui_service::error_code)
    }
    #[cfg(not(windows))]
    {
        let _ = (window, app, request_id);
        Err("unsupported")
    }
}

pub fn setup(app: &AppHandle) {
    #[cfg(windows)]
    app.manage(Arc::new(UiService::default()));
    #[cfg(not(windows))]
    let _ = app;
}

pub fn close_owner(app: &AppHandle, label: &str) {
    #[cfg(windows)]
    app.state::<Arc<UiService>>().close_owner(label);
    #[cfg(not(windows))]
    let _ = (app, label);
}
