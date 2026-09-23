//! Exact local image paths for CI evidence, never serialized or logged.
use crate::local_file;
use std::{
    ffi::OsString,
    os::windows::ffi::OsStringExt,
    path::{Path, PathBuf},
};

// Test-only Win32 import: no product dependency/feature change is needed.
#[link(name = "kernel32")]
extern "system" {
    fn GetSystemDirectoryW(buffer: *mut u16, size: u32) -> u32;
}

pub struct Images {
    application: Option<PathBuf>,
    console: Option<PathBuf>,
}

impl Images {
    pub fn new(application: &Path) -> Self {
        Self {
            application: local_file::local_path(application).ok(),
            console: system_console().and_then(|path| local_file::local_path(&path).ok()),
        }
    }

    pub fn identify(&self, actual: &Path) -> (bool, bool) {
        let Ok(actual) = local_file::local_path(actual) else {
            return (false, false);
        };
        let matches = |expected: &Option<PathBuf>| {
            expected
                .as_ref()
                .is_some_and(|expected| local_file::same_path(expected, &actual))
        };
        (matches(&self.application), matches(&self.console))
    }
}

fn system_console() -> Option<PathBuf> {
    let mut buffer = [0u16; 32768];
    // Use the OS API, not an inherited SystemRoot/PATH environment variable.
    let length = unsafe { GetSystemDirectoryW(buffer.as_mut_ptr(), buffer.len() as u32) } as usize;
    if length == 0 || length >= buffer.len() {
        return None;
    }
    Some(PathBuf::from(OsString::from_wide(&buffer[..length])).join("conhost.exe"))
}

#[test]
fn system_console_path_is_resolved_by_the_os() {
    let executable = std::env::current_exe().unwrap();
    let images = Images::new(&executable);
    let console = system_console().expect("system directory must be available on Windows CI");
    assert_eq!(images.identify(&console), (false, true));
}

#[test]
fn missing_or_same_named_images_outside_system_directory_are_rejected() {
    let temp = tempfile::tempdir().unwrap();
    let application = temp.path().join("Alhangeul.exe");
    let impostor = temp.path().join("conhost.exe");
    std::fs::write(&application, b"test-only identity").unwrap();
    std::fs::write(&impostor, b"test-only identity").unwrap();
    let images = Images::new(&application);
    assert_eq!(images.identify(&application), (true, false));
    assert_eq!(images.identify(&impostor), (false, false));
    assert_eq!(
        images.identify(&temp.path().join("missing.exe")),
        (false, false)
    );
    let absent = Images {
        application: None,
        console: None,
    };
    assert_eq!(absent.identify(&application), (false, false));
}
