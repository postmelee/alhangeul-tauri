use pdf_writer::{Finish, Pdf, Ref};
use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::font_catalog;
use crate::state::atomic_write;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum PdfTextMode {
    Searchable,
    OutlinedFallback,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfExportResult {
    pub path: String,
    pub page_count: u32,
    pub text_mode: PdfTextMode,
    pub warning: Option<String>,
}

pub fn export_svg_pages_to_pdf(
    svg_paths: &[PathBuf],
    target_path: &Path,
) -> Result<PdfExportResult, String> {
    ensure_pdf_path(target_path)?;
    let (bytes, text_mode, warning) = match render_pdf(svg_paths, true) {
        Ok(bytes) => (bytes, PdfTextMode::Searchable, None),
        Err(searchable_error) => {
            let bytes = render_pdf(svg_paths, false).map_err(|fallback_error| {
                format!(
                    "검색 가능한 PDF 변환 실패: {}; 글자 윤곽선 fallback 실패: {}",
                    searchable_error, fallback_error
                )
            })?;
            (
                bytes,
                PdfTextMode::OutlinedFallback,
                Some(format!(
                    "검색 가능한 텍스트 변환에 실패해 글자 윤곽선으로 저장했습니다: {}",
                    searchable_error
                )),
            )
        }
    };
    atomic_write(target_path, &bytes)?;
    Ok(PdfExportResult {
        path: target_path.to_string_lossy().to_string(),
        page_count: svg_paths.len() as u32,
        text_mode,
        warning,
    })
}

pub(crate) fn ensure_pdf_path(path: &Path) -> Result<(), String> {
    if path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("pdf"))
        != Some(true)
    {
        return Err("PDF 파일 경로는 .pdf 확장자여야 합니다".to_string());
    }
    Ok(())
}

fn conversion_options(embed_text: bool) -> svg2pdf::ConversionOptions {
    svg2pdf::ConversionOptions {
        embed_text,
        ..svg2pdf::ConversionOptions::default()
    }
}

fn pdf_usvg_options() -> usvg::Options<'static> {
    usvg::Options {
        fontdb: std::sync::Arc::new(font_catalog::create_pdf_font_database()),
        ..Default::default()
    }
}

fn parse_svg_tree_for_pdf(
    svg_content: &str,
    options: &usvg::Options<'static>,
) -> Result<usvg::Tree, String> {
    usvg::Tree::from_str(svg_content, options).map_err(|e| format!("SVG 파싱 실패: {}", e))
}

fn render_pdf(svg_paths: &[PathBuf], embed_text: bool) -> Result<Vec<u8>, String> {
    if svg_paths.is_empty() {
        return Err("페이지가 없습니다".to_string());
    }
    let options = pdf_usvg_options();
    let mut alloc = Ref::new(1);
    let catalog_ref = alloc.bump();
    let page_tree_ref = alloc.bump();

    struct PageData {
        chunk: pdf_writer::Chunk,
        svg_ref: Ref,
        width: f32,
        height: f32,
    }

    let mut page_data = Vec::with_capacity(svg_paths.len());
    for path in svg_paths {
        let svg = std::fs::read_to_string(path)
            .map_err(|e| format!("PDF 페이지 SVG 읽기 실패: {} ({})", path.display(), e))?;
        let tree = parse_svg_tree_for_pdf(&svg, &options)?;
        let (chunk, svg_ref) = svg2pdf::to_chunk(&tree, conversion_options(embed_text))
            .map_err(|e| format!("SVG->PDF chunk 변환 실패: {:?}", e))?;
        let dpi_ratio = 72.0 / 96.0;
        page_data.push(PageData {
            chunk,
            svg_ref,
            width: tree.size().width() * dpi_ratio,
            height: tree.size().height() * dpi_ratio,
        });
    }

    let mut page_refs = Vec::with_capacity(page_data.len());
    let mut renumbered_chunks = Vec::with_capacity(page_data.len());
    let mut remapped_svg_refs = Vec::with_capacity(page_data.len());
    for data in &page_data {
        page_refs.push(alloc.bump());
        let mut map = HashMap::new();
        let chunk = data
            .chunk
            .renumber(|old| *map.entry(old).or_insert_with(|| alloc.bump()));
        remapped_svg_refs.push(map.get(&data.svg_ref).copied().unwrap_or(data.svg_ref));
        renumbered_chunks.push(chunk);
    }

    let mut pdf = Pdf::new();
    pdf.catalog(catalog_ref).pages(page_tree_ref);
    pdf.pages(page_tree_ref)
        .count(page_refs.len() as i32)
        .kids(page_refs.iter().copied());
    let svg_name = pdf_writer::Name(b"S1");

    for (index, data) in page_data.iter().enumerate() {
        let content_ref = alloc.bump();
        let mut page = pdf.page(page_refs[index]);
        page.media_box(pdf_writer::Rect::new(0.0, 0.0, data.width, data.height));
        page.parent(page_tree_ref);
        page.contents(content_ref);
        let mut resources = page.resources();
        resources
            .x_objects()
            .pair(svg_name, remapped_svg_refs[index]);
        resources.finish();
        page.finish();

        let mut content = pdf_writer::Content::new();
        content.transform([data.width, 0.0, 0.0, data.height, 0.0, 0.0]);
        content.x_object(svg_name);
        pdf.stream(content_ref, &content.finish());
    }
    for chunk in &renumbered_chunks {
        pdf.extend(chunk);
    }
    let info_ref = alloc.bump();
    pdf.document_info(info_ref)
        .producer(pdf_writer::TextStr("alhangeul-desktop"));
    Ok(pdf.finish())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ensure_pdf_path_accepts_pdf_case_insensitively() {
        assert!(ensure_pdf_path(Path::new("out.pdf")).is_ok());
        assert!(ensure_pdf_path(Path::new("out.PDF")).is_ok());
    }

    #[test]
    fn ensure_pdf_path_rejects_non_pdf_paths() {
        assert_eq!(
            ensure_pdf_path(Path::new("out.hwp")).unwrap_err(),
            "PDF 파일 경로는 .pdf 확장자여야 합니다"
        );
    }

    #[test]
    fn render_pdf_rejects_an_empty_page_list() {
        assert_eq!(render_pdf(&[], true).unwrap_err(), "페이지가 없습니다");
    }

    #[test]
    fn searchable_conversion_is_the_primary_mode() {
        assert!(conversion_options(true).embed_text);
        assert!(!conversion_options(false).embed_text);
    }
}
