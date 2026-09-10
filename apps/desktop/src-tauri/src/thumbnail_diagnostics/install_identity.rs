//! Conservative diagnosis-only identity. This does not change updater eligibility.
use super::{
    local_file,
    model::{InstallKind, Observation},
    registry::{self, Hive},
};
use std::path::Path;

const PRODUCT: &str = r"Software\postmelee\Alhangeul";
const UNINSTALL: &str = r"Software\Microsoft\Windows\CurrentVersion\Uninstall";

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct InstallIdentity {
    pub kind: InstallKind,
    pub records_readable: bool,
}

pub fn collect(root: &Path) -> InstallIdentity {
    let nsis = registry::string(Hive::User, PRODUCT, "");
    let msi = registry::string(Hive::User, PRODUCT, "InstallDir");
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
                records_readable: !matches!(nsis, Observation::Unreadable)
                    && !matches!(msi, Observation::Unreadable),
            }
        }
    };
    let records = uninstall_kinds(root);
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
    }
}

fn matches_root(value: &str, root: &Path) -> bool {
    local_file::same_path(Path::new(value), root)
}

fn uninstall_kinds(root: &Path) -> Result<Vec<InstallKind>, ()> {
    let mut result = Vec::new();
    for hive in [Hive::User, Hive::Machine] {
        let key = match registry::open(hive, UNINSTALL) {
            Ok(key) => key,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
            Err(_) => return Err(()),
        };
        for (index, name) in key.enum_keys().enumerate() {
            if index >= 4096 {
                return Err(());
            }
            let name = name.map_err(|_| ())?;
            let path = format!(r"{UNINSTALL}\{name}");
            let display = registry::string(hive, &path, "DisplayName");
            if matches!(display, Observation::Unreadable) {
                return Err(());
            }
            if !equals(&display, "Alhangeul") {
                continue;
            }
            result.push(entry(hive, &path, &name, root)?);
        }
    }
    Ok(result)
}

fn entry(hive: Hive, path: &str, name: &str, root: &Path) -> Result<InstallKind, ()> {
    let publisher = registry::string(hive, path, "Publisher");
    let location = registry::string(hive, path, "InstallLocation");
    let command = registry::string(hive, path, "UninstallString");
    let binary = registry::string(hive, path, "MainBinaryName");
    let installer = registry::dword(hive, path, "WindowsInstaller");
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
