use super::protocol::{FixtureId, Operation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Fixed fresh copies for each format. Only after-force cache reuses Force.
#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum Slot {
    HwpShell,
    HwpCache,
    HwpForce,
    HwpJpgShell,
    HwpJpgCache,
    HwpJpgForce,
    HwpxShell,
    HwpxCache,
    HwpxForce,
    HwpxJpgShell,
    HwpxJpgCache,
    HwpxJpgForce,
}

pub const SLOTS: [Slot; 12] = [
    Slot::HwpShell,
    Slot::HwpCache,
    Slot::HwpForce,
    Slot::HwpJpgShell,
    Slot::HwpJpgCache,
    Slot::HwpJpgForce,
    Slot::HwpxShell,
    Slot::HwpxCache,
    Slot::HwpxForce,
    Slot::HwpxJpgShell,
    Slot::HwpxJpgCache,
    Slot::HwpxJpgForce,
];
pub const MANIFEST_NAME: &str = "owner.json";
pub const MAX_MANIFEST_BYTES: usize = 8192;
pub const MAX_FIXTURE_BYTES: usize = 1024 * 1024;
pub const SCHEMA_VERSION: u32 = 1;

impl Slot {
    pub fn group(self) -> super::model::Extension {
        match self {
            Self::HwpShell
            | Self::HwpCache
            | Self::HwpForce
            | Self::HwpJpgShell
            | Self::HwpJpgCache
            | Self::HwpJpgForce => super::model::Extension::Hwp,
            _ => super::model::Extension::Hwpx,
        }
    }

    pub fn permits(self, operation: Operation) -> bool {
        match self {
            Self::HwpShell | Self::HwpxShell | Self::HwpJpgShell | Self::HwpxJpgShell => {
                operation == Operation::Shell
            }
            Self::HwpCache | Self::HwpxCache | Self::HwpJpgCache | Self::HwpxJpgCache => {
                operation == Operation::CacheOnly
            }
            _ => matches!(operation, Operation::ForceExtract | Operation::CacheOnly),
        }
    }
    pub fn filename(self) -> &'static str {
        match self {
            Self::HwpShell => "hwp-shell.hwp",
            Self::HwpCache => "hwp-cache.hwp",
            Self::HwpForce => "hwp-force.hwp",
            Self::HwpJpgShell => "hwp-shell.jpg",
            Self::HwpJpgCache => "hwp-cache.jpg",
            Self::HwpJpgForce => "hwp-force.jpg",
            Self::HwpxShell => "hwpx-shell.hwpx",
            Self::HwpxCache => "hwpx-cache.hwpx",
            Self::HwpxForce => "hwpx-force.hwpx",
            Self::HwpxJpgShell => "hwpx-shell.jpg",
            Self::HwpxJpgCache => "hwpx-cache.jpg",
            Self::HwpxJpgForce => "hwpx-force.jpg",
        }
    }

    pub fn fixture(self) -> FixtureId {
        match self {
            Self::HwpShell | Self::HwpCache | Self::HwpForce => FixtureId::Hwp,
            Self::HwpxShell | Self::HwpxCache | Self::HwpxForce => FixtureId::Hwpx,
            _ => FixtureId::Jpg,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Identity {
    pub slot: Slot,
    pub bytes: u64,
    pub sha256: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Manifest {
    pub schema_version: u32,
    pub request_id: Uuid,
    pub source_sha: String,
    pub files: [Identity; 12],
}

pub fn validate(manifest: &Manifest, request_id: Uuid, source: &str) -> bool {
    manifest.schema_version == SCHEMA_VERSION
        && !request_id.is_nil()
        && manifest.request_id == request_id
        && manifest.source_sha == source
        && lower_hex(source, 40)
        && manifest.files.iter().zip(SLOTS).all(|(identity, slot)| {
            identity.slot == slot
                && (1..=MAX_FIXTURE_BYTES as u64).contains(&identity.bytes)
                && lower_hex(&identity.sha256, 64)
        })
}

fn lower_hex(value: &str, length: usize) -> bool {
    value.len() == length
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

pub fn valid_source(source: &str) -> bool {
    lower_hex(source, 40)
}
