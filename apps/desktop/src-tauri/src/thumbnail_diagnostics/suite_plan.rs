//! Fixed sequence: no direct COM activation before the initial Shell observations.
use super::{
    model::Extension,
    protocol::{FixtureId, Operation, Request},
    scratch_manifest::Slot,
};
use uuid::Uuid;

#[derive(Debug)]
pub struct Step {
    pub label: String,
    pub operation: Operation,
    pub fixture: FixtureId,
    pub slot: Option<Slot>,
}

impl Step {
    pub fn request(&self, scope: Uuid) -> Request {
        Request {
            schema_version: 1,
            request_id: Uuid::new_v4(),
            operation: self.operation,
            fixture_id: Some(self.fixture),
            consent: true,
            scope_id: self.slot.map(|_| scope),
            slot: self.slot,
        }
    }
}

pub fn steps(extension: Extension) -> Vec<Step> {
    let fixture = match extension {
        Extension::Hwp => FixtureId::Hwp,
        Extension::Hwpx => FixtureId::Hwpx,
    };
    let mut steps = vec![Step {
        label: format!("manual-association-{}", extension.suffix()),
        operation: Operation::Association,
        fixture,
        slot: None,
    }];
    let copies = copies(extension);
    for (operation, suffix, index, after) in [
        (Operation::Shell, "shell", 0, false),
        (Operation::CacheOnly, "cache-only", 1, false),
        (Operation::ForceExtract, "force-extract", 2, false),
        (Operation::CacheOnly, "cache-only", 2, true),
    ] {
        for (role, offset) in [("document", 0), ("control-jpg", 3)] {
            let slot = copies[index + offset];
            let prefix = if after {
                "manual-after-force"
            } else {
                "manual"
            };
            steps.push(Step {
                label: format!("{prefix}-{role}-{suffix}"),
                operation,
                fixture: slot.fixture(),
                slot: Some(slot),
            });
        }
    }
    steps.push(Step {
        label: "manual-activate".into(),
        operation: Operation::Activate,
        fixture,
        slot: None,
    });
    steps
}

fn copies(extension: Extension) -> [Slot; 6] {
    match extension {
        Extension::Hwp => [
            Slot::HwpShell,
            Slot::HwpCache,
            Slot::HwpForce,
            Slot::HwpJpgShell,
            Slot::HwpJpgCache,
            Slot::HwpJpgForce,
        ],
        Extension::Hwpx => [
            Slot::HwpxShell,
            Slot::HwpxCache,
            Slot::HwpxForce,
            Slot::HwpxJpgShell,
            Slot::HwpxJpgCache,
            Slot::HwpxJpgForce,
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::super::{assessment::expected_labels, protocol::validate_request};
    use super::*;

    #[test]
    fn plans_have_exact_ten_labels_and_direct_activation_is_last() {
        for extension in [Extension::Hwp, Extension::Hwpx] {
            let steps = steps(extension);
            let mut actual: Vec<_> = steps.iter().map(|step| step.label.clone()).collect();
            let mut expected = expected_labels(extension);
            actual.sort();
            expected.sort();
            assert_eq!(actual, expected);
            assert_eq!(steps[0].operation, Operation::Association);
            assert_eq!(steps[9].operation, Operation::Activate);
            assert!(steps[1..9]
                .iter()
                .all(|step| step.operation != Operation::Activate));
        }
    }

    #[test]
    fn fresh_copies_only_reuse_force_for_after_force_cache() {
        let mut ids = std::collections::HashSet::new();
        let scope = Uuid::new_v4();
        for extension in [Extension::Hwp, Extension::Hwpx] {
            let steps = steps(extension);
            for step in &steps {
                let request = step.request(scope);
                assert!(validate_request(&request, true).is_ok());
                assert!(ids.insert(request.request_id));
                assert_eq!(request.scope_id, step.slot.map(|_| scope));
                if let Some(slot) = step.slot {
                    assert_eq!(slot.group(), extension);
                }
            }
            let fresh: std::collections::HashSet<_> = steps[1..7]
                .iter()
                .map(|step| step.slot.unwrap().filename())
                .collect();
            assert_eq!(fresh.len(), 6);
            assert_eq!(steps[5].slot, steps[7].slot);
            assert_eq!(steps[6].slot, steps[8].slot);
        }
    }
}
