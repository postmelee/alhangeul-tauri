use super::{
    environment::Environment,
    model::Observation,
    registry::{self, Hive},
    token,
};
use windows::Win32::System::Com::{
    CoGetApartmentType, APTTYPE, APTTYPEQUALIFIER, APTTYPE_MAINSTA, APTTYPE_STA,
};

pub fn collect() -> Environment {
    let token = token::read();
    let version = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion";
    let os_build = match registry::string(Hive::Machine, version, "CurrentBuildNumber") {
        Observation::Known(value) => value
            .parse()
            .map_or(Observation::Unreadable, Observation::Known),
        Observation::Missing => Observation::Missing,
        Observation::Unreadable => Observation::Unreadable,
    };
    let (mut apartment, mut qualifier) = (APTTYPE::default(), APTTYPEQUALIFIER::default());
    // SAFETY: both outputs are initialized and writable; no COM initialization here.
    let apartment_sta = match unsafe { CoGetApartmentType(&mut apartment, &mut qualifier) } {
        Ok(()) => Observation::Known(apartment == APTTYPE_STA || apartment == APTTYPE_MAINSTA),
        Err(_) => Observation::Unreadable,
    };
    Environment {
        os_build,
        process_x64: cfg!(target_arch = "x86_64"),
        apartment_sta,
        elevated: token.elevated,
        elevation_type: token.elevation_type,
        integrity_rid: token.integrity_rid,
        enable_lua: registry::dword(
            Hive::Machine,
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System",
            "EnableLUA",
        ),
        icons_only: registry::dword(
            Hive::User,
            r"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced",
            "IconsOnly",
        ),
        disable_thumbnails: display_policies(),
    }
}

fn display_policies() -> [Observation<u32>; 4] {
    let current = r"Software\Microsoft\Windows\CurrentVersion\Policies\Explorer";
    let policies = r"Software\Policies\Microsoft\Windows\Explorer";
    [
        (Hive::User, current),
        (Hive::User, policies),
        (Hive::Machine, current),
        (Hive::Machine, policies),
    ]
    .map(|(hive, key)| registry::dword(hive, key, "DisableThumbnails"))
}
