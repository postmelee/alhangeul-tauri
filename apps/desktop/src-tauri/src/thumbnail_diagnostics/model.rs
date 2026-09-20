use serde::{Deserialize, Serialize};

pub const HANDLER_CLSID: &str = "{C1DCF316-0771-49DD-BFEA-C85F69B1674B}";

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(tag = "status", content = "value", rename_all = "kebab-case")]
pub enum Observation<T> {
    Known(T),
    Missing,
    Unreadable,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub enum Extension {
    #[serde(rename = ".hwp")]
    Hwp,
    #[serde(rename = ".hwpx")]
    Hwpx,
}

impl Extension {
    pub fn suffix(self) -> &'static str {
        match self {
            Self::Hwp => "hwp",
            Self::Hwpx => "hwpx",
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum RegistrationScope {
    UserOnly,
    MachineOnly,
    Ambiguous,
    Unknown,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum InstallKind {
    Nsis,
    Msi,
    Unknown,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum Finding {
    Ready,
    DiagnosticInvalid,
    OtherHandlerSelected,
    RegistrationAmbiguous,
    RegistrationMismatch,
    ReferenceMismatch,
    DisplayPolicyRestricted,
    ShellControlFailed,
    UnclassifiedFailure,
    PerUserShellActivationFailed,
    ThumbnailApiOk,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum Action {
    None,
    CheckDiagnostics,
    CheckShellEnvironment,
    Investigate,
    ConsiderMsi,
    CheckInstallHistory,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RegistrationCheck {
    pub ready: bool,
    pub reference_matched: bool,
    pub scope: RegistrationScope,
    pub finding: Finding,
}

/// API evidence only: never exception text, paths, SID, or bitmap contents.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Probe {
    pub schema_version: u32,
    pub mode: String,
    pub phase: String,
    pub status: String,
    pub hresult: String,
    pub apartment: String,
    pub elapsed_ms: i64,
    pub bitmap_present: Option<bool>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub request_flags: Option<u32>,
    pub cache_flags: Option<u32>,
    pub resolved_handler: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Record {
    #[serde(rename = "Label")]
    pub label: String,
    #[serde(rename = "Result")]
    pub result: Probe,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CheckInput {
    pub extension: Extension,
    pub registration: RegistrationCheck,
    pub install_kind: InstallKind,
    pub integrity: bool,
    pub cleanup: bool,
    pub registration_stable: bool,
    pub probes: Vec<Record>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Assessment {
    pub finding: Finding,
    pub recommended_action: Action,
    pub evidence_valid: bool,
    pub thumbnail_passed: bool,
}

impl Assessment {
    pub fn invalid(finding: Finding) -> Self {
        Self {
            finding,
            recommended_action: Action::CheckDiagnostics,
            evidence_valid: false,
            thumbnail_passed: false,
        }
    }
}
