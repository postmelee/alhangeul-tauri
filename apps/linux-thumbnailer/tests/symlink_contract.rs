#![cfg(target_os = "linux")]

mod support;

use std::fs::{self, File};
use std::os::unix::ffi::OsStrExt;
use std::os::unix::fs::{symlink, MetadataExt};
use std::path::{Path, PathBuf};
use std::time::Duration;
use support::*;
use tempfile::TempDir;

const INPUT: &str = "하위 폴더/원본 문서.hwpx";

#[test]
fn ancestor_and_parent_aliases_render_new_outputs() {
    let (_directory, real, alias) = linked_workspace();
    let input = real.join(INPUT);
    let original = fs::read(&input).unwrap();
    let cases = [
        (input.clone(), real.join("cache/normal.png")),
        (alias.join(INPUT), real.join("cache/input-alias.png")),
        (input.clone(), alias.join("parent-alias.png")),
        (input.clone(), alias.join("cache/ancestor-alias.png")),
        (alias.join(INPUT), alias.join("cache/양쪽 별칭.png")),
    ];
    for (source, output) in cases {
        assert!(run(&source, &output, 64).success());
        assert_png(&output, 64);
        assert_eq!(fs::read(&input).unwrap(), original);
    }
    assert_no_temporaries(&real);
    assert_no_temporaries(&real.join("cache"));
}

#[test]
fn aliased_precreated_and_existing_outputs_preserve_publication_contracts() {
    let (_directory, real, alias) = linked_workspace();
    let original = fs::read(real.join(INPUT)).unwrap();
    for initial in [b"".as_slice(), b"existing-final".as_slice()] {
        let output = alias.join("cache/existing.png");
        fs::write(&output, initial).unwrap();
        let held = File::open(&output).unwrap();
        let before = held.metadata().unwrap();
        assert!(run(&alias.join(INPUT), &output, 64).success());
        assert_png(&real.join("cache/existing.png"), 64);
        if initial.is_empty() {
            let after = fs::metadata(&output).unwrap();
            assert_eq!((after.dev(), after.ino()), (before.dev(), before.ino()));
            assert!(held.metadata().unwrap().len() > 0);
        }
        assert_eq!(fs::read(real.join(INPUT)).unwrap(), original);
    }
    assert_no_temporaries(&real.join("cache"));
}

#[test]
fn invalid_inputs_through_aliases_preserve_original_and_final() {
    let (_directory, real, alias) = linked_workspace();
    let input = real.join(INPUT);
    let original = fs::read(&input).unwrap();
    let output = alias.join("cache/final.png");
    fs::write(&output, b"existing-final").unwrap();
    symlink(&input, real.join("input-link.hwpx")).unwrap();
    symlink(real.join("missing"), real.join("dangling.hwpx")).unwrap();
    File::create(real.join("oversize.hwp"))
        .unwrap()
        .set_len(64 * 1024 * 1024 + 1)
        .unwrap();
    for source in [
        alias.join("input-link.hwpx"),
        alias.join("dangling.hwpx"),
        alias.join("oversize.hwp"),
        alias.clone(),
        PathBuf::from("relative.hwpx"),
    ] {
        assert!(!run(&source, &output, 64).success());
        assert_eq!(fs::read(&output).unwrap(), b"existing-final");
        assert_eq!(fs::read(&input).unwrap(), original);
    }
    assert_no_temporaries(&real.join("cache"));
}

