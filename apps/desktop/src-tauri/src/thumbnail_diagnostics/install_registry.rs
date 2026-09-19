//! Read boundary for install identity; tests inject raw values, not a second classifier.
use super::{
    model::Observation,
    registry::{self, Hive},
};
use winreg::{enums::REG_EXPAND_SZ, RegValue};

// Only the MSI collector calls this. Never expand or execute registry commands.
pub(super) fn decode_msi_uninstall_string(value: Observation<RegValue>) -> Observation<String> {
    match value {
        Observation::Known(value) if value.vtype == REG_EXPAND_SZ => {
            match super::registry_text::decode_literal_msi_command(&value.bytes) {
                Some(text) => Observation::Known(text),
                _ => Observation::Unreadable,
            }
        }
        value => registry::decode_string(value, false),
    }
}

pub(super) trait Reader {
    fn raw(&self, hive: Hive, path: &str, name: &str) -> Observation<RegValue>;
    fn keys(&self, hive: Hive, path: &str) -> Result<Vec<String>, ()>;

    fn raw_detailed(
        &self,
        hive: Hive,
        path: &str,
        name: &str,
    ) -> (Observation<RegValue>, Option<i32>) {
        (self.raw(hive, path, name), None)
    }

    fn keys_detailed(&self, hive: Hive, path: &str) -> (Result<Vec<String>, ()>, Option<i32>) {
        (self.keys(hive, path), None)
    }

    fn string(&self, hive: Hive, path: &str, name: &str) -> Observation<String> {
        registry::decode_string(self.raw(hive, path, name), name == "DisplayName")
    }

    fn dword(&self, hive: Hive, path: &str, name: &str) -> Observation<u32> {
        registry::decode_dword(self.raw(hive, path, name))
    }

    fn msi_uninstall_string(&self, path: &str) -> Observation<String> {
        decode_msi_uninstall_string(self.raw(Hive::Machine, path, "UninstallString"))
    }
}

pub(super) struct Native;

impl Reader for Native {
    fn string(&self, hive: Hive, path: &str, name: &str) -> Observation<String> {
        if name == "DisplayName" {
            registry::display_name(hive, path)
        } else {
            registry::string(hive, path, name)
        }
    }

    fn raw_detailed(
        &self,
        hive: Hive,
        path: &str,
        name: &str,
    ) -> (Observation<RegValue>, Option<i32>) {
        registry::raw_detailed(hive, path, name)
    }

    fn raw(&self, hive: Hive, path: &str, name: &str) -> Observation<RegValue> {
        registry::raw(hive, path, name)
    }

    fn keys(&self, hive: Hive, path: &str) -> Result<Vec<String>, ()> {
        self.keys_detailed(hive, path).0
    }

    fn keys_detailed(&self, hive: Hive, path: &str) -> (Result<Vec<String>, ()>, Option<i32>) {
        let key = match registry::open(hive, path) {
            Ok(key) => key,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return (Ok(vec![]), None)
            }
            Err(error) => return (Err(()), error.raw_os_error()),
        };
        let mut result = Vec::new();
        for (index, name) in key.enum_keys().enumerate() {
            if index >= 4096 {
                return (Err(()), None);
            }
            match name {
                Ok(name) => result.push(name),
                Err(error) => return (Err(()), error.raw_os_error()),
            }
        }
        (Ok(result), None)
    }
}
