use super::{
    BACKUP_ROOT, EXTENSIONS, HANDLER_CLSID_TEXT, HANDLER_FILENAME, THREADING_MODEL,
    THUMBNAIL_PROVIDER_TEXT, WORKER_FILENAME,
};
use crate::module_handle;
use core::ffi::c_void;
use registry::{
    delete_key, delete_value, read_value, write_dword, write_string, write_value, RawValue,
};
use std::ffi::OsString;
use std::iter::once;
use std::os::windows::ffi::OsStringExt;
use std::path::PathBuf;
use windows_sys::Win32::Foundation::{
    ERROR_FILE_NOT_FOUND, ERROR_INVALID_DATA, ERROR_PATH_NOT_FOUND, ERROR_SUCCESS,
};
use windows_sys::Win32::Storage::FileSystem::{
    GetFileAttributesW, FILE_ATTRIBUTE_DIRECTORY, INVALID_FILE_ATTRIBUTES,
};
use windows_sys::Win32::System::LibraryLoader::GetModuleFileNameW;
use windows_sys::Win32::System::Registry::{REG_BINARY, REG_DWORD, REG_SZ};
use windows_sys::Win32::UI::Shell::{SHChangeNotify, SHCNE_ASSOCCHANGED, SHCNF_IDLIST};

mod registry;

#[derive(Clone, Copy)]
enum Scope {
    User,
    Machine,
}

enum Snapshot {
    Absent,
    Present(RawValue),
}

pub(crate) fn install_machine() -> u32 {
    install(Scope::Machine)
}

pub(crate) fn uninstall_machine() -> u32 {
    uninstall(Scope::Machine)
}

pub(crate) fn install_user() -> u32 {
    install(Scope::User)
}

pub(crate) fn uninstall_user() -> u32 {
    uninstall(Scope::User)
}

fn install(scope: Scope) -> u32 {
    if let Err(status) = install_inner(scope) {
        let _ = uninstall_inner(scope);
        return status;
    }
    notify_association_change();
    ERROR_SUCCESS
}

fn install_inner(scope: Scope) -> Result<(), u32> {
    let handler_path = installed_handler_path()?;
    for extension in EXTENSIONS {
        snapshot_extension(scope, extension)?;
    }
    register_clsid(scope, &handler_path)?;
    for extension in EXTENSIONS {
        write_string(scope, &association_path(extension), "", HANDLER_CLSID_TEXT)?;
    }
    Ok(())
}

fn uninstall(scope: Scope) -> u32 {
    let status = uninstall_inner(scope).err().unwrap_or(ERROR_SUCCESS);
    notify_association_change();
    status
}

fn uninstall_inner(scope: Scope) -> Result<(), u32> {
    let mut first_error = None;
    for extension in EXTENSIONS {
        record_error(&mut first_error, restore_extension(scope, extension));
    }
    record_error(&mut first_error, delete_key(scope, BACKUP_ROOT));
    record_error(&mut first_error, remove_clsid(scope));
    first_error.map_or(Ok(()), Err)
}

fn snapshot_extension(scope: Scope, extension: &str) -> Result<(), u32> {
    let current = read_value(scope, &association_path(extension), "")?;
    let prior = read_snapshot(scope, extension)?;
    if current.as_ref().is_some_and(is_our_clsid) {
        return prior.map(|_| ()).ok_or(ERROR_INVALID_DATA);
    }
    write_snapshot(scope, extension, current)
}

fn restore_extension(scope: Scope, extension: &str) -> Result<(), u32> {
    let backup = backup_path(extension);
    let Some(snapshot) = read_snapshot(scope, extension)? else {
        return Ok(());
    };
    let current = read_value(scope, &association_path(extension), "")?;
    if current.as_ref().is_some_and(is_our_clsid) {
        match snapshot {
            Snapshot::Absent => delete_value(scope, &association_path(extension), "")?,
            Snapshot::Present(value) => {
                write_value(scope, &association_path(extension), "", &value)?;
            }
        }
    }
    clear_snapshot(scope, &backup)
}

fn write_snapshot(scope: Scope, extension: &str, current: Option<RawValue>) -> Result<(), u32> {
    let path = backup_path(extension);
    delete_value(scope, &path, "State")?;
    match current {
        Some(value) => {
            write_value(
                scope,
                &path,
                "Data",
                &RawValue {
                    kind: REG_BINARY,
                    data: value.data,
                },
            )?;
            write_dword(scope, &path, "Kind", value.kind)?;
            write_dword(scope, &path, "State", 1)
        }
        None => {
            delete_value(scope, &path, "Data")?;
            delete_value(scope, &path, "Kind")?;
            write_dword(scope, &path, "State", 0)
        }
    }
}

