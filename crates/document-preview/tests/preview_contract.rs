use alhangeul_document_preview::limits::{
    bounded_requested_edge, validate_input_len, DIRECT_DEADLINE_MS, FRAME_HEADER_BYTES,
    MAX_BITMAP_PAYLOAD_BYTES, MAX_FINAL_PIXELS, MAX_FRAME_BYTES, MAX_INPUT_BYTES,
    MAX_PREVIEW_BYTES, MAX_PREVIEW_PIXELS, MAX_REQUESTED_EDGE, MAX_SVG_BYTES, TOTAL_DEADLINE_MS,
    WORKER_MEMORY_LIMIT_BYTES,
};
use alhangeul_document_preview::protocol::{
    decode_frame, decode_frame_header, decode_request_header, encode_frame, encode_request_header,
    Frame, FrameKind,
};
use alhangeul_document_preview::{
    extract_embedded_preview, rasterize_embedded_preview, rasterize_first_page,
    render_first_page_svg, resolve_document_preview, EmbeddedPreview, EmbeddedPreviewFormat,
    PreviewError, PreviewSelection,
};
use std::io::{Cursor, Read, Write};
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

const HWP: &[u8] = include_bytes!("../../../third_party/rhwp/saved/blank2010.hwp");
const HWPX: &[u8] = include_bytes!("../../../third_party/rhwp/saved/blank_hwpx.hwpx");
const PNG_1X1: &[u8] = &[
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0xda, 0x63, 0x64, 0xf8, 0xcf, 0xf0,
    0x1f, 0x00, 0x05, 0xfe, 0x02, 0xfe, 0xc2, 0xc4, 0x85, 0xca, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
    0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
];

#[derive(Clone, Copy)]
enum PreviewMutation<'a> {
    Remove,
    Replace(&'a [u8]),
}

#[test]
fn stage_one_resource_budgets_are_fixed() {
    assert_eq!(MAX_INPUT_BYTES, 64 * 1024 * 1024);
    assert_eq!(MAX_REQUESTED_EDGE, 1024);
    assert_eq!(MAX_SVG_BYTES, 16 * 1024 * 1024);
    assert_eq!(MAX_PREVIEW_BYTES, 16 * 1024 * 1024);
    assert_eq!(MAX_PREVIEW_PIXELS, 16_777_216);
    assert_eq!(MAX_FINAL_PIXELS, 1_048_576);
    assert_eq!(MAX_BITMAP_PAYLOAD_BYTES, 4_194_304);
    assert_eq!(FRAME_HEADER_BYTES, 64);
    assert_eq!(MAX_FRAME_BYTES, 4_194_368);
    assert_eq!(WORKER_MEMORY_LIMIT_BYTES, 256 * 1024 * 1024);
    assert_eq!(DIRECT_DEADLINE_MS, 1_500);
    assert_eq!(TOTAL_DEADLINE_MS, 2_000);
    assert_eq!(bounded_requested_edge(4096), Ok(1024));
    assert!(matches!(
        bounded_requested_edge(0),
        Err(PreviewError::InvalidRequestedEdge(0))
    ));
    assert!(matches!(
        validate_input_len(MAX_INPUT_BYTES + 1),
        Err(PreviewError::InputTooLarge { .. })
    ));
}

#[test]
fn protocol_round_trips_maximum_bitmap_and_control_frames() {
    let payload = vec![0x5a; MAX_BITMAP_PAYLOAD_BYTES];
    let bitmap = Frame::bitmap(FrameKind::DirectBitmap, 1024, 1024, payload).unwrap();
    let encoded = encode_frame(&bitmap).unwrap();
    assert_eq!(encoded.len(), MAX_FRAME_BYTES);
    assert_eq!(decode_frame(&encoded).unwrap(), bitmap);

    let complete = Frame::control(FrameKind::Complete).unwrap();
    assert_eq!(
        decode_frame(&encode_frame(&complete).unwrap()).unwrap(),
        complete
    );
}

#[test]
fn worker_request_header_binds_edge_length_and_payload_hash() {
    let header = encode_request_header(HWPX, 256).unwrap();
    let decoded = decode_request_header(&header).unwrap();
    assert_eq!(decoded.requested_edge, 256);
    assert_eq!(decoded.payload_len, HWPX.len());
    assert_eq!(decoded.validate_payload(HWPX), Ok(()));

    let mut changed = HWPX.to_vec();
    changed[0] ^= 0xff;
    assert_eq!(
        decoded.validate_payload(&changed),
        Err(PreviewError::RequestHashMismatch)
    );

    let mut oversized = header;
    oversized[16..24].copy_from_slice(&((MAX_INPUT_BYTES as u64) + 1).to_le_bytes());
    assert!(matches!(
        decode_request_header(&oversized),
        Err(PreviewError::InputTooLarge { .. })
    ));
}

