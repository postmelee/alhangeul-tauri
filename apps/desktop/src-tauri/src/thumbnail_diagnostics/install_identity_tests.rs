//! Calls the product collector with typed raw registry records, without registry writes.
use super::*;
use std::collections::BTreeMap;
use winreg::{enums::*, RegValue};

#[path = "install_failure_tests.rs"]
mod failure_tests;

const ROOT: &str = r"C:\Program Files\Alhangeul";
const MSI_ID: &str = "{77C4273A-7040-4B1C-A575-51ACDCB27935}";

#[derive(Default)]
struct Records {
    values: BTreeMap<(bool, String, String), Observation<RegValue>>,
    keys: BTreeMap<bool, Result<Vec<String>, ()>>,
}

impl Reader for Records {
    fn raw(&self, hive: Hive, path: &str, name: &str) -> Observation<RegValue> {
        match self
            .values
            .get(&(matches!(hive, Hive::Machine), path.into(), name.into()))
        {
            Some(Observation::Known(value)) => Observation::Known(RegValue {
                bytes: value.bytes.clone(),
                vtype: value.vtype.clone(),
            }),
            Some(Observation::Unreadable) => Observation::Unreadable,
            _ => Observation::Missing,
        }
    }
    fn keys(&self, hive: Hive, path: &str) -> Result<Vec<String>, ()> {
        assert_eq!(path, UNINSTALL);
        self.keys
            .get(&matches!(hive, Hive::Machine))
            .cloned()
            .unwrap_or(Ok(vec![]))
    }
}

impl Records {
    fn put(&mut self, hive: Hive, path: &str, name: &str, value: Observation<RegValue>) {
        self.values.insert(
            (matches!(hive, Hive::Machine), path.into(), name.into()),
            value,
        );
    }
    fn text(&mut self, hive: Hive, path: &str, name: &str, text: &str) {
        self.put(hive, path, name, raw_text(text, REG_SZ));
    }
    fn entry(&mut self, hive: Hive, name: &str) -> String {
        self.keys
            .entry(matches!(hive, Hive::Machine))
            .or_insert(Ok(vec![]))
            .as_mut()
            .unwrap()
            .push(name.into());
        format!(r"{UNINSTALL}\{name}")
    }
    fn collected(&self) -> InstallIdentity {
        collect_from(Path::new(r"\\?\C:\Program Files\Alhangeul"), self)
    }
}

fn raw_text(text: &str, vtype: RegType) -> Observation<RegValue> {
    Observation::Known(RegValue {
        bytes: text
            .encode_utf16()
            .chain([0])
            .flat_map(u16::to_le_bytes)
            .collect(),
        vtype,
    })
}

