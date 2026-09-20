//! Windows execution tests, not substitutes for installed headless acceptance.
use super::{
    process,
    process_pipes::{self, Pipes},
    protocol::{Operation, Request},
    service::DiagnosticService,
    transport::TransportError,
};
use std::time::{Duration, Instant};

#[test]
fn pre_cancelled_and_expired_permits_do_not_spawn_a_process() {
    let service = DiagnosticService::default();
    let permit = service
        .begin("test", Operation::Inspect, false, Instant::now())
        .unwrap();
    let request: Request = serde_json::from_value(serde_json::json!({ "schemaVersion": 1,
        "requestId": permit.request_id, "operation": "inspect", "fixtureId": null,
        "consent": false }))
    .unwrap();
    service.cancel("test", permit.request_id).unwrap();
    assert_eq!(
        process::run::<bool>(&request, &permit, false),
        Err(TransportError::Cancelled)
    );
    let service = DiagnosticService::default();
    let permit = service
        .begin(
            "test",
            Operation::Inspect,
            false,
            Instant::now() - Duration::from_secs(20),
        )
        .unwrap();
    assert_eq!(
        process::run::<bool>(&request, &permit, false),
        Err(TransportError::TimedOut)
    );
}

#[test]
fn pipe_drain_observes_eof_and_bounds_without_waiting_for_more_data() {
    let Pipes {
        input,
        output: _output,
        error: _error,
        child,
    } = Pipes::create().unwrap();
    let writer = process_pipes::write_request(input, vec![b'x'; 100]).unwrap();
    let deadline = Instant::now() + Duration::from_secs(2);
    let mut bytes = Vec::new();
    let mut closed = false;
    while Instant::now() < deadline && !closed {
        closed = process_pipes::drain(&child[0], &mut bytes, 100).unwrap();
        std::thread::sleep(Duration::from_millis(1));
    }
    assert!(closed);
    assert_eq!(bytes, vec![b'x'; 100]);
    assert!(writer.is_finished());
    assert!(writer.join().unwrap());
}

#[test]
fn pipe_overflow_is_rejected_before_allocating_unbounded_output() {
    let Pipes {
        input,
        output: _output,
        error: _error,
        child,
    } = Pipes::create().unwrap();
    let writer = process_pipes::write_request(input, vec![b'x'; 100]).unwrap();
    let deadline = Instant::now() + Duration::from_secs(2);
    while !writer.is_finished() && Instant::now() < deadline {
        std::thread::sleep(Duration::from_millis(1));
    }
    assert!(writer.is_finished());
    let mut bytes = Vec::new();
    assert_eq!(
        process_pipes::drain(&child[0], &mut bytes, 10),
        Err(TransportError::Size)
    );
    assert!(bytes.is_empty());
    assert!(writer.join().unwrap());
}