#[test]
fn protocol_rejects_unsupported_or_malformed_frames_before_copying_payload() {
    let frame = Frame::bitmap(FrameKind::PreviewCandidate, 1, 1, vec![0, 1, 2, 3]).unwrap();
    let encoded = encode_frame(&frame).unwrap();

    let mut unsupported_version = encoded.clone();
    unsupported_version[8..10].copy_from_slice(&2_u16.to_le_bytes());
    assert!(matches!(
        decode_frame(&unsupported_version),
        Err(PreviewError::UnsupportedFrameVersion(2))
    ));

    let mut unsupported_kind = encoded.clone();
    unsupported_kind[10..12].copy_from_slice(&99_u16.to_le_bytes());
    assert!(matches!(
        decode_frame(&unsupported_kind),
        Err(PreviewError::UnsupportedFrameKind(99))
    ));

    let mut oversized = encoded.clone();
    oversized[12..16]
        .copy_from_slice(&(u32::try_from(MAX_BITMAP_PAYLOAD_BYTES).unwrap() + 1).to_le_bytes());
    assert!(matches!(
        decode_frame(&oversized),
        Err(PreviewError::FrameTooLarge { .. })
    ));

    let mut reserved = encoded.clone();
    reserved[28] = 1;
    assert!(matches!(
        decode_frame(&reserved),
        Err(PreviewError::InvalidFrame("frame reserved bytes"))
    ));

    let mut truncated = encoded.clone();
    truncated.pop();
    assert!(matches!(
        decode_frame(&truncated),
        Err(PreviewError::InvalidFrame("frame length"))
    ));

    let mut overflowing_dimensions = encoded.clone();
    overflowing_dimensions[16..20].copy_from_slice(&u32::MAX.to_le_bytes());
    assert!(matches!(
        decode_frame(&overflowing_dimensions),
        Err(PreviewError::ArithmeticOverflow("bitmap stride"))
    ));

    let mut bad_stride = encoded.clone();
    bad_stride[24..28].copy_from_slice(&8_u32.to_le_bytes());
    assert!(matches!(
        decode_frame(&bad_stride),
        Err(PreviewError::InvalidFrame("bitmap stride"))
    ));

    let mut bad_hash = encoded;
    bad_hash[FRAME_HEADER_BYTES] ^= 0xff;
    assert_eq!(
        decode_frame(&bad_hash),
        Err(PreviewError::PayloadHashMismatch)
    );
}

#[test]
fn frame_header_rejects_invalid_bitmap_metadata_before_payload_allocation() {
    let frame = Frame::bitmap(FrameKind::DirectBitmap, 2, 1, vec![0; 8]).unwrap();
    let encoded = encode_frame(&frame).unwrap();
    let header = decode_frame_header(&encoded[..FRAME_HEADER_BYTES]).unwrap();
    assert_eq!(header.payload_len, 8);

    let mut oversized = encoded[..FRAME_HEADER_BYTES].to_vec();
    oversized[12..16]
        .copy_from_slice(&(u32::try_from(MAX_BITMAP_PAYLOAD_BYTES).unwrap() + 1).to_le_bytes());
    assert!(matches!(
        decode_frame_header(&oversized),
        Err(PreviewError::FrameTooLarge { .. })
    ));
}

#[test]
fn direct_render_is_deterministic_and_does_not_mutate_input() {
    for source in [HWP, HWPX] {
        let original = source.to_vec();
        let first = render_first_page_svg(source).unwrap();
        let second = render_first_page_svg(source).unwrap();
        assert_eq!(first, second);
        assert!(first.contains("<svg"));
        assert_eq!(source, original);
    }
}

#[test]
fn normal_embedded_preview_is_bounded_and_detected() {
    let preview = extract_embedded_preview(HWPX).unwrap().unwrap();
    assert_eq!(preview.format, EmbeddedPreviewFormat::Png);
    assert!(preview.width > 0);
    assert!(preview.height > 0);
    assert!(preview.bytes.len() <= MAX_PREVIEW_BYTES);
}

