#![cfg_attr(windows, windows_subsystem = "windows")]
#![forbid(unsafe_code)]

mod worker;

fn main() {
    let input = std::io::stdin();
    let output = std::io::stdout();
    let _ = worker::run(input.lock(), output.lock());
}
