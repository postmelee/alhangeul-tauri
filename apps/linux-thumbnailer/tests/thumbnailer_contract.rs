#![cfg(target_os = "linux")]

use image::codecs::png::{PngDecoder, PngEncoder};
use image::{ColorType, ExtendedColorType, ImageDecoder, ImageEncoder};
use std::fs::{self, File};
use std::io::{BufReader, Cursor, Write};
use std::os::unix::fs::{symlink, MetadataExt, PermissionsExt};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, ExitStatus};
use std::time::{Duration, Instant};
use tempfile::TempDir;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

const TEST_BEHAVIOR: &str = "ALHANGEUL_THUMBNAILER_TEST_BEHAVIOR";
const TEMP_PREFIX: &str = ".alhangeul-thumbnail-";

#[test]
fn hwp_and_hwpx_render_to_bounded_rgba_png() {
    let directory = TempDir::new().unwrap();
    for (fixture, edge) in [("blank2010.hwp", 128), ("blank_hwpx.hwpx", 256)] {
        let input = copy_fixture(&directory, fixture);
        let output = directory.path().join(format!("{fixture}.png"));
        assert!(run(&input, &output, edge).success());
        assert_png(&output, edge);
    }
    assert_no_temporaries(directory.path());
}

#[test]
fn embedded_preview_is_used_only_when_direct_render_fails() {
    let directory = TempDir::new().unwrap();
    let input = directory.path().join("preview-only.hwpx");
    fs::write(&input, preview_only_hwpx()).unwrap();
    let output = directory.path().join("preview.png");
    assert!(run(&input, &output, 64).success());
    assert_png(&output, 64);
    assert_no_temporaries(directory.path());
}

#[test]
fn precreated_output_keeps_tumbler_reader_inode() {
    let directory = TempDir::new().unwrap();
    let input = copy_fixture(&directory, "blank_hwpx.hwpx");
    let output = directory.path().join("precreated.png");
    let held = File::create(&output).unwrap();
    let inode = held.metadata().unwrap().ino();
    assert!(run(&input, &output, 64).success());
    assert_eq!(fs::metadata(&output).unwrap().ino(), inode);
    assert!(held.metadata().unwrap().len() > 0);
}

#[test]
fn invalid_inputs_edges_and_output_types_fail_closed() {
    let directory = TempDir::new().unwrap();
    let input = copy_fixture(&directory, "blank_hwpx.hwpx");
    let output = directory.path().join("output.png");
    for edge in [0, 1025] {
        assert!(!run(&input, &output, edge).success());
    }
    assert!(!Command::new(binary())
        .args(["-", output.to_str().unwrap(), "64"])
        .status()
        .unwrap()
        .success());
    let input_link = directory.path().join("input-link.hwpx");
    symlink(&input, &input_link).unwrap();
    assert!(!run(&input_link, &output, 64).success());
    assert!(!run(directory.path(), &output, 64).success());
    assert!(!run(&input, &input, 64).success());
    let target = directory.path().join("target.png");
    fs::write(&target, b"sentinel").unwrap();
    symlink(&target, &output).unwrap();
    assert!(!run(&input, &output, 64).success());
    assert_eq!(fs::read(&target).unwrap(), b"sentinel");
    assert_no_temporaries(directory.path());
}

#[test]
fn oversized_and_corrupt_documents_preserve_existing_output() {
    let directory = TempDir::new().unwrap();
    let output = directory.path().join("existing.png");
    fs::write(&output, b"existing-final").unwrap();
    let oversized = directory.path().join("oversized.hwp");
    File::create(&oversized)
        .unwrap()
        .set_len(64 * 1024 * 1024 + 1)
        .unwrap();
    assert!(!run(&oversized, &output, 64).success());
    assert_eq!(fs::read(&output).unwrap(), b"existing-final");
    let corrupt = directory.path().join("corrupt.hwpx");
    fs::write(&corrupt, b"not-a-document").unwrap();
    assert!(!run(&corrupt, &output, 64).success());
    assert_eq!(fs::read(&output).unwrap(), b"existing-final");
    assert_no_temporaries(directory.path());
}

#[test]
fn readonly_directory_does_not_leave_partial_output() {
    let directory = TempDir::new().unwrap();
    let input = copy_fixture(&directory, "blank_hwpx.hwpx");
    let readonly = directory.path().join("readonly");
    fs::create_dir(&readonly).unwrap();
    fs::set_permissions(&readonly, fs::Permissions::from_mode(0o555)).unwrap();
    let output = readonly.join("output.png");
    let status = run(&input, &output, 64);
    fs::set_permissions(&readonly, fs::Permissions::from_mode(0o755)).unwrap();
    assert!(!status.success());
    assert!(!output.exists());
    assert_no_temporaries(&readonly);
}

#[test]
fn timeout_kills_and_reaps_worker_and_removes_temporary() {
    let directory = TempDir::new().unwrap();
    let input = copy_fixture(&directory, "blank_hwpx.hwpx");
    let output = directory.path().join("timeout.png");
    let started = Instant::now();
    let mut child = spawn_with_behavior(&input, &output, "hang");
    let worker_pid = wait_for_worker(child.id());
    let status = wait_with_timeout(&mut child, Duration::from_secs(4));
    assert!(!status.success());
    assert!(started.elapsed() >= Duration::from_millis(1_300));
    assert!(started.elapsed() < Duration::from_secs(4));
    wait_for_process_exit(worker_pid);
    assert!(!output.exists());
    assert_no_temporaries(directory.path());
}

