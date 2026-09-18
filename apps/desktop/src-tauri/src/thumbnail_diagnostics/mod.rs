//! Windows diagnostics and pure contracts; UI commands use the same suite.

pub(crate) mod assessment;
mod child_input;
mod entry;
pub(crate) mod environment;
#[cfg(any(windows, test))]
mod fixtures;
pub(crate) mod model;
pub(crate) mod protocol;
pub(crate) mod reference;
pub(crate) mod registration;
pub(crate) mod results;
#[cfg(any(windows, test))]
mod scratch;
#[cfg(any(windows, test))]
mod scratch_delete;
#[cfg(any(windows, test))]
mod scratch_io;
mod scratch_manifest;
#[cfg(any(windows, test))]
mod shell_path;
pub(crate) mod ui_service;
// Pure ownership/deadline contract shared by the headless and UI services.
#[cfg_attr(not(test), allow(dead_code))]
pub(crate) mod service;
pub(crate) mod suite;
pub(crate) mod suite_plan;
pub(crate) mod transport;

#[cfg(windows)]
pub(crate) mod child;
#[cfg(windows)]
mod com;
#[cfg(windows)]
pub(crate) mod dispatch;
#[cfg(windows)]
mod environment_native;
#[cfg(windows)]
mod handle;
#[cfg(windows)]
mod inspection_native;
#[cfg(windows)]
mod install_identity;
#[cfg(windows)]
mod install_registry;
#[cfg(windows)]
mod local_file;
#[cfg(windows)]
mod probe;
#[cfg(windows)]
mod process;
#[cfg(windows)]
mod process_pipes;
#[cfg(windows)]
mod process_spawn;
#[cfg(windows)]
mod registration_native;
#[cfg(windows)]
mod registry;
#[cfg(any(windows, test))]
mod registry_text;
#[cfg(windows)]
mod token;

#[cfg(test)]
mod assessment_tests;
#[cfg(all(test, windows))]
mod process_tests;
#[cfg(all(test, windows))]
mod probe_tests;
#[cfg(test)]
mod protocol_tests;
#[cfg(test)]
mod scratch_tests;
#[cfg(test)]
mod service_tests;
#[cfg(test)]
mod suite_tests;

#[cfg(test)]
#[path = "../../build/thumbnail_reference.rs"]
mod build_reference_tests;
