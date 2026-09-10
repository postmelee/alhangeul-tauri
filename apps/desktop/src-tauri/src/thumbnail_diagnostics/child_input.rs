use super::protocol::{self, Request, RequestError};
use std::io::Read;

pub fn read(reader: impl Read) -> Result<Request, RequestError> {
    let mut bytes = Vec::new();
    reader
        .take(protocol::MAX_REQUEST_BYTES as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| RequestError::Schema)?;
    protocol::decode_request(&bytes, false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bounded_input_rejects_trailing_duplicate_oversized_and_private_fields() {
        let json = br#"{"schemaVersion":1,"requestId":"cdddc775-bae2-4993-ae74-a4e5dc3218ed","operation":"inspect","fixtureId":null,"consent":false}"#;
        assert!(read(&json[..]).is_ok());
        assert!(read([&json[..], &json[..]].concat().as_slice()).is_err());
        for extra in ["\"consent\":false,", "\"path\":\"secret.hwp\","] {
            let invalid = String::from_utf8_lossy(json).replacen('{', &format!("{{{extra}"), 1);
            assert!(read(invalid.as_bytes()).is_err());
        }
        assert!(matches!(
            read(std::io::repeat(b' ')),
            Err(RequestError::Size)
        ));
    }
}
