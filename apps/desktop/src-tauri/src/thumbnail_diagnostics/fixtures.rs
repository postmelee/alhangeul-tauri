//! Synthetic, non-private fixtures. No user documents or upstream samples.
use super::protocol::FixtureId;
use rhwp::{
    model::{
        document::{Document, Section},
        paragraph::Paragraph,
    },
    serializer::{serialize_hwp, serialize_hwpx},
};

pub use super::scratch_manifest::{MAX_FIXTURE_BYTES, SCHEMA_VERSION};
pub const TEXT: &str = "Alhangeul 썸네일 검사";

pub fn generate(id: FixtureId) -> Result<Vec<u8>, ()> {
    let document = Document {
        sections: vec![Section {
            paragraphs: vec![Paragraph {
                text: TEXT.into(),
                ..Default::default()
            }],
            ..Default::default()
        }],
        ..Default::default()
    };
    let bytes = match id {
        FixtureId::Hwp => serialize_hwp(&document).map_err(|_| ())?,
        FixtureId::Hwpx => serialize_hwpx(&document).map_err(|_| ())?,
        FixtureId::Jpg => jpeg_pattern(),
    };
    if bytes.is_empty() || bytes.len() > MAX_FIXTURE_BYTES {
        return Err(());
    }
    Ok(bytes)
}

/// Our own baseline grayscale JPEG: two adjacent 8x8 blocks (128 and 255).
/// Quantizer 16; DC coefficients 0,64; AC all zero. Metadata contains no names,
/// times or paths. This fixed bitstream does not depend on an image encoder.
fn jpeg_pattern() -> Vec<u8> {
    let mut bytes = vec![0xff, 0xd8, 0xff, 0xdb, 0, 67, 0];
    bytes.extend([16; 64]);
    bytes.extend([0xff, 0xc0, 0, 11, 8, 0, 8, 0, 16, 1, 1, 0x11, 0]);
    bytes.extend([0xff, 0xc4, 0, 39, 0]);
    bytes.extend([1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    bytes.extend([0, 7, 0x10]);
    bytes.extend([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    bytes.push(0);
    bytes.extend([0xff, 0xda, 0, 8, 1, 1, 0, 0, 63, 0, 0x28, 0x0f, 0xff, 0xd9]);
    bytes
}

#[cfg(test)]
#[path = "fixtures_tests.rs"]
mod tests;
