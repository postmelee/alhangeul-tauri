//! Headless operations only. No Tauri, plugins, updater, UI or private documents.
use super::{
    inspection_native::{self, Context},
    model::Extension,
    probe::{self, ImageMode},
    protocol::{self, FixtureId, Operation, Request},
    results::{ChildResult, ProbeResult},
    scratch::Scratch,
    service::WorkPermit,
    suite,
    transport::TransportError,
};
use std::time::{Duration, Instant};

const REFERENCE: &[u8] = include_bytes!(concat!(
    env!("OUT_DIR"),
    "/thumbnail-diagnostic-reference.json"
));

pub struct NativeBackend;
impl suite::Backend for NativeBackend {
    fn invoke(
        &mut self,
        request: &Request,
        permit: &WorkPermit,
    ) -> Result<ChildResult, TransportError> {
        super::process::run(request, permit, true)
    }
}

pub fn execute(request: &Request) -> Result<ChildResult, ()> {
    protocol::validate_request(request, false).map_err(|_| ())?;
    if request.operation == Operation::Suite {
        let permit = WorkPermit::isolated(
            request.request_id,
            Instant::now() + Duration::from_secs(protocol::SUITE_TIMEOUT_SECONDS),
        );
        return Ok(ChildResult::Suite(Box::new(suite::run(
            &mut NativeBackend,
            &permit,
        ))));
    }
    // Cleanup never requires current COM registration to remain unchanged.
    if request.operation == Operation::Cleanup {
        return cleanup(request);
    }
    let context = Context::capture(REFERENCE)?;
    match request.operation {
        Operation::Inspect => {
            let result = context.inspection();
            if !context.stable() {
                return Err(());
            }
            Ok(ChildResult::Inspection(result))
        }
        Operation::Prepare => prepare(request, &context),
        _ => probe_request(request, &context),
    }
}

fn prepare(request: &Request, context: &Context) -> Result<ChildResult, ()> {
    if ![Extension::Hwp, Extension::Hwpx]
        .into_iter()
        .any(|ext| context.ready(ext))
        || !context.stable()
    {
        return Err(());
    }
    let reference = context.reference.as_ref().ok_or(())?;
    let scratch = Scratch::prepare(
        &std::env::temp_dir(),
        request.scope_id.ok_or(())?,
        &reference.source_sha,
    )?;
    Ok(ChildResult::Prepared(scratch.intact() && context.stable()))
}

fn cleanup(request: &Request) -> Result<ChildResult, ()> {
    let deadline = Instant::now() + Duration::from_secs(protocol::CLEANUP_TIMEOUT_SECONDS);
    let reference = super::registration_native::embedded_reference(REFERENCE).ok_or(())?;
    // Cancellation before preparation may leave no directory at all. Only a
    // positively absent exact scope is clean; partial/unreadable scopes are not.
    if Scratch::absent(&std::env::temp_dir(), request.scope_id.ok_or(())?) {
        return Ok(ChildResult::Cleaned(true));
    }
    let result = Scratch::load(
        &std::env::temp_dir(),
        request.scope_id.ok_or(())?,
        &reference.source_sha,
    )
    .is_ok_and(|scratch| scratch.cleanup(deadline));
    Ok(ChildResult::Cleaned(result))
}

fn probe_request(request: &Request, context: &Context) -> Result<ChildResult, ()> {
    let extension = match request.fixture_id.ok_or(())? {
        FixtureId::Hwp => Extension::Hwp,
        FixtureId::Hwpx => Extension::Hwpx,
        FixtureId::Jpg => request.slot.ok_or(())?.group(),
    };
    let inspection = context.inspection();
    let mut integrity = true;
    let result = if request.operation == Operation::Association {
        context.checks[inspection_native::index(extension)]
            .1
            .clone()
    } else {
        if !context.ready(extension) {
            return Err(());
        }
        let _guards = context.guard_binaries()?;
        if request.operation == Operation::Activate {
            probe::activate(&context.sta)
        } else {
            let (probe, intact) = image(request, context)?;
            integrity = intact;
            probe
        }
    };
    Ok(ChildResult::Probe(ProbeResult {
        probe: result,
        integrity,
        registration_stable: context.stable(),
        state_token: inspection.state_token,
    }))
}

fn image(request: &Request, context: &Context) -> Result<(super::model::Probe, bool), ()> {
    let reference = context.reference.as_ref().ok_or(())?;
    let scratch = Scratch::load(
        &std::env::temp_dir(),
        request.scope_id.ok_or(())?,
        &reference.source_sha,
    )?;
    if !scratch.intact() {
        return Err(());
    }
    let mut fixture = scratch.fixture(request.slot.ok_or(())?)?;
    if !context.stable() {
        return Err(());
    }
    let mode = match request.operation {
        Operation::Shell => ImageMode::Shell,
        Operation::CacheOnly => ImageMode::CacheOnly,
        Operation::ForceExtract => ImageMode::ForceExtract,
        _ => return Err(()),
    };
    let result = probe::image(&context.sta, fixture.path(), mode);
    Ok((result, fixture.intact() && scratch.intact()))
}
