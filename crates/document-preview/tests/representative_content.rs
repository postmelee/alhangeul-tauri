use alhangeul_document_preview::{rasterize_first_page, render_first_page_svg, Bitmap};

const ONSAEMIRO: &[u8] =
    include_bytes!("../../../third_party/rhwp/samples/[2027] 온새미로 1 본교재.hwp");
const BIZ_PLAN: &[u8] = include_bytes!("../../../third_party/rhwp/samples/biz_plan.hwp");
const FORM_002: &[u8] = include_bytes!("../../../third_party/rhwp/samples/hwpx/form-002.hwpx");

#[test]
fn onsaemiro_keeps_title_text_and_background_image() {
    let onsaemiro_svg = render_first_page_svg(ONSAEMIRO).unwrap();
    assert!(onsaemiro_svg.matches("<text ").count() >= 30);
    assert!(onsaemiro_svg.contains("<image "));
    let onsaemiro = rasterize_first_page(ONSAEMIRO, 512).unwrap();
    assert_region_ink("onsaemiro title", &onsaemiro, (0.12, 0.24, 0.88, 0.46), 100);
    assert_region_ink(
        "onsaemiro background image",
        &onsaemiro,
        (0.00, 0.50, 1.00, 0.92),
        1_000,
    );
}

#[test]
fn biz_plan_keeps_title_and_date_text() {
    let biz_plan_svg = render_first_page_svg(BIZ_PLAN).unwrap();
    assert!(biz_plan_svg.matches("<text ").count() >= 40);
    let biz_plan = rasterize_first_page(BIZ_PLAN, 512).unwrap();
    assert_region_ink(
        "biz plan title between rules",
        &biz_plan,
        (0.10, 0.135, 0.90, 0.175),
        100,
    );
    assert_region_ink("biz plan date", &biz_plan, (0.25, 0.50, 0.75, 0.56), 40);
}

#[test]
fn form_002_keeps_body_text_inside_table() {
    let form_svg = render_first_page_svg(FORM_002).unwrap();
    assert!(form_svg.matches("<text ").count() >= 400);
    let form = rasterize_first_page(FORM_002, 512).unwrap();
    assert_region_ink(
        "form body inside table borders",
        &form,
        (0.12, 0.56, 0.88, 0.70),
        300,
    );
}

fn assert_region_ink(label: &str, bitmap: &Bitmap, region: (f32, f32, f32, f32), minimum: usize) {
    let (left, top, right, bottom) = region;
    let x0 = (bitmap.width as f32 * left).floor() as u32;
    let y0 = (bitmap.height as f32 * top).floor() as u32;
    let x1 = (bitmap.width as f32 * right).ceil() as u32;
    let y1 = (bitmap.height as f32 * bottom).ceil() as u32;
    let mut ink = 0_usize;

    for y in y0..y1.min(bitmap.height) {
        for x in x0..x1.min(bitmap.width) {
            let offset = ((y * bitmap.width + x) * 4) as usize;
            let pixel = &bitmap.bgra[offset..offset + 4];
            if composited_over_white(pixel)
                .iter()
                .any(|channel| *channel < 245)
            {
                ink += 1;
            }
        }
    }

    assert!(
        ink >= minimum,
        "{label} region ink {ink} is below {minimum}"
    );
}

fn composited_over_white(pixel: &[u8]) -> [u8; 3] {
    let transparent_white = 255_u8.saturating_sub(pixel[3]);
    [
        pixel[0].saturating_add(transparent_white),
        pixel[1].saturating_add(transparent_white),
        pixel[2].saturating_add(transparent_white),
    ]
}

#[test]
fn premultiplied_transparent_pixels_do_not_count_as_ink() {
    assert_eq!(composited_over_white(&[0, 0, 0, 0]), [255, 255, 255]);
    assert_eq!(composited_over_white(&[0, 0, 0, 255]), [0, 0, 0]);
}