fn read_snapshot(scope: Scope, extension: &str) -> Result<Option<Snapshot>, u32> {
    let path = backup_path(extension);
    let Some(state) = read_value(scope, &path, "State")? else {
        return Ok(None);
    };
    match read_dword(&state)? {
        0 => Ok(Some(Snapshot::Absent)),
        1 => {
            let kind = read_value(scope, &path, "Kind")?.ok_or(ERROR_INVALID_DATA)?;
            let data = read_value(scope, &path, "Data")?.ok_or(ERROR_INVALID_DATA)?;
            if data.kind != REG_BINARY {
                return Err(ERROR_INVALID_DATA);
            }
            Ok(Some(Snapshot::Present(RawValue {
                kind: read_dword(&kind)?,
                data: data.data,
            })))
        }
        _ => Err(ERROR_INVALID_DATA),
    }
}

fn clear_snapshot(scope: Scope, path: &str) -> Result<(), u32> {
    for name in ["State", "Kind", "Data"] {
        delete_value(scope, path, name)?;
    }
    delete_key(scope, path)
}

fn register_clsid(scope: Scope, handler_path: &[u16]) -> Result<(), u32> {
    let path = inproc_path();
    write_value(
        scope,
        &path,
        "",
        &RawValue {
            kind: REG_SZ,
            data: utf16_bytes(handler_path),
        },
    )?;
    write_string(scope, &path, "ThreadingModel", THREADING_MODEL)
}

fn remove_clsid(scope: Scope) -> Result<(), u32> {
    let inproc = inproc_path();
    delete_value(scope, &inproc, "")?;
    delete_value(scope, &inproc, "ThreadingModel")?;
    delete_key(scope, &inproc)?;
    delete_key(scope, &class_path())
}

fn installed_handler_path() -> Result<Vec<u16>, u32> {
    let mut buffer = vec![0u16; 32_768];
    let length =
        unsafe { GetModuleFileNameW(module_handle(), buffer.as_mut_ptr(), buffer.len() as u32) }
            as usize;
    if length == 0 || length >= buffer.len() {
        return Err(ERROR_PATH_NOT_FOUND);
    }
    buffer.truncate(length);
    let path = PathBuf::from(OsString::from_wide(&buffer));
    if !path.is_absolute()
        || !path
            .file_name()
            .is_some_and(|name| name.eq_ignore_ascii_case(HANDLER_FILENAME))
    {
        return Err(ERROR_INVALID_DATA);
    }
    ensure_worker_exists(path.with_file_name(WORKER_FILENAME))?;
    buffer.push(0);
    Ok(buffer)
}

fn ensure_worker_exists(path: PathBuf) -> Result<(), u32> {
    let wide = wide_os(path.as_os_str());
    let attributes = unsafe { GetFileAttributesW(wide.as_ptr()) };
    if attributes == INVALID_FILE_ATTRIBUTES || attributes & FILE_ATTRIBUTE_DIRECTORY != 0 {
        Err(ERROR_FILE_NOT_FOUND)
    } else {
        Ok(())
    }
}

fn read_dword(value: &RawValue) -> Result<u32, u32> {
    if value.kind != REG_DWORD || value.data.len() != 4 {
        return Err(ERROR_INVALID_DATA);
    }
    Ok(u32::from_le_bytes(
        value.data.as_slice().try_into().unwrap(),
    ))
}

fn is_our_clsid(value: &RawValue) -> bool {
    value.kind == REG_SZ
        && decode_utf16(&value.data)
            .is_some_and(|text| text.eq_ignore_ascii_case(HANDLER_CLSID_TEXT))
}

fn decode_utf16(data: &[u8]) -> Option<String> {
    let chunks = data.chunks_exact(2);
    if !chunks.remainder().is_empty() {
        return None;
    }
    let mut units = chunks
        .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
        .collect::<Vec<_>>();
    while units.last() == Some(&0) {
        units.pop();
    }
    String::from_utf16(&units).ok()
}

fn utf16_bytes(units: &[u16]) -> Vec<u8> {
    units.iter().flat_map(|unit| unit.to_le_bytes()).collect()
}

fn wide_os(value: &std::ffi::OsStr) -> Vec<u16> {
    use std::os::windows::ffi::OsStrExt;
    value.encode_wide().chain(once(0)).collect()
}

fn class_path() -> String {
    format!("Software\\Classes\\CLSID\\{HANDLER_CLSID_TEXT}")
}

fn inproc_path() -> String {
    format!("{}\\InprocServer32", class_path())
}

fn association_path(extension: &str) -> String {
    format!("Software\\Classes\\{extension}\\ShellEx\\{THUMBNAIL_PROVIDER_TEXT}")
}

fn backup_path(extension: &str) -> String {
    format!("{BACKUP_ROOT}\\{extension}")
}

fn record_error(first: &mut Option<u32>, result: Result<(), u32>) {
    if let Err(status) = result {
        first.get_or_insert(status);
    }
}

fn notify_association_change() {
    unsafe {
        SHChangeNotify(
            SHCNE_ASSOCCHANGED as i32,
            SHCNF_IDLIST,
            core::ptr::null::<c_void>(),
            core::ptr::null::<c_void>(),
        );
    }
}
