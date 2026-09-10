//! Argument routing is pure; Linux does not call the diagnostic entry point.
use super::protocol::CHILD_FLAG;
use std::ffi::OsString;

#[derive(Debug, PartialEq, Eq)]
pub enum Route {
    Application,
    Child,
    Invalid,
}

pub fn route(args: impl IntoIterator<Item = OsString>) -> Route {
    let mut count = 0;
    let mut internal = false;
    let mut exact = false;
    for arg in args.into_iter().skip(1) {
        count += 1;
        exact |= arg == CHILD_FLAG;
        internal |= arg
            .to_string_lossy()
            .starts_with("--alhangeul-thumbnail-diagnostic");
    }
    if !internal {
        Route::Application
    } else if count == 1 && exact {
        Route::Child
    } else {
        Route::Invalid
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_exact_single_internal_argument_enters_headless_mode() {
        let check = |args: &[&str]| route(args.iter().map(OsString::from));
        assert_eq!(check(&["Alhangeul.exe"]), Route::Application);
        assert_eq!(
            check(&["Alhangeul.exe", "C:\\docs\\a.hwp"]),
            Route::Application
        );
        assert_eq!(check(&["Alhangeul.exe", CHILD_FLAG]), Route::Child);
        for args in [
            vec!["Alhangeul.exe", CHILD_FLAG, "a.hwp"],
            vec!["Alhangeul.exe", CHILD_FLAG, CHILD_FLAG],
            vec![
                "Alhangeul.exe",
                "--alhangeul-thumbnail-diagnostic-child=true",
            ],
            vec!["Alhangeul.exe", "--alhangeul-thumbnail-diagnostic"],
        ] {
            assert_eq!(check(&args), Route::Invalid);
        }
    }
}
