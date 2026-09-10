//! No registry-supplied path is opened before local/non-reparse validation.
use super::reference::BinaryIdentity;
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File, OpenOptions},
    io::Read,
    os::windows::{
        ffi::OsStringExt,
        fs::{MetadataExt, OpenOptionsExt},
        io::AsRawHandle,
    },
    path::{Component, Path, PathBuf, Prefix},
};
use windows::{
    core::PCWSTR,
    Win32::{Foundation::HANDLE, Storage::FileSystem::*},
};

pub fn local_path(path: &Path) -> Result<PathBuf, ()> {
    if !path.is_absolute() {
        return Err(());
    }
    let drive = match path.components().next() {
        Some(Component::Prefix(prefix)) => match prefix.kind() {
            Prefix::Disk(drive) | Prefix::VerbatimDisk(drive) => drive,
            _ => return Err(()),
        },
        _ => return Err(()),
    };
    let root = [drive as u16, b':' as u16, b'\\' as u16, 0];
    // SAFETY: terminated drive-root string; DRIVE_FIXED is defined as 3 by Win32.
    if unsafe { GetDriveTypeW(PCWSTR(root.as_ptr())) } != 3 {
        return Err(());
    }
    if path
        .components()
        .any(|part| matches!(part, Component::ParentDir | Component::CurDir))
    {
        return Err(());
    }
    for ancestor in path.ancestors() {
        let metadata = fs::symlink_metadata(ancestor).map_err(|_| ())?;
        if metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT.0 != 0 {
            return Err(());
        }
    }
    fs::canonicalize(path).map_err(|_| ())
}

pub fn open(path: &Path, limit: u64) -> Result<File, ()> {
    local_path(path)?;
    let file = OpenOptions::new()
        .read(true)
        .share_mode(FILE_SHARE_READ.0)
        .custom_flags(FILE_FLAG_OPEN_REPARSE_POINT.0)
        .open(path)
        .map_err(|_| ())?;
    verify_handle(path, &file, limit)?;
    Ok(file)
}

pub fn verify_handle(path: &Path, file: &File, limit: u64) -> Result<(), ()> {
    let metadata = file.metadata().map_err(|_| ())?;
    if !metadata.is_file()
        || metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT.0 != 0
        || !(1..=limit).contains(&metadata.len())
    {
        return Err(());
    }
    verify_location(path, file)
}

pub fn verify_directory(path: &Path, file: &File) -> Result<(), ()> {
    let metadata = file.metadata().map_err(|_| ())?;
    if !metadata.is_dir() || metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT.0 != 0 {
        return Err(());
    }
    verify_location(path, file)
}

fn verify_location(path: &Path, file: &File) -> Result<(), ()> {
    let expected = local_path(path)?;
    let mut buffer = [0u16; 32768];
    // SAFETY: File keeps its handle alive, and the API receives the full output slice.
    let length = unsafe {
        GetFinalPathNameByHandleW(
            HANDLE(file.as_raw_handle()),
            &mut buffer,
            GETFINALPATHNAMEBYHANDLE_FLAGS(FILE_NAME_NORMALIZED.0 | VOLUME_NAME_DOS.0),
        )
    } as usize;
    if length == 0 || length >= buffer.len() {
        return Err(());
    }
    let actual = PathBuf::from(std::ffi::OsString::from_wide(&buffer[..length]));
    if !same_path(&actual, &expected) || local_path(path)? != expected {
        return Err(());
    }
    Ok(())
}

pub fn identity(root: &Path, name: &str) -> Result<BinaryIdentity, ()> {
    if ![
        "AlhangeulThumbnailHandler.dll",
        "AlhangeulThumbnailWorker.exe",
    ]
    .contains(&name)
    {
        return Err(());
    }
    let mut file = open(&root.join(name), 128 * 1024 * 1024)?;
    let size = file.metadata().map_err(|_| ())?.len();
    let mut hash = Sha256::new();
    let mut count = 0u64;
    let mut buffer = [0u8; 65536];
    loop {
        let length = file.read(&mut buffer).map_err(|_| ())?;
        if length == 0 {
            break;
        }
        count += length as u64;
        if count > size {
            return Err(());
        }
        hash.update(&buffer[..length]);
    }
    if count != size {
        return Err(());
    }
    Ok(BinaryIdentity {
        name: name.into(),
        bytes: size,
        sha256: format!("{:x}", hash.finalize()),
    })
}

pub fn same_path(left: &Path, right: &Path) -> bool {
    fn normalized(path: &Path) -> Option<String> {
        // Reject non-Unicode rather than comparing lossy replacement characters.
        let value = path.to_str()?.replace('/', "\\");
        Some(
            value
                .strip_prefix(r"\\?\")
                .unwrap_or(&value)
                .trim_end_matches('\\')
                .to_owned(),
        )
    }
    match (normalized(left), normalized(right)) {
        (Some(left), Some(right)) => left.eq_ignore_ascii_case(&right),
        _ => false,
    }
}