#[test]
fn direct_and_embedded_rasters_are_bounded_premultiplied_bgra() {
    let direct = rasterize_first_page(HWPX, 96).unwrap();
    assert_eq!(direct.width.max(direct.height), 96);
    assert_eq!(
        direct.bgra.len(),
        (direct.width * direct.height * 4) as usize
    );
    assert!(direct
        .bgra
        .chunks_exact(4)
        .all(|pixel| { pixel[0] <= pixel[3] && pixel[1] <= pixel[3] && pixel[2] <= pixel[3] }));

    let mut encoded_png = Cursor::new(Vec::new());
    image::DynamicImage::new_rgba8(1, 1)
        .write_to(&mut encoded_png, image::ImageFormat::Png)
        .unwrap();
    let embedded = EmbeddedPreview {
        format: EmbeddedPreviewFormat::Png,
        width: 1,
        height: 1,
        bytes: encoded_png.into_inner(),
    };
    let bitmap = rasterize_embedded_preview(&embedded, 32).unwrap();
    assert_eq!(bitmap.width.max(bitmap.height), 32);
    assert_eq!(
        bitmap.bgra.len(),
        (bitmap.width * bitmap.height * 4) as usize
    );
}

#[test]
fn missing_or_stale_preview_does_not_override_direct_render() {
    let missing = mutate_hwpx_preview(HWPX, PreviewMutation::Remove);
    assert!(extract_embedded_preview(&missing).unwrap().is_none());
    assert!(matches!(
        resolve_document_preview(&missing).unwrap(),
        PreviewSelection::DirectSvg(_)
    ));

    let stale = mutate_hwpx_preview(HWPX, PreviewMutation::Replace(PNG_1X1));
    let embedded = extract_embedded_preview(&stale).unwrap().unwrap();
    assert_eq!((embedded.width, embedded.height), (1, 1));
    assert!(matches!(
        resolve_document_preview(&stale).unwrap(),
        PreviewSelection::DirectSvg(_)
    ));
}

#[test]
fn preview_only_input_uses_embedded_fallback_after_direct_failure() {
    let input = preview_only_hwpx(PNG_1X1);
    let selected = resolve_document_preview(&input).unwrap();
    let PreviewSelection::Embedded(preview) = selected else {
        panic!("preview-only input must use the embedded fallback");
    };
    assert_eq!(preview.format, EmbeddedPreviewFormat::Png);
    assert_eq!((preview.width, preview.height), (1, 1));
}

#[test]
fn corrupt_unsupported_and_oversized_previews_are_rejected() {
    let corrupt = mutate_hwpx_preview(HWPX, PreviewMutation::Replace(b"not an image"));
    assert!(matches!(
        extract_embedded_preview(&corrupt),
        Err(PreviewError::EmbeddedPreview(_))
    ));

    let unsupported = preview_only_hwpx(b"GIF89a");
    assert!(matches!(
        extract_embedded_preview(&unsupported),
        Err(PreviewError::EmbeddedPreview(_))
    ));

    let oversized_bytes = vec![0_u8; MAX_PREVIEW_BYTES + 1];
    let oversized = preview_only_hwpx(&oversized_bytes);
    assert!(matches!(
        extract_embedded_preview(&oversized),
        Err(PreviewError::PreviewTooLarge { .. })
    ));
}

fn mutate_hwpx_preview(source: &[u8], mutation: PreviewMutation<'_>) -> Vec<u8> {
    let mut archive = ZipArchive::new(Cursor::new(source)).unwrap();
    let cursor = Cursor::new(Vec::new());
    let mut writer = ZipWriter::new(cursor);

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).unwrap();
        let name = entry.name().to_string();
        let compression = entry.compression();
        let is_dir = entry.is_dir();
        let mut contents = Vec::new();
        entry.read_to_end(&mut contents).unwrap();
        drop(entry);

        if name.starts_with("Preview/PrvImage") {
            if let PreviewMutation::Replace(replacement) = mutation {
                let options = SimpleFileOptions::default().compression_method(compression);
                writer.start_file(name, options).unwrap();
                writer.write_all(replacement).unwrap();
            }
            continue;
        }

        let options = SimpleFileOptions::default().compression_method(compression);
        if is_dir {
            writer.add_directory(name, options).unwrap();
        } else {
            writer.start_file(name, options).unwrap();
            writer.write_all(&contents).unwrap();
        }
    }

    writer.finish().unwrap().into_inner()
}

fn preview_only_hwpx(preview: &[u8]) -> Vec<u8> {
    let cursor = Cursor::new(Vec::new());
    let mut writer = ZipWriter::new(cursor);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    writer.start_file("Preview/PrvImage.png", options).unwrap();
    writer.write_all(preview).unwrap();
    writer.finish().unwrap().into_inner()
}
