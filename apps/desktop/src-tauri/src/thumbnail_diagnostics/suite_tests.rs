use super::{
    environment::Environment,
    model::*,
    protocol::{Operation, Request},
    results::*,
    service::{Status, WorkPermit},
    suite::{self, Backend},
    suite_plan,
    transport::TransportError,
};
use std::{
    collections::VecDeque,
    time::{Duration, Instant},
};
use uuid::Uuid;

struct Fake {
    replies: VecDeque<(Operation, Result<ChildResult, TransportError>)>,
    calls: Vec<Request>,
    cleanup_deadline: Option<Instant>,
}
impl Backend for Fake {
    fn invoke(
        &mut self,
        request: &Request,
        permit: &WorkPermit,
    ) -> Result<ChildResult, TransportError> {
        super::protocol::validate_request(request, true).unwrap();
        self.calls.push(request.clone());
        if request.operation == Operation::Cleanup {
            self.cleanup_deadline = Some(permit.deadline());
        }
        let (operation, reply) = self.replies.pop_front().expect("unexpected child");
        assert_eq!(request.operation, operation);
        reply
    }
}

fn inspection() -> Inspection {
    let value = serde_json::json!({"osBuild":{"status":"known","value":19045},
        "processX64":true,"apartmentSta":{"status":"known","value":true},
        "elevated":{"status":"known","value":false},"elevationType":{"status":"known","value":3},
        "integrityRid":{"status":"known","value":8192},"enableLua":{"status":"known","value":1},
        "iconsOnly":{"status":"known","value":0},
        "disableThumbnails":[{"status":"missing"},{"status":"missing"},{"status":"missing"},{"status":"missing"}]});
    let environment: Environment = serde_json::from_value(value).unwrap();
    let check = RegistrationCheck {
        ready: true,
        reference_matched: true,
        scope: RegistrationScope::UserOnly,
        finding: Finding::Ready,
    };
    Inspection {
        build_reference: None,
        environment,
        install_kind: InstallKind::Nsis,
        install_records_readable: true,
        registration: [check.clone(), check],
        state_token: "a".repeat(64),
    }
}

fn fake(initial: Inspection) -> Fake {
    let cases: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../../tests/fixtures/windows-thumbnail-app-assessments.json"
    ))
    .unwrap();
    let base: CheckInput = serde_json::from_value(cases["base"].clone()).unwrap();
    let mut replies = VecDeque::from([(
        Operation::Inspect,
        Ok(ChildResult::Inspection(initial.clone())),
    )]);
    if initial.registration.iter().any(|check| check.ready) {
        replies.push_back((Operation::Prepare, Ok(ChildResult::Prepared(true))));
        for (index, extension) in [Extension::Hwp, Extension::Hwpx].into_iter().enumerate() {
            if !initial.registration[index].ready {
                continue;
            }
            for step in suite_plan::steps(extension) {
                let label = step.label.replace("association-hwpx", "association-hwp");
                let probe = base
                    .probes
                    .iter()
                    .find(|record| record.label == label)
                    .unwrap()
                    .result
                    .clone();
                replies.push_back((
                    step.operation,
                    Ok(ChildResult::Probe(ProbeResult {
                        probe,
                        integrity: true,
                        registration_stable: true,
                        state_token: initial.state_token.clone(),
                    })),
                ));
            }
        }
    }
    replies.push_back((
        Operation::Inspect,
        Ok(ChildResult::Inspection(initial.clone())),
    ));
    if initial.registration.iter().any(|check| check.ready) {
        replies.push_back((Operation::Cleanup, Ok(ChildResult::Cleaned(true))));
    }
    Fake {
        replies,
        calls: Vec::new(),
        cleanup_deadline: None,
    }
}

fn permit() -> WorkPermit {
    WorkPermit::isolated(Uuid::new_v4(), Instant::now() + Duration::from_secs(180))
}

