use alhangeul_document_preview::limits::checked_bgra_len;
use image::codecs::png::PngDecoder;
use image::{ColorType, ImageDecoder};
use std::fs::{self, File, OpenOptions};
use std::io::{BufReader, Write};
use std::os::unix::fs::{MetadataExt, OpenOptionsExt};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

static TEMP_SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OutputError {
    Temporary,
    InvalidPng,
    Commit,
}

pub struct PendingOutput {
    path: PathBuf,
    precreated: Option<OutputIdentity>,
    committed: bool,
}

#[derive(Clone, Copy)]
struct OutputIdentity {
    device: u64,
    inode: u64,
}

impl PendingOutput {
    pub fn new(final_path: &Path) -> Result<Self, OutputError> {
        let parent = final_path.parent().ok_or(OutputError::Temporary)?;
        let precreated = precreated_identity(final_path)?;
        for _ in 0..128 {
            let sequence = TEMP_SEQUENCE.fetch_add(1, Ordering::Relaxed);
            let name = format!(".alhangeul-thumbnail-{}-{sequence}.tmp", std::process::id());
            let path = parent.join(name);
            match fs::symlink_metadata(&path) {
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                    return Ok(Self {
                        path,
                        precreated,
                        committed: false,
                    });
                }
                Ok(_) => continue,
                Err(_) => return Err(OutputError::Temporary),
            }
        }
        Err(OutputError::Temporary)
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn commit(&mut self, final_path: &Path, edge: u32) -> Result<(), OutputError> {
        if self.path.parent() != final_path.parent() {
            return Err(OutputError::Commit);
        }
        validate_png(&self.path, edge)?;
        if let Some(identity) = self.precreated {
            commit_precreated(&self.path, final_path, identity)?;
        } else {
            validate_replace_target(final_path)?;
            fs::rename(&self.path, final_path).map_err(|_| OutputError::Commit)?;
        }
        self.committed = true;
        Ok(())
    }
}

fn precreated_identity(path: &Path) -> Result<Option<OutputIdentity>, OutputError> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.is_file() && metadata.len() == 0 => Ok(Some(OutputIdentity {
            device: metadata.dev(),
            inode: metadata.ino(),
        })),
        Ok(metadata) if metadata.is_file() => Ok(None),
        Ok(_) => Err(OutputError::Temporary),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(_) => Err(OutputError::Temporary),
    }
}

fn validate_replace_target(path: &Path) -> Result<(), OutputError> {
    if let Ok(metadata) = fs::symlink_metadata(path) {
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err(OutputError::Commit);
        }
    }
    Ok(())
}

fn commit_precreated(
    source: &Path,
    destination: &Path,
    identity: OutputIdentity,
) -> Result<(), OutputError> {
    let png = fs::read(source).map_err(|_| OutputError::Commit)?;
    let mut output = OpenOptions::new()
        .write(true)
        .custom_flags(libc::O_NOFOLLOW | libc::O_CLOEXEC)
        .open(destination)
        .map_err(|_| OutputError::Commit)?;
    let metadata = output.metadata().map_err(|_| OutputError::Commit)?;
    if !metadata.is_file() || metadata.dev() != identity.device || metadata.ino() != identity.inode
    {
        return Err(OutputError::Commit);
    }
    output.set_len(0).map_err(|_| OutputError::Commit)?;
    output.write_all(&png).map_err(|_| OutputError::Commit)?;
    drop(output);
    fs::remove_file(source).map_err(|_| OutputError::Commit)
}

impl Drop for PendingOutput {
    fn drop(&mut self) {
        if !self.committed {
            let _ = fs::remove_file(&self.path);
        }
    }
}

fn validate_png(path: &Path, edge: u32) -> Result<(), OutputError> {
    let metadata = fs::symlink_metadata(path).map_err(|_| OutputError::InvalidPng)?;
    if metadata.file_type().is_symlink() || !metadata.is_file() || metadata.len() == 0 {
        return Err(OutputError::InvalidPng);
    }
    let decoder = PngDecoder::new(BufReader::new(
        File::open(path).map_err(|_| OutputError::InvalidPng)?,
    ))
    .map_err(|_| OutputError::InvalidPng)?;
    let (width, height) = decoder.dimensions();
    if decoder.color_type() != ColorType::Rgba8
        || width.max(height) != edge
        || checked_bgra_len(width, height).map_err(|_| OutputError::InvalidPng)?
            != usize::try_from(decoder.total_bytes()).map_err(|_| OutputError::InvalidPng)?
    {
        return Err(OutputError::InvalidPng);
    }
    let mut pixels = vec![0_u8; decoder.total_bytes() as usize];
    decoder
        .read_image(&mut pixels)
        .map_err(|_| OutputError::InvalidPng)
}
