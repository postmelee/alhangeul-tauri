//! Runs the real application binary, never a fabricated handler or registry setup.
#![cfg(windows)]
// Reuse only the low-level supervisor. It selects an explicit EXE only in test cfg.
// Its production callers still select canonical current_exe and the fixed flag.
#[allow(dead_code)]
#[path = "../src/thumbnail_diagnostics/handle.rs"]
mod handle;
#[allow(dead_code)]
#[path = "../src/thumbnail_diagnostics/local_file.rs"]
mod local_file;
#[allow(dead_code)]
#[path = "../src/thumbnail_diagnostics/model.rs"]
mod model;
#[path = "../src/thumbnail_diagnostics/process_pipes.rs"]
mod process_pipes;
#[allow(dead_code)]
#[path = "../src/thumbnail_diagnostics/process_spawn.rs"]
mod process_spawn;
#[allow(dead_code)]
#[path = "../src/thumbnail_diagnostics/protocol.rs"]
mod protocol;
#[allow(dead_code)]
#[path = "../src/thumbnail_diagnostics/reference.rs"]
mod reference;
#[allow(dead_code)]
#[path = "../src/thumbnail_diagnostics/scratch_manifest.rs"]
mod scratch_manifest;
#[allow(dead_code)]
#[path = "../src/thumbnail_diagnostics/service.rs"]
mod service;
mod thumbnail_process_policy;
#[path = "support/thumbnail_processes.rs"]
mod thumbnail_processes;
#[allow(dead_code)]
#[path = "../src/thumbnail_diagnostics/transport.rs"]
mod transport;

use process_pipes::Pipes;
use process_spawn::Child;
use std::{
    path::Path,
    time::{Duration, Instant},
};

struct Output {
    code: u32,
    bytes: Vec<u8>,
    processes: u32,
    observations: thumbnail_processes::Observations,
}

fn run(arguments: &str, input: Option<Vec<u8>>) -> Output {
    let executable = env!("CARGO_BIN_EXE_Alhangeul");
    let pipes = Pipes::create().unwrap();
    let child = Child::test_executable(Path::new(executable), &pipes, arguments).unwrap();
    let Pipes {
        input: writer,
        output,
        error,
        child: ends,
    } = pipes;
    drop(ends);
    let mut held_input = Some(writer);
    let writer =
        input.map(|bytes| process_pipes::write_request(held_input.take().unwrap(), bytes).unwrap());
    let deadline = Instant::now() + Duration::from_secs(22);
    let mut observations = thumbnail_processes::Observations::new(&child, Path::new(executable));
    let (code, bytes) = drain(&child, &output, &error, deadline, &mut observations);
    child.terminate();
    while !child.quiescent() && Instant::now() < deadline {
        std::thread::sleep(Duration::from_millis(10));
    }
    assert!(child.quiescent());
    if let Some(writer) = writer {
        while !writer.is_finished() && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(10));
        }
        assert!(writer.is_finished());
        let _ = writer.join();
    }
    Output {
        code,
        bytes,
        processes: child.test_total_processes().unwrap(),
        observations,
    }
}

fn drain(
    child: &Child,
    output: &handle::OwnedHandle,
    error: &handle::OwnedHandle,
    deadline: Instant,
    observations: &mut thumbnail_processes::Observations,
) -> (u32, Vec<u8>) {
    let (mut bytes, mut errors) = (Vec::new(), Vec::new());
    let (mut closed, mut error_closed) = (false, false);
    loop {
        assert!(
            Instant::now() < deadline,
            "headless child did not exit within its bound; live samples: {observations:?}"
        );
        observations.sample(child);
        if !closed {
            closed = process_pipes::drain(output, &mut bytes, protocol::MAX_RESULT_BYTES).unwrap();
        }
        if !error_closed {
            error_closed = process_pipes::drain(error, &mut errors, 4096).unwrap();
        }
        if let Some(code) = child.exited().unwrap() {
            if closed && error_closed {
                assert!(
                    errors.is_empty(),
                    "headless child must not log private failures"
                );
                return (code, bytes);
            }
        }
        std::thread::sleep(Duration::from_millis(10));
    }
}

#[test]
fn malformed_flag_and_ipc_exit_without_gui_fallback() {
    for flag in [
        "--alhangeul-thumbnail-diagnostic-child=true",
        "--alhangeul-thumbnail-diagnostic-child unwanted.hwp",
    ] {
        let output = run(flag, Some(Vec::new()));
        assert_eq!(output.code, 2);
        assert!(output.bytes.is_empty());
        assert_headless_processes(&output);
    }
    for input in [b"{".to_vec(), vec![b' '; protocol::MAX_REQUEST_BYTES + 1]] {
        let output = run(protocol::CHILD_FLAG, Some(input));
        assert_ne!(output.code, 0);
        assert!(output.bytes.is_empty());
        assert_headless_processes(&output);
    }
}

#[test]
fn inspect_returns_typed_evidence_without_starting_a_webview_process() {
    let id = uuid::Uuid::new_v4();
    let input = serde_json::to_vec(&serde_json::json!({"schemaVersion":1,
        "requestId":id,"operation":"inspect","fixtureId":null,"consent":false}))
    .unwrap();
    let output = run(protocol::CHILD_FLAG, Some(input));
    assert_eq!(output.code, 0);
    assert_headless_processes(&output);
    let reply: serde_json::Value = serde_json::from_slice(&output.bytes).unwrap();
    assert_eq!(reply["requestId"], id.to_string());
    assert_eq!(reply["operation"], "inspect");
    assert_eq!(reply["result"]["kind"], "inspection");
    assert!(reply["result"]["value"]["environment"].is_object());
    assert_eq!(
        reply["result"]["value"]["registration"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
}

#[test]
fn missing_stdin_eof_is_stopped_by_the_real_child_watchdog() {
    let output = run(protocol::CHILD_FLAG, None);
    assert_eq!(output.code, 124);
    assert!(output.bytes.is_empty());
    assert_headless_processes(&output);
}

fn assert_headless_processes(output: &Output) {
    assert!(
        output
            .observations
            .accepts(output.processes, cfg!(debug_assertions)),
        "unexpected or incomplete job evidence; lifetime count: {}, observations: {:?}",
        output.processes,
        output.observations
    );
}

#[test]
fn dropping_the_job_reclaims_the_owned_application_process() {
    use windows::Win32::{Foundation::*, System::Threading::*};
    let pipes = Pipes::create().unwrap();
    let child = Child::test_executable(
        Path::new(env!("CARGO_BIN_EXE_Alhangeul")),
        &pipes,
        protocol::CHILD_FLAG,
    )
    .unwrap();
    let mut process = HANDLE::default();
    unsafe {
        DuplicateHandle(
            GetCurrentProcess(),
            child.process.0,
            GetCurrentProcess(),
            &mut process,
            0,
            false,
            DUPLICATE_SAME_ACCESS,
        )
    }
    .unwrap();
    let observed = handle::OwnedHandle(process);
    // Keep input open: normal completion cannot explain the observed exit.
    drop(child);
    assert_eq!(
        unsafe { WaitForSingleObject(observed.0, 2000) },
        WAIT_OBJECT_0
    );
}
