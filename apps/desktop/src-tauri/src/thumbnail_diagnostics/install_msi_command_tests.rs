//! MSI fixture mirrors the observed REG_EXPAND_SZ; NSIS and generic fields stay strict.
use super::*;
use crate::thumbnail_diagnostics::install_failure::*;

fn msi_path() -> String {
    format!(r"{UNINSTALL}\{MSI_ID}")
}

#[test]
fn observed_msi_fixture_uses_expand_string_and_collector_accepts_both_types() {
    let records = installed(InstallKind::Msi);
    let Observation::Known(value) = records.raw(Hive::Machine, &msi_path(), "UninstallString")
    else {
        panic!("missing MSI fixture")
    };
    assert_eq!(value.vtype, REG_EXPAND_SZ);
    assert_eq!(value.bytes.len(), 106);
    // Reproduces the pre-fix type rejection without running a second classifier.
    assert_eq!(
        crate::thumbnail_diagnostics::registry::decode_string(Observation::Known(value), false),
        Observation::Unreadable
    );
    for vtype in [REG_SZ, REG_EXPAND_SZ] {
        let mut records = installed(InstallKind::Msi);
        records.put(
            Hive::Machine,
            &msi_path(),
            "UninstallString",
            raw_text(&format!("MsiExec.exe /X{MSI_ID}"), vtype),
        );
        assert_identity(&records, InstallKind::Msi, true);
    }
}

#[test]
fn expanded_or_malformed_msi_command_remains_unreadable_with_correct_reason() {
    for (value, reason) in [
        (
            raw_text("%SYSTEMROOT%\\System32\\msiexec.exe /X{id}", REG_EXPAND_SZ),
            ReadReason::InvalidString,
        ),
        (raw_text("", REG_EXPAND_SZ), ReadReason::InvalidString),
        (
            Observation::Known(RegValue {
                bytes: vec![0],
                vtype: REG_EXPAND_SZ,
            }),
            ReadReason::InvalidString,
        ),
        (raw_text("MsiExec.exe", REG_MULTI_SZ), ReadReason::WrongType),
        (
            Observation::Known(RegValue {
                bytes: vec![0; 32770],
                vtype: REG_EXPAND_SZ,
            }),
            ReadReason::TooLarge,
        ),
    ] {
        let mut records = installed(InstallKind::Msi);
        records.put(Hive::Machine, &msi_path(), "UninstallString", value);
        let result = records.collected();
        assert_eq!(result.kind, InstallKind::Unknown);
        assert!(!result.records_readable);
        assert_eq!(result.read_failures.len(), 1);
        assert_eq!(result.read_failures[0].field, ReadField::UninstallString);
        assert_eq!(result.read_failures[0].reason, reason);
    }
}

#[test]
fn msi_marker_is_required_before_expand_string_reader_is_used() {
    for (value, flag_error) in [
        (Observation::Missing, None),
        (
            Observation::Unreadable,
            Some((ReadReason::ReadFailed, None, None)),
        ),
        (
            Observation::Known(RegValue {
                bytes: 0_u32.to_le_bytes().to_vec(),
                vtype: REG_DWORD,
            }),
            None,
        ),
        (
            Observation::Known(RegValue {
                bytes: vec![1],
                vtype: REG_DWORD,
            }),
            Some((ReadReason::InvalidDword, Some(4), Some(1))),
        ),
    ] {
        assert_rejected_msi_flag(value, flag_error);
    }
}

fn assert_rejected_msi_flag(
    value: Observation<RegValue>,
    flag_error: Option<(ReadReason, Option<u32>, Option<u32>)>,
) {
    let mut records = installed(InstallKind::Msi);
    records.put(Hive::Machine, &msi_path(), "WindowsInstaller", value);
    let result = records.collected();
    assert_eq!(result.kind, InstallKind::Unknown);
    assert!(!result.records_readable);
    let mut expected = Vec::new();
    if let Some((reason, value_type, byte_length)) = flag_error {
        expected.push(product_failure(
            ReadField::WindowsInstaller,
            reason,
            value_type,
            byte_length,
        ));
    }
    // Without a valid MSI marker the generic reader must reject REG_EXPAND_SZ.
    expected.push(product_failure(
        ReadField::UninstallString,
        ReadReason::WrongType,
        Some(2),
        Some(106),
    ));
    assert_eq!(result.read_failures, expected);
    for failure in result.read_failures {
        let json = serde_json::to_string(&failure).unwrap();
        assert!(!json.contains("Program Files") && !json.contains(MSI_ID));
        assert_eq!(
            serde_json::from_str::<InstallReadFailure>(&json).unwrap(),
            failure
        );
    }
}

fn product_failure(
    field: ReadField,
    reason: ReadReason,
    value_type: Option<u32>,
    byte_length: Option<u32>,
) -> InstallReadFailure {
    InstallReadFailure {
        area: ReadArea::UninstallProduct,
        hive: ReadHive::Machine,
        field,
        reason,
        value_type,
        byte_length,
        win32_error: None,
    }
}

#[test]
fn nsis_and_other_msi_fields_do_not_accept_expand_strings() {
    let mut nsis = installed(InstallKind::Nsis);
    nsis.put(
        Hive::User,
        &format!(r"{UNINSTALL}\Alhangeul"),
        "UninstallString",
        raw_text(&format!(r#""{ROOT}\uninstall.exe""#), REG_EXPAND_SZ),
    );
    assert_identity(&nsis, InstallKind::Unknown, false);
    for field in ["Publisher", "InstallLocation", "MainBinaryName"] {
        let mut records = installed(InstallKind::Msi);
        records.put(
            Hive::Machine,
            &msi_path(),
            field,
            raw_text("literal", REG_EXPAND_SZ),
        );
        assert_identity(&records, InstallKind::Unknown, false);
    }
}

#[test]
fn readable_command_does_not_bypass_other_msi_identity_checks() {
    for (field, text) in [
        ("Publisher", "Other"),
        ("InstallLocation", r"C:\Other"),
        ("UninstallString", "Other.exe /X{id}"),
    ] {
        let mut records = installed(InstallKind::Msi);
        records.text(Hive::Machine, &msi_path(), field, text);
        assert_identity(&records, InstallKind::Unknown, true);
    }
}
