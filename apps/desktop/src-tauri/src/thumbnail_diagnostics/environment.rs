use super::model::Observation;
use serde::{Deserialize, Serialize};

/// All token observations describe the diagnostic caller, not Explorer.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Environment {
    pub os_build: Observation<u32>,
    pub process_x64: bool,
    pub apartment_sta: Observation<bool>,
    pub elevated: Observation<bool>,
    pub elevation_type: Observation<u32>,
    pub integrity_rid: Observation<u32>,
    pub enable_lua: Observation<u32>,
    pub icons_only: Observation<u32>,
    /// HKCU CurrentVersion, HKCU Policies, HKLM CurrentVersion, HKLM Policies.
    pub disable_thumbnails: [Observation<u32>; 4],
}

impl Environment {
    /// This is a display setting observation, never a COM failure diagnosis.
    pub fn display_restricted(&self) -> bool {
        self.icons_only == Observation::Known(1)
            || self.disable_thumbnails.contains(&Observation::Known(1))
    }

    pub fn inspection_complete(&self) -> bool {
        let readable = |value: &Observation<u32>| {
            matches!(value, Observation::Missing | Observation::Known(0..=1))
        };
        self.process_x64
            && self.apartment_sta == Observation::Known(true)
            && matches!(self.os_build, Observation::Known(_))
            && matches!(self.elevated, Observation::Known(_))
            && matches!(self.elevation_type, Observation::Known(1..=3))
            && matches!(self.integrity_rid, Observation::Known(_))
            && readable(&self.enable_lua)
            && readable(&self.icons_only)
            && self.disable_thumbnails.iter().all(readable)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn environment() -> Environment {
        Environment {
            os_build: Observation::Known(19045),
            process_x64: true,
            apartment_sta: Observation::Known(true),
            elevated: Observation::Known(false),
            elevation_type: Observation::Known(3),
            integrity_rid: Observation::Known(8192),
            enable_lua: Observation::Known(1),
            icons_only: Observation::Known(0),
            disable_thumbnails: std::array::from_fn(|_| Observation::Missing),
        }
    }

    #[test]
    fn missing_policy_is_not_a_restriction_but_unreadable_is_incomplete() {
        let mut state = environment();
        assert!(state.inspection_complete());
        assert!(!state.display_restricted());
        state.disable_thumbnails[2] = Observation::Unreadable;
        assert!(!state.inspection_complete());
        assert!(!state.display_restricted());
        state.disable_thumbnails[2] = Observation::Known(1);
        assert!(state.inspection_complete());
        assert!(state.display_restricted());
        state.disable_thumbnails[2] = Observation::Known(2);
        assert!(!state.inspection_complete());
    }

    #[test]
    fn elevation_and_uac_are_context_not_failure() {
        let mut state = environment();
        state.elevated = Observation::Known(true);
        state.enable_lua = Observation::Known(0);
        assert!(state.inspection_complete());
        assert!(!state.display_restricted());
    }
}
