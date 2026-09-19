//! Conservative diagnosis-only identity. This does not change updater eligibility.
use super::{
    install_registry::{Native, Reader},
    local_file,
    model::{InstallKind, Observation},
    registry::Hive,
};
use std::path::Path;

const PRODUCT: &str = r"Software\postmelee\Alhangeul";
const UNINSTALL: &str = r"Software\Microsoft\Windows\CurrentVersion\Uninstall";

#[derive(Clone)]
pub struct InstallIdentity {
    pub kind: InstallKind,
    pub records_readable: bool,
    pub read_failures: Vec<super::install_failure::InstallReadFailure>,
}

// Observability must not change registration stability or its Debug-based token.
impl PartialEq for InstallIdentity {
    fn eq(&self, other: &Self) -> bool {
        self.kind == other.kind && self.records_readable == other.records_readable
    }
}
impl Eq for InstallIdentity {}

impl std::fmt::Debug for InstallIdentity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("InstallIdentity")
            .field("kind", &self.kind)
            .field("records_readable", &self.records_readable)
            .finish()
    }
}

pub fn collect(root: &Path) -> InstallIdentity {
    collect_from(root, &Native)
}

fn collect_from(root: &Path, reader: &impl Reader) -> InstallIdentity {
    let trace = super::install_trace::Trace::new(reader);
    let mut identity = classify(root, &trace);
    identity.read_failures = trace.finish();
    identity
}

fn classify(root: &Path, reader: &impl Reader) -> InstallIdentity {
    let nsis = reader.string(Hive::User, PRODUCT, "");
    let msi = reader.string(Hive::User, PRODUCT, "InstallDir");
    let expected = match (&nsis, &msi) {
        (Observation::Known(path), Observation::Missing) if matches_root(path, root) => {
            InstallKind::Nsis
        }
        (Observation::Missing, Observation::Known(path)) if matches_root(path, root) => {
            InstallKind::Msi
        }
        _ => {
            return InstallIdentity {
                kind: InstallKind::Unknown,
                read_failures: vec![],
                records_readable: !matches!(nsis, Observation::Unreadable)
                    && !matches!(msi, Observation::Unreadable),
            }
        }
    };
    let records = uninstall_kinds(root, reader);
    InstallIdentity {
        kind: if records
            .as_ref()
            .is_ok_and(|values| values.as_slice() == [expected])
        {
            expected
        } else {
            InstallKind::Unknown
        },
        records_readable: records.is_ok(),
        read_failures: vec![],
    }
}

fn matches_root(value: &str, root: &Path) -> bool {
    local_file::same_path(Path::new(value), root)
}

fn uninstall_kinds(root: &Path, reader: &impl Reader) -> Result<Vec<InstallKind>, ()> {
    let mut result = Vec::new();
    for hive in [Hive::User, Hive::Machine] {
        for name in reader.keys(hive, UNINSTALL)? {
            let path = format!(r"{UNINSTALL}\{name}");
            let display = reader.string(hive, &path, "DisplayName");
            if matches!(display, Observation::Unreadable) {
                return Err(());
            }
            if !equals(&display, "Alhangeul") {
                continue;
            }
            result.push(entry(reader, hive, &path, &name, root)?);
        }
    }
    Ok(result)
}

fn entry(
    reader: &impl Reader,
    hive: Hive,
    path: &str,
    name: &str,
    root: &Path,
) -> Result<InstallKind, ()> {
    let publisher = reader.string(hive, path, "Publisher");
    let location = reader.string(hive, path, "InstallLocation");
    let command = reader.string(hive, path, "UninstallString");
    let binary = reader.string(hive, path, "MainBinaryName");
    let installer = reader.dword(hive, path, "WindowsInstaller");
    if [&publisher, &location, &command, &binary]
        .into_iter()
        .any(|value| matches!(value, Observation::Unreadable))
        || matches!(installer, Observation::Unreadable)
    {
        return Err(());
    }
    if !equals(&publisher, "postmelee") {
        return Ok(InstallKind::Unknown);
    }
    let Observation::Known(command) = command else {
        return Ok(InstallKind::Unknown);
    };
    let uninstaller = command_executable(&command);
    let nsis_path = uninstaller.is_some_and(|file| nsis_in_root(file, root));
    let location_matches =
        matches!(location, Observation::Known(ref path) if matches_root(path, root));
    match hive {
        Hive::User
            if nsis_path
                && equals(&binary, "Alhangeul.exe")
                && matches!(installer, Observation::Missing | Observation::Known(0)) =>
        {
            Ok(InstallKind::Nsis)
        }
        Hive::Machine
            if location_matches
                && installer == Observation::Known(1)
                && msi_command_matches(name, uninstaller) =>
        {
            Ok(InstallKind::Msi)
        }
        _ => Ok(InstallKind::Unknown),
    }
}

fn nsis_in_root(file: &str, root: &Path) -> bool {
    Path::new(file)
        .file_name()
        .and_then(|value| value.to_str())
        .is_some_and(|value| value.eq_ignore_ascii_case("uninstall.exe"))
        && Path::new(file)
            .parent()
            .is_some_and(|path| local_file::same_path(path, root))
}

fn msi_command_matches(name: &str, uninstaller: Option<&str>) -> bool {
    name.starts_with('{')
        && name.ends_with('}')
        && uuid::Uuid::parse_str(name).is_ok()
        && uninstaller.is_some_and(|file| {
            Path::new(file)
                .file_name()
                .and_then(|value| value.to_str())
                .is_some_and(|value| {
                    value.eq_ignore_ascii_case("msiexec.exe")
                        || value.eq_ignore_ascii_case("msiexec")
                })
        })
}

fn equals(value: &Observation<String>, expected: &str) -> bool {
    matches!(value, Observation::Known(value) if value.eq_ignore_ascii_case(expected))
}

fn command_executable(command: &str) -> Option<&str> {
    let command = command.trim();
    if let Some(quoted) = command.strip_prefix('"') {
        quoted.split_once('"').map(|pair| pair.0)
    } else {
        command.split_whitespace().next()
    }
}

#[cfg(test)]
#[path = "install_identity_tests.rs"]
mod record_tests;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn installed_nsis_command_shape_matches_only_its_root() {
        let root = Path::new(r"\\?\C:\Users\fixture\AppData\Local\Alhangeul");
        let command = r#""C:\Users\fixture\AppData\Local\Alhangeul\uninstall.exe""#;
        assert!(nsis_in_root(command_executable(command).unwrap(), root));
        assert!(!nsis_in_root(r"C:\Other\uninstall.exe", root));
        assert!(!nsis_in_root(
            r"C:\Users\fixture\AppData\Local\Alhangeul\other.exe",
            root
        ));
    }

    #[test]
    fn installed_msi_command_and_trailing_separator_are_recognized() {
        let id = "{77C4273A-7040-4B1C-A575-51ACDCB27935}";
        let command = format!("MsiExec.exe /X{id}");
        assert!(msi_command_matches(id, command_executable(&command)));
        assert!(matches_root(
            r"C:\Program Files\Alhangeul\",
            Path::new(r"\\?\C:\Program Files\Alhangeul")
        ));
        assert!(!msi_command_matches(
            "not-a-product-code",
            command_executable(&command)
        ));
        assert!(!msi_command_matches(id, Some("other.exe")));
    }
}
