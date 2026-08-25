pub mod registration;

#[cfg(windows)]
mod abi;
#[cfg(windows)]
mod bitmap;
#[cfg(windows)]
mod class_factory;
#[cfg(windows)]
mod process;
#[cfg(windows)]
mod provider;

#[cfg(windows)]
use core::ffi::c_void;
#[cfg(windows)]
use std::panic::{catch_unwind, AssertUnwindSafe};
#[cfg(windows)]
use std::sync::atomic::{AtomicPtr, AtomicU32, Ordering};
#[cfg(windows)]
use windows_sys::core::{GUID, HRESULT};
#[cfg(windows)]
use windows_sys::Win32::Foundation::{BOOL, HINSTANCE, HMODULE, S_FALSE, S_OK};

#[cfg(windows)]
static MODULE_HANDLE: AtomicPtr<c_void> = AtomicPtr::new(core::ptr::null_mut());
#[cfg(windows)]
static OBJECT_COUNT: AtomicU32 = AtomicU32::new(0);
#[cfg(windows)]
static SERVER_LOCKS: AtomicU32 = AtomicU32::new(0);

#[cfg(windows)]
pub(crate) fn guard_hresult(action: impl FnOnce() -> HRESULT) -> HRESULT {
    catch_unwind(AssertUnwindSafe(action)).unwrap_or(windows_sys::Win32::Foundation::E_UNEXPECTED)
}

#[cfg(windows)]
pub(crate) fn guard_u32(action: impl FnOnce() -> u32) -> u32 {
    catch_unwind(AssertUnwindSafe(action)).unwrap_or(0)
}

#[cfg(windows)]
pub(crate) fn module_handle() -> HMODULE {
    MODULE_HANDLE.load(Ordering::Acquire)
}

#[cfg(windows)]
pub(crate) fn object_created() {
    OBJECT_COUNT.fetch_add(1, Ordering::AcqRel);
}

#[cfg(windows)]
pub(crate) fn object_destroyed() {
    OBJECT_COUNT.fetch_sub(1, Ordering::AcqRel);
}

#[cfg(windows)]
pub(crate) fn set_server_lock(lock: bool) {
    if lock {
        SERVER_LOCKS.fetch_add(1, Ordering::AcqRel);
    } else {
        let _ = SERVER_LOCKS.fetch_update(Ordering::AcqRel, Ordering::Acquire, |count| {
            count.checked_sub(1)
        });
    }
}

#[cfg(windows)]
#[no_mangle]
pub extern "system" fn DllMain(module: HINSTANCE, reason: u32, _reserved: *mut c_void) -> BOOL {
    if reason == windows_sys::Win32::System::SystemServices::DLL_PROCESS_ATTACH {
        MODULE_HANDLE.store(module, Ordering::Release);
    }
    1
}

#[cfg(windows)]
#[no_mangle]
pub unsafe extern "system" fn DllGetClassObject(
    class_id: *const GUID,
    iid: *const GUID,
    object: *mut *mut c_void,
) -> HRESULT {
    guard_hresult(|| unsafe { class_factory::get_class_object(class_id, iid, object) })
}

#[cfg(windows)]
#[no_mangle]
pub extern "system" fn DllCanUnloadNow() -> HRESULT {
    guard_hresult(|| {
        if OBJECT_COUNT.load(Ordering::Acquire) == 0 && SERVER_LOCKS.load(Ordering::Acquire) == 0 {
            S_OK
        } else {
            S_FALSE
        }
    })
}
