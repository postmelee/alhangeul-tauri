use crate::limits::{bounded_requested_edge, validate_input_len, FRAME_HEADER_BYTES};
use crate::protocol::PROTOCOL_VERSION;
use crate::PreviewError;

pub const REQUEST_MAGIC: [u8; 8] = *b"ALHGREQ\0";

const HASH_OFFSET: usize = 32;
const HASH_BYTES: usize = 32;
const EDGE_OFFSET: usize = 12;
const LENGTH_OFFSET: usize = 16;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RequestHeader {
    pub requested_edge: u32,
    pub payload_len: usize,
    payload_hash: [u8; HASH_BYTES],
}

impl RequestHeader {
    pub fn validate_payload(&self, payload: &[u8]) -> Result<(), PreviewError> {
        if payload.len() != self.payload_len {
            return Err(PreviewError::InvalidFrame("request payload length"));
        }
        if self.payload_hash != *blake3::hash(payload).as_bytes() {
            return Err(PreviewError::RequestHashMismatch);
        }
        Ok(())
    }
}

pub fn encode_request_header(
    payload: &[u8],
    requested_edge: u32,
) -> Result<[u8; FRAME_HEADER_BYTES], PreviewError> {
    validate_input_len(payload.len())?;
    let edge = bounded_requested_edge(requested_edge)?;
    let payload_len = u64::try_from(payload.len())
        .map_err(|_| PreviewError::ArithmeticOverflow("request payload u64"))?;
    let mut header = [0_u8; FRAME_HEADER_BYTES];
    header[0..8].copy_from_slice(&REQUEST_MAGIC);
    header[8..10].copy_from_slice(&PROTOCOL_VERSION.to_le_bytes());
    header[EDGE_OFFSET..EDGE_OFFSET + 4].copy_from_slice(&edge.to_le_bytes());
    header[LENGTH_OFFSET..LENGTH_OFFSET + 8].copy_from_slice(&payload_len.to_le_bytes());
    header[HASH_OFFSET..HASH_OFFSET + HASH_BYTES].copy_from_slice(blake3::hash(payload).as_bytes());
    Ok(header)
}

pub fn decode_request_header(header: &[u8]) -> Result<RequestHeader, PreviewError> {
    if header.len() != FRAME_HEADER_BYTES {
        return Err(PreviewError::InvalidFrame("request header length"));
    }
    if header[0..8] != REQUEST_MAGIC {
        return Err(PreviewError::InvalidFrame("request magic"));
    }
    let version = read_u16(header, 8);
    if version != PROTOCOL_VERSION {
        return Err(PreviewError::UnsupportedFrameVersion(version));
    }
    if header[10..12] != [0_u8; 2] || header[24..32] != [0_u8; 8] {
        return Err(PreviewError::InvalidFrame("request reserved bytes"));
    }
    let requested_edge = bounded_requested_edge(read_u32(header, EDGE_OFFSET))?;
    let payload_len = usize::try_from(read_u64(header, LENGTH_OFFSET))
        .map_err(|_| PreviewError::ArithmeticOverflow("request payload usize"))?;
    validate_input_len(payload_len)?;
    let mut payload_hash = [0_u8; HASH_BYTES];
    payload_hash.copy_from_slice(&header[HASH_OFFSET..HASH_OFFSET + HASH_BYTES]);
    Ok(RequestHeader {
        requested_edge,
        payload_len,
        payload_hash,
    })
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

fn read_u64(bytes: &[u8], offset: usize) -> u64 {
    u64::from_le_bytes([
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
        bytes[offset + 4],
        bytes[offset + 5],
        bytes[offset + 6],
        bytes[offset + 7],
    ])
}
