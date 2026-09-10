//! File primitives for Windows; Linux implementations exist for unit tests only.
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File, OpenOptions},
    io::{Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
};

pub fn checked_path(path: &Path) -> Result<PathBuf, ()> {
    #[cfg(windows)]
    {
        super::local_file::local_path(path)
    }
    #[cfg(all(test, not(windows)))]
    {
        if !path.is_absolute() {
            return Err(());
        }
        for ancestor in path.ancestors() {
            if fs::symlink_metadata(ancestor)
                .map_err(|_| ())?
                .file_type()
                .is_symlink()
            {
                return Err(());
            }
        }
        fs::canonicalize(path).map_err(|_| ())
    }
}

pub fn open(path: &Path, limit: usize) -> Result<File, ()> {
    #[cfg(windows)]
    {
        super::local_file::open(path, limit as u64)
    }
    #[cfg(all(test, not(windows)))]
    {
        checked_path(path)?;
        let file = File::open(path).map_err(|_| ())?;
        let metadata = file.metadata().map_err(|_| ())?;
        if !metadata.is_file() || !(1..=limit as u64).contains(&metadata.len()) {
            return Err(());
        }
        Ok(file)
    }
}

pub fn hold_directory(path: &Path) -> Result<File, ()> {
    checked_path(path)?;
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        use windows::Win32::Storage::FileSystem::*;
        let file = OpenOptions::new()
            .access_mode(FILE_READ_ATTRIBUTES.0)
            .share_mode(FILE_SHARE_READ.0 | FILE_SHARE_WRITE.0)
            .custom_flags(FILE_FLAG_BACKUP_SEMANTICS.0 | FILE_FLAG_OPEN_REPARSE_POINT.0)
            .open(path)
            .map_err(|_| ())?;
        super::local_file::verify_directory(path, &file)?;
        Ok(file)
    }
    #[cfg(all(test, not(windows)))]
    {
        File::open(path).map_err(|_| ())
    }
}

pub fn create(path: &Path, bytes: &[u8]) -> Result<(), ()> {
    checked_path(path.parent().ok_or(())?)?;
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        options
            .share_mode(0)
            .custom_flags(windows::Win32::Storage::FileSystem::FILE_FLAG_OPEN_REPARSE_POINT.0);
    }
    let mut file = options.open(path).map_err(|_| ())?;
    file.write_all(bytes)
        .and_then(|_| file.flush())
        .map_err(|_| ())
}

pub fn bytes(file: &mut File, limit: usize) -> Result<Vec<u8>, ()> {
    file.seek(SeekFrom::Start(0)).map_err(|_| ())?;
    let mut output = Vec::new();
    file.take(limit as u64 + 1)
        .read_to_end(&mut output)
        .map_err(|_| ())?;
    if output.is_empty() || output.len() > limit {
        return Err(());
    }
    Ok(output)
}

pub fn digest(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

pub fn regular(path: &Path) -> bool {
    let Ok(metadata) = fs::symlink_metadata(path) else {
        return false;
    };
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes()
            & windows::Win32::Storage::FileSystem::FILE_ATTRIBUTE_REPARSE_POINT.0
            != 0
        {
            return false;
        }
    }
    metadata.is_file() && !metadata.file_type().is_symlink()
}
