pub const HANDLER_CLSID: u128 = 0xc1dcf316_0771_49dd_bfea_c85f69b1674b;
pub const THUMBNAIL_PROVIDER_IID: u128 = 0xe357fccd_a995_4576_b01f_234630154e96;
pub const INITIALIZE_WITH_STREAM_IID: u128 = 0xb824b49d_22ac_4161_ac8a_9916e8fa3f7f;
pub const CLASS_FACTORY_IID: u128 = 0x00000001_0000_0000_c000_000000000046;
pub const UNKNOWN_IID: u128 = 0x00000000_0000_0000_c000_000000000046;

pub const HANDLER_FILENAME: &str = "AlhangeulThumbnailHandler.dll";
pub const WORKER_FILENAME: &str = "AlhangeulThumbnailWorker.exe";
pub const THREADING_MODEL: &str = "Apartment";
pub const HANDLER_CLSID_TEXT: &str = "{C1DCF316-0771-49DD-BFEA-C85F69B1674B}";
pub const THUMBNAIL_PROVIDER_TEXT: &str = "{E357FCCD-A995-4576-B01F-234630154E96}";
pub const BACKUP_ROOT: &str = "Software\\Alhangeul\\ThumbnailHandlerBackup";
pub const EXTENSIONS: [&str; 2] = [".hwp", ".hwpx"];

#[cfg(windows)]
mod windows;

#[cfg(windows)]
pub(crate) use windows::{install_machine, install_user, uninstall_machine, uninstall_user};

#[cfg(windows)]
pub(crate) fn guid(value: u128) -> windows_sys::core::GUID {
    windows_sys::core::GUID::from_u128(value)
}

#[cfg(windows)]
pub(crate) unsafe fn guid_matches(actual: *const windows_sys::core::GUID, expected: u128) -> bool {
    if actual.is_null() {
        return false;
    }
    let expected = guid(expected);
    let actual = unsafe { &*actual };
    actual.data1 == expected.data1
        && actual.data2 == expected.data2
        && actual.data3 == expected.data3
        && actual.data4 == expected.data4
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixed_registration_identity_is_stable() {
        assert_eq!(HANDLER_CLSID, 0xc1dcf316_0771_49dd_bfea_c85f69b1674b);
        assert_eq!(HANDLER_FILENAME, "AlhangeulThumbnailHandler.dll");
        assert_eq!(WORKER_FILENAME, "AlhangeulThumbnailWorker.exe");
        assert_eq!(THREADING_MODEL, "Apartment");
        assert_eq!(HANDLER_CLSID_TEXT, "{C1DCF316-0771-49DD-BFEA-C85F69B1674B}");
        assert_eq!(
            THUMBNAIL_PROVIDER_TEXT,
            "{E357FCCD-A995-4576-B01F-234630154E96}"
        );
        assert_eq!(EXTENSIONS, [".hwp", ".hwpx"]);
    }
}
