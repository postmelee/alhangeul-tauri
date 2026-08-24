#![forbid(unsafe_code)]

pub mod limits;
pub mod protocol;
#[cfg(feature = "render")]
mod render;

#[cfg(feature = "render")]
pub use render::{
    extract_embedded_preview, render_first_page_svg, resolve_document_preview, EmbeddedPreview,
    EmbeddedPreviewFormat, PreviewSelection,
};

use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PreviewError {
    InputTooLarge { actual: usize, max: usize },
    SvgTooLarge { actual: usize, max: usize },
    PreviewTooLarge { actual: usize, max: usize },
    PreviewPixelsTooLarge { width: u32, height: u32, max: u64 },
    FinalPixelsTooLarge { width: u32, height: u32, max: u64 },
    FrameTooLarge { actual: usize, max: usize },
    InvalidRequestedEdge(u32),
    ArithmeticOverflow(&'static str),
    InvalidFrame(&'static str),
    UnsupportedFrameVersion(u16),
    UnsupportedFrameKind(u16),
    PayloadHashMismatch,
    DocumentParse(String),
    DocumentRender(String),
    EmbeddedPreview(String),
}

impl fmt::Display for PreviewError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InputTooLarge { actual, max } => {
                write!(formatter, "input bytes {actual} exceed {max}")
            }
            Self::SvgTooLarge { actual, max } => {
                write!(formatter, "SVG bytes {actual} exceed {max}")
            }
            Self::PreviewTooLarge { actual, max } => {
                write!(formatter, "preview bytes {actual} exceed {max}")
            }
            Self::PreviewPixelsTooLarge { width, height, max } => write!(
                formatter,
                "preview dimensions {width}x{height} exceed {max} pixels"
            ),
            Self::FinalPixelsTooLarge { width, height, max } => write!(
                formatter,
                "bitmap dimensions {width}x{height} exceed {max} pixels"
            ),
            Self::FrameTooLarge { actual, max } => {
                write!(formatter, "frame bytes {actual} exceed {max}")
            }
            Self::InvalidRequestedEdge(edge) => {
                write!(formatter, "requested edge must be non-zero: {edge}")
            }
            Self::ArithmeticOverflow(context) => {
                write!(formatter, "arithmetic overflow: {context}")
            }
            Self::InvalidFrame(reason) => write!(formatter, "invalid frame: {reason}"),
            Self::UnsupportedFrameVersion(version) => {
                write!(formatter, "unsupported frame version: {version}")
            }
            Self::UnsupportedFrameKind(kind) => write!(formatter, "unsupported frame kind: {kind}"),
            Self::PayloadHashMismatch => write!(formatter, "frame payload hash mismatch"),
            Self::DocumentParse(error) => write!(formatter, "document parse failed: {error}"),
            Self::DocumentRender(error) => write!(formatter, "first page render failed: {error}"),
            Self::EmbeddedPreview(error) => write!(formatter, "embedded preview failed: {error}"),
        }
    }
}

impl std::error::Error for PreviewError {}
