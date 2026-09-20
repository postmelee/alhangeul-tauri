use super::*;

#[test]
fn consent_single_slot_and_window_ownership_are_enforced() {
    let service = UiService::default();
    assert!(matches!(
        service.begin("a", Operation::Suite, false),
        Err(ServiceError::ConsentRequired)
    ));
    let (view, permit) = service.begin("a", Operation::Suite, true).unwrap();
    let id = view.snapshot.request_id;
    assert!(permit.is_some());
    assert!(matches!(
        service.begin("b", Operation::Inspect, false),
        Err(ServiceError::Busy)
    ));
    assert!(matches!(
        service.snapshot("b", id),
        Err(ServiceError::NotOwner)
    ));
    assert!(matches!(
        service.cancel("b", id),
        Err(ServiceError::NotOwner)
    ));
    let (recovered, permit) = service.begin("a", Operation::Inspect, false).unwrap();
    assert!(permit.is_none());
    assert_eq!(recovered.snapshot.request_id, id);
    assert_eq!(recovered.operation, Operation::Suite);
    service.close_owner("b");
    assert_eq!(
        service.snapshot("a", id).unwrap().snapshot.status,
        Status::Running
    );
    service.close_owner("a");
    assert_eq!(
        service.snapshot("a", id).unwrap().snapshot.status,
        Status::Cancelling
    );
    assert!(matches!(
        service.begin("b", Operation::Suite, true),
        Err(ServiceError::Busy)
    ));
    service.finish(id, Status::Completed, None);
    assert_eq!(
        service.snapshot("a", id).unwrap().snapshot.status,
        Status::Cancelled
    );
    assert!(service.begin("b", Operation::Inspect, false).is_ok());
}

#[test]
fn result_publication_and_old_worker_cannot_overwrite_a_new_operation() {
    let service = UiService::default();
    let (first, _) = service.begin("a", Operation::Inspect, false).unwrap();
    let id = first.snapshot.request_id;
    service.finish(id, Status::Completed, None);
    let done = service.snapshot("a", id).unwrap();
    assert_eq!(done.snapshot.sequence, 2);
    assert_eq!(done.snapshot.status, Status::Completed);
    let (second, _) = service.begin("b", Operation::Suite, true).unwrap();
    service.finish(id, Status::Failed, Some(ChildResult::Cleaned(false)));
    let current = service.snapshot("b", second.snapshot.request_id).unwrap();
    assert_eq!(current.snapshot.status, Status::Running);
    assert!(current.result.is_none());
    service.cancel("b", current.snapshot.request_id).unwrap();
    service.finish(current.snapshot.request_id, Status::Failed, None);
    assert_eq!(
        service
            .snapshot("b", current.snapshot.request_id)
            .unwrap()
            .snapshot
            .status,
        Status::Failed
    );
}

#[test]
fn bridge_errors_are_fixed_codes_not_native_exception_text() {
    assert_eq!(error_code(ServiceError::Busy), "busy");
    assert_eq!(error_code(ServiceError::NotOwner), "not-owner");
    assert_eq!(
        error_code(ServiceError::ConsentRequired),
        "consent-required"
    );
    assert_eq!(error_code(ServiceError::InvalidOperation), "unavailable");
}
