//! Read boundary for install identity; tests inject raw values, not a second classifier.
use super::{
    model::Observation,
    registry::{self, Hive},
};
use winreg::RegValue;

pub(super) trait Reader {
    fn raw(&self, hive: Hive, path: &str, name: &str) -> Observation<RegValue>;
    fn keys(&self, hive: Hive, path: &str) -> Result<Vec<String>, ()>;

    fn string(&self, hive: Hive, path: &str, name: &str) -> Observation<String> {
        registry::decode_string(self.raw(hive, path, name), name == "DisplayName")
    }

    fn dword(&self, hive: Hive, path: &str, name: &str) -> Observation<u32> {
        registry::decode_dword(self.raw(hive, path, name))
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

    fn raw(&self, hive: Hive, path: &str, name: &str) -> Observation<RegValue> {
        registry::raw(hive, path, name)
    }

    fn keys(&self, hive: Hive, path: &str) -> Result<Vec<String>, ()> {
        let key = match registry::open(hive, path) {
            Ok(key) => key,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
            Err(_) => return Err(()),
        };
        let mut result = Vec::new();
        for (index, name) in key.enum_keys().enumerate() {
            if index >= 4096 {
                return Err(());
            }
            result.push(name.map_err(|_| ())?);
        }
        Ok(result)
    }
}
