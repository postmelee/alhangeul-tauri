#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(windows)]
    if let Some(code) = alhangeul_desktop::thumbnail_diagnostic_entry() {
        std::process::exit(code);
    }
    alhangeul_desktop::run();
}
