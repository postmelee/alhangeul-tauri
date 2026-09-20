use super::{
    scratch::Scratch,
    scratch_manifest::{self, Slot, MANIFEST_NAME, SLOTS},
};
use std::{
    fs,
    time::{Duration, Instant},
};
use uuid::Uuid;

fn prepared() -> (tempfile::TempDir, Uuid, Scratch) {
    let base = tempfile::tempdir().unwrap();
    let id = Uuid::new_v4();
    let scratch = Scratch::prepare(base.path(), id, &"a".repeat(40)).unwrap();
    (base, id, scratch)
}

fn deadline() -> Instant {
    Instant::now() + Duration::from_secs(5)
}

#[test]
fn fresh_copies_are_fixed_separate_and_only_explicit_cleanup_removes_them() {
    let (base, id, scratch) = prepared();
    assert!(scratch.intact());
    let mut paths = Vec::new();
    for slot in SLOTS {
        let mut fixture = scratch.fixture(slot).unwrap();
        assert!(fixture.intact());
        paths.push(fixture.path().to_path_buf());
    }
    assert_eq!(
        paths.iter().collect::<std::collections::HashSet<_>>().len(),
        12
    );
    assert!(Scratch::prepare(base.path(), id, &"a".repeat(40)).is_err());
    assert!(scratch.cleanup(deadline()));
    assert_eq!(fs::read_dir(base.path()).unwrap().count(), 0);
}

#[test]
fn manifest_is_bound_to_request_source_order_and_bytes() {
    let (base, id, scratch) = prepared();
    let mut manifest = scratch.manifest.clone();
    assert!(!scratch_manifest::validate(
        &manifest,
        Uuid::new_v4(),
        &"a".repeat(40)
    ));
    assert!(Scratch::load(base.path(), id, &"b".repeat(40)).is_err());
    manifest.files.swap(0, 1);
    assert!(!scratch_manifest::validate(&manifest, id, &"a".repeat(40)));
    assert!(scratch.cleanup(deadline()));
}

#[test]
fn invalid_source_and_nil_owner_cannot_create_a_directory() {
    let base = tempfile::tempdir().unwrap();
    assert!(Scratch::prepare(base.path(), Uuid::new_v4(), "devel").is_err());
    assert!(Scratch::prepare(base.path(), Uuid::nil(), &"a".repeat(40)).is_err());
    assert_eq!(fs::read_dir(base.path()).unwrap().count(), 0);
}

#[cfg(windows)]
#[test]
fn held_fixture_handle_prevents_cleanup_without_deleting_other_files() {
    let (_base, _id, scratch) = prepared();
    let fixture = scratch.fixture(Slot::HwpxForce).unwrap();
    let root = fixture.path().parent().unwrap().to_path_buf();
    assert!(!scratch.cleanup(Instant::now() + Duration::from_millis(100)));
    assert!(SLOTS
        .into_iter()
        .all(|slot| root.join(slot.filename()).exists()));
    drop(fixture);
}

#[test]
fn unknown_files_and_directories_are_retained_without_partial_deletion() {
    for directory in [false, true] {
        let (_base, _id, scratch) = prepared();
        let fixture = scratch.fixture(Slot::HwpShell).unwrap();
        let root = fixture.path().parent().unwrap().to_path_buf();
        drop(fixture);
        let unknown = root.join("not-owned");
        if directory {
            fs::create_dir(&unknown).unwrap();
        } else {
            fs::write(&unknown, b"not ours").unwrap();
        }
        assert!(!scratch.cleanup(deadline()));
        assert!(unknown.exists());
        assert!(SLOTS
            .into_iter()
            .all(|slot| root.join(slot.filename()).exists()));
        assert!(root.join(MANIFEST_NAME).exists());
    }
}

#[test]
fn changed_fixture_and_expired_cleanup_never_report_success() {
    let (_base, _id, scratch) = prepared();
    let fixture = scratch.fixture(Slot::HwpxForce).unwrap();
    let path = fixture.path().to_path_buf();
    drop(fixture);
    fs::write(&path, b"changed").unwrap();
    assert!(!scratch.intact());
    assert!(!scratch.cleanup(deadline()));
    assert_eq!(fs::read(path).unwrap(), b"changed");
    let (_base, _id, scratch) = prepared();
    assert!(!scratch.cleanup(Instant::now()));
}

#[cfg(target_os = "linux")]
#[test]
fn a_symlink_cannot_redirect_reading_or_cleanup_to_an_unowned_target() {
    let (base, _id, scratch) = prepared();
    let fixture = scratch.fixture(Slot::HwpShell).unwrap();
    let path = fixture.path().to_path_buf();
    drop(fixture);
    let target = base.path().join("outside.hwp");
    fs::rename(&path, &target).unwrap();
    std::os::unix::fs::symlink(&target, &path).unwrap();
    assert!(scratch.fixture(Slot::HwpShell).is_err());
    assert!(!scratch.cleanup(deadline()));
    assert!(target.exists());
    assert!(fs::symlink_metadata(path).unwrap().file_type().is_symlink());
}
#[test]
fn only_a_positively_absent_exact_scope_counts_as_already_clean() {
    let base = tempfile::tempdir().unwrap();
    let id = uuid::Uuid::new_v4();
    assert!(super::scratch::Scratch::absent(base.path(), id));
    assert!(!super::scratch::Scratch::absent(
        base.path(),
        uuid::Uuid::nil()
    ));
    let partial = base.path().join(format!("alhangeul-thumbnail-check-{id}"));
    std::fs::create_dir(&partial).unwrap();
    assert!(!super::scratch::Scratch::absent(base.path(), id));
}