#[test]
fn output_leaf_and_parent_failures_preserve_target_sentinels() {
    let (_directory, real, alias) = linked_workspace();
    let original = fs::read(real.join(INPUT)).unwrap();
    let target = real.join("target.png");
    fs::write(&target, b"target-sentinel").unwrap();
    symlink(&target, real.join("cache/leaf.png")).unwrap();
    symlink(real.join("missing"), real.join("cache/dangling.png")).unwrap();
    symlink(real.join("missing"), real.join("dangling-parent")).unwrap();
    for output in [
        real.join(INPUT),
        alias.join(INPUT),
        alias.join("cache/leaf.png"),
        alias.join("cache/dangling.png"),
        alias.join("dangling-parent/output.png"),
        alias.join("missing/output.png"),
        alias.join(INPUT).join("output.png"),
        alias.join("cache"),
        PathBuf::from("relative.png"),
        PathBuf::from("/"),
    ] {
        for source in [real.join(INPUT), alias.join(INPUT)] {
            assert!(!run(&source, &output, 64).success());
        }
        assert_eq!(fs::read(real.join(INPUT)).unwrap(), original);
        assert_eq!(fs::read(&target).unwrap(), b"target-sentinel");
        assert!(!real.join("missing").exists());
    }
    assert_no_temporaries(&real);
    assert_no_temporaries(&real.join("cache"));
    assert_no_temporaries(&real.join("하위 폴더"));
}

#[test]
fn aliased_partial_and_panicking_workers_preserve_final_and_inode() {
    let (_directory, real, alias) = linked_workspace();
    let original = fs::read(real.join(INPUT)).unwrap();
    let output = alias.join("cache/final.png");
    for initial in [b"".as_slice(), b"existing-final".as_slice()] {
        for behavior in ["partial", "panic"] {
            fs::write(&output, initial).unwrap();
            let inode = fs::metadata(&output).unwrap().ino();
            let mut child = spawn_with_behavior(&alias.join(INPUT), &output, behavior);
            assert!(!wait_with_timeout(&mut child, Duration::from_secs(4)).success());
            assert_eq!(fs::read(&output).unwrap(), initial);
            assert_eq!(fs::metadata(&output).unwrap().ino(), inode);
            assert_eq!(fs::read(real.join(INPUT)).unwrap(), original);
            assert_no_temporaries(&real.join("cache"));
        }
    }
}

#[test]
fn resolved_worker_paths_survive_alias_retargeting_and_timeout_reaps_worker() {
    let (directory, real, alias) = linked_workspace();
    let input = real.join(INPUT);
    let original = fs::read(&input).unwrap();
    let output = real.join("cache/final.png");
    fs::write(&output, b"existing-final").unwrap();
    let decoy = directory.path().join("decoy");
    fs::create_dir_all(decoy.join("cache")).unwrap();
    fs::write(decoy.join("cache/final.png"), b"target-sentinel").unwrap();
    let mut child = spawn_with_behavior(&alias.join(INPUT), &alias.join("cache/final.png"), "hang");
    let worker_pid = wait_for_limited_worker(child.id());
    let command = fs::read(format!("/proc/{worker_pid}/cmdline")).unwrap();
    let args = command.split(|byte| *byte == 0).collect::<Vec<_>>();
    assert_eq!(args[2], input.as_os_str().as_bytes());
    assert!(Path::new(std::ffi::OsStr::from_bytes(args[3]))
        .parent()
        .is_some_and(|parent| parent == real.join("cache")));
    fs::remove_file(&alias).unwrap();
    symlink(&decoy, &alias).unwrap();
    assert!(!wait_with_timeout(&mut child, Duration::from_secs(4)).success());
    wait_for_process_exit(worker_pid);
    assert_eq!(fs::read(&input).unwrap(), original);
    assert_eq!(fs::read(&output).unwrap(), b"existing-final");
    assert_eq!(fs::read(decoy.join("cache/final.png")).unwrap(), b"target-sentinel");
    assert_no_temporaries(&real.join("cache"));
    assert_no_temporaries(&decoy.join("cache"));
}

fn linked_workspace() -> (TempDir, PathBuf, PathBuf) {
    let directory = TempDir::new().unwrap();
    let real = directory.path().join("실제 문서");
    let alias = directory.path().join("상위 별칭");
    fs::create_dir_all(real.join("cache")).unwrap();
    fs::create_dir_all(real.join("하위 폴더")).unwrap();
    fs::rename(copy_fixture(&directory, "blank_hwpx.hwpx"), real.join(INPUT)).unwrap();
    symlink(&real, &alias).unwrap();
    (directory, real, alias)
}
