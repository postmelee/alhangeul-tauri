#![cfg(windows)]

use core::ffi::c_void;
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::path::{Path, PathBuf};
use windows_sys::core::{GUID, HRESULT};
use windows_sys::Win32::Foundation::{FreeLibrary, HMODULE, S_FALSE, S_OK};
use windows_sys::Win32::Graphics::Gdi::{DeleteObject, GetObjectW, BITMAP, HBITMAP};
use windows_sys::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryW};
use windows_sys::Win32::UI::Shell::SHCreateMemStream;

mod support;

use support::preview_only_hwpx;

static TEST_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

const CLSID: GUID = GUID::from_u128(alhangeul_thumbnail_handler::registration::HANDLER_CLSID);
const IID_CLASS_FACTORY: GUID =
    GUID::from_u128(alhangeul_thumbnail_handler::registration::CLASS_FACTORY_IID);
const IID_INITIALIZE: GUID =
    GUID::from_u128(alhangeul_thumbnail_handler::registration::INITIALIZE_WITH_STREAM_IID);
const IID_THUMBNAIL: GUID =
    GUID::from_u128(alhangeul_thumbnail_handler::registration::THUMBNAIL_PROVIDER_IID);

type DllGetClassObject = unsafe extern "system" fn(
    class_id: *const GUID,
    iid: *const GUID,
    object: *mut *mut c_void,
) -> HRESULT;
type DllCanUnloadNow = unsafe extern "system" fn() -> HRESULT;
type DllInstall = unsafe extern "system" fn(i32, *const u16) -> HRESULT;
type QueryInterface = unsafe extern "system" fn(
    this: *mut c_void,
    iid: *const GUID,
    object: *mut *mut c_void,
) -> HRESULT;
type Release = unsafe extern "system" fn(this: *mut c_void) -> u32;

#[test]
fn standard_registration_exports_are_available() {
    let _lock = TEST_LOCK.lock().unwrap();
    let library = Library::load(&staged_handler());
    let _: DllInstall = unsafe { library.export(b"DllInstall\0") };
}

#[repr(C)]
struct FactoryVTable {
    query_interface: QueryInterface,
    add_ref: unsafe extern "system" fn(*mut c_void) -> u32,
    release: Release,
    create_instance: unsafe extern "system" fn(
        *mut c_void,
        *mut c_void,
        *const GUID,
        *mut *mut c_void,
    ) -> HRESULT,
    lock_server: unsafe extern "system" fn(*mut c_void, i32) -> HRESULT,
}

#[repr(C)]
struct InitializeVTable {
    query_interface: QueryInterface,
    add_ref: unsafe extern "system" fn(*mut c_void) -> u32,
    release: Release,
    initialize: unsafe extern "system" fn(*mut c_void, *mut c_void, u32) -> HRESULT,
}

#[repr(C)]
struct ThumbnailVTable {
    query_interface: QueryInterface,
    add_ref: unsafe extern "system" fn(*mut c_void) -> u32,
    release: Release,
    get_thumbnail: unsafe extern "system" fn(*mut c_void, u32, *mut HBITMAP, *mut i32) -> HRESULT,
}

#[test]
fn dll_activation_direct_fallback_sizes_and_unload_are_stable() {
    let _lock = TEST_LOCK.lock().unwrap();
    let library = Library::load(&staged_handler());
    let get_class: DllGetClassObject = unsafe { library.export(b"DllGetClassObject\0") };
    let can_unload: DllCanUnloadNow = unsafe { library.export(b"DllCanUnloadNow\0") };
    assert_eq!(unsafe { can_unload() }, S_OK);

    let direct = std::fs::read(fixture("blank2010.hwp")).unwrap();
    let provider = unsafe { Provider::create(get_class, &direct) };
    assert_eq!(unsafe { can_unload() }, S_FALSE);
    for edge in [32, 96, 256, 1024] {
        let bitmap = unsafe { provider.thumbnail(edge) };
        assert_eq!(bitmap.max_edge(), edge as i32);
    }
    assert!(unsafe { provider.initialize_again(&direct) } < 0);
    drop(provider);
    assert_eq!(unsafe { can_unload() }, S_OK);

    let fallback = unsafe { Provider::create(get_class, &preview_only_hwpx()) };
    let bitmap = unsafe { fallback.thumbnail(96) };
    assert_eq!(bitmap.max_edge(), 96);
    drop(fallback);
    assert_eq!(unsafe { can_unload() }, S_OK);
}

#[test]
fn repeated_class_factory_activation_releases_every_object() {
    let _lock = TEST_LOCK.lock().unwrap();
    let library = Library::load(&staged_handler());
    let get_class: DllGetClassObject = unsafe { library.export(b"DllGetClassObject\0") };
    let can_unload: DllCanUnloadNow = unsafe { library.export(b"DllCanUnloadNow\0") };
    let threads = (0..8)
        .map(|_| {
            std::thread::spawn(move || unsafe {
                let factory = class_factory(get_class);
                ((*vtable::<FactoryVTable>(factory)).release)(factory);
            })
        })
        .collect::<Vec<_>>();
    for thread in threads {
        thread.join().unwrap();
    }
    assert_eq!(unsafe { can_unload() }, S_OK);
}

