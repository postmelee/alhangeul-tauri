//! Only this request's fixed files are touched. Unknown contents are retained.
use super::{
    fixtures,
    protocol::FixtureId,
    scratch_io as io,
    scratch_manifest::{
        self as schema, Identity, Manifest, Slot, MANIFEST_NAME, MAX_MANIFEST_BYTES, SLOTS,
    },
};
use std::{
    fs::{self, File},
    path::{Path, PathBuf},
    time::{Duration, Instant},
};
use uuid::Uuid;

pub struct Scratch {
    root: PathBuf,
    _directory: File,
    pub manifest: Manifest,
}
pub struct Fixture {
    path: PathBuf,
    file: File,
    identity: Identity,
}

fn root(base: &Path, id: Uuid) -> Result<PathBuf, ()> {
    if id.is_nil() {
        return Err(());
    }
    Ok(io::checked_path(base)?.join(format!("alhangeul-thumbnail-check-{id}")))
}

impl Scratch {
    pub fn absent(base: &Path, id: Uuid) -> bool {
        root(base, id).is_ok_and(|path| {
            fs::symlink_metadata(path)
                .is_err_and(|error| error.kind() == std::io::ErrorKind::NotFound)
        })
    }

    pub fn prepare(base: &Path, id: Uuid, source: &str) -> Result<Self, ()> {
        if !schema::valid_source(source) {
            return Err(());
        }
        let root = root(base, id)?;
        // create_dir, never create_dir_all: existing or concurrent owners fail closed.
        fs::create_dir(&root).map_err(|_| ())?;
        let directory = io::hold_directory(&root)?;
        let result = prepare_files(&root, id, source);
        if result.is_err() {
            // Preparation may have left partial bytes. Do not claim successful
            // cleanup or delete an unmanifested directory from another process.
            return Err(());
        }
        Ok(Self {
            root,
            _directory: directory,
            manifest: result?,
        })
    }

    pub fn load(base: &Path, id: Uuid, source: &str) -> Result<Self, ()> {
        let root = io::checked_path(&root(base, id)?)?;
        let directory = io::hold_directory(&root)?;
        let mut file = io::open(&root.join(MANIFEST_NAME), MAX_MANIFEST_BYTES)?;
        let bytes = io::bytes(&mut file, MAX_MANIFEST_BYTES)?;
        let manifest: Manifest = serde_json::from_slice(&bytes).map_err(|_| ())?;
        if !schema::validate(&manifest, id, source) {
            return Err(());
        }
        Ok(Self {
            root,
            _directory: directory,
            manifest,
        })
    }

    pub fn fixture(&self, slot: Slot) -> Result<Fixture, ()> {
        let identity = self
            .manifest
            .files
            .iter()
            .find(|file| file.slot == slot)
            .ok_or(())?
            .clone();
        let path = self.root.join(slot.filename());
        let file = io::open(&path, fixtures::MAX_FIXTURE_BYTES)?;
        let mut fixture = Fixture {
            path,
            file,
            identity,
        };
        if !fixture.intact() {
            return Err(());
        }
        Ok(fixture)
    }

    pub fn intact(&self) -> bool {
        let Ok(current) = Self::load(
            self.root.parent().unwrap(),
            self.manifest.request_id,
            &self.manifest.source_sha,
        ) else {
            return false;
        };
        current.manifest == self.manifest
            && self.known_contents()
            && SLOTS.into_iter().all(|slot| self.fixture(slot).is_ok())
    }

    fn known_contents(&self) -> bool {
        if io::checked_path(&self.root).is_err() {
            return false;
        }
        let Ok(entries) = fs::read_dir(&self.root) else {
            return false;
        };
        let mut count = 0;
        for entry in entries {
            count += 1;
            let Ok(entry) = entry else {
                return false;
            };
            if count > 13 || !io::regular(&entry.path()) {
                return false;
            }
            let name = entry.file_name();
            if name != MANIFEST_NAME && !SLOTS.iter().any(|slot| name == slot.filename()) {
                return false;
            }
        }
        count == 13
    }

    pub fn cleanup(self, deadline: Instant) -> bool {
        // Check the whole directory first, before deleting even a known file.
        if Instant::now() >= deadline || !self.intact() {
            return false;
        }
        let Some(guards) = self.delete_guards(deadline) else {
            return false;
        };
        // Holding verified handles does not authorize touching an extra entry.
        if !self.known_contents() {
            return false;
        }
        for guard in guards {
            if Instant::now() >= deadline || !guard.delete() {
                return false;
            }
        }
        // Non-recursive: a concurrent unknown entry makes removal fail safely.
        drop(self._directory);
        fs::remove_dir(&self.root).is_ok()
    }

    fn delete_guards(&self, deadline: Instant) -> Option<Vec<super::scratch_delete::DeleteGuard>> {
        let owner = serde_json::to_vec(&self.manifest).ok()?;
        let mut guards = Vec::new();
        let files = self
            .manifest
            .files
            .iter()
            .map(|file| {
                (
                    file.slot.filename(),
                    file.bytes as usize,
                    file.sha256.clone(),
                )
            })
            .chain([(MANIFEST_NAME, owner.len(), io::digest(&owner))]);
        for (name, length, digest) in files {
            loop {
                if Instant::now() >= deadline || !io::regular(&self.root.join(name)) {
                    return None;
                }
                if let Ok(guard) =
                    super::scratch_delete::DeleteGuard::open(&self.root.join(name), length, &digest)
                {
                    guards.push(guard);
                    break;
                }
                std::thread::sleep(Duration::from_millis(10));
            }
        }
        Some(guards)
    }
}

impl Fixture {
    pub fn path(&self) -> &Path {
        &self.path
    }
    pub fn intact(&mut self) -> bool {
        io::bytes(&mut self.file, fixtures::MAX_FIXTURE_BYTES).is_ok_and(|bytes| {
            bytes.len() as u64 == self.identity.bytes && io::digest(&bytes) == self.identity.sha256
        })
    }
}

fn prepare_files(root: &Path, id: Uuid, source: &str) -> Result<Manifest, ()> {
    let hwp = fixtures::generate(FixtureId::Hwp)?;
    let hwpx = fixtures::generate(FixtureId::Hwpx)?;
    let jpg = fixtures::generate(FixtureId::Jpg)?;
    let mut files = Vec::new();
    for slot in SLOTS {
        let bytes = match slot.fixture() {
            FixtureId::Hwp => &hwp,
            FixtureId::Hwpx => &hwpx,
            FixtureId::Jpg => &jpg,
        };
        io::create(&root.join(slot.filename()), bytes)?;
        files.push(Identity {
            slot,
            bytes: bytes.len() as u64,
            sha256: io::digest(bytes),
        });
    }
    let manifest = Manifest {
        schema_version: fixtures::SCHEMA_VERSION,
        request_id: id,
        source_sha: source.into(),
        files: files.try_into().map_err(|_| ())?,
    };
    if !schema::validate(&manifest, id, source) {
        return Err(());
    }
    let encoded = serde_json::to_vec(&manifest).map_err(|_| ())?;
    if encoded.len() > MAX_MANIFEST_BYTES {
        return Err(());
    }
    io::create(&root.join(MANIFEST_NAME), &encoded)?;
    Ok(manifest)
}
