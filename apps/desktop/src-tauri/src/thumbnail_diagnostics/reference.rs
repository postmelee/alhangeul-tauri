use serde::{Deserialize, Serialize};

pub const MAX_REFERENCE_BYTES: usize = 4096;
const MAX_BINARY_BYTES: u64 = 128 * 1024 * 1024;
const FILE_NAMES: [&str; 2] = [
    "AlhangeulThumbnailHandler.dll",
    "AlhangeulThumbnailWorker.exe",
];

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BinaryIdentity {
    pub name: String,
    pub bytes: u64,
    pub sha256: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BuildReference {
    pub schema_version: u32,
    pub source_sha: String,
    pub product_version: String,
    pub files: [BinaryIdentity; 2],
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ReferenceError {
    Invalid,
    SourceMismatch,
    VersionMismatch,
    BinaryMismatch,
}

fn lower_hex(value: &str, length: usize) -> bool {
    value.len() == length
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

pub fn parse(bytes: &[u8]) -> Result<BuildReference, ReferenceError> {
    if bytes.is_empty() || bytes.len() > MAX_REFERENCE_BYTES {
        return Err(ReferenceError::Invalid);
    }
    let reference: BuildReference =
        serde_json::from_slice(bytes).map_err(|_| ReferenceError::Invalid)?;
    let parts: Vec<_> = reference.product_version.split('.').collect();
    if reference.schema_version != 1
        || !lower_hex(&reference.source_sha, 40)
        || parts.len() != 3
        || parts
            .iter()
            .any(|part| part.is_empty() || !part.bytes().all(|b| b.is_ascii_digit()))
    {
        return Err(ReferenceError::Invalid);
    }
    for (index, identity) in reference.files.iter().enumerate() {
        if identity.name != FILE_NAMES[index]
            || !(1..=MAX_BINARY_BYTES).contains(&identity.bytes)
            || !lower_hex(&identity.sha256, 64)
        {
            return Err(ReferenceError::Invalid);
        }
    }
    Ok(reference)
}

/// Actual identities must come from the bounded, read-only native collector,
/// not WebView input. This pure comparison never loads either binary.
pub fn verify(
    encoded: &[u8],
    source_sha: &str,
    product_version: &str,
    actual: &[BinaryIdentity; 2],
) -> Result<BuildReference, ReferenceError> {
    let reference = parse(encoded)?;
    if reference.source_sha != source_sha {
        return Err(ReferenceError::SourceMismatch);
    }
    if reference.product_version != product_version {
        return Err(ReferenceError::VersionMismatch);
    }
    if &reference.files != actual {
        return Err(ReferenceError::BinaryMismatch);
    }
    Ok(reference)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn reference() -> BuildReference {
        BuildReference {
            schema_version: 1,
            source_sha: "a".repeat(40),
            product_version: "0.1.0".into(),
            files: FILE_NAMES.map(|name| BinaryIdentity {
                name: name.into(),
                bytes: 20,
                sha256: "b".repeat(64),
            }),
        }
    }

    #[test]
    fn exact_build_and_bytes_must_match() {
        let reference = reference();
        let encoded = serde_json::to_vec(&reference).unwrap();
        assert_eq!(
            verify(&encoded, &reference.source_sha, "0.1.0", &reference.files),
            Ok(reference.clone())
        );
        assert_eq!(
            verify(&encoded, &"c".repeat(40), "0.1.0", &reference.files),
            Err(ReferenceError::SourceMismatch)
        );
        assert_eq!(
            verify(&encoded, &reference.source_sha, "0.2.0", &reference.files),
            Err(ReferenceError::VersionMismatch)
        );
        let mut actual = reference.files.clone();
        actual[1].sha256 = "c".repeat(64);
        assert_eq!(
            verify(&encoded, &reference.source_sha, "0.1.0", &actual),
            Err(ReferenceError::BinaryMismatch)
        );
    }

    #[test]
    fn malformed_unknown_duplicate_and_oversized_references_are_rejected() {
        assert_eq!(
            parse(&vec![b' '; MAX_REFERENCE_BYTES + 1]),
            Err(ReferenceError::Invalid)
        );
        assert_eq!(parse(b"{}"), Err(ReferenceError::Invalid));
        let mut raw = serde_json::to_value(reference()).unwrap();
        raw["files"][1]["name"] = serde_json::json!(FILE_NAMES[0]);
        assert_eq!(
            parse(&serde_json::to_vec(&raw).unwrap()),
            Err(ReferenceError::Invalid)
        );
        raw = serde_json::to_value(reference()).unwrap();
        raw["extra"] = serde_json::json!("not accepted");
        assert_eq!(
            parse(&serde_json::to_vec(&raw).unwrap()),
            Err(ReferenceError::Invalid)
        );
    }
}
