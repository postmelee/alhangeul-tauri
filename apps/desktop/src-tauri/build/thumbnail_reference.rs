use sha2::{Digest, Sha256};
#[cfg(not(test))]
use std::{env, process::Command};
use std::{fs, path::Path};

const NAME: &str = "thumbnail-diagnostic-reference.json";
const BINARIES: [&str; 2] = [
    "AlhangeulThumbnailHandler.dll",
    "AlhangeulThumbnailWorker.exe",
];

#[cfg(not(test))]
#[path = "../src/thumbnail_diagnostics/reference.rs"]
mod reference;
#[cfg(test)]
use super::reference;

#[cfg(not(test))]
pub fn prepare() {
    println!("cargo:rerun-if-changed=build/thumbnail_reference.rs");
    println!("cargo:rerun-if-changed=src/thumbnail_diagnostics/reference.rs");
    if env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }
    let output = std::path::PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR missing"));
    let staging = Path::new("windows/thumbnail-resources");
    for name in [NAME, BINARIES[0], BINARIES[1]] {
        println!("cargo:rerun-if-changed={}", staging.join(name).display());
    }
    watch_git();
    let reference = git(&["rev-parse", "HEAD"]).and_then(|source| {
        validate(
            staging,
            &source,
            &env::var("CARGO_PKG_VERSION").map_err(|_| ())?,
        )
    });
    let encoded = match reference {
        Ok(encoded) => encoded,
        Err(()) if env::var("PROFILE").as_deref() == Ok("debug") => {
            println!("cargo:warning=Thumbnail diagnostic reference unavailable; debug diagnosis is unverified");
            "null".to_string()
        }
        Err(()) => panic!("Windows thumbnail diagnostic reference is missing, stale, or invalid"),
    };
    fs::write(output.join(NAME), encoded).expect("Cannot stage diagnostic reference");
}

#[cfg(not(test))]
fn git(args: &[&str]) -> Result<String, ()> {
    let output = Command::new("git").args(args).output().map_err(|_| ())?;
    if !output.status.success() {
        return Err(());
    }
    String::from_utf8(output.stdout)
        .map(|s| s.trim().to_owned())
        .map_err(|_| ())
}

#[cfg(not(test))]
fn watch_git() {
    for args in [
        vec!["rev-parse", "--absolute-git-dir"],
        vec!["rev-parse", "--path-format=absolute", "--git-common-dir"],
    ] {
        if let Ok(directory) = git(&args) {
            // Watch refs as well as HEAD in linked worktrees; changing only a
            // source commit must not retain a previously compiled identity.
            println!("cargo:rerun-if-changed={directory}");
        }
    }
}

fn validate(staging: &Path, source: &str, version: &str) -> Result<String, ()> {
    let encoded = bounded_file(&staging.join(NAME), 4096)?;
    let mut actual = Vec::new();
    for name in BINARIES {
        let bytes = bounded_file(&staging.join(name), 128 * 1024 * 1024)?;
        actual.push(reference::BinaryIdentity {
            name: name.into(),
            bytes: bytes.len() as u64,
            sha256: format!("{:x}", Sha256::digest(&bytes)),
        });
    }
    reference::verify(
        &encoded,
        source,
        version,
        &actual.try_into().map_err(|_| ())?,
    )
    .map_err(|_| ())?;
    String::from_utf8(encoded).map_err(|_| ())
}

fn bounded_file(path: &Path, limit: u64) -> Result<Vec<u8>, ()> {
    use std::io::Read;
    let metadata = fs::symlink_metadata(path).map_err(|_| ())?;
    if !metadata.is_file()
        || metadata.file_type().is_symlink()
        || metadata.len() == 0
        || metadata.len() > limit
    {
        return Err(());
    }
    let mut bytes = Vec::new();
    fs::File::open(path)
        .map_err(|_| ())?
        .take(limit + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| ())?;
    if bytes.len() as u64 != metadata.len() {
        return Err(());
    }
    Ok(bytes)
}

#[cfg(test)]
#[path = "thumbnail_reference_tests.rs"]
mod tests;