fn installed(kind: InstallKind) -> Records {
    let mut records = Records::default();
    let (marker, hive, name) = match kind {
        InstallKind::Nsis => ("", Hive::User, "Alhangeul"),
        InstallKind::Msi => ("InstallDir", Hive::Machine, MSI_ID),
        _ => unreachable!(),
    };
    records.text(Hive::User, PRODUCT, marker, ROOT);
    let path = records.entry(hive, name);
    records.text(hive, &path, "DisplayName", "Alhangeul");
    records.text(hive, &path, "Publisher", "postmelee");
    records.text(hive, &path, "InstallLocation", &format!(r"{ROOT}\"));
    if kind == InstallKind::Nsis {
        records.text(
            hive,
            &path,
            "UninstallString",
            &format!(r#""{ROOT}\uninstall.exe""#),
        );
        records.text(hive, &path, "MainBinaryName", "Alhangeul.exe");
    } else {
        records.text(
            hive,
            &path,
            "UninstallString",
            &format!("MsiExec.exe /X{MSI_ID}"),
        );
        records.put(
            hive,
            &path,
            "WindowsInstaller",
            Observation::Known(RegValue {
                bytes: 1_u32.to_le_bytes().to_vec(),
                vtype: REG_DWORD,
            }),
        );
    }
    records
}

fn assert_identity(records: &Records, kind: InstallKind, records_readable: bool) {
    let result = records.collected();
    assert_eq!(result.kind, kind);
    assert_eq!(result.records_readable, records_readable);
    assert_eq!(result.read_failures.is_empty(), records_readable);
}

#[test]
fn collector_recognizes_both_installers_among_literal_empty_and_missing_names() {
    for kind in [InstallKind::Nsis, InstallKind::Msi] {
        let mut records = installed(kind);
        for (index, value) in [
            raw_text("Other application", REG_EXPAND_SZ),
            raw_text("", REG_SZ),
            raw_text("", REG_EXPAND_SZ),
            Observation::Missing,
        ]
        .into_iter()
        .enumerate()
        {
            let path = records.entry(Hive::Machine, &format!("other-{index}"));
            records.put(Hive::Machine, &path, "DisplayName", value);
        }
        assert_identity(&records, kind, true);
    }
}

#[test]
fn collector_accepts_literal_expandable_product_name_without_expanding_markers() {
    for (kind, hive, name) in [
        (InstallKind::Nsis, Hive::User, "Alhangeul"),
        (InstallKind::Msi, Hive::Machine, MSI_ID),
    ] {
        let mut records = installed(kind);
        records.put(
            hive,
            &format!(r"{UNINSTALL}\{name}"),
            "DisplayName",
            raw_text("Alhangeul", REG_EXPAND_SZ),
        );
        assert_identity(&records, kind, true);
        let marker = if kind == InstallKind::Nsis {
            ""
        } else {
            "InstallDir"
        };
        records.put(Hive::User, PRODUCT, marker, raw_text(ROOT, REG_EXPAND_SZ));
        assert_identity(&records, InstallKind::Unknown, false);
    }
}

#[test]
fn collector_does_not_ignore_unreadable_or_malformed_unrelated_records() {
    let invalid = [
        raw_text("%PRODUCT%", REG_EXPAND_SZ),
        raw_text("Other", REG_MULTI_SZ),
        Observation::Known(RegValue {
            bytes: vec![0],
            vtype: REG_SZ,
        }),
        Observation::Unreadable,
    ];
    for value in invalid {
        let mut records = installed(InstallKind::Msi);
        let path = records.entry(Hive::User, "other");
        records.put(Hive::User, &path, "DisplayName", value);
        assert_identity(&records, InstallKind::Unknown, false);
    }
}

#[test]
fn collector_rejects_missing_mixed_wrong_and_unreadable_markers() {
    for value in [
        Observation::Missing,
        raw_text(r"C:\Other", REG_SZ),
        Observation::Unreadable,
    ] {
        let unreadable = matches!(value, Observation::Unreadable);
        let mut records = installed(InstallKind::Nsis);
        records.put(Hive::User, PRODUCT, "", value);
        assert_identity(&records, InstallKind::Unknown, !unreadable);
    }
    let mut records = installed(InstallKind::Nsis);
    records.text(Hive::User, PRODUCT, "InstallDir", ROOT);
    assert_identity(&records, InstallKind::Unknown, true);
}

#[test]
fn collector_requires_exactly_one_matching_install_record() {
    for kind in [InstallKind::Nsis, InstallKind::Msi] {
        let mut records = installed(kind);
        let machine = kind == InstallKind::Msi;
        records.keys.insert(machine, Ok(vec![]));
        assert_identity(&records, InstallKind::Unknown, true);
        let mut records = installed(kind);
        let names = records.keys.get_mut(&machine).unwrap().as_mut().unwrap();
        names.push(names[0].clone());
        assert_identity(&records, InstallKind::Unknown, true);
        records.keys.insert(machine, Err(()));
        assert_identity(&records, InstallKind::Unknown, false);
    }
}

#[test]
fn collector_checks_product_fields_paths_and_types_without_relaxation() {
    for (kind, hive, name, field, bad) in [
        (
            InstallKind::Nsis,
            Hive::User,
            "Alhangeul",
            "UninstallString",
            r#""C:\Other\uninstall.exe""#,
        ),
        (
            InstallKind::Nsis,
            Hive::User,
            "Alhangeul",
            "MainBinaryName",
            "Other.exe",
        ),
        (
            InstallKind::Msi,
            Hive::Machine,
            MSI_ID,
            "InstallLocation",
            r"C:\Other",
        ),
        (
            InstallKind::Msi,
            Hive::Machine,
            MSI_ID,
            "Publisher",
            "Other",
        ),
    ] {
        let mut records = installed(kind);
        let path = format!(r"{UNINSTALL}\{name}");
        records.text(hive, &path, field, bad);
        assert_identity(&records, InstallKind::Unknown, true);
        records.put(hive, &path, field, raw_text(bad, REG_EXPAND_SZ));
        assert_identity(&records, InstallKind::Unknown, false);
    }
    let mut records = installed(InstallKind::Msi);
    records.put(
        Hive::Machine,
        &format!(r"{UNINSTALL}\{MSI_ID}"),
        "WindowsInstaller",
        raw_text("1", REG_SZ),
    );
    assert_identity(&records, InstallKind::Unknown, false);
}
