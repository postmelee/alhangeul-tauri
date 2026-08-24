use crate::limits::{
    validate_input_len, validate_preview_len, validate_preview_pixels, validate_svg_len,
};
use crate::PreviewError;
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
