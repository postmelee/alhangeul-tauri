use super::protocol::*;
use serde_json::json;

fn request(operation: &str, consent: bool) -> serde_json::Value {
    json!({
        "schemaVersion": 1,
        "requestId": "aa616366-f226-4eeb-b731-87c9a8cf9c70",
        "operation": operation,
        "fixtureId": null,
        "consent": consent,
    })
}

#[test]
fn decode_is_bounded_and_rejects_unsafe_or_unknown_fields() {
    assert_eq!(decode_request(&[], false).unwrap_err(), RequestError::Size);
    assert_eq!(
        decode_request(&vec![b' '; MAX_REQUEST_BYTES + 1], false).unwrap_err(),
        RequestError::Size
    );
    let mut input = request("inspect", false);
    input["path"] = json!("C:\\private.hwp");
    assert_eq!(
        decode_request(&serde_json::to_vec(&input).unwrap(), false).unwrap_err(),
        RequestError::Schema
    );
    assert!(decode_request(b"{}", false).is_err());
}

#[test]
fn active_operations_require_consent_and_suite_cannot_recurse() {
    assert!(decode_request(
        &serde_json::to_vec(&request("inspect", false)).unwrap(),
        false
    )
    .is_ok());
    for operation in ["prepare", "activate", "suite"] {
        let input = serde_json::to_vec(&request(operation, false)).unwrap();
        assert_eq!(
            decode_request(&input, false).unwrap_err(),
            RequestError::Consent
        );
    }
    let suite = serde_json::to_vec(&request("suite", true)).unwrap();
    assert!(decode_request(&suite, false).is_ok());
    assert_eq!(
        decode_request(&suite, true).unwrap_err(),
        RequestError::RecursiveSuite
    );
}

#[test]
fn fixed_fixture_and_request_identity_are_required() {
    let mut input = request("shell", true);
    assert_eq!(
        decode_request(&serde_json::to_vec(&input).unwrap(), false).unwrap_err(),
        RequestError::Fixture
    );
    input["fixtureId"] = json!("hwp");
    input["scopeId"] = json!("6098d338-ee2b-402b-be65-bc396c601491");
    input["slot"] = json!("hwp-shell");
    assert!(decode_request(&serde_json::to_vec(&input).unwrap(), false).is_ok());
    input["fixtureId"] = json!("../../private.hwp");
    assert!(decode_request(&serde_json::to_vec(&input).unwrap(), false).is_err());
    input["fixtureId"] = json!("hwp");
    input["requestId"] = json!("00000000-0000-0000-0000-000000000000");
    assert_eq!(
        decode_request(&serde_json::to_vec(&input).unwrap(), false).unwrap_err(),
        RequestError::Schema
    );
}

#[test]
fn copy_slots_cannot_select_other_formats_or_reuse_shell_inputs_for_force() {
    let mut input = request("shell", true);
    input["fixtureId"] = json!("hwp");
    input["slot"] = json!("hwp-shell");
    assert_eq!(
        decode_request(&serde_json::to_vec(&input).unwrap(), true).unwrap_err(),
        RequestError::Scope
    );
    input["scopeId"] = json!("6098d338-ee2b-402b-be65-bc396c601491");
    input["slot"] = json!("hwpx-shell");
    assert_eq!(
        decode_request(&serde_json::to_vec(&input).unwrap(), true).unwrap_err(),
        RequestError::Fixture
    );
    input["slot"] = json!("hwp-force");
    assert!(decode_request(&serde_json::to_vec(&input).unwrap(), true).is_err());
    input["operation"] = json!("force-extract");
    assert!(decode_request(&serde_json::to_vec(&input).unwrap(), true).is_ok());
    input["operation"] = json!("cache-only");
    assert!(decode_request(&serde_json::to_vec(&input).unwrap(), true).is_ok());
}

#[test]
fn limits_and_child_flag_are_fixed_product_contracts() {
    assert_eq!(CHILD_FLAG, "--alhangeul-thumbnail-diagnostic-child");
    assert_eq!(MAX_RESULT_BYTES, 256 * 1024);
    assert_eq!(STATE_TIMEOUT_SECONDS, 15);
    assert_eq!(PROBE_TIMEOUT_SECONDS, 30);
    assert_eq!(SUITE_TIMEOUT_SECONDS, 180);
    assert_eq!(CLEANUP_TIMEOUT_SECONDS, 5);
}
