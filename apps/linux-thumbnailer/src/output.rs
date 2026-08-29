use alhangeul_document_preview::limits::checked_bgra_len;
use image::codecs::png::PngDecoder;
use image::{ColorType, ImageDecoder};
use std::fs::{self, File};
use std::io::BufReader;
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
    committed: bool,
}

impl PendingOutput {
    pub fn new(final_path: &Path) -> Result<Self, OutputError> {
        let parent = final_path.parent().ok_or(OutputError::Temporary)?;
        for _ in 0..128 {
            let sequence = TEMP_SEQUENCE.fetch_add(1, Ordering::Relaxed);
            let name = format!(".alhangeul-thumbnail-{}-{sequence}.tmp", std::process::id());
            let path = parent.join(name);
            match fs::symlink_metadata(&path) {
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                    return Ok(Self {
                        path,
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
        if let Ok(metadata) = fs::symlink_metadata(final_path) {
            if metadata.file_type().is_symlink() || !metadata.is_file() {
                return Err(OutputError::Commit);
            }
        }
        fs::rename(&self.path, final_path).map_err(|_| OutputError::Commit)?;
        self.committed = true;
        Ok(())
    }
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
