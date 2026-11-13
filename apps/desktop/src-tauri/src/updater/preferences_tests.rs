use super::*;

#[test]
fn automatic_checks_require_an_explicit_persisted_choice() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("settings/updater-preferences.json");
    assert!(!UpdaterPreferences::default().get(&path).unwrap());
    for enabled in [true, false] {
        UpdaterPreferences::default().set(&path, enabled).unwrap();
        assert_eq!(UpdaterPreferences::default().get(&path).unwrap(), enabled);
    }
    fs::remove_file(&path).unwrap();
    assert!(!UpdaterPreferences::default().get(&path).unwrap());
}

#[test]
fn corrupt_and_future_settings_do_not_authorize_startup_requests() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("prefs.json");
    for contents in [
        "true",
        "{",
        r#"{"version":2,"automaticChecks":true}"#,
        r#"{"version":1,"automaticChecks":true,"unknown":1}"#,
    ] {
        fs::write(&path, contents).unwrap();
        let read = UpdaterPreferences::default().get(&path);
        assert!(read.is_err());
        assert!(!read.unwrap_or(false));
    }
    UpdaterPreferences::default().set(&path, false).unwrap();
    assert!(!UpdaterPreferences::default().get(&path).unwrap());
}

#[test]
fn write_failure_is_reported_without_exposing_the_path() {
    let dir = tempfile::tempdir().unwrap();
    let parent = dir.path().join("private-folder");
    fs::write(&parent, "file instead of directory").unwrap();
    assert_eq!(
        UpdaterPreferences::default().set(&parent.join("prefs.json"), true),
        Err("update-settings-write-failed")
    );
}
