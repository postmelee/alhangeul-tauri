use serde::{Deserialize, Serialize};
use std::{fs, path::Path, sync::Mutex};
use tauri::{AppHandle, Manager, State};

#[derive(Default)]
pub(crate) struct UpdaterPreferences(Mutex<()>);

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct StoredPreference {
    version: u8,
    automatic_checks: bool,
}

impl UpdaterPreferences {
    pub(crate) fn get(&self, path: &Path) -> Result<bool, &'static str> {
        let _guard = self.0.lock().map_err(|_| "update-settings-unavailable")?;
        let metadata = match fs::metadata(path) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
            Err(_) => return Err("update-settings-read-failed"),
        };
        if !metadata.is_file() || metadata.len() > 4096 {
            return Err("update-settings-invalid");
        }
        let bytes = fs::read(path).map_err(|_| "update-settings-read-failed")?;
        let stored: StoredPreference =
            serde_json::from_slice(&bytes).map_err(|_| "update-settings-invalid")?;
        if stored.version != 1 {
            return Err("update-settings-invalid");
        }
        Ok(stored.automatic_checks)
    }

    pub(crate) fn set(&self, path: &Path, enabled: bool) -> Result<(), &'static str> {
        let _guard = self.0.lock().map_err(|_| "update-settings-unavailable")?;
        let parent = path.parent().ok_or("update-settings-write-failed")?;
        fs::create_dir_all(parent).map_err(|_| "update-settings-write-failed")?;
        let bytes = serde_json::to_vec(&StoredPreference {
            version: 1,
            automatic_checks: enabled,
        })
        .map_err(|_| "update-settings-write-failed")?;
        crate::state::atomic_write(path, &bytes).map_err(|_| "update-settings-write-failed")
    }
}

fn preference_path(app: &AppHandle) -> Result<std::path::PathBuf, &'static str> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("updater-preferences.json"))
        .map_err(|_| "update-settings-unavailable")
}

pub(crate) fn startup_enabled(app: &AppHandle) -> bool {
    // Missing, invalid or unreadable preferences never authorize an automatic request.
    preference_path(app)
        .and_then(|path| app.state::<UpdaterPreferences>().get(&path))
        .unwrap_or(false)
}

#[tauri::command]
pub(crate) fn updater_get_automatic_checks(
    app: AppHandle,
    preferences: State<'_, UpdaterPreferences>,
) -> Result<bool, &'static str> {
    preferences.get(&preference_path(&app)?)
}

#[tauri::command]
pub(crate) fn updater_set_automatic_checks(
    app: AppHandle,
    preferences: State<'_, UpdaterPreferences>,
    enabled: bool,
) -> Result<(), &'static str> {
    preferences.set(&preference_path(&app)?, enabled)
}

#[cfg(test)]
#[path = "preferences_tests.rs"]
mod tests;
