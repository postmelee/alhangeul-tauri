//! Internal typed IPC evidence. No file paths, raw registry text or bitmap bytes.
use super::{environment::Environment, model::*, service::Status};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Inspection {
    pub build_reference: Option<super::reference::BuildReference>,
    pub environment: Environment,
    pub install_kind: InstallKind,
    pub install_records_readable: bool,
    pub registration: [RegistrationCheck; 2],
    /// Internal SHA-256 equality token, not a user-facing registry summary.
    pub state_token: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProbeResult {
    pub probe: Probe,
    pub integrity: bool,
    pub registration_stable: bool,
    pub state_token: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FormatResult {
    pub input: CheckInput,
    pub assessment: Assessment,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SuiteResult {
    pub status: Status,
    pub inspection: Option<Inspection>,
    pub cleanup: bool,
    pub formats: Vec<FormatResult>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(
    tag = "kind",
    content = "value",
    rename_all = "kebab-case",
    deny_unknown_fields
)]
pub enum ChildResult {
    Inspection(Inspection),
    Prepared(bool),
    Probe(ProbeResult),
    Cleaned(bool),
    Suite(Box<SuiteResult>),
}

pub fn valid_token(token: &str) -> bool {
    token.len() == 64
        && token
            .bytes()
            .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
}
