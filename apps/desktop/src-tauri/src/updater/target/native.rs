use super::{
    LinuxEvidence, TargetEvidence, TargetProbeError, UpdaterTargetProbe, WindowsEvidence,
    WindowsProductRecord, WindowsRegistryHive, WindowsRegistryView, WindowsUninstallEntry,
};

pub(crate) struct NativeTargetProbe;

#[cfg(target_os = "windows")]
impl UpdaterTargetProbe for NativeTargetProbe {
    fn evidence(&self) -> Result<TargetEvidence, TargetProbeError> {
        windows_evidence().map(TargetEvidence::Windows)
    }
}

#[cfg(target_os = "linux")]
impl UpdaterTargetProbe for NativeTargetProbe {
    fn evidence(&self) -> Result<TargetEvidence, TargetProbeError> {
        linux_evidence().map(TargetEvidence::Linux)
    }
}

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
impl UpdaterTargetProbe for NativeTargetProbe {
    fn evidence(&self) -> Result<TargetEvidence, TargetProbeError> {
        Ok(TargetEvidence::UnsupportedPlatform)
    }
}

#[cfg(target_os = "windows")]
fn windows_evidence() -> Result<WindowsEvidence, TargetProbeError> {
    use winreg::enums::{
        HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_32KEY, KEY_WOW64_64KEY,
    };
    use winreg::RegKey;

    const PRODUCT_KEY: &str = r"Software\postmelee\Alhangeul";
    const UNINSTALL_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Uninstall";
    let views = [
        (WindowsRegistryView::Registry64, KEY_WOW64_64KEY),
        (WindowsRegistryView::Registry32, KEY_WOW64_32KEY),
    ];
    let current_user = RegKey::predef(HKEY_CURRENT_USER);
    let local_machine = RegKey::predef(HKEY_LOCAL_MACHINE);
    let mut product_records = Vec::new();
    if let Ok(key) = current_user.open_subkey_with_flags(PRODUCT_KEY, KEY_READ | KEY_WOW64_64KEY) {
        product_records.push(WindowsProductRecord {
            hive: WindowsRegistryHive::CurrentUser,
            view: WindowsRegistryView::Registry64,
            default_install_dir: optional_string(&key, ""),
            install_dir: optional_string(&key, "InstallDir"),
        });
    }
    let mut uninstall_entries = Vec::new();
    for (hive, root) in [
        (WindowsRegistryHive::CurrentUser, &current_user),
        (WindowsRegistryHive::LocalMachine, &local_machine),
    ] {
        for (view, view_flag) in views {
            let Ok(uninstall) = root.open_subkey_with_flags(UNINSTALL_KEY, KEY_READ | view_flag)
            else {
                continue;
            };
            for key_name in uninstall.enum_keys().flatten() {
                let Ok(entry) = uninstall.open_subkey_with_flags(&key_name, KEY_READ | view_flag)
                else {
                    continue;
                };
                let display_name = optional_string(&entry, "DisplayName");
                if !display_name
                    .as_deref()
                    .is_some_and(|name| name.eq_ignore_ascii_case("Alhangeul"))
                {
                    continue;
                }
                uninstall_entries.push(WindowsUninstallEntry {
                    hive,
                    view,
                    key_name,
                    display_name,
                    publisher: optional_string(&entry, "Publisher"),
                    install_location: optional_string(&entry, "InstallLocation"),
                    uninstall_string: optional_string(&entry, "UninstallString"),
                    main_binary_name: optional_string(&entry, "MainBinaryName"),
                    windows_installer: entry.get_value("WindowsInstaller").ok(),
                });
            }
        }
    }
    Ok(WindowsEvidence {
        architecture: std::env::consts::ARCH.to_string(),
        current_executable: std::env::current_exe()
            .and_then(std::fs::canonicalize)
            .map_err(|_| TargetProbeError)?,
        product_records,
        uninstall_entries,
    })
}

#[cfg(target_os = "windows")]
fn optional_string(key: &winreg::RegKey, name: &str) -> Option<String> {
    key.get_value::<String, _>(name)
        .ok()
        .filter(|value| !value.trim().is_empty())
}

#[cfg(target_os = "linux")]
fn linux_evidence() -> Result<LinuxEvidence, TargetProbeError> {
    use std::os::unix::fs::PermissionsExt;

    let current_executable = std::env::current_exe()
        .and_then(std::fs::canonicalize)
        .map_err(|_| TargetProbeError)?;
    let appimage_path = canonical_env_path("APPIMAGE");
    let appdir_path = canonical_env_path("APPDIR");
    let appimage_metadata = appimage_path
        .as_ref()
        .and_then(|path| std::fs::metadata(path).ok());
    let appdir_metadata = appdir_path
        .as_ref()
        .and_then(|path| std::fs::metadata(path).ok());
    let parent_metadata = appimage_path
        .as_ref()
        .and_then(|path| path.parent())
        .and_then(|path| std::fs::metadata(path).ok());
    Ok(LinuxEvidence {
        architecture: std::env::consts::ARCH.to_string(),
        current_executable,
        appimage_path,
        appdir_path,
        appimage_exists: appimage_metadata
            .as_ref()
            .is_some_and(|meta| meta.is_file()),
        appdir_exists: appdir_metadata.as_ref().is_some_and(|meta| meta.is_dir()),
        appimage_writable: appimage_metadata
            .as_ref()
            .is_some_and(|meta| meta.permissions().mode() & 0o222 != 0),
        parent_writable: parent_metadata
            .as_ref()
            .is_some_and(|meta| meta.permissions().mode() & 0o222 != 0),
    })
}

#[cfg(target_os = "linux")]
fn canonical_env_path(name: &str) -> Option<std::path::PathBuf> {
    std::env::var_os(name)
        .filter(|value| !value.is_empty())
        .and_then(|value| std::fs::canonicalize(value).ok())
}

#[cfg(not(target_os = "windows"))]
fn _keep_windows_types_linked(
    _: (
        WindowsEvidence,
        WindowsProductRecord,
        WindowsRegistryHive,
        WindowsRegistryView,
        WindowsUninstallEntry,
    ),
) {
}

#[cfg(not(target_os = "linux"))]
fn _keep_linux_type_linked(_: LinuxEvidence) {}
