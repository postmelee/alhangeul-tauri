use super::model::*;
use std::collections::BTreeMap;

pub fn expected_labels(extension: Extension) -> Vec<String> {
    let mut labels = vec![
        format!("manual-association-{}", extension.suffix()),
        "manual-activate".into(),
    ];
    for role in ["document", "control-jpg"] {
        for mode in ["shell", "cache-only", "force-extract"] {
            labels.push(format!("manual-{role}-{mode}"));
        }
        labels.push(format!("manual-after-force-{role}-cache-only"));
    }
    labels
}

pub fn bitmap_ok(probe: &Probe) -> bool {
    probe.status == "ok"
        && probe.hresult == "0x00000000"
        && probe.bitmap_present == Some(true)
        && probe.width.is_some_and(|n| (1..=1024).contains(&n))
        && probe.height.is_some_and(|n| (1..=1024).contains(&n))
}

fn expected_mode(label: &str) -> &'static str {
    if label.contains("-association-") {
        "association"
    } else if label.ends_with("-activate") {
        "activate"
    } else if label.ends_with("-cache-only") {
        "cache-only"
    } else if label.ends_with("-force-extract") {
        "force-extract"
    } else {
        "shell"
    }
}

fn valid_hresult(value: &str) -> bool {
    value.len() == 10
        && value.starts_with("0x")
        && value[2..]
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'A'..=b'F').contains(&byte))
}

pub fn probe_valid(probe: &Probe, label: &str) -> bool {
    if probe.schema_version != 1
        || probe.apartment != "STA"
        || probe.elapsed_ms < 0
        || !valid_hresult(&probe.hresult)
        || probe.mode != expected_mode(label)
    {
        return false;
    }
    let phases = [
        "AssocQueryStringW",
        "CoCreateInstance.handler",
        "SHCreateItemFromParsingName.imageFactory",
        "IShellItemImageFactory.GetImage",
        "SHCreateItemFromParsingName.shellItem",
        "CoCreateInstance.thumbnailCache",
        "IThumbnailCache.GetThumbnail",
        "ISharedBitmap.GetSharedBitmap",
    ];
    if !phases.contains(&probe.phase.as_str()) {
        return false;
    }
    if probe.status == "failed" {
        return probe.bitmap_present != Some(true)
            && probe.width.is_none()
            && probe.height.is_none()
            && (probe.mode != "cache-only" || probe.phase == "IThumbnailCache.GetThumbnail")
            && matches!(probe.hresult.as_bytes()[2], b'8'..=b'9' | b'A'..=b'F');
    }
    successful_probe_valid(probe)
}

fn successful_probe_valid(probe: &Probe) -> bool {
    if probe.status != "ok" || probe.hresult != "0x00000000" {
        return false;
    }
    match probe.mode.as_str() {
        "association" => probe.phase == "AssocQueryStringW",
        "activate" => probe.phase == "CoCreateInstance.handler",
        "shell" => {
            bitmap_ok(probe)
                && probe.request_flags == Some(8)
                && probe.phase == "IShellItemImageFactory.GetImage"
        }
        "cache-only" | "force-extract" => {
            bitmap_ok(probe)
                && probe.request_flags == Some(if probe.mode == "cache-only" { 1 } else { 4 })
                && probe.phase == "ISharedBitmap.GetSharedBitmap"
        }
        _ => false,
    }
}

fn evidence(input: &CheckInput) -> Option<BTreeMap<&str, &Probe>> {
    let labels = expected_labels(input.extension);
    if input.probes.len() != labels.len() {
        return None;
    }
    let mut map = BTreeMap::new();
    for record in &input.probes {
        if !labels.contains(&record.label)
            || !probe_valid(&record.result, &record.label)
            || map.insert(record.label.as_str(), &record.result).is_some()
        {
            return None;
        }
    }
    let label = format!("manual-association-{}", input.extension.suffix());
    if !map[label.as_str()]
        .resolved_handler
        .as_deref()
        .is_some_and(|value| value.eq_ignore_ascii_case(HANDLER_CLSID))
    {
        return None;
    }
    Some(map)
}

pub fn assess(input: &CheckInput) -> Assessment {
    let registration = &input.registration;
    if !input.integrity || !input.cleanup || !input.registration_stable {
        return Assessment::invalid(Finding::DiagnosticInvalid);
    }
    if !registration.ready {
        let finding = match registration.finding {
            Finding::OtherHandlerSelected
            | Finding::RegistrationAmbiguous
            | Finding::RegistrationMismatch
            | Finding::ReferenceMismatch
            | Finding::DisplayPolicyRestricted => registration.finding,
            _ => Finding::DiagnosticInvalid,
        };
        return Assessment::invalid(finding);
    }
    if registration.finding != Finding::Ready
        || !registration.reference_matched
        || !matches!(
            registration.scope,
            RegistrationScope::UserOnly | RegistrationScope::MachineOnly
        )
    {
        return Assessment::invalid(Finding::DiagnosticInvalid);
    }
    let Some(probes) = evidence(input) else {
        return Assessment::invalid(Finding::DiagnosticInvalid);
    };
    classify(input, &probes)
}

fn classify(input: &CheckInput, probes: &BTreeMap<&str, &Probe>) -> Assessment {
    let mut result = Assessment {
        finding: Finding::UnclassifiedFailure,
        recommended_action: Action::Investigate,
        evidence_valid: true,
        thumbnail_passed: false,
    };
    if !bitmap_ok(probes["manual-control-jpg-shell"])
        || !bitmap_ok(probes["manual-control-jpg-force-extract"])
    {
        result.finding = Finding::ShellControlFailed;
        result.recommended_action = Action::CheckShellEnvironment;
        return result;
    }
    if probes["manual-activate"].status != "ok" {
        return result;
    }
    let shell = probes["manual-document-shell"];
    let force = probes["manual-document-force-extract"];
    if bitmap_ok(shell) && bitmap_ok(force) {
        result.finding = Finding::ThumbnailApiOk;
        result.recommended_action = Action::None;
        result.thumbnail_passed = true;
    } else if input.registration.scope == RegistrationScope::UserOnly
        && shell.phase == "IShellItemImageFactory.GetImage"
        && force.phase == "IThumbnailCache.GetThumbnail"
        && [shell, force]
            .iter()
            .all(|p| p.status == "failed" && p.hresult == "0x80040154")
    {
        result.finding = Finding::PerUserShellActivationFailed;
        result.recommended_action = if input.install_kind == InstallKind::Nsis {
            Action::ConsiderMsi
        } else {
            Action::CheckInstallHistory
        };
    }
    result
}
