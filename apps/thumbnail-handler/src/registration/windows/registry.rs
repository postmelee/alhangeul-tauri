use super::Scope;
use std::iter::once;
use windows_sys::Win32::Foundation::{ERROR_FILE_NOT_FOUND, ERROR_PATH_NOT_FOUND, ERROR_SUCCESS};
use windows_sys::Win32::System::Registry::{
    RegCloseKey, RegCreateKeyExW, RegDeleteKeyExW, RegDeleteValueW, RegOpenKeyExW,
    RegQueryValueExW, RegSetValueExW, HKEY, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_QUERY_VALUE,
    KEY_READ, KEY_SET_VALUE, KEY_WOW64_64KEY, KEY_WRITE, REG_DWORD, REG_OPTION_NON_VOLATILE,
    REG_SZ,
};

pub(super) struct RawValue {
    pub(super) kind: u32,
    pub(super) data: Vec<u8>,
}

struct Key(HKEY);

impl Drop for Key {
    fn drop(&mut self) {
        unsafe { RegCloseKey(self.0) };
    }
}

pub(super) fn read_value(scope: Scope, path: &str, name: &str) -> Result<Option<RawValue>, u32> {
    let Some(key) = open_key(scope, path, KEY_QUERY_VALUE)? else {
        return Ok(None);
    };
    let name = wide(name);
    let mut kind = 0;
    let mut size = 0;
    let status = unsafe {
        RegQueryValueExW(
            key.0,
            name.as_ptr(),
            core::ptr::null(),
            &mut kind,
            core::ptr::null_mut(),
            &mut size,
        )
    };
    if is_missing(status) {
        return Ok(None);
    }
    check(status)?;
    let mut data = vec![0u8; size as usize];
    let status = unsafe {
        RegQueryValueExW(
            key.0,
            name.as_ptr(),
            core::ptr::null(),
            &mut kind,
            data.as_mut_ptr(),
            &mut size,
        )
    };
    check(status)?;
    data.truncate(size as usize);
    Ok(Some(RawValue { kind, data }))
}

pub(super) fn write_value(
    scope: Scope,
    path: &str,
    name: &str,
    value: &RawValue,
) -> Result<(), u32> {
    let key = create_key(scope, path)?;
    let name = wide(name);
    let data = if value.data.is_empty() {
        core::ptr::null()
    } else {
        value.data.as_ptr()
    };
    check(unsafe {
        RegSetValueExW(
            key.0,
            name.as_ptr(),
            0,
            value.kind,
            data,
            value.data.len() as u32,
        )
    })
}

pub(super) fn write_string(scope: Scope, path: &str, name: &str, value: &str) -> Result<(), u32> {
    let value = wide(value);
    write_value(
        scope,
        path,
        name,
        &RawValue {
            kind: REG_SZ,
            data: value.iter().flat_map(|unit| unit.to_le_bytes()).collect(),
        },
    )
}

pub(super) fn write_dword(scope: Scope, path: &str, name: &str, value: u32) -> Result<(), u32> {
    write_value(
        scope,
        path,
        name,
        &RawValue {
            kind: REG_DWORD,
            data: value.to_le_bytes().to_vec(),
        },
    )
}

pub(super) fn delete_value(scope: Scope, path: &str, name: &str) -> Result<(), u32> {
    let Some(key) = open_key(scope, path, KEY_SET_VALUE)? else {
        return Ok(());
    };
    let status = unsafe { RegDeleteValueW(key.0, wide(name).as_ptr()) };
    if is_missing(status) {
        Ok(())
    } else {
        check(status)
    }
}

pub(super) fn delete_key(scope: Scope, path: &str) -> Result<(), u32> {
    let status = unsafe { RegDeleteKeyExW(scope.root(), wide(path).as_ptr(), KEY_WOW64_64KEY, 0) };
    if is_missing(status) {
        Ok(())
    } else {
        check(status)
    }
}

fn open_key(scope: Scope, path: &str, access: u32) -> Result<Option<Key>, u32> {
    let mut key = core::ptr::null_mut();
    let status = unsafe {
        RegOpenKeyExW(
            scope.root(),
            wide(path).as_ptr(),
            0,
            access | KEY_WOW64_64KEY,
            &mut key,
        )
    };
    if is_missing(status) {
        Ok(None)
    } else {
        check(status).map(|_| Some(Key(key)))
    }
}

fn create_key(scope: Scope, path: &str) -> Result<Key, u32> {
    let mut key = core::ptr::null_mut();
    let status = unsafe {
        RegCreateKeyExW(
            scope.root(),
            wide(path).as_ptr(),
            0,
            core::ptr::null(),
            REG_OPTION_NON_VOLATILE,
            KEY_READ | KEY_WRITE | KEY_WOW64_64KEY,
            core::ptr::null(),
            &mut key,
            core::ptr::null_mut(),
        )
    };
    check(status).map(|_| Key(key))
}

impl Scope {
    fn root(self) -> HKEY {
        match self {
            Self::User => HKEY_CURRENT_USER,
            Self::Machine => HKEY_LOCAL_MACHINE,
        }
    }
}

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(once(0)).collect()
}

fn check(status: u32) -> Result<(), u32> {
    if status == ERROR_SUCCESS {
        Ok(())
    } else {
        Err(status)
    }
}

fn is_missing(status: u32) -> bool {
    status == ERROR_FILE_NOT_FOUND || status == ERROR_PATH_NOT_FOUND
}
