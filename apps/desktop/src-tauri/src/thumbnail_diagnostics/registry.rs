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
    string_value(hive, path, name, false)
}

// Discovery accepts empty names and literal REG_EXPAND_SZ DisplayNames.
// Product paths, COM values and installer fields stay strict nonempty REG_SZ.
pub fn display_name(hive: Hive, path: &str) -> Observation<String> {
    string_value(hive, path, "DisplayName", true)
}

fn string_value(hive: Hive, path: &str, name: &str, display_name: bool) -> Observation<String> {
    decode_string(raw(hive, path, name), display_name)
}

fn decode_string(value: Observation<RegValue>, display_name: bool) -> Observation<String> {
    match value {
        Observation::Known(value)
            if value.vtype == REG_SZ || (display_name && value.vtype == REG_EXPAND_SZ) =>
        {
            let decoded = if display_name {
                super::registry_text::decode_display_name(
                    &value.bytes,
                    value.vtype == REG_EXPAND_SZ,
                )
            } else {
                super::registry_text::decode_sz(&value.bytes, false)
            };
            match decoded {
                Some(value) => Observation::Known(value),
                _ => Observation::Unreadable,
            }
        }
        Observation::Missing => Observation::Missing,
        _ => Observation::Unreadable,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_empty_is_known_without_relaxing_other_values() {
        let empty = || {
            Observation::Known(RegValue {
                bytes: vec![0, 0],
                vtype: REG_SZ,
            })
        };
        assert_eq!(
            decode_string(empty(), true),
            Observation::Known(String::new())
        );
        assert_eq!(decode_string(empty(), false), Observation::Unreadable);
        assert_eq!(
            decode_string(Observation::Missing, true),
            Observation::Missing
        );
        assert_eq!(
            decode_string(Observation::Unreadable, true),
            Observation::Unreadable
        );
    }

    #[test]
    fn expandable_type_is_limited_to_literal_display_names() {
        for name in ["Other application", "Alhangeul", "%PRODUCT%"] {
            let value = || {
                Observation::Known(RegValue {
                    bytes: name
                        .encode_utf16()
                        .chain([0])
                        .flat_map(u16::to_le_bytes)
                        .collect(),
                    vtype: REG_EXPAND_SZ,
                })
            };
            let expected = if name.contains('%') {
                Observation::Unreadable
            } else {
                Observation::Known(name.to_string())
            };
            assert_eq!(decode_string(value(), true), expected);
            assert_eq!(decode_string(value(), false), Observation::Unreadable);
        }
    }

    #[test]
    fn wrong_types_are_not_accepted_as_empty_display_names() {
        for vtype in [REG_MULTI_SZ, REG_BINARY, REG_DWORD, REG_QWORD, REG_NONE] {
            assert_eq!(
                decode_string(
                    Observation::Known(RegValue {
                        bytes: vec![0, 0],
                        vtype
                    }),
                    true
                ),
                Observation::Unreadable
            );
        }
    }
}
