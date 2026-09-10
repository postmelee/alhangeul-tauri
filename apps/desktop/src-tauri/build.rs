#[path = "build/thumbnail_reference.rs"]
mod thumbnail_reference;

fn main() {
    thumbnail_reference::prepare();
    tauri_build::build();
}
