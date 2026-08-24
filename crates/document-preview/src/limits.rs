use crate::PreviewError;

pub const MAX_INPUT_BYTES: usize = 64 * 1024 * 1024;
pub const MAX_REQUESTED_EDGE: u32 = 1024;
pub const MAX_SVG_BYTES: usize = 16 * 1024 * 1024;
pub const MAX_PREVIEW_BYTES: usize = 16 * 1024 * 1024;
pub const MAX_PREVIEW_PIXELS: u64 = 16_777_216;
pub const MAX_FINAL_PIXELS: u64 = 1_048_576;
pub const BITMAP_BYTES_PER_PIXEL: u32 = 4;
pub const MAX_BITMAP_PAYLOAD_BYTES: usize = 4_194_304;
pub const FRAME_HEADER_BYTES: usize = 64;
pub const MAX_FRAME_BYTES: usize = 4_194_368;
pub const WORKER_MEMORY_LIMIT_BYTES: u64 = 256 * 1024 * 1024;
pub const DIRECT_DEADLINE_MS: u64 = 1_500;
pub const TOTAL_DEADLINE_MS: u64 = 2_000;

pub fn validate_input_len(actual: usize) -> Result<(), PreviewError> {
    if actual > MAX_INPUT_BYTES {
        return Err(PreviewError::InputTooLarge {
            actual,
            max: MAX_INPUT_BYTES,
        });
    }
    Ok(())
}

pub fn bounded_requested_edge(requested: u32) -> Result<u32, PreviewError> {
    if requested == 0 {
        return Err(PreviewError::InvalidRequestedEdge(requested));
    }
    Ok(requested.min(MAX_REQUESTED_EDGE))
}

pub fn validate_svg_len(actual: usize) -> Result<(), PreviewError> {
    if actual > MAX_SVG_BYTES {
        return Err(PreviewError::SvgTooLarge {
            actual,
            max: MAX_SVG_BYTES,
        });
    }
    Ok(())
}

pub fn validate_preview_len(actual: usize) -> Result<(), PreviewError> {
    if actual > MAX_PREVIEW_BYTES {
        return Err(PreviewError::PreviewTooLarge {
            actual,
            max: MAX_PREVIEW_BYTES,
        });
    }
    Ok(())
}

pub fn validate_preview_pixels(width: u32, height: u32) -> Result<u64, PreviewError> {
    let pixels = checked_pixels(width, height, "preview pixels")?;
    if pixels > MAX_PREVIEW_PIXELS {
        return Err(PreviewError::PreviewPixelsTooLarge {
            width,
            height,
            max: MAX_PREVIEW_PIXELS,
        });
    }
    Ok(pixels)
}

pub fn checked_bgra_len(width: u32, height: u32) -> Result<usize, PreviewError> {
    let pixels = checked_pixels(width, height, "final pixels")?;
    if pixels > MAX_FINAL_PIXELS {
        return Err(PreviewError::FinalPixelsTooLarge {
            width,
            height,
            max: MAX_FINAL_PIXELS,
        });
    }
    let bytes = pixels
        .checked_mul(u64::from(BITMAP_BYTES_PER_PIXEL))
        .ok_or(PreviewError::ArithmeticOverflow("BGRA bytes"))?;
    usize::try_from(bytes).map_err(|_| PreviewError::ArithmeticOverflow("BGRA usize"))
}

pub fn validate_frame_len(actual: usize) -> Result<(), PreviewError> {
    if actual > MAX_FRAME_BYTES {
        return Err(PreviewError::FrameTooLarge {
            actual,
            max: MAX_FRAME_BYTES,
        });
    }
    Ok(())
}

fn checked_pixels(width: u32, height: u32, context: &'static str) -> Result<u64, PreviewError> {
    if width == 0 || height == 0 {
        return Err(PreviewError::InvalidFrame("zero bitmap dimension"));
    }
    u64::from(width)
        .checked_mul(u64::from(height))
        .ok_or(PreviewError::ArithmeticOverflow(context))
}
