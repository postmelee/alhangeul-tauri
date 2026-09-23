use super::model::{Finding, Observation, RegistrationCheck, RegistrationScope, HANDLER_CLSID};

/// Preflight facts, not paths; registration scope is independent of installer kind.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Evidence {
    pub user_class: Observation<bool>,
    pub machine_class: Observation<bool>,
    pub selected_handler: Observation<String>,
    pub path_matches: Observation<bool>,
    pub apartment_matches: Observation<bool>,
    pub reference_matches: bool,
    pub environment_complete: bool,
    pub display_restricted: bool,
}

pub fn scope(user: &Observation<bool>, machine: &Observation<bool>) -> RegistrationScope {
    match (user, machine) {
        (Observation::Known(true), Observation::Missing) => RegistrationScope::UserOnly,
        (Observation::Missing, Observation::Known(true)) => RegistrationScope::MachineOnly,
        (Observation::Known(true), Observation::Known(true)) => RegistrationScope::Ambiguous,
        _ => RegistrationScope::Unknown,
    }
}

pub fn inspect(evidence: &Evidence) -> RegistrationCheck {
    let scope = scope(&evidence.user_class, &evidence.machine_class);
    let finding = if !evidence.environment_complete {
        Finding::DiagnosticInvalid
    } else if evidence.display_restricted {
        Finding::DisplayPolicyRestricted
    } else if scope == RegistrationScope::Ambiguous {
        Finding::RegistrationAmbiguous
    } else if scope == RegistrationScope::Unknown {
        Finding::RegistrationMismatch
    } else if !matches!(&evidence.selected_handler, Observation::Known(id)
        if id.eq_ignore_ascii_case(HANDLER_CLSID))
    {
        if matches!(evidence.selected_handler, Observation::Known(_)) {
            Finding::OtherHandlerSelected
        } else {
            Finding::DiagnosticInvalid
        }
    } else if evidence.path_matches != Observation::Known(true)
        || evidence.apartment_matches != Observation::Known(true)
    {
        Finding::RegistrationMismatch
    } else if !evidence.reference_matches {
        Finding::ReferenceMismatch
    } else {
        Finding::Ready
    };
    RegistrationCheck {
        ready: finding == Finding::Ready,
        reference_matched: evidence.reference_matches,
        scope,
        finding,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid() -> Evidence {
        Evidence {
            user_class: Observation::Known(true),
            machine_class: Observation::Missing,
            selected_handler: Observation::Known(HANDLER_CLSID.into()),
            path_matches: Observation::Known(true),
            apartment_matches: Observation::Known(true),
            reference_matches: true,
            environment_complete: true,
            display_restricted: false,
        }
    }

    #[test]
    fn only_complete_unambiguous_matching_registration_is_ready() {
        assert!(inspect(&valid()).ready);
        let mut evidence = valid();
        evidence.machine_class = Observation::Known(true);
        assert_eq!(inspect(&evidence).finding, Finding::RegistrationAmbiguous);
        evidence.machine_class = Observation::Unreadable;
        assert!(!inspect(&evidence).ready);
        evidence = valid();
        evidence.reference_matches = false;
        assert_eq!(inspect(&evidence).finding, Finding::ReferenceMismatch);
        evidence = valid();
        evidence.apartment_matches = Observation::Missing;
        assert_eq!(inspect(&evidence).finding, Finding::RegistrationMismatch);
    }

    #[test]
    fn selected_other_handler_and_incomplete_environment_skip_activation() {
        let mut evidence = valid();
        evidence.selected_handler =
            Observation::Known("{00000000-0000-0000-0000-000000000000}".into());
        assert_eq!(inspect(&evidence).finding, Finding::OtherHandlerSelected);
        evidence.selected_handler = Observation::Unreadable;
        assert_eq!(inspect(&evidence).finding, Finding::DiagnosticInvalid);
        evidence = valid();
        evidence.environment_complete = false;
        assert!(!inspect(&evidence).ready);
        evidence = valid();
        evidence.display_restricted = true;
        assert_eq!(inspect(&evidence).finding, Finding::DisplayPolicyRestricted);
    }
}
