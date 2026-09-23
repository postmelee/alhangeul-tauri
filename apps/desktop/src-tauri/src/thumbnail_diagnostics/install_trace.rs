//! Observe the collector's actual reads, without re-reading or changing acceptance.
use super::{
    install_failure::*,
    install_registry::Reader,
    model::Observation,
    registry::{self, Hive},
};
use std::cell::RefCell;
use winreg::{enums::*, RegValue};

pub(super) struct Trace<'a, R> {
    reader: &'a R,
    failures: RefCell<Vec<InstallReadFailure>>,
}

impl<'a, R: Reader> Trace<'a, R> {
    pub fn new(reader: &'a R) -> Self {
        Self {
            reader,
            failures: RefCell::new(vec![]),
        }
    }

    pub fn finish(self) -> Vec<InstallReadFailure> {
        self.failures.into_inner()
    }

    fn record(&self, failure: InstallReadFailure) {
        let mut failures = self.failures.borrow_mut();
        if failures.len() < 8 {
            failures.push(failure);
        }
    }

    fn read<T>(
        &self,
        hive: Hive,
        path: &str,
        field: (&str, bool),
        decode: impl FnOnce(Observation<RegValue>) -> Observation<T>,
    ) -> Observation<T> {
        let (name, msi_command) = field;
        let (raw, error) = self.reader.raw_detailed(hive, path, name);
        let mut failure = location(hive, name);
        failure.win32_error = error;
        if let Observation::Known(value) = &raw {
            failure.value_type = Some(value.vtype.clone() as u32);
            failure.byte_length = u32::try_from(value.bytes.len()).ok();
            failure.reason = reason(value, name, msi_command);
        }
        let result = match raw {
            Observation::Known(value) if value.bytes.len() > 32768 => Observation::Unreadable,
            value => decode(value),
        };
        if matches!(result, Observation::Unreadable) {
            self.record(failure);
        }
        result
    }
}

impl<R: Reader> Reader for Trace<'_, R> {
    fn raw(&self, hive: Hive, path: &str, name: &str) -> Observation<RegValue> {
        self.reader.raw(hive, path, name)
    }

    fn string(&self, hive: Hive, path: &str, name: &str) -> Observation<String> {
        self.read(hive, path, (name, false), |value| {
            registry::decode_string(value, name == "DisplayName")
        })
    }

    fn dword(&self, hive: Hive, path: &str, name: &str) -> Observation<u32> {
        self.read(hive, path, (name, false), registry::decode_dword)
    }

    fn msi_uninstall_string(&self, path: &str) -> Observation<String> {
        self.read(
            Hive::Machine,
            path,
            ("UninstallString", true),
            super::install_registry::decode_msi_uninstall_string,
        )
    }

    fn keys(&self, hive: Hive, path: &str) -> Result<Vec<String>, ()> {
        let (result, error) = self.reader.keys_detailed(hive, path);
        if result.is_err() {
            let mut failure = location(hive, "keys");
            failure.reason = ReadReason::EnumerationFailed;
            failure.win32_error = error;
            self.record(failure);
        }
        result
    }
}

fn reason(value: &RegValue, name: &str, msi_command: bool) -> ReadReason {
    if value.bytes.len() > 32768 {
        return ReadReason::TooLarge;
    }
    if name == "WindowsInstaller" {
        return if value.vtype == REG_DWORD {
            ReadReason::InvalidDword
        } else {
            ReadReason::WrongType
        };
    }
    if value.vtype == REG_SZ
        || ((name == "DisplayName" || msi_command) && value.vtype == REG_EXPAND_SZ)
    {
        ReadReason::InvalidString
    } else {
        ReadReason::WrongType
    }
}

fn location(hive: Hive, name: &str) -> InstallReadFailure {
    let (area, field) = match name {
        "" => (ReadArea::Marker, ReadField::DefaultValue),
        "InstallDir" => (ReadArea::Marker, ReadField::InstallDir),
        "keys" => (ReadArea::UninstallEnumeration, ReadField::Keys),
        "DisplayName" => (ReadArea::UninstallDiscovery, ReadField::DisplayName),
        "Publisher" => (ReadArea::UninstallProduct, ReadField::Publisher),
        "InstallLocation" => (ReadArea::UninstallProduct, ReadField::InstallLocation),
        "UninstallString" => (ReadArea::UninstallProduct, ReadField::UninstallString),
        "MainBinaryName" => (ReadArea::UninstallProduct, ReadField::MainBinaryName),
        "WindowsInstaller" => (ReadArea::UninstallProduct, ReadField::WindowsInstaller),
        _ => (ReadArea::UninstallProduct, ReadField::Unknown),
    };
    InstallReadFailure {
        area,
        field,
        hive: match hive {
            Hive::User => ReadHive::User,
            Hive::Machine => ReadHive::Machine,
        },
        reason: ReadReason::ReadFailed,
        value_type: None,
        byte_length: None,
        win32_error: None,
    }
}