#[test]
fn two_formats_require_all_probes_and_cleanup_before_success() {
    let mut backend = fake(inspection());
    let result = suite::run(&mut backend, &permit());
    assert_eq!(result.status, Status::Completed);
    assert!(result.cleanup);
    assert!(result
        .formats
        .iter()
        .all(|format| format.assessment.thumbnail_passed));
    assert!(backend.replies.is_empty());
    assert_eq!(backend.calls.last().unwrap().operation, Operation::Cleanup);
    let scopes: std::collections::HashSet<_> = backend
        .calls
        .iter()
        .filter_map(|call| call.scope_id)
        .collect();
    assert_eq!(scopes.len(), 1);
    let ids: std::collections::HashSet<_> =
        backend.calls.iter().map(|call| call.request_id).collect();
    assert_eq!(ids.len(), backend.calls.len());
}

#[test]
fn skipped_registration_does_not_generate_files_or_call_com() {
    let mut initial = inspection();
    for check in &mut initial.registration {
        check.ready = false;
        check.finding = Finding::OtherHandlerSelected;
    }
    let mut backend = fake(initial);
    let result = suite::run(&mut backend, &permit());
    assert_eq!(backend.calls.len(), 2);
    assert!(backend
        .calls
        .iter()
        .all(|call| call.operation == Operation::Inspect));
    assert!(result
        .formats
        .iter()
        .all(|format| format.assessment.finding == Finding::OtherHandlerSelected));
}

#[test]
fn cleanup_failure_invalidates_even_complete_successful_probes() {
    let mut backend = fake(inspection());
    backend.replies.back_mut().unwrap().1 = Ok(ChildResult::Cleaned(false));
    let result = suite::run(&mut backend, &permit());
    assert_eq!(result.status, Status::Failed);
    assert!(!result.cleanup);
    assert!(result
        .formats
        .iter()
        .all(|format| !format.assessment.evidence_valid));
}

#[test]
fn one_format_success_does_not_promote_the_skipped_format() {
    let mut initial = inspection();
    initial.registration[1].ready = false;
    initial.registration[1].finding = Finding::OtherHandlerSelected;
    let mut backend = fake(initial);
    let result = suite::run(&mut backend, &permit());
    assert_eq!(result.status, Status::Completed);
    assert!(result.formats[0].assessment.thumbnail_passed);
    assert!(!result.formats[1].assessment.thumbnail_passed);
    assert_eq!(
        result.formats[1].assessment.finding,
        Finding::OtherHandlerSelected
    );
    assert!(result.formats[1].input.probes.is_empty());
}

#[test]
fn changed_registration_or_fixture_aborts_and_still_cleans() {
    for mutation in 0..3 {
        let mut backend = fake(inspection());
        if let Ok(ChildResult::Probe(probe)) = &mut backend.replies[3].1 {
            match mutation {
                0 => probe.state_token = "b".repeat(64),
                1 => probe.registration_stable = false,
                _ => probe.integrity = false,
            }
        }
        backend.replies.truncate(4);
        backend
            .replies
            .push_back((Operation::Cleanup, Ok(ChildResult::Cleaned(true))));
        let result = suite::run(&mut backend, &permit());
        assert_eq!(result.status, Status::Failed);
        assert!(result.cleanup);
        assert!(result
            .formats
            .iter()
            .all(|format| !format.assessment.evidence_valid));
    }
}

#[test]
fn failed_preparation_timeout_and_cancel_keep_one_cleanup_deadline() {
    for error in [
        TransportError::Invalid,
        TransportError::TimedOut,
        TransportError::Cancelled,
    ] {
        let mut backend = fake(inspection());
        backend.replies.truncate(1);
        backend.replies.push_back((Operation::Prepare, Err(error)));
        backend
            .replies
            .push_back((Operation::Cleanup, Ok(ChildResult::Cleaned(true))));
        let work = permit();
        let deadline = work.cleanup_deadline(Instant::now());
        let result = suite::run(&mut backend, &work);
        assert_eq!(result.status, error.status());
        assert_eq!(backend.cleanup_deadline, Some(deadline));
        assert!(!result.formats[0].assessment.thumbnail_passed);
    }
}

#[test]
fn final_inspection_change_invalidates_earlier_probe_success() {
    let mut backend = fake(inspection());
    let index = backend.replies.len() - 2;
    if let Ok(ChildResult::Inspection(state)) = &mut backend.replies[index].1 {
        state.state_token = "b".repeat(64);
    }
    let result = suite::run(&mut backend, &permit());
    assert_eq!(result.status, Status::Failed);
    assert!(result
        .formats
        .iter()
        .all(|format| !format.assessment.evidence_valid));
}
