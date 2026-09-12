//! Read-only Registry64 access. Raw values stay internal and are never IPC output.
use super::model::Observation;
use std::io;
use winreg::{enums::*, RegKey, RegValue};

#[derive(Clone, Copy)]
pub enum Hive {
    User,
    Machine,
}

pub fn open(hive: Hive, path: &str) -> Result<RegKey, io::Error> {
    let root = match hive {
        Hive::User => HKEY_CURRENT_USER,
        Hive::Machine => HKEY_LOCAL_MACHINE,
    };
    RegKey::predef(root).open_subkey_with_flags(path, KEY_READ | KEY_WOW64_64KEY)
}

fn observed<T>(result: Result<T, io::Error>) -> Observation<T> {
    match result {
        Ok(value) => Observation::Known(value),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Observation::Missing,
        Err(_) => Observation::Unreadable,
    }
}

pub fn exists(hive: Hive, path: &str) -> Observation<bool> {
    observed(open(hive, path).map(|_| true))
}

pub fn raw(hive: Hive, path: &str, name: &str) -> Observation<RegValue> {
    observed(open(hive, path).and_then(|key| {
        let value = key.get_raw_value(name)?;
        if value.bytes.len() > 32768 {
            return Err(io::ErrorKind::InvalidData.into());
        }
        Ok(value)
    }))
}

pub fn dword(hive: Hive, path: &str, name: &str) -> Observation<u32> {
    match raw(hive, path, name) {
        Observation::Known(value) if value.vtype == REG_DWORD && value.bytes.len() == 4 => {
            Observation::Known(u32::from_le_bytes(value.bytes.try_into().unwrap()))
        }
        Observation::Missing => Observation::Missing,
        _ => Observation::Unreadable,
    }
}

pub fn string(hive: Hive, path: &str, name: &str) -> Observation<String> {
    match raw(hive, path, name) {
        Observation::Known(value) if value.vtype == REG_SZ && value.bytes.len() % 2 == 0 => {
            let mut units: Vec<_> = value
                .bytes
                .as_chunks::<2>()
                .0
                .iter()
                .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
                .collect();
            if units.pop() != Some(0) || units.contains(&0) {
                return Observation::Unreadable;
            }
            match String::from_utf16(&units) {
                Ok(value) if !value.is_empty() => Observation::Known(value),
                _ => Observation::Unreadable,
            }
        }
        Observation::Missing => Observation::Missing,
        _ => Observation::Unreadable,
    }
}
