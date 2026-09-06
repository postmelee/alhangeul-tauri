use image::codecs::png::PngDecoder;
use image::{ColorType, ImageDecoder};
use std::fs::{self, File};
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, ExitStatus};
use std::time::{Duration, Instant};
use tempfile::TempDir;

const TEST_BEHAVIOR: &str = "ALHANGEUL_THUMBNAILER_TEST_BEHAVIOR";
const TEMP_PREFIX: &str = ".alhangeul-thumbnail-";

pub fn binary() -> &'static str {
    env!("CARGO_BIN_EXE_alhangeul-thumbnailer")
}

pub fn run(input: &Path, output: &Path, edge: u32) -> ExitStatus {
    spawn(input, output, edge).wait().unwrap()
}

pub fn spawn(input: &Path, output: &Path, edge: u32) -> Child {
    Command::new(binary())
        .arg(input)
        .arg(output)
        .arg(edge.to_string())
        .spawn()
        .unwrap()
}

pub fn spawn_with_behavior(input: &Path, output: &Path, behavior: &str) -> Child {
    let mut command = Command::new(binary());
    command
        .arg(input)
        .arg(output)
        .arg("64")
        .env(TEST_BEHAVIOR, behavior);
    command.spawn().unwrap()
}

pub fn copy_fixture(directory: &TempDir, name: &str) -> PathBuf {
    let source = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../third_party/rhwp/saved")
        .join(name);
    let destination = directory.path().join(name);
    fs::copy(source, &destination).unwrap();
    destination
}

pub fn assert_png(path: &Path, edge: u32) {
    let decoder = PngDecoder::new(BufReader::new(File::open(path).unwrap())).unwrap();
    assert_eq!(decoder.color_type(), ColorType::Rgba8);
    let (width, height) = decoder.dimensions();
    assert_eq!(width.max(height), edge);
    let mut pixels = vec![0_u8; decoder.total_bytes() as usize];
    decoder.read_image(&mut pixels).unwrap();
    assert_eq!(pixels.len(), width as usize * height as usize * 4);
}

pub fn assert_no_temporaries(directory: &Path) {
    let names = fs::read_dir(directory)
        .unwrap()
        .map(|entry| entry.unwrap().file_name())
        .collect::<Vec<_>>();
    assert!(names
        .iter()
        .all(|name| !name.to_string_lossy().starts_with(TEMP_PREFIX)));
}

pub fn wait_for_limited_worker(parent_pid: u32) -> u32 {
    let children = format!("/proc/{parent_pid}/task/{parent_pid}/children");
    let deadline = Instant::now() + Duration::from_secs(2);
    loop {
        if let Ok(value) = fs::read_to_string(&children) {
            if let Some(pid) = value.split_whitespace().next() {
                let pid = pid.parse().unwrap();
                let limits = fs::read_to_string(format!("/proc/{pid}/limits")).unwrap();
                let address = limits
                    .lines()
                    .find(|line| line.starts_with("Max address space"))
                    .unwrap();
                if address.split_whitespace().collect::<Vec<_>>()
                    == ["Max", "address", "space", "268435456", "268435456", "bytes"]
                {
                    return pid;
                }
            }
        }
        assert!(
            Instant::now() < deadline,
            "worker process의 메모리 제한이 적용되지 않았습니다"
        );
        std::thread::sleep(Duration::from_millis(10));
    }
}

pub fn wait_for_process_exit(pid: u32) {
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

pub fn wait_with_timeout(child: &mut Child, timeout: Duration) -> ExitStatus {
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
