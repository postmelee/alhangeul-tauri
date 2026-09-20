use super::{
    com::Sta,
    environment::Environment,
    install_identity::{self, InstallIdentity},
    local_file,
    model::{Extension, Observation, Probe, RegistrationScope, HANDLER_CLSID},
    probe,
    reference::{self, BinaryIdentity, BuildReference},
    registration::{self, Evidence},
    registry::{self, Hive},
};
use std::path::{Path, PathBuf};

const CATEGORY: &str = "{E357FCCD-A995-4576-B01F-234630154E96}";

/// Internal snapshot: intentionally not Serialize, since values can contain paths.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Snapshot {
    pub classes: [Class; 2],
    pub extensions: [[Observation<String>; 2]; 2],
    pub binaries: Option<[BinaryIdentity; 2]>,
    pub install: InstallIdentity,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Class {
    pub present: Observation<bool>,
    path: Observation<String>,
    apartment: Observation<String>,
}

pub fn executable_root() -> Result<PathBuf, ()> {
    let executable = std::env::current_exe().map_err(|_| ())?;
    let executable = local_file::local_path(&executable)?;
    if !executable
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.eq_ignore_ascii_case("Alhangeul.exe"))
    {
        return Err(());
    }
    executable.parent().map(Path::to_path_buf).ok_or(())
}

pub fn collect(root: &Path) -> Snapshot {
    let classes = [Hive::User, Hive::Machine].map(|hive| {
        let class = format!(r"Software\Classes\CLSID\{HANDLER_CLSID}");
        let server = format!(r"{class}\InprocServer32");
        Class {
            present: registry::exists(hive, &class),
            path: registry::string(hive, &server, ""),
            apartment: registry::string(hive, &server, "ThreadingModel"),
        }
    });
    let extensions = [".hwp", ".hwpx"].map(|extension| {
        let path = format!(r"Software\Classes\{extension}\ShellEx\{CATEGORY}");
        [Hive::User, Hive::Machine].map(|hive| registry::string(hive, &path, ""))
    });
    let binaries = local_file::identity(root, "AlhangeulThumbnailHandler.dll")
        .and_then(|handler| {
            local_file::identity(root, "AlhangeulThumbnailWorker.exe")
                .map(|worker| [handler, worker])
        })
        .ok();
    Snapshot {
        classes,
        extensions,
        binaries,
        install: install_identity::collect(root),
    }
}

pub fn preflight(
    sta: &Sta,
    root: &Path,
    snapshot: &Snapshot,
    context: (&Environment, Extension),
    reference: Option<&BuildReference>,
) -> (Evidence, Probe) {
    let (environment, extension) = context;
    let association = probe::association(sta, extension);
    let selected_handler = match (&*association.status, &association.resolved_handler) {
        ("ok", Some(id)) => Observation::Known(id.clone()),
        _ => Observation::Unreadable,
    };
    let scope = registration::scope(&snapshot.classes[0].present, &snapshot.classes[1].present);
    let class = match scope {
        RegistrationScope::UserOnly => Some(&snapshot.classes[0]),
        RegistrationScope::MachineOnly => Some(&snapshot.classes[1]),
        _ => None,
    };
    let (path_matches, apartment_matches) = class_matches(class, root);
    let reference_matches =
        reference
            .zip(snapshot.binaries.as_ref())
            .is_some_and(|(reference, actual)| {
                serde_json::to_vec(reference).is_ok_and(|encoded| {
                    reference::verify(
                        &encoded,
                        &reference.source_sha,
                        env!("CARGO_PKG_VERSION"),
                        actual,
                    )
                    .is_ok()
                })
            });
    (
        Evidence {
            user_class: snapshot.classes[0].present.clone(),
            machine_class: snapshot.classes[1].present.clone(),
            selected_handler,
            path_matches,
            apartment_matches,
            reference_matches,
            environment_complete: environment.inspection_complete(),
            display_restricted: environment.display_restricted(),
        },
        association,
    )
}

fn class_matches(class: Option<&Class>, root: &Path) -> (Observation<bool>, Observation<bool>) {
    let Some(class) = class else {
        return (Observation::Unreadable, Observation::Unreadable);
    };
    let path = match &class.path {
        Observation::Known(path) => Observation::Known(local_file::same_path(
            Path::new(path),
            &root.join("AlhangeulThumbnailHandler.dll"),
        )),
        Observation::Missing => Observation::Missing,
        Observation::Unreadable => Observation::Unreadable,
    };
    let apartment = match &class.apartment {
        Observation::Known(value) => Observation::Known(value == "Apartment"),
        Observation::Missing => Observation::Missing,
        Observation::Unreadable => Observation::Unreadable,
    };
    (path, apartment)
}

pub fn embedded_reference(encoded: &[u8]) -> Option<BuildReference> {
    let reference = reference::parse(encoded).ok()?;
    (reference.product_version == env!("CARGO_PKG_VERSION")).then_some(reference)
}
