use super::*;

#[test]
fn public_documents_parse_and_render_without_external_samples() {
    for id in [FixtureId::Hwp, FixtureId::Hwpx] {
        let bytes = generate(id).unwrap();
        let core = rhwp::DocumentCore::from_bytes(&bytes).unwrap();
        assert_eq!(core.page_count(), 1, "{id:?}");
        assert!(
            core.document().sections[0].paragraphs[0]
                .text
                .contains(TEXT),
            "{id:?}"
        );
        let svg = alhangeul_document_preview::render_first_page_svg(&bytes).unwrap();
        let tree = roxmltree::Document::parse(&svg).unwrap();
        let rendered: String = tree
            .descendants()
            .filter(|node| node.is_text())
            .filter_map(|node| node.text())
            .collect();
        let compact = |text: &str| {
            text.chars()
                .filter(|value| !value.is_whitespace())
                .collect::<String>()
        };
        assert!(compact(&rendered).contains(&compact(TEXT)), "{id:?}");
        let bitmap = alhangeul_document_preview::rasterize_first_page(&bytes, 256).unwrap();
        assert!(bitmap.width > 0 && bitmap.height > 0);
        assert_eq!(bitmap.width.max(bitmap.height), 256);
        assert!(bitmap
            .bgra
            .as_chunks::<4>()
            .0
            .iter()
            .any(|pixel| pixel[3] > 0 && pixel[..3] != [255; 3]));
        assert!(bytes.len() <= MAX_FIXTURE_BYTES);
    }
}

#[test]
fn self_authored_jpeg_is_a_fixed_two_tone_control() {
    let bytes = generate(FixtureId::Jpg).unwrap();
    assert_eq!(generate(FixtureId::Jpg).unwrap(), bytes);
    let image = image::load_from_memory_with_format(&bytes, image::ImageFormat::Jpeg)
        .unwrap()
        .into_luma8();
    assert_eq!(image.dimensions(), (16, 8));
    assert_eq!(image.get_pixel(0, 0).0, [128]);
    assert_eq!(image.get_pixel(15, 7).0, [255]);
    assert_eq!(SCHEMA_VERSION, 1);
}
