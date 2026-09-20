//! Orchestration contract, independent of Windows APIs. Only the native backend
//! is compiled in production; synthetic backends exist in tests only.
use super::{
    assessment,
    model::{Assessment, CheckInput, Extension, Finding, Record},
    protocol::{Operation, Request},
    results::{self, ChildResult, FormatResult, Inspection, SuiteResult},
    service::{Status, WorkPermit},
    suite_plan,
    transport::TransportError,
};
use std::time::Instant;
use uuid::Uuid;

pub trait Backend {
    fn invoke(
        &mut self,
        request: &Request,
        permit: &WorkPermit,
    ) -> Result<ChildResult, TransportError>;
}

pub fn request(operation: Operation, scope: Uuid) -> Request {
    Request {
        schema_version: 1,
        request_id: Uuid::new_v4(),
        operation,
        fixture_id: None,
        consent: true,
        scope_id: matches!(operation, Operation::Prepare | Operation::Cleanup).then_some(scope),
        slot: None,
    }
}

pub fn run(backend: &mut impl Backend, permit: &WorkPermit) -> SuiteResult {
    let scope = Uuid::new_v4();
    let mut result = SuiteResult {
        status: Status::Failed,
        inspection: None,
        cleanup: true,
        formats: Vec::new(),
    };
    let initial = match inspect(backend, permit, scope) {
        Ok(initial) => initial,
        Err(error) => {
            result.status = error.status();
            return result;
        }
    };
    result.formats = formats(&initial);
    let prepared = initial.registration.iter().any(|check| check.ready);
    let outcome = collect(backend, permit, scope, &initial, &mut result.formats);
    // A preparation attempt can leave partial files even when its reply failed.
    if prepared {
        let deadline = permit.cleanup_deadline(Instant::now());
        let cleanup = WorkPermit::isolated(permit.request_id, deadline);
        result.cleanup = matches!(
            backend.invoke(&request(Operation::Cleanup, scope), &cleanup),
            Ok(ChildResult::Cleaned(true))
        );
    }
    result.inspection = Some(initial);
    finalize(&mut result, outcome, permit);
    result
}

fn inspect(
    backend: &mut impl Backend,
    permit: &WorkPermit,
    scope: Uuid,
) -> Result<Inspection, TransportError> {
    stopped(permit)?;
    match backend.invoke(&request(Operation::Inspect, scope), permit)? {
        ChildResult::Inspection(value) if results::valid_token(&value.state_token) => Ok(value),
        _ => Err(TransportError::Invalid),
    }
}

fn collect(
    backend: &mut impl Backend,
    permit: &WorkPermit,
    scope: Uuid,
    initial: &Inspection,
    formats: &mut [FormatResult],
) -> Result<(), TransportError> {
    if initial.registration.iter().any(|check| check.ready) {
        stopped(permit)?;
        if !matches!(
            backend.invoke(&request(Operation::Prepare, scope), permit)?,
            ChildResult::Prepared(true)
        ) {
            return Err(TransportError::Invalid);
        }
        for format in formats {
            if format.input.registration.ready {
                probe_format(
                    backend,
                    permit,
                    scope,
                    &initial.state_token,
                    &mut format.input,
                )?;
            }
        }
    }
    if inspect(backend, permit, scope)?.state_token != initial.state_token {
        return Err(TransportError::Identity);
    }
    Ok(())
}

fn probe_format(
    backend: &mut impl Backend,
    permit: &WorkPermit,
    scope: Uuid,
    token: &str,
    input: &mut CheckInput,
) -> Result<(), TransportError> {
    for step in suite_plan::steps(input.extension) {
        stopped(permit)?;
        let ChildResult::Probe(result) = backend.invoke(&step.request(scope), permit)? else {
            return Err(TransportError::Invalid);
        };
        let valid = result.integrity
            && result.registration_stable
            && result.state_token == token
            && assessment::probe_valid(&result.probe, &step.label);
        input.probes.push(Record {
            label: step.label,
            result: result.probe,
        });
        if !valid {
            return Err(TransportError::Invalid);
        }
    }
    Ok(())
}

fn formats(initial: &Inspection) -> Vec<FormatResult> {
    [Extension::Hwp, Extension::Hwpx]
        .into_iter()
        .enumerate()
        .map(|(index, extension)| FormatResult {
            input: CheckInput {
                extension,
                registration: initial.registration[index].clone(),
                install_kind: initial.install_kind,
                integrity: true,
                cleanup: true,
                registration_stable: true,
                probes: Vec::new(),
            },
            assessment: Assessment::invalid(Finding::DiagnosticInvalid),
        })
        .collect()
}

fn finalize(result: &mut SuiteResult, outcome: Result<(), TransportError>, permit: &WorkPermit) {
    result.status = if !result.cleanup {
        Status::Failed
    } else if let Err(error) = outcome {
        error.status()
    } else {
        permit
            .stop_reason(Instant::now())
            .unwrap_or(Status::Completed)
    };
    for format in &mut result.formats {
        format.input.cleanup = result.cleanup;
        format.input.integrity &= result.status == Status::Completed;
        format.input.registration_stable &= result.status == Status::Completed;
        format.assessment = assessment::assess(&format.input);
    }
}

fn stopped(permit: &WorkPermit) -> Result<(), TransportError> {
    match permit.stop_reason(Instant::now()) {
        None => Ok(()),
        Some(Status::Cancelled) => Err(TransportError::Cancelled),
        Some(_) => Err(TransportError::TimedOut),
    }
}
