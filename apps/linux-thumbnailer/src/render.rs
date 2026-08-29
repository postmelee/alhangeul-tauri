use crate::cli::Request;
use alhangeul_document_preview::limits::{
    checked_bgra_len, validate_input_len, MAX_INPUT_BYTES, WORKER_MEMORY_LIMIT_BYTES,
};
use alhangeul_document_preview::{
    extract_embedded_preview, rasterize_embedded_preview, rasterize_first_page, Bitmap,
};
use image::codecs::png::PngEncoder;
use image::{ExtendedColorType, ImageEncoder};
use std::fs::{self, File, OpenOptions};
use std::io::{BufWriter, Read, Write};
use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RenderError {
    Limit,
    Input,
    Render,
    Output,
}

pub fn run_worker(request: &Request) -> Result<(), RenderError> {
    apply_worker_memory_limit()?;
    run_debug_behavior(request)?;
    let bytes = read_bounded(&request.input)?;
    let bitmap = render_bitmap(&bytes, request.edge)?;
    write_png(&request.output, bitmap)
}

fn apply_worker_memory_limit() -> Result<(), RenderError> {
    let limit = libc::rlimit {
        rlim_cur: WORKER_MEMORY_LIMIT_BYTES as libc::rlim_t,
        rlim_max: WORKER_MEMORY_LIMIT_BYTES as libc::rlim_t,
    };
    // SAFETY: `limit` is initialized for RLIMIT_AS and remains valid for the call.
    if unsafe { libc::setrlimit(libc::RLIMIT_AS, &limit) } != 0 {
        return Err(RenderError::Limit);
    }
    Ok(())
}

fn read_bounded(path: &Path) -> Result<Vec<u8>, RenderError> {
    let metadata = fs::metadata(path).map_err(|_| RenderError::Input)?;
    if !metadata.is_file() || metadata.len() > MAX_INPUT_BYTES as u64 {
        return Err(RenderError::Input);
    }
    let mut file = File::open(path).map_err(|_| RenderError::Input)?;
    let capacity = usize::try_from(metadata.len()).map_err(|_| RenderError::Input)?;
    let mut bytes = Vec::with_capacity(capacity.min(MAX_INPUT_BYTES));
    file.by_ref()
        .take(MAX_INPUT_BYTES as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| RenderError::Input)?;
    validate_input_len(bytes.len()).map_err(|_| RenderError::Input)?;
    Ok(bytes)
}

fn render_bitmap(bytes: &[u8], edge: u32) -> Result<Bitmap, RenderError> {
    if let Ok(bitmap) = rasterize_first_page(bytes, edge) {
        return validate_bitmap(bitmap, edge);
    }
    let preview = extract_embedded_preview(bytes)
        .map_err(|_| RenderError::Render)?
        .ok_or(RenderError::Render)?;
    let bitmap = rasterize_embedded_preview(&preview, edge).map_err(|_| RenderError::Render)?;
    validate_bitmap(bitmap, edge)
}

fn validate_bitmap(bitmap: Bitmap, edge: u32) -> Result<Bitmap, RenderError> {
    if bitmap.width.max(bitmap.height) != edge
        || checked_bgra_len(bitmap.width, bitmap.height).map_err(|_| RenderError::Render)?
            != bitmap.bgra.len()
    {
        return Err(RenderError::Render);
    }
    Ok(bitmap)
}

fn write_png(path: &Path, bitmap: Bitmap) -> Result<(), RenderError> {
    let mut guard = PartialOutput::create(path)?;
    let rgba = premultiplied_bgra_to_rgba(&bitmap.bgra);
    {
        let mut writer = BufWriter::new(&mut guard.file);
        PngEncoder::new(&mut writer)
            .write_image(&rgba, bitmap.width, bitmap.height, ExtendedColorType::Rgba8)
            .map_err(|_| RenderError::Output)?;
        writer.flush().map_err(|_| RenderError::Output)?;
    }
    guard.file.sync_all().map_err(|_| RenderError::Output)?;
    guard.keep = true;
    Ok(())
}

fn premultiplied_bgra_to_rgba(bgra: &[u8]) -> Vec<u8> {
    bgra.as_chunks::<4>()
        .0
        .iter()
        .flat_map(|pixel| {
            let alpha = u16::from(pixel[3]);
            let straight = |channel: u8| {
                if alpha == 0 {
                    0
                } else {
                    ((u16::from(channel) * 255 + alpha / 2) / alpha).min(255) as u8
                }
            };
            [
                straight(pixel[2]),
                straight(pixel[1]),
                straight(pixel[0]),
                pixel[3],
            ]
        })
        .collect()
}

struct PartialOutput {
    file: File,
    path: std::path::PathBuf,
    keep: bool,
}

impl PartialOutput {
    fn create(path: &Path) -> Result<Self, RenderError> {
        let file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(path)
            .map_err(|_| RenderError::Output)?;
        Ok(Self {
            file,
            path: path.to_path_buf(),
            keep: false,
        })
    }
}

impl Drop for PartialOutput {
    fn drop(&mut self) {
        if !self.keep {
            let _ = fs::remove_file(&self.path);
        }
    }
}

#[cfg(debug_assertions)]
fn run_debug_behavior(request: &Request) -> Result<(), RenderError> {
    match std::env::var("ALHANGEUL_THUMBNAILER_TEST_BEHAVIOR").as_deref() {
        Ok("hang") => loop {
            std::thread::sleep(std::time::Duration::from_secs(60));
        },
        Ok("panic") => panic!("test worker panic"),
        Ok("partial") => {
            fs::write(&request.output, b"partial").map_err(|_| RenderError::Output)?;
            Err(RenderError::Output)
        }
        _ => Ok(()),
    }
}

#[cfg(not(debug_assertions))]
fn run_debug_behavior(_: &Request) -> Result<(), RenderError> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn premultiplied_bgra_roundtrips_to_straight_rgba() {
        assert_eq!(
            premultiplied_bgra_to_rgba(&[25, 50, 100, 128, 3, 2, 1, 255, 7, 8, 9, 0]),
            [199, 100, 50, 128, 1, 2, 3, 255, 0, 0, 0, 0]
        );
    }
}
