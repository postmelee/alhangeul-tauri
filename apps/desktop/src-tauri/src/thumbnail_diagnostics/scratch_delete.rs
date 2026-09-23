use super::scratch_io as io;
use std::{
    fs::{self, File},
    path::{Path, PathBuf},
};

/// Opening all these guards precedes deleting any file. On Windows the handles
/// deny concurrent writes/rename/delete, and deletion targets the verified handle.
pub struct DeleteGuard {
    file: File,
    path: PathBuf,
}

impl DeleteGuard {
    pub fn open(path: &Path, length: usize, digest: &str) -> Result<Self, ()> {
        io::checked_path(path)?;
        #[cfg(windows)]
        let mut file = {
            use std::{fs::OpenOptions, os::windows::fs::OpenOptionsExt};
            use windows::Win32::{Foundation::GENERIC_READ, Storage::FileSystem::*};
            let file = OpenOptions::new()
                .access_mode(GENERIC_READ.0 | DELETE.0)
                .share_mode(FILE_SHARE_READ.0)
                .custom_flags(FILE_FLAG_OPEN_REPARSE_POINT.0)
                .open(path)
                .map_err(|_| ())?;
            super::local_file::verify_handle(path, &file, length as u64)?;
            file
        };
        #[cfg(all(test, not(windows)))]
        let mut file = io::open(path, length)?;
        let bytes = io::bytes(&mut file, length)?;
        if bytes.len() != length || io::digest(&bytes) != digest {
            return Err(());
        }
        Ok(Self {
            file,
            path: path.to_path_buf(),
        })
    }

    pub fn delete(self) -> bool {
        #[cfg(windows)]
        {
            use std::os::windows::io::AsRawHandle;
            use windows::Win32::{Foundation::HANDLE, Storage::FileSystem::*};
            let disposition = FILE_DISPOSITION_INFO { DeleteFile: true };
            let result = unsafe {
                SetFileInformationByHandle(
                    HANDLE(self.file.as_raw_handle()),
                    FileDispositionInfo,
                    (&disposition as *const FILE_DISPOSITION_INFO).cast(),
                    std::mem::size_of_val(&disposition) as u32,
                )
            };
            if result.is_err() {
                return false;
            }
            drop(self.file);
        }
        #[cfg(all(test, not(windows)))]
        {
            drop(self.file);
            if !io::regular(&self.path) || fs::remove_file(&self.path).is_err() {
                return false;
            }
        }
        matches!(fs::symlink_metadata(self.path), Err(error) if error.kind() == std::io::ErrorKind::NotFound)
    }
}
