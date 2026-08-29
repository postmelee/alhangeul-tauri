#![cfg_attr(not(target_os = "linux"), allow(dead_code, unused_imports))]

#[cfg(not(target_os = "linux"))]
compile_error!("alhangeul-linux-thumbnailer supports Linux only");

mod cli;
mod output;
mod render;

use alhangeul_document_preview::limits::FRAME_SELECTION_DEADLINE_MS;
use cli::{Invocation, Request, INTERNAL_WORKER_FLAG};
use output::PendingOutput;
use std::process::{Child, Command, ExitCode, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

static INTERRUPTED: AtomicBool = AtomicBool::new(false);
const TEST_BEHAVIOR: &str = "ALHANGEUL_THUMBNAILER_TEST_BEHAVIOR";

fn main() -> ExitCode {
    let result = std::panic::catch_unwind(run);
    if matches!(result, Ok(Ok(()))) {
        ExitCode::SUCCESS
    } else {
        eprintln!("alhangeul-thumbnailer: request failed");
        ExitCode::FAILURE
    }
}

fn run() -> Result<(), ()> {
    let invocation = cli::parse(std::env::args_os().skip(1)).map_err(|_| ())?;
    match invocation {
        Invocation::Supervisor(request) => run_supervisor(&request),
        Invocation::Worker(request) => render::run_worker(&request).map_err(|_| ()),
    }
}

fn run_supervisor(request: &Request) -> Result<(), ()> {
    INTERRUPTED.store(false, Ordering::SeqCst);
    install_signal_handlers()?;
    let mut pending = PendingOutput::new(&request.output).map_err(|_| ())?;
    let started = Instant::now();
    let mut child = ChildGuard::spawn(request, pending.path()).map_err(|_| ())?;
    let deadline = started + Duration::from_millis(FRAME_SELECTION_DEADLINE_MS);
    let status = child.wait_until(deadline).map_err(|_| ())?;
    if !status.success() || INTERRUPTED.load(Ordering::SeqCst) {
        return Err(());
    }
    pending
        .commit(&request.output, request.edge)
        .map_err(|_| ())
}

struct ChildGuard {
    child: Option<Child>,
}

impl ChildGuard {
    fn spawn(request: &Request, temporary: &std::path::Path) -> std::io::Result<Self> {
        let mut command = Command::new(std::env::current_exe()?);
        command
            .arg(INTERNAL_WORKER_FLAG)
            .arg(&request.input)
            .arg(temporary)
            .arg(request.edge.to_string())
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .env_clear();
        #[cfg(debug_assertions)]
        if let Some(behavior) = std::env::var_os(TEST_BEHAVIOR) {
            command.env(TEST_BEHAVIOR, behavior);
        }
        Ok(Self {
            child: Some(command.spawn()?),
        })
    }

    fn wait_until(&mut self, deadline: Instant) -> std::io::Result<std::process::ExitStatus> {
        loop {
            if INTERRUPTED.load(Ordering::SeqCst) || Instant::now() >= deadline {
                self.terminate_and_wait();
                return Err(std::io::Error::new(
                    std::io::ErrorKind::TimedOut,
                    "worker deadline or signal",
                ));
            }
            if let Some(status) = self.child_mut()?.try_wait()? {
                self.child = None;
                return Ok(status);
            }
            let remaining = deadline.saturating_duration_since(Instant::now());
            std::thread::sleep(remaining.min(Duration::from_millis(10)));
        }
    }

    fn child_mut(&mut self) -> std::io::Result<&mut Child> {
        self.child
            .as_mut()
            .ok_or_else(|| std::io::Error::other("worker already reaped"))
    }

    fn terminate_and_wait(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

impl Drop for ChildGuard {
    fn drop(&mut self) {
        self.terminate_and_wait();
    }
}

extern "C" fn mark_interrupted(_: libc::c_int) {
    INTERRUPTED.store(true, Ordering::SeqCst);
}

fn install_signal_handlers() -> Result<(), ()> {
    for signal in [libc::SIGHUP, libc::SIGINT, libc::SIGTERM] {
        install_signal(signal)?;
    }
    Ok(())
}

fn install_signal(signal: libc::c_int) -> Result<(), ()> {
    // SAFETY: zeroed `sigaction` is initialized below before it is installed.
    let mut action = unsafe { std::mem::zeroed::<libc::sigaction>() };
    action.sa_sigaction = mark_interrupted as libc::sighandler_t;
    // SAFETY: `sa_mask` points to initialized storage owned by `action`.
    if unsafe { libc::sigemptyset(&mut action.sa_mask) } != 0 {
        return Err(());
    }
    // SAFETY: the handler has C ABI, static lifetime, and only updates an AtomicBool.
    if unsafe { libc::sigaction(signal, &action, std::ptr::null_mut()) } != 0 {
        return Err(());
    }
    Ok(())
}
