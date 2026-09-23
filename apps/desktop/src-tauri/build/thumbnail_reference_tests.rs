use super::*;

fn staged() -> tempfile::TempDir {
    let directory = tempfile::tempdir().unwrap();
    let files = BINARIES.map(|name| {
        let bytes = format!("synthetic {name}").into_bytes();
        fs::write(directory.path().join(name), &bytes).unwrap();
        reference::BinaryIdentity {
            name: name.into(),
            bytes: bytes.len() as u64,
            sha256: format!("{:x}", Sha256::digest(&bytes)),
        }
    });
    let reference = reference::BuildReference {
        schema_version: 1,
        source_sha: "a".repeat(40),
        product_version: "0.1.0".into(),
        files,
    };
    fs::write(
        directory.path().join(NAME),
        serde_json::to_vec(&reference).unwrap(),
    )
    .unwrap();
    directory
}

#[test]
fn build_reference_matches_exact_source_version_and_disk_bytes() {
    let directory = staged();
    assert!(validate(directory.path(), &"a".repeat(40), "0.1.0").is_ok());
    assert!(validate(directory.path(), &"b".repeat(40), "0.1.0").is_err());
    assert!(validate(directory.path(), &"a".repeat(40), "0.2.0").is_err());
    fs::write(directory.path().join(BINARIES[1]), b"changed").unwrap();
    assert!(validate(directory.path(), &"a".repeat(40), "0.1.0").is_err());
}

#[test]
fn build_reference_rejects_missing_oversized_and_duplicate_fields() {
    let directory = staged();
    let path = directory.path().join(NAME);
    let original = fs::read_to_string(&path).unwrap();
    let duplicate = original.replacen('{', "{\"schemaVersion\":1,", 1);
    fs::write(&path, duplicate).unwrap();
    assert!(validate(directory.path(), &"a".repeat(40), "0.1.0").is_err());
    fs::write(&path, vec![b' '; 4097]).unwrap();
    assert!(validate(directory.path(), &"a".repeat(40), "0.1.0").is_err());
    fs::remove_file(path).unwrap();
    assert!(validate(directory.path(), &"a".repeat(40), "0.1.0").is_err());
}

#[cfg(target_os = "linux")]
#[test]
fn build_reference_rejects_symlinked_payload() {
    let directory = staged();
    let path = directory.path().join(BINARIES[0]);
    fs::rename(&path, directory.path().join("real.dll")).unwrap();
    std::os::unix::fs::symlink(directory.path().join("real.dll"), path).unwrap();
    assert!(validate(directory.path(), &"a".repeat(40), "0.1.0").is_err());
}
