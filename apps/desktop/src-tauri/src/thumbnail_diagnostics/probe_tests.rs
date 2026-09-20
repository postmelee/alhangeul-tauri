//! Real Windows Shell regression, independent of Alhangeul registration.
use super::{
    com::Sta,
    fixtures,
    probe::{self, ImageMode},
    protocol::FixtureId,
};

#[test]
fn canonical_public_jpg_reaches_shell_and_cache_apis() {
    let root = std::env::temp_dir().join(format!(
        "alhangeul-shell-한글 space-{}",
        uuid::Uuid::new_v4()
    ));
    std::fs::create_dir(&root).unwrap();
    let file = root.join("control.jpg");
    std::fs::write(&file, fixtures::generate(FixtureId::Jpg).unwrap()).unwrap();
    let path = std::fs::canonicalize(&file).unwrap();
    let outcome = std::thread::spawn(move || {
        let sta = Sta::enter().unwrap();
        [
            ImageMode::Shell,
            ImageMode::ForceExtract,
            ImageMode::CacheOnly,
        ]
        .map(|mode| probe::image(&sta, &path, mode))
    })
    .join();
    // Only these known test files; no recursive cleanup or global cache changes.
    std::fs::remove_file(&file).unwrap();
    std::fs::remove_dir(&root).unwrap();
    for probe in outcome.unwrap() {
        assert_eq!(
            probe.hresult, "0x00000000",
            "{}: {}",
            probe.mode, probe.phase
        );
        assert_eq!(probe.status, "ok");
        assert_eq!(probe.bitmap_present, Some(true));
    }
}
