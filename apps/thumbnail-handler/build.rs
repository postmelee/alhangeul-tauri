#[cfg(windows)]
#[path = "../../build-support/windows-version.rs"]
mod windows_version;

fn main() {
    #[cfg(windows)]
    windows_version::embed(
        "Alhangeul thumbnail handler",
        "AlhangeulThumbnailHandler.dll",
        2,
    );
}
