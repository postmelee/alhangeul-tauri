use std::{env, fs, path::Path};
use tauri_winres::{VersionInfo, WindowsResource};

pub fn embed(description: &str, filename: &str, file_type: u64) {
    if env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }
    let directory = env::var("CARGO_MANIFEST_DIR").expect("crate directory");
    let manifest = Path::new(&directory).join("../desktop/src-tauri/Cargo.toml");
    println!("cargo:rerun-if-changed={}", manifest.display());
    println!("cargo:rerun-if-changed=../../build-support/windows-version.rs");
    let source = fs::read_to_string(manifest).expect("read product manifest");
    let mut in_package = false;
    let version = source
        .lines()
        .find_map(|line| {
            let line = line.trim();
            if line.starts_with('[') {
                in_package = line == "[package]";
            }
            if in_package {
                line.strip_prefix("version = \"")
                    .and_then(|s| s.strip_suffix('"'))
            } else {
                None
            }
        })
        .expect("product package version");
    let parts: Vec<u16> = version
        .split('.')
        .map(|part| part.parse().expect("stable numeric version"))
        .collect();
    assert_eq!(parts.len(), 3, "product version must have three components");
    let packed =
        (u64::from(parts[0]) << 48) | (u64::from(parts[1]) << 32) | (u64::from(parts[2]) << 16);
    WindowsResource::new()
        .set("ProductName", "Alhangeul")
        .set("CompanyName", "postmelee")
        .set("FileDescription", description)
        .set("OriginalFilename", filename)
        .set("LegalCopyright", "Alhangeul contributors")
        .set("ProductVersion", version)
        .set("FileVersion", version)
        .set_version_info(VersionInfo::PRODUCTVERSION, packed)
        .set_version_info(VersionInfo::FILEVERSION, packed)
        .set_version_info(VersionInfo::FILETYPE, file_type)
        .compile()
        .expect("compile Alhangeul Windows version resource");
}
