use super::scratch_manifest::Slot;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub const CHILD_FLAG: &str = "--alhangeul-thumbnail-diagnostic-child";
pub const MAX_REQUEST_BYTES: usize = 16 * 1024;
pub const MAX_RESULT_BYTES: usize = 256 * 1024;
pub const STATE_TIMEOUT_SECONDS: u64 = 15;
pub const PROBE_TIMEOUT_SECONDS: u64 = 30;
pub const SUITE_TIMEOUT_SECONDS: u64 = 180;
pub const CLEANUP_TIMEOUT_SECONDS: u64 = 5;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum Operation {
    Inspect,
    Prepare,
    Cleanup,
    Association,
    Shell,
    CacheOnly,
    ForceExtract,
    Activate,
    Suite,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum FixtureId {
    Hwp,
    Hwpx,
    Jpg,
}

/// No caller-supplied path, URL, executable, or arbitrary CLSID.
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Request {
    pub schema_version: u32,
    pub request_id: Uuid,
    pub operation: Operation,
    pub fixture_id: Option<FixtureId>,
    pub consent: bool,
    /// Internal generated scope ID and fixed copy slot, never a caller path.
    #[serde(default)]
    pub scope_id: Option<Uuid>,
    #[serde(default)]
    pub slot: Option<Slot>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RequestError {
    Size,
    Schema,
    Consent,
    RecursiveSuite,
    Fixture,
    Scope,
}

pub fn decode_request(bytes: &[u8], nested: bool) -> Result<Request, RequestError> {
    if bytes.is_empty() || bytes.len() > MAX_REQUEST_BYTES {
        return Err(RequestError::Size);
    }
    let request: Request = serde_json::from_slice(bytes).map_err(|_| RequestError::Schema)?;
    validate_request(&request, nested)?;
    Ok(request)
}

pub fn validate_request(request: &Request, nested: bool) -> Result<(), RequestError> {
    if request.schema_version != 1 || request.request_id.is_nil() {
        return Err(RequestError::Schema);
    }
    if nested && request.operation == Operation::Suite {
        return Err(RequestError::RecursiveSuite);
    }
    let active = !matches!(
        request.operation,
        Operation::Inspect | Operation::Association
    );
    if active && !request.consent {
        return Err(RequestError::Consent);
    }
    let needs_fixture = matches!(
        request.operation,
        Operation::Association
            | Operation::Shell
            | Operation::CacheOnly
            | Operation::ForceExtract
            | Operation::Activate
    );
    if needs_fixture != request.fixture_id.is_some()
        || (matches!(
            request.operation,
            Operation::Association | Operation::Activate
        ) && request.fixture_id == Some(FixtureId::Jpg))
    {
        return Err(RequestError::Fixture);
    }
    validate_scope(request)
}

fn validate_scope(request: &Request) -> Result<(), RequestError> {
    let image = matches!(
        request.operation,
        Operation::Shell | Operation::CacheOnly | Operation::ForceExtract
    );
    let needs_scope = image || matches!(request.operation, Operation::Prepare | Operation::Cleanup);
    if needs_scope != request.scope_id.is_some() || request.scope_id.is_some_and(|id| id.is_nil()) {
        return Err(RequestError::Scope);
    }
    if image != request.slot.is_some()
        || request.slot.is_some_and(|slot| {
            Some(slot.fixture()) != request.fixture_id || !slot.permits(request.operation)
        })
    {
        return Err(RequestError::Fixture);
    }
    Ok(())
}
