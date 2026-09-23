use alhangeul_document_preview::protocol::{decode_request_header, encode_frame, Frame, FrameKind};
use alhangeul_document_preview::{
    extract_embedded_preview, rasterize_embedded_preview, rasterize_first_page, Bitmap,
    PreviewError,
};
use std::io::{Read, Write};

pub fn run(mut input: impl Read, mut output: impl Write) -> Result<(), PreviewError> {
    let (bytes, requested_edge) = read_request(&mut input)?;
    write_preview_candidate(&bytes, requested_edge, &mut output)?;
    write_direct_result(&bytes, requested_edge, &mut output)?;
    write_frame(Frame::control(FrameKind::Complete)?, &mut output)?;
    output
        .flush()
        .map_err(|error| PreviewError::InvalidFrame(io_reason(error.kind())))
}

fn read_request(input: &mut impl Read) -> Result<(Vec<u8>, u32), PreviewError> {
    let mut encoded = [0_u8; alhangeul_document_preview::limits::FRAME_HEADER_BYTES];
    input
        .read_exact(&mut encoded)
        .map_err(|error| PreviewError::InvalidFrame(io_reason(error.kind())))?;
    let header = decode_request_header(&encoded)?;
    let mut bytes = vec![0_u8; header.payload_len];
    input
        .read_exact(&mut bytes)
        .map_err(|error| PreviewError::InvalidFrame(io_reason(error.kind())))?;
    header.validate_payload(&bytes)?;
    Ok((bytes, header.requested_edge))
}

fn write_preview_candidate(
    bytes: &[u8],
    requested_edge: u32,
    output: &mut impl Write,
) -> Result<(), PreviewError> {
    let candidate = extract_embedded_preview(bytes)
        .ok()
        .flatten()
        .and_then(|preview| rasterize_embedded_preview(&preview, requested_edge).ok());
    if let Some(bitmap) = candidate {
        write_frame(bitmap_frame(FrameKind::PreviewCandidate, bitmap)?, output)?;
    }
    Ok(())
}

fn write_direct_result(
    bytes: &[u8],
    requested_edge: u32,
    output: &mut impl Write,
) -> Result<(), PreviewError> {
    let frame = match rasterize_first_page(bytes, requested_edge) {
        Ok(bitmap) => bitmap_frame(FrameKind::DirectBitmap, bitmap)?,
        Err(_) => Frame::control(FrameKind::DirectFailed)?,
    };
    write_frame(frame, output)
}

fn bitmap_frame(kind: FrameKind, bitmap: Bitmap) -> Result<Frame, PreviewError> {
    Frame::bitmap(kind, bitmap.width, bitmap.height, bitmap.bgra)
}

fn write_frame(frame: Frame, output: &mut impl Write) -> Result<(), PreviewError> {
    output
        .write_all(&encode_frame(&frame)?)
        .map_err(|error| PreviewError::InvalidFrame(io_reason(error.kind())))
}

const fn io_reason(kind: std::io::ErrorKind) -> &'static str {
    match kind {
        std::io::ErrorKind::UnexpectedEof => "pipe unexpected EOF",
        std::io::ErrorKind::BrokenPipe => "pipe broken",
        std::io::ErrorKind::WriteZero => "pipe write zero",
        _ => "pipe I/O",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use alhangeul_document_preview::limits::FRAME_HEADER_BYTES;
    use alhangeul_document_preview::protocol::{decode_frame, encode_request_header};
    use image::ImageFormat;
    use std::io::Cursor;
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;

    const HWPX: &[u8] = include_bytes!("../../../third_party/rhwp/saved/blank_hwpx.hwpx");

    #[test]
    fn direct_bitmap_wins_even_when_embedded_candidate_is_invalid() {
        let frames = execute(HWPX, 96).unwrap();
        assert_eq!(frames.last().unwrap().kind, FrameKind::Complete);
        assert!(frames
            .iter()
            .any(|frame| frame.kind == FrameKind::DirectBitmap));
        assert!(!frames
            .iter()
            .any(|frame| frame.kind == FrameKind::DirectFailed));
    }

    #[test]
    fn valid_preview_candidate_precedes_direct_failure() {
        let input = preview_only_hwpx();
        let frames = execute(&input, 32).unwrap();
        assert_eq!(
            frames.iter().map(|frame| frame.kind).collect::<Vec<_>>(),
            [
                FrameKind::PreviewCandidate,
                FrameKind::DirectFailed,
                FrameKind::Complete,
            ]
        );
    }

    #[test]
    fn request_hash_mismatch_is_rejected_without_output() {
        let mut request = encode_request_header(HWPX, 96).unwrap().to_vec();
        request.extend_from_slice(HWPX);
        request[FRAME_HEADER_BYTES] ^= 0xff;
        let mut output = Vec::new();
        assert_eq!(
            run(Cursor::new(request), &mut output),
            Err(PreviewError::RequestHashMismatch)
        );
        assert!(output.is_empty());
    }

    fn execute(bytes: &[u8], edge: u32) -> Result<Vec<Frame>, PreviewError> {
        let mut request = encode_request_header(bytes, edge)?.to_vec();
        request.extend_from_slice(bytes);
        let mut output = Vec::new();
        run(Cursor::new(request), &mut output)?;
        decode_frames(&output)
    }

    fn decode_frames(mut encoded: &[u8]) -> Result<Vec<Frame>, PreviewError> {
        let mut frames = Vec::new();
        while !encoded.is_empty() {
            let header = alhangeul_document_preview::protocol::decode_frame_header(
                &encoded[..FRAME_HEADER_BYTES],
            )?;
            let frame_len = FRAME_HEADER_BYTES + header.payload_len;
            frames.push(decode_frame(&encoded[..frame_len])?);
            encoded = &encoded[frame_len..];
        }
        Ok(frames)
    }

    fn preview_only_hwpx() -> Vec<u8> {
        let mut png = Cursor::new(Vec::new());
        image::DynamicImage::new_rgba8(1, 1)
            .write_to(&mut png, ImageFormat::Png)
            .unwrap();
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        let options =
            SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
        writer.start_file("Preview/PrvImage.png", options).unwrap();
        writer.write_all(&png.into_inner()).unwrap();
        writer.finish().unwrap().into_inner()
    }
}