#[test]
fn worker_memory_limit_and_parent_signal_cleanup_are_observable() {
    let directory = TempDir::new().unwrap();
    let input = copy_fixture(&directory, "blank_hwpx.hwpx");
    let output = directory.path().join("signal.png");
    let mut child = spawn_with_behavior(&input, &output, "hang");
    let worker_pid = wait_for_worker(child.id());
    let limits = fs::read_to_string(format!("/proc/{worker_pid}/limits")).unwrap();
    let address = limits
        .lines()
        .find(|line| line.starts_with("Max address space"))
        .unwrap();
    assert_eq!(
        address.split_whitespace().collect::<Vec<_>>(),
        ["Max", "address", "space", "268435456", "268435456", "bytes"]
    );
    assert!(Command::new("/bin/kill")
        .args(["-TERM", &child.id().to_string()])
        .status()
        .unwrap()
        .success());
    assert!(!wait_with_timeout(&mut child, Duration::from_secs(3)).success());
    wait_for_process_exit(worker_pid);
    assert!(!output.exists());
    assert_no_temporaries(directory.path());
}

#[test]
fn partial_and_panicking_workers_preserve_final_and_cleanup() {
    let directory = TempDir::new().unwrap();
    let input = copy_fixture(&directory, "blank_hwpx.hwpx");
    let output = directory.path().join("existing.png");
    for behavior in ["partial", "panic"] {
        fs::write(&output, b"existing-final").unwrap();
        let status = spawn_with_behavior(&input, &output, behavior)
            .wait()
            .unwrap();
        assert!(!status.success());
        assert_eq!(fs::read(&output).unwrap(), b"existing-final");
        assert_no_temporaries(directory.path());
    }
}

#[test]
fn concurrent_requests_publish_only_complete_png() {
    let directory = TempDir::new().unwrap();
    let input = copy_fixture(&directory, "blank_hwpx.hwpx");
    let output = directory.path().join("shared.png");
    let mut children = (0..4)
        .map(|_| spawn(&input, &output, 128))
        .collect::<Vec<_>>();
    for child in &mut children {
        assert!(wait_with_timeout(child, Duration::from_secs(4)).success());
    }
    assert_png(&output, 128);
    assert_no_temporaries(directory.path());
}

fn binary() -> &'static str {
    env!("CARGO_BIN_EXE_alhangeul-thumbnailer")
}

fn run(input: &Path, output: &Path, edge: u32) -> ExitStatus {
    spawn(input, output, edge).wait().unwrap()
}

fn spawn(input: &Path, output: &Path, edge: u32) -> Child {
    Command::new(binary())
        .arg(input)
        .arg(output)
        .arg(edge.to_string())
        .spawn()
        .unwrap()
}

fn spawn_with_behavior(input: &Path, output: &Path, behavior: &str) -> Child {
    let mut command = Command::new(binary());
    command
        .arg(input)
        .arg(output)
        .arg("64")
        .env(TEST_BEHAVIOR, behavior);
    command.spawn().unwrap()
}

fn copy_fixture(directory: &TempDir, name: &str) -> PathBuf {
    let source = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../third_party/rhwp/saved")
        .join(name);
    let destination = directory.path().join(name);
    fs::copy(source, &destination).unwrap();
    destination
}

fn assert_png(path: &Path, edge: u32) {
    let decoder = PngDecoder::new(BufReader::new(File::open(path).unwrap())).unwrap();
    assert_eq!(decoder.color_type(), ColorType::Rgba8);
    let (width, height) = decoder.dimensions();
    assert_eq!(width.max(height), edge);
    let mut pixels = vec![0_u8; decoder.total_bytes() as usize];
    decoder.read_image(&mut pixels).unwrap();
    assert_eq!(pixels.len(), width as usize * height as usize * 4);
}

fn assert_no_temporaries(directory: &Path) {
    let names = fs::read_dir(directory)
        .unwrap()
        .map(|entry| entry.unwrap().file_name())
        .collect::<Vec<_>>();
    assert!(names
        .iter()
        .all(|name| !name.to_string_lossy().starts_with(TEMP_PREFIX)));
}

fn preview_only_hwpx() -> Vec<u8> {
    let mut png = Cursor::new(Vec::new());
    PngEncoder::new(&mut png)
        .write_image(&[0x20, 0x80, 0xe0, 0xff], 1, 1, ExtendedColorType::Rgba8)
        .unwrap();
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    writer.start_file("Preview/PrvImage.png", options).unwrap();
    writer.write_all(&png.into_inner()).unwrap();
    writer.finish().unwrap().into_inner()
}

fn wait_for_worker(parent_pid: u32) -> u32 {
    let children = format!("/proc/{parent_pid}/task/{parent_pid}/children");
    let deadline = Instant::now() + Duration::from_secs(2);
    loop {
        if let Ok(value) = fs::read_to_string(&children) {
            if let Some(pid) = value.split_whitespace().next() {
                return pid.parse().unwrap();
            }
        }
        assert!(
            Instant::now() < deadline,
            "worker process가 시작되지 않았습니다"
        );
        std::thread::sleep(Duration::from_millis(10));
    }
}

fn wait_for_process_exit(pid: u32) {
    let path = format!("/proc/{pid}");
    let deadline = Instant::now() + Duration::from_secs(2);
    while Path::new(&path).exists() {
        assert!(
            Instant::now() < deadline,
            "worker process가 회수되지 않았습니다"
        );
        std::thread::sleep(Duration::from_millis(10));
    }
}

fn wait_with_timeout(child: &mut Child, timeout: Duration) -> ExitStatus {
    let deadline = Instant::now() + timeout;
    loop {
        if let Some(status) = child.try_wait().unwrap() {
            return status;
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            panic!("thumbnailer process timeout");
        }
        std::thread::sleep(Duration::from_millis(10));
    }
}
