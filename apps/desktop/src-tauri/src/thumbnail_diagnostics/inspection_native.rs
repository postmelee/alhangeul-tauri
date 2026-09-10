use super::{
    com::Sta,
    environment::Environment,
    environment_native, local_file,
    model::{Extension, Probe},
    reference::BuildReference,
    registration,
    registration_native::{self, Snapshot},
    results::Inspection,
};
use sha2::{Digest, Sha256};
use std::{fs::File, path::PathBuf};

pub struct Context {
    pub sta: Sta,
    pub root: PathBuf,
    snapshot: Snapshot,
    environment: Environment,
    pub reference: Option<BuildReference>,
    pub checks: [(registration::Evidence, Probe); 2],
}

impl Context {
    pub fn capture(encoded: &[u8]) -> Result<Self, ()> {
        let sta = Sta::enter().map_err(|_| ())?;
        let root = registration_native::executable_root()?;
        let snapshot = registration_native::collect(&root);
        let environment = environment_native::collect();
        let reference = registration_native::embedded_reference(encoded);
        let checks = [Extension::Hwp, Extension::Hwpx].map(|extension| {
            registration_native::preflight(
                &sta,
                &root,
                &snapshot,
                (&environment, extension),
                reference.as_ref(),
            )
        });
        Ok(Self {
            sta,
            root,
            snapshot,
            environment,
            reference,
            checks,
        })
    }

    pub fn inspection(&self) -> Inspection {
        // Raw paths/registry text are hashed only inside the child. The token is
        // for internal equality checks and must not appear in the copied UI summary.
        let associations = self
            .checks
            .each_ref()
            .map(|check| &check.0.selected_handler);
        let token = format!(
            "{:?}|{:?}|{:?}",
            self.snapshot, self.environment, associations
        );
        Inspection {
            build_reference: self.reference.clone(),
            environment: self.environment.clone(),
            install_kind: self.snapshot.install.kind,
            install_records_readable: self.snapshot.install.records_readable,
            registration: self
                .checks
                .each_ref()
                .map(|check| registration::inspect(&check.0)),
            state_token: format!("{:x}", Sha256::digest(token.as_bytes())),
        }
    }

    pub fn stable(&self) -> bool {
        if registration_native::collect(&self.root) != self.snapshot
            || environment_native::collect() != self.environment
        {
            return false;
        }
        [Extension::Hwp, Extension::Hwpx]
            .into_iter()
            .enumerate()
            .all(|(index, extension)| {
                let (evidence, _) = registration_native::preflight(
                    &self.sta,
                    &self.root,
                    &self.snapshot,
                    (&self.environment, extension),
                    self.reference.as_ref(),
                );
                evidence == self.checks[index].0
            })
    }

    /// Keep verified executable bytes and their directory from being replaced
    /// between the final preflight and the synchronous COM call.
    pub fn guard_binaries(&self) -> Result<Vec<File>, ()> {
        let mut files = vec![super::scratch_io::hold_directory(&self.root)?];
        for name in [
            "AlhangeulThumbnailHandler.dll",
            "AlhangeulThumbnailWorker.exe",
        ] {
            files.push(local_file::open(&self.root.join(name), 128 * 1024 * 1024)?);
        }
        if !self.stable() {
            return Err(());
        }
        Ok(files)
    }

    pub fn ready(&self, extension: Extension) -> bool {
        registration::inspect(&self.checks[index(extension)].0).ready
    }
}

pub fn index(extension: Extension) -> usize {
    match extension {
        Extension::Hwp => 0,
        Extension::Hwpx => 1,
    }
}