struct Provider {
    initialize: *mut c_void,
    thumbnail: *mut c_void,
}

impl Provider {
    unsafe fn create(get_class: DllGetClassObject, bytes: &[u8]) -> Self {
        let factory = unsafe { class_factory(get_class) };
        let mut initialize = core::ptr::null_mut();
        assert_eq!(
            unsafe {
                ((*vtable::<FactoryVTable>(factory)).create_instance)(
                    factory,
                    core::ptr::null_mut(),
                    &IID_INITIALIZE,
                    &mut initialize,
                )
            },
            S_OK
        );
        unsafe { ((*vtable::<FactoryVTable>(factory)).release)(factory) };
        let stream = memory_stream(bytes);
        assert_eq!(
            unsafe {
                ((*vtable::<InitializeVTable>(initialize)).initialize)(initialize, stream, 0)
            },
            S_OK
        );
        release_unknown(stream);
        let mut thumbnail = core::ptr::null_mut();
        assert_eq!(
            unsafe {
                ((*vtable::<InitializeVTable>(initialize)).query_interface)(
                    initialize,
                    &IID_THUMBNAIL,
                    &mut thumbnail,
                )
            },
            S_OK
        );
        Self {
            initialize,
            thumbnail,
        }
    }

    unsafe fn thumbnail(&self, edge: u32) -> BitmapGuard {
        let mut bitmap = core::ptr::null_mut();
        let mut alpha = 0;
        assert_eq!(
            unsafe {
                ((*vtable::<ThumbnailVTable>(self.thumbnail)).get_thumbnail)(
                    self.thumbnail,
                    edge,
                    &mut bitmap,
                    &mut alpha,
                )
            },
            S_OK
        );
        assert!(!bitmap.is_null());
        assert_eq!(alpha, 2);
        BitmapGuard(bitmap)
    }

    unsafe fn initialize_again(&self, bytes: &[u8]) -> HRESULT {
        let stream = memory_stream(bytes);
        let result = unsafe {
            ((*vtable::<InitializeVTable>(self.initialize)).initialize)(self.initialize, stream, 0)
        };
        release_unknown(stream);
        result
    }
}

impl Drop for Provider {
    fn drop(&mut self) {
        unsafe {
            ((*vtable::<ThumbnailVTable>(self.thumbnail)).release)(self.thumbnail);
            ((*vtable::<InitializeVTable>(self.initialize)).release)(self.initialize);
        }
    }
}

struct BitmapGuard(HBITMAP);

impl BitmapGuard {
    fn max_edge(&self) -> i32 {
        let mut bitmap = BITMAP::default();
        let copied = unsafe {
            GetObjectW(
                self.0,
                i32::try_from(core::mem::size_of::<BITMAP>()).unwrap(),
                (&mut bitmap as *mut BITMAP).cast(),
            )
        };
        assert_eq!(
            copied,
            i32::try_from(core::mem::size_of::<BITMAP>()).unwrap()
        );
        bitmap.bmWidth.max(bitmap.bmHeight.abs())
    }
}

impl Drop for BitmapGuard {
    fn drop(&mut self) {
        assert_ne!(unsafe { DeleteObject(self.0) }, 0);
    }
}

struct Library(HMODULE);

impl Library {
    fn load(path: &Path) -> Self {
        let module = unsafe { LoadLibraryW(wide(path.as_os_str()).as_ptr()) };
        assert!(
            !module.is_null(),
            "handler DLL을 load할 수 없습니다: {}",
            path.display()
        );
        Self(module)
    }

    unsafe fn export<T: Copy>(&self, name: &[u8]) -> T {
        let address = unsafe { GetProcAddress(self.0, name.as_ptr()) };
        assert!(address.is_some(), "export가 없습니다: {:?}", name);
        unsafe { core::mem::transmute_copy(&address) }
    }
}

impl Drop for Library {
    fn drop(&mut self) {
        assert_ne!(unsafe { FreeLibrary(self.0) }, 0);
    }
}

unsafe fn class_factory(get_class: DllGetClassObject) -> *mut c_void {
    let mut factory = core::ptr::null_mut();
    assert_eq!(
        unsafe { get_class(&CLSID, &IID_CLASS_FACTORY, &mut factory) },
        S_OK
    );
    factory
}

unsafe fn vtable<T>(interface: *mut c_void) -> *const T {
    unsafe { *interface.cast::<*const T>() }
}

fn memory_stream(bytes: &[u8]) -> *mut c_void {
    let stream = unsafe { SHCreateMemStream(bytes.as_ptr(), u32::try_from(bytes.len()).unwrap()) };
    assert!(!stream.is_null());
    stream
}

fn release_unknown(interface: *mut c_void) {
    unsafe { ((*vtable::<InitializeVTable>(interface)).release)(interface) };
}

fn staged_handler() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../desktop/src-tauri/windows/thumbnail-resources")
        .join(alhangeul_thumbnail_handler::registration::HANDLER_FILENAME)
}

fn fixture(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../third_party/rhwp/saved")
        .join(name)
}

fn wide(value: &OsStr) -> Vec<u16> {
    value.encode_wide().chain(core::iter::once(0)).collect()
}
