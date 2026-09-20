use super::assessment::assess;
use super::model::{Assessment, CheckInput, Finding, Observation};
use serde_json::Value;

const CASES: &str =
    include_str!("../../../../../tests/fixtures/windows-thumbnail-app-assessments.json");

#[test]
fn shared_powershell_cases_match_native_assessment() {
    let fixture: Value = serde_json::from_str(CASES).unwrap();
    assert_eq!(fixture["schemaVersion"], 1);
    let cases = fixture["cases"].as_array().unwrap();
    assert!(cases.len() >= 40);
    for case in cases {
        let mut input = fixture["base"].clone();
        for mutation in case["mutations"].as_array().unwrap() {
            *input
                .pointer_mut(mutation["pointer"].as_str().unwrap())
                .unwrap() = mutation["value"].clone();
        }
        let parsed: CheckInput = serde_json::from_value(input).unwrap();
        let expected: Assessment = serde_json::from_value(case["expected"].clone()).unwrap();
        assert_eq!(assess(&parsed), expected, "{}", case["id"]);
    }
}

#[test]
fn observation_does_not_coalesce_missing_unreadable_or_zero() {
    let states = [
        Observation::Known(0_u32),
        Observation::Missing,
        Observation::Unreadable,
    ];
    for (index, state) in states.iter().enumerate() {
        let encoded = serde_json::to_string(state).unwrap();
        let decoded: Observation<u32> = serde_json::from_str(&encoded).unwrap();
        assert_eq!(*state, decoded);
        for other in &states[..index] {
            assert_ne!(encoded, serde_json::to_string(other).unwrap());
        }
    }
}

#[test]
fn untrusted_extra_fields_are_not_accepted_as_public_evidence() {
    let fixture: Value = serde_json::from_str(CASES).unwrap();
    let mut input = fixture["base"].clone();
    input["probes"][0]["Result"]["privatePath"] = Value::String("private".into());
    assert!(serde_json::from_value::<CheckInput>(input).is_err());
}

#[test]
fn environment_alone_cannot_produce_known_failure_or_success() {
    let fixture: Value = serde_json::from_str(CASES).unwrap();
    let mut input: CheckInput = serde_json::from_value(fixture["base"].clone()).unwrap();
    input.probes.clear();
    assert_eq!(assess(&input).finding, Finding::DiagnosticInvalid);
}
