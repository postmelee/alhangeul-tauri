use crate::limits::{
    validate_input_len, validate_preview_len, validate_preview_pixels, validate_svg_len,
};
use crate::PreviewError;
use image::imageops::FilterType;
use image::ImageReader;
use rhwp::DocumentCore;
use std::io::Cursor;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EmbeddedPreviewFormat {
    Png,
    Bmp,
    Gif,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EmbeddedPreview {
    pub format: EmbeddedPreviewFormat,
    pub width: u32,
    pub height: u32,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PreviewSelection {
    DirectSvg(String),
    Embedded(EmbeddedPreview),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Bitmap {
    pub width: u32,
    pub height: u32,
    pub bgra: Vec<u8>,
}

pub fn render_first_page_svg(bytes: &[u8]) -> Result<String, PreviewError> {
    validate_input_len(bytes.len())?;
    let core = DocumentCore::from_bytes(bytes)
        .map_err(|error| PreviewError::DocumentParse(error.to_string()))?;
    let svg = core
        .render_page_svg_native(0)
        .map_err(|error| PreviewError::DocumentRender(error.to_string()))?;
    validate_svg_len(svg.len())?;
    Ok(svg)
}

pub fn extract_embedded_preview(bytes: &[u8]) -> Result<Option<EmbeddedPreview>, PreviewError> {
    validate_input_len(bytes.len())?;
    let Some(thumbnail) = rhwp::parser::extract_thumbnail_only(bytes) else {
        return Ok(None);
    };
    validate_preview_len(thumbnail.data.len())?;
    let reader = ImageReader::new(Cursor::new(&thumbnail.data))
        .with_guessed_format()
        .map_err(|error| PreviewError::EmbeddedPreview(error.to_string()))?;
    let format = preview_format(reader.format())?;
    let (width, height) = reader
        .into_dimensions()
        .map_err(|error| PreviewError::EmbeddedPreview(error.to_string()))?;
    validate_preview_pixels(width, height)?;
    Ok(Some(EmbeddedPreview {
        format,
        width,
        height,
        bytes: thumbnail.data,
    }))
}

pub fn resolve_document_preview(bytes: &[u8]) -> Result<PreviewSelection, PreviewError> {
    validate_input_len(bytes.len())?;
    let embedded = extract_embedded_preview(bytes);
    match render_first_page_svg(bytes) {
        Ok(svg) => Ok(PreviewSelection::DirectSvg(svg)),
        Err(direct_error) => match embedded {
            Ok(Some(preview)) => Ok(PreviewSelection::Embedded(preview)),
            Ok(None) | Err(_) => Err(direct_error),
        },
    }
}

pub fn rasterize_first_page(bytes: &[u8], requested_edge: u32) -> Result<Bitmap, PreviewError> {
    let svg = render_first_page_svg(bytes)?;
    let tree = resvg::usvg::Tree::from_str(&svg, &resvg::usvg::Options::default())
        .map_err(|error| PreviewError::Raster(error.to_string()))?;
    let (width, height, scale) =
        fitted_dimensions(tree.size().width(), tree.size().height(), requested_edge)?;
    let mut pixmap = resvg::tiny_skia::Pixmap::new(width, height)
        .ok_or_else(|| PreviewError::Raster("pixmap allocation failed".to_string()))?;
    let transform = resvg::tiny_skia::Transform::from_scale(scale, scale);
    resvg::render(&tree, transform, &mut pixmap.as_mut());
    Ok(Bitmap {
        width,
        height,
        bgra: premultiplied_rgba_to_bgra(pixmap.data()),
    })
}

pub fn rasterize_embedded_preview(
    preview: &EmbeddedPreview,
    requested_edge: u32,
) -> Result<Bitmap, PreviewError> {
    let decoded = image::load_from_memory(&preview.bytes)
        .map_err(|error| PreviewError::Raster(error.to_string()))?;
    let (width, height, _) =
        fitted_dimensions(preview.width as f32, preview.height as f32, requested_edge)?;
    let rgba = decoded
        .resize_exact(width, height, FilterType::Lanczos3)
        .into_rgba8();
    Ok(Bitmap {
        width,
        height,
        bgra: straight_rgba_to_premultiplied_bgra(rgba.as_raw()),
    })
}

fn fitted_dimensions(
    source_width: f32,
    source_height: f32,
    requested_edge: u32,
) -> Result<(u32, u32, f32), PreviewError> {
    let edge = crate::limits::bounded_requested_edge(requested_edge)?;
    if !source_width.is_finite()
        || !source_height.is_finite()
        || source_width <= 0.0
        || source_height <= 0.0
    {
        return Err(PreviewError::Raster(
            "invalid source dimensions".to_string(),
        ));
    }
    let scale = edge as f32 / source_width.max(source_height);
    let width = (source_width * scale).round().clamp(1.0, edge as f32) as u32;
    let height = (source_height * scale).round().clamp(1.0, edge as f32) as u32;
    crate::limits::checked_bgra_len(width, height)?;
    Ok((width, height, scale))
}

fn premultiplied_rgba_to_bgra(rgba: &[u8]) -> Vec<u8> {
    rgba.chunks_exact(4)
        .flat_map(|pixel| [pixel[2], pixel[1], pixel[0], pixel[3]])
        .collect()
}

fn straight_rgba_to_premultiplied_bgra(rgba: &[u8]) -> Vec<u8> {
    rgba.chunks_exact(4)
        .flat_map(|pixel| {
            let alpha = u16::from(pixel[3]);
            let premultiply = |channel: u8| ((u16::from(channel) * alpha + 127) / 255) as u8;
            [
                premultiply(pixel[2]),
                premultiply(pixel[1]),
                premultiply(pixel[0]),
                pixel[3],
            ]
        })
        .collect()
}

fn preview_format(
    format: Option<image::ImageFormat>,
) -> Result<EmbeddedPreviewFormat, PreviewError> {
    match format {
        Some(image::ImageFormat::Png) => Ok(EmbeddedPreviewFormat::Png),
        Some(image::ImageFormat::Bmp) => Ok(EmbeddedPreviewFormat::Bmp),
        Some(image::ImageFormat::Gif) => Ok(EmbeddedPreviewFormat::Gif),
        _ => Err(PreviewError::EmbeddedPreview(
            "unsupported embedded image format".to_string(),
        )),
    }
}
