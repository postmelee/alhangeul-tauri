//! Closed diagnostic vocabulary: no registry paths, value text or exception messages.
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InstallReadFailure {
    pub area: ReadArea,
    pub hive: ReadHive,
    pub field: ReadField,
    pub reason: ReadReason,
    pub value_type: Option<u32>,
    pub byte_length: Option<u32>,
    pub win32_error: Option<i32>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ReadArea {
    Marker,
    UninstallEnumeration,
    UninstallDiscovery,
    UninstallProduct,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ReadHive {
    User,
    Machine,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ReadField {
    DefaultValue,
    InstallDir,
    Keys,
    DisplayName,
    Publisher,
    InstallLocation,
    UninstallString,
    MainBinaryName,
    WindowsInstaller,
    Unknown,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ReadReason {
    ReadFailed,
    EnumerationFailed,
    TooLarge,
    WrongType,
    InvalidString,
    InvalidDword,
}
