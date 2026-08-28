use crate::limits::{
    checked_bgra_len, validate_frame_len, FRAME_HEADER_BYTES, MAX_BITMAP_PAYLOAD_BYTES,
};
pub use crate::request::{
    decode_request_header, encode_request_header, RequestHeader, REQUEST_MAGIC,
};
use crate::PreviewError;

pub const FRAME_MAGIC: [u8; 8] = *b"ALHGTHM\0";
pub const PROTOCOL_VERSION: u16 = 1;

const HASH_OFFSET: usize = 32;
const HASH_BYTES: usize = 32;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FrameHeader {
    pub kind: FrameKind,
    pub width: u32,
    pub height: u32,
    pub stride: u32,
    pub payload_len: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u16)]
pub enum FrameKind {
    PreviewCandidate = 1,
    DirectBitmap = 2,
    DirectFailed = 3,
    Complete = 4,
}

impl FrameKind {
    const fn is_bitmap(self) -> bool {
        matches!(self, Self::PreviewCandidate | Self::DirectBitmap)
    }
}

impl TryFrom<u16> for FrameKind {
    type Error = PreviewError;

    fn try_from(value: u16) -> Result<Self, Self::Error> {
        match value {
            1 => Ok(Self::PreviewCandidate),
            2 => Ok(Self::DirectBitmap),
            3 => Ok(Self::DirectFailed),
            4 => Ok(Self::Complete),
            other => Err(PreviewError::UnsupportedFrameKind(other)),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Frame {
    pub kind: FrameKind,
    pub width: u32,
    pub height: u32,
    pub stride: u32,
    pub payload: Vec<u8>,
}

impl Frame {
    pub fn bitmap(
        kind: FrameKind,
        width: u32,
        height: u32,
        payload: Vec<u8>,
    ) -> Result<Self, PreviewError> {
        if !kind.is_bitmap() {
            return Err(PreviewError::InvalidFrame(
                "control kind has bitmap payload",
            ));
        }
        let stride = width
            .checked_mul(4)
            .ok_or(PreviewError::ArithmeticOverflow("bitmap stride"))?;
        let frame = Self {
            kind,
            width,
            height,
            stride,
            payload,
        };
        validate_frame(&frame)?;
        Ok(frame)
    }

    pub fn control(kind: FrameKind) -> Result<Self, PreviewError> {
        if kind.is_bitmap() {
            return Err(PreviewError::InvalidFrame("bitmap kind requires payload"));
        }
        Ok(Self {
            kind,
            width: 0,
            height: 0,
            stride: 0,
            payload: Vec::new(),
        })
    }
}

pub fn encode_frame(frame: &Frame) -> Result<Vec<u8>, PreviewError> {
    validate_frame(frame)?;
    let total = FRAME_HEADER_BYTES
        .checked_add(frame.payload.len())
        .ok_or(PreviewError::ArithmeticOverflow("frame bytes"))?;
    validate_frame_len(total)?;
    let payload_len = u32::try_from(frame.payload.len())
        .map_err(|_| PreviewError::ArithmeticOverflow("payload u32"))?;
    let mut encoded = vec![0_u8; total];
    encoded[0..8].copy_from_slice(&FRAME_MAGIC);
    encoded[8..10].copy_from_slice(&PROTOCOL_VERSION.to_le_bytes());
    encoded[10..12].copy_from_slice(&(frame.kind as u16).to_le_bytes());
    encoded[12..16].copy_from_slice(&payload_len.to_le_bytes());
    encoded[16..20].copy_from_slice(&frame.width.to_le_bytes());
    encoded[20..24].copy_from_slice(&frame.height.to_le_bytes());
    encoded[24..28].copy_from_slice(&frame.stride.to_le_bytes());
    encoded[HASH_OFFSET..HASH_OFFSET + HASH_BYTES]
        .copy_from_slice(blake3::hash(&frame.payload).as_bytes());
    encoded[FRAME_HEADER_BYTES..].copy_from_slice(&frame.payload);
    Ok(encoded)
}

pub fn decode_frame_header(header: &[u8]) -> Result<FrameHeader, PreviewError> {
    if header.len() != FRAME_HEADER_BYTES {
        return Err(PreviewError::InvalidFrame("frame header length"));
    }
    parse_frame_header(header)
}

pub fn decode_frame(encoded: &[u8]) -> Result<Frame, PreviewError> {
    validate_frame_len(encoded.len())?;
    if encoded.len() < FRAME_HEADER_BYTES {
        return Err(PreviewError::InvalidFrame("truncated header"));
    }
    let header = parse_frame_header(&encoded[..FRAME_HEADER_BYTES])?;
    let payload_len = header.payload_len;
    let expected = FRAME_HEADER_BYTES
        .checked_add(payload_len)
        .ok_or(PreviewError::ArithmeticOverflow("frame length"))?;
    if expected != encoded.len() {
        return Err(PreviewError::InvalidFrame("frame length"));
    }
    let payload = &encoded[FRAME_HEADER_BYTES..];
    if encoded[HASH_OFFSET..HASH_OFFSET + HASH_BYTES] != *blake3::hash(payload).as_bytes() {
        return Err(PreviewError::PayloadHashMismatch);
    }
    let frame = Frame {
        kind: header.kind,
        width: header.width,
        height: header.height,
        stride: header.stride,
        payload: payload.to_vec(),
    };
    Ok(frame)
}

fn parse_frame_header(header: &[u8]) -> Result<FrameHeader, PreviewError> {
    if header[0..8] != FRAME_MAGIC {
        return Err(PreviewError::InvalidFrame("magic"));
    }
    let version = read_u16(header, 8);
    if version != PROTOCOL_VERSION {
        return Err(PreviewError::UnsupportedFrameVersion(version));
    }
    let kind = FrameKind::try_from(read_u16(header, 10))?;
    let payload_len = usize::try_from(read_u32(header, 12))
        .map_err(|_| PreviewError::ArithmeticOverflow("payload usize"))?;
    if payload_len > MAX_BITMAP_PAYLOAD_BYTES {
        return Err(PreviewError::FrameTooLarge {
            actual: FRAME_HEADER_BYTES.saturating_add(payload_len),
            max: crate::limits::MAX_FRAME_BYTES,
        });
    }
    if header[28..32] != [0_u8; 4] {
        return Err(PreviewError::InvalidFrame("frame reserved bytes"));
    }
    let parsed = FrameHeader {
        kind,
        width: read_u32(header, 16),
        height: read_u32(header, 20),
        stride: read_u32(header, 24),
        payload_len,
    };
    validate_frame_metadata(parsed)?;
    Ok(parsed)
}

fn validate_frame_metadata(header: FrameHeader) -> Result<(), PreviewError> {
    if !header.kind.is_bitmap() {
        if header.width != 0 || header.height != 0 || header.stride != 0 || header.payload_len != 0
        {
            return Err(PreviewError::InvalidFrame("control frame fields"));
        }
        return Ok(());
    }
    let expected_stride = header
        .width
        .checked_mul(4)
        .ok_or(PreviewError::ArithmeticOverflow("bitmap stride"))?;
    if header.stride != expected_stride {
        return Err(PreviewError::InvalidFrame("bitmap stride"));
    }
    if crate::limits::checked_bgra_len(header.width, header.height)? != header.payload_len {
        return Err(PreviewError::InvalidFrame("bitmap payload length"));
    }
    Ok(())
}

fn validate_frame(frame: &Frame) -> Result<(), PreviewError> {
    validate_frame_fields(
        frame.kind,
        frame.width,
        frame.height,
        frame.stride,
        &frame.payload,
    )
}

fn validate_frame_fields(
    kind: FrameKind,
    width: u32,
    height: u32,
    stride: u32,
    payload: &[u8],
) -> Result<(), PreviewError> {
    if !kind.is_bitmap() {
        if width != 0 || height != 0 || stride != 0 || !payload.is_empty() {
            return Err(PreviewError::InvalidFrame("control frame fields"));
        }
        return Ok(());
    }
    let expected_stride = width
        .checked_mul(4)
        .ok_or(PreviewError::ArithmeticOverflow("bitmap stride"))?;
    if stride != expected_stride {
        return Err(PreviewError::InvalidFrame("bitmap stride"));
    }
    let expected_payload = checked_bgra_len(width, height)?;
    if expected_payload != payload.len() {
        return Err(PreviewError::InvalidFrame("bitmap payload length"));
    }
    Ok(())
}

fn read_u16(bytes: &[u8], offset: usize) -> u16 {
    u16::from_le_bytes([bytes[offset], bytes[offset + 1]])
}

fn read_u32(bytes: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes([
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
    ])
}
