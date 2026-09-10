//! Bounded reply contract, shared by the native parent and headless child.
use super::protocol::{Operation, Request, MAX_RESULT_BYTES};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Reply<T> {
    pub schema_version: u32,
    pub request_id: Uuid,
    pub operation: Operation,
    pub result: T,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TransportError {
    Size,
    Invalid,
    Identity,
    Exit,
    Cancelled,
    TimedOut,
    Cleanup,
}

impl TransportError {
    pub fn status(self) -> super::service::Status {
        match self {
            Self::Cancelled => super::service::Status::Cancelled,
            Self::TimedOut => super::service::Status::TimedOut,
            _ => super::service::Status::Failed,
        }
    }
}

pub fn decode<T: DeserializeOwned>(
    bytes: &[u8],
    request: &Request,
    exit_code: u32,
) -> Result<T, TransportError> {
    if exit_code != 0 {
        return Err(TransportError::Exit);
    }
    if bytes.is_empty() || bytes.len() > MAX_RESULT_BYTES {
        return Err(TransportError::Size);
    }
    let reply: Reply<T> = serde_json::from_slice(bytes).map_err(|_| TransportError::Invalid)?;
    if reply.schema_version != 1
        || reply.request_id != request.request_id
        || reply.operation != request.operation
    {
        return Err(TransportError::Identity);
    }
    Ok(reply.result)
}

pub fn encode<T: Serialize>(request: &Request, result: T) -> Result<Vec<u8>, TransportError> {
    let bytes = serde_json::to_vec(&Reply {
        schema_version: 1,
        request_id: request.request_id,
        operation: request.operation,
        result,
    })
    .map_err(|_| TransportError::Invalid)?;
    if bytes.len() > MAX_RESULT_BYTES {
        return Err(TransportError::Size);
    }
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn interrupted_or_unreclaimed_execution_cannot_be_a_completed_diagnosis() {
        use super::super::service::Status;
        assert_eq!(TransportError::Cancelled.status(), Status::Cancelled);
        assert_eq!(TransportError::TimedOut.status(), Status::TimedOut);
        assert_eq!(TransportError::Cleanup.status(), Status::Failed);
        assert_eq!(TransportError::Invalid.status(), Status::Failed);
    }

    fn request() -> Request {
        serde_json::from_value(serde_json::json!({ "schemaVersion": 1,
            "requestId": Uuid::new_v4(), "operation": "inspect",
            "fixtureId": null, "consent": false }))
        .unwrap()
    }

    #[test]
    fn reply_requires_one_exact_schema_request_operation_and_successful_exit() {
        let request = request();
        let bytes = encode(&request, true).unwrap();
        assert!(decode::<bool>(&bytes, &request, 0).unwrap());
        assert_eq!(
            decode::<bool>(&bytes, &request, 1),
            Err(TransportError::Exit)
        );
        let mut different = request.clone();
        different.request_id = Uuid::new_v4();
        assert_eq!(
            decode::<bool>(&bytes, &different, 0),
            Err(TransportError::Identity)
        );
        different = request.clone();
        different.operation = Operation::Suite;
        assert_eq!(
            decode::<bool>(&bytes, &different, 0),
            Err(TransportError::Identity)
        );
        let duplicate = [bytes.clone(), bytes].concat();
        assert_eq!(
            decode::<bool>(&duplicate, &request, 0),
            Err(TransportError::Invalid)
        );
    }

    #[test]
    fn malformed_duplicate_unknown_and_oversized_replies_fail_closed() {
        let request = request();
        let bytes = encode(&request, true).unwrap();
        let text = String::from_utf8(bytes).unwrap();
        for extra in ["\"schemaVersion\":1,", "\"path\":\"private\","] {
            let invalid = text.replacen('{', &format!("{{{extra}"), 1);
            assert_eq!(
                decode::<bool>(invalid.as_bytes(), &request, 0),
                Err(TransportError::Invalid)
            );
        }
        assert_eq!(
            decode::<bool>(&vec![b' '; MAX_RESULT_BYTES + 1], &request, 0),
            Err(TransportError::Size)
        );
        assert_eq!(
            decode::<bool>(b"{", &request, 0),
            Err(TransportError::Invalid)
        );
    }
}
