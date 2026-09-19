//! Failure observations exercise the same collector and never change its verdict.
use super::*;
use crate::thumbnail_diagnostics::install_failure::*;
use std::cell::Cell;

#[test]
fn identifies_marker_discovery_and_product_decode_failures() {
    for (hive, path, field, value, area, expected_field, reason) in [
        (
            Hive::User,
            PRODUCT.to_string(),
            "InstallDir",
            raw_text(ROOT, REG_EXPAND_SZ),
            ReadArea::Marker,
            ReadField::InstallDir,
            ReadReason::WrongType,
        ),
        (
            Hive::Machine,
            format!(r"{UNINSTALL}\{MSI_ID}"),
            "DisplayName",
            raw_text("%PRIVATE%", REG_EXPAND_SZ),
            ReadArea::UninstallDiscovery,
            ReadField::DisplayName,
            ReadReason::InvalidString,
        ),
        (
            Hive::Machine,
            format!(r"{UNINSTALL}\{MSI_ID}"),
            "Publisher",
            raw_text("", REG_SZ),
            ReadArea::UninstallProduct,
            ReadField::Publisher,
            ReadReason::InvalidString,
        ),
        (
            Hive::Machine,
            format!(r"{UNINSTALL}\{MSI_ID}"),
            "WindowsInstaller",
            Observation::Known(RegValue {
                bytes: vec![1],
                vtype: REG_DWORD,
            }),
            ReadArea::UninstallProduct,
            ReadField::WindowsInstaller,
            ReadReason::InvalidDword,
        ),
        (
            Hive::User,
            PRODUCT.to_string(),
            "InstallDir",
            Observation::Known(RegValue {
                bytes: vec![0; 32770],
                vtype: REG_SZ,
            }),
            ReadArea::Marker,
            ReadField::InstallDir,
            ReadReason::TooLarge,
        ),
    ] {
        let mut records = installed(InstallKind::Msi);
        records.put(hive, &path, field, value);
        let result = records.collected();
        assert_eq!(result.kind, InstallKind::Unknown);
        assert!(!result.records_readable);
        assert_eq!(result.read_failures.len(), 1);
        let failure = &result.read_failures[0];
        assert_eq!(
            (failure.area, failure.field, failure.reason),
            (area, expected_field, reason)
        );
        assert!(failure.value_type.is_some() && failure.byte_length.is_some());
        assert_eq!(failure.win32_error, None);
        let json = serde_json::to_string(failure).unwrap();
        assert!(!json.contains("PRIVATE") && !json.contains("Program Files"));
        assert_eq!(
            serde_json::from_str::<InstallReadFailure>(&json).unwrap(),
            *failure
        );
    }
}

struct FailingRead {
    count: Cell<usize>,
    enumeration: bool,
}

impl Reader for FailingRead {
    fn raw(&self, _: Hive, _: &str, _: &str) -> Observation<RegValue> {
        panic!("observer must not read again")
    }
    fn raw_detailed(&self, _: Hive, _: &str, name: &str) -> (Observation<RegValue>, Option<i32>) {
        self.count.set(self.count.get() + 1);
        match (self.enumeration, name) {
            (false, "InstallDir") => (Observation::Unreadable, Some(5)),
            (true, "InstallDir") => (raw_text(ROOT, REG_SZ), None),
            _ => (Observation::Missing, Some(2)),
        }
    }
    fn keys(&self, _: Hive, _: &str) -> Result<Vec<String>, ()> {
        panic!("observer must not enumerate again")
    }
    fn keys_detailed(&self, _: Hive, _: &str) -> (Result<Vec<String>, ()>, Option<i32>) {
        (Err(()), Some(5))
    }
}

#[test]
fn preserves_os_error_without_retrying_and_does_not_report_missing_as_failed() {
    for enumeration in [false, true] {
        let reader = FailingRead {
            count: Cell::new(0),
            enumeration,
        };
        let result = collect_from(Path::new(ROOT), &reader);
        assert_eq!(reader.count.get(), 2);
        assert_eq!(result.kind, InstallKind::Unknown);
        assert!(!result.records_readable);
        assert_eq!(result.read_failures.len(), 1);
        let failure = &result.read_failures[0];
        assert_eq!(failure.win32_error, Some(5));
        assert_eq!(failure.value_type, None);
        assert_eq!(failure.byte_length, None);
        assert_eq!(
            failure.reason,
            if enumeration {
                ReadReason::EnumerationFailed
            } else {
                ReadReason::ReadFailed
            }
        );
    }
}

#[test]
fn records_all_bad_product_fields_without_changing_rejection() {
    let mut records = installed(InstallKind::Msi);
    let path = format!(r"{UNINSTALL}\{MSI_ID}");
    for name in [
        "Publisher",
        "InstallLocation",
        "UninstallString",
        "MainBinaryName",
    ] {
        records.put(Hive::Machine, &path, name, raw_text("", REG_SZ));
    }
    let result = records.collected();
    assert_eq!(result.kind, InstallKind::Unknown);
    assert!(!result.records_readable);
    assert_eq!(result.read_failures.len(), 4);
    assert!(result
        .read_failures
        .iter()
        .all(|f| f.hive == ReadHive::Machine));
}

#[test]
fn failure_serialization_rejects_unknown_codes_and_raw_fields() {
    let valid = serde_json::json!({"area":"marker", "hive":"user", "field":"install-dir",
        "reason":"read-failed", "valueType":null, "byteLength":null, "win32Error":5});
    assert!(serde_json::from_value::<InstallReadFailure>(valid.clone()).is_ok());
    let mut private = valid.clone();
    private["path"] = "private-path".into();
    assert!(serde_json::from_value::<InstallReadFailure>(private).is_err());
    let mut unknown = valid;
    unknown["reason"] = "private-error".into();
    assert!(serde_json::from_value::<InstallReadFailure>(unknown).is_err());
}

#[test]
fn observation_details_do_not_change_registration_stability_or_token() {
    let records = FailingRead {
        count: Cell::new(0),
        enumeration: false,
    };
    let identity = collect_from(Path::new(ROOT), &records);
    let mut changed = identity.clone();
    changed.read_failures[0].win32_error = Some(13);
    assert_eq!(identity, changed);
    assert_eq!(format!("{identity:?}"), format!("{changed:?}"));
    changed.records_readable = true;
    assert_ne!(identity, changed);
    assert_ne!(format!("{identity:?}"), format!("{changed:?}"));
}
