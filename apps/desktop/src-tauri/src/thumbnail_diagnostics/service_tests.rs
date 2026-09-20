use super::protocol::{Operation, STATE_TIMEOUT_SECONDS, SUITE_TIMEOUT_SECONDS};
use super::service::*;
use std::time::{Duration, Instant};

#[test]
fn cleanup_budget_is_shared_and_cannot_extend_an_expired_operation() {
    let now = Instant::now();
    let work = WorkPermit::isolated(uuid::Uuid::new_v4(), now + Duration::from_secs(180));
    assert_eq!(work.cleanup_deadline(now), now + Duration::from_secs(5));
    assert_eq!(
        work.cleanup_deadline(now + Duration::from_secs(4)),
        now + Duration::from_secs(5)
    );
    let expired = WorkPermit::isolated(uuid::Uuid::new_v4(), now);
    assert_eq!(
        expired.cleanup_deadline(now + Duration::from_secs(10)),
        now + Duration::from_secs(5)
    );
}

#[test]
fn service_requires_consent_and_owns_exact_window_and_request() {
    let service = DiagnosticService::default();
    let now = Instant::now();
    assert!(matches!(
        service.begin("main", Operation::Suite, false, now),
        Err(ServiceError::ConsentRequired)
    ));
    assert!(matches!(
        service.begin("main", Operation::Shell, true, now),
        Err(ServiceError::InvalidOperation)
    ));
    let work = service.begin("main", Operation::Suite, true, now).unwrap();
    assert!(matches!(
        service.begin("second", Operation::Inspect, false, now),
        Err(ServiceError::Busy)
    ));
    assert_eq!(
        service.snapshot("second", work.request_id),
        Err(ServiceError::NotOwner)
    );
    assert_eq!(
        service.cancel("second", work.request_id),
        Err(ServiceError::NotOwner)
    );
    assert_eq!(work.stop_reason(now), None);
    service.cancel("main", work.request_id).unwrap();
    assert_eq!(work.stop_reason(now), Some(Status::Cancelled));
    assert!(matches!(
        service.begin("second", Operation::Inspect, false, now),
        Err(ServiceError::Busy)
    ));
    service
        .finish(work.request_id, Status::Completed, now)
        .unwrap();
    assert_eq!(
        service.snapshot("main", work.request_id).unwrap().status,
        Status::Cancelled
    );
    let next = service
        .begin("second", Operation::Inspect, false, now)
        .unwrap();
    assert_ne!(next.request_id, work.request_id);
    assert_eq!(
        service.finish(work.request_id, Status::Completed, now),
        Err(ServiceError::NotOwner)
    );
}

#[test]
fn timeouts_cannot_be_overwritten_by_late_success() {
    for (operation, seconds) in [
        (Operation::Inspect, STATE_TIMEOUT_SECONDS),
        (Operation::Suite, SUITE_TIMEOUT_SECONDS),
    ] {
        let service = DiagnosticService::default();
        let now = Instant::now();
        let work = service.begin("main", operation, true, now).unwrap();
        let deadline = now + Duration::from_secs(seconds);
        assert_eq!(work.stop_reason(deadline - Duration::from_nanos(1)), None);
        assert_eq!(work.stop_reason(deadline), Some(Status::TimedOut));
        service
            .finish(work.request_id, Status::Completed, deadline)
            .unwrap();
        let snapshot = service.snapshot("main", work.request_id).unwrap();
        assert_eq!(snapshot.status, Status::TimedOut);
        assert_eq!(snapshot.sequence, 2);
    }
}

#[test]
fn cleanup_failure_stays_failed_and_cancel_is_idempotent() {
    let service = DiagnosticService::default();
    let now = Instant::now();
    let work = service.begin("main", Operation::Suite, true, now).unwrap();
    service.cancel("main", work.request_id).unwrap();
    service.cancel("main", work.request_id).unwrap();
    assert_eq!(
        service.snapshot("main", work.request_id).unwrap().sequence,
        2
    );
    assert_eq!(
        service.finish(work.request_id, Status::Running, now),
        Err(ServiceError::InvalidTransition)
    );
    service
        .finish(work.request_id, Status::Failed, now)
        .unwrap();
    assert_eq!(
        service.snapshot("main", work.request_id).unwrap().status,
        Status::Failed
    );
}
