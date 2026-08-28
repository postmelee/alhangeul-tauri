use core::ffi::c_void;
use windows_sys::core::{GUID, HRESULT};
use windows_sys::Win32::Graphics::Gdi::HBITMAP;
use windows_sys::Win32::System::Com::STATSTG;

pub type QueryInterface = unsafe extern "system" fn(
    this: *mut c_void,
    iid: *const GUID,
    object: *mut *mut c_void,
) -> HRESULT;
pub type AddRef = unsafe extern "system" fn(this: *mut c_void) -> u32;
pub type Release = unsafe extern "system" fn(this: *mut c_void) -> u32;

#[repr(C)]
pub struct InterfaceHeader<V> {
    pub vtable: *const V,
    pub owner: *mut c_void,
}

#[repr(C)]
pub struct ClassFactoryVTable {
    pub query_interface: QueryInterface,
    pub add_ref: AddRef,
    pub release: Release,
    pub create_instance: unsafe extern "system" fn(
        this: *mut c_void,
        outer: *mut c_void,
        iid: *const GUID,
        object: *mut *mut c_void,
    ) -> HRESULT,
    pub lock_server: unsafe extern "system" fn(this: *mut c_void, lock: i32) -> HRESULT,
}

#[repr(C)]
pub struct InitializeWithStreamVTable {
    pub query_interface: QueryInterface,
    pub add_ref: AddRef,
    pub release: Release,
    pub initialize:
        unsafe extern "system" fn(this: *mut c_void, stream: *mut c_void, mode: u32) -> HRESULT,
}

#[repr(C)]
pub struct ThumbnailProviderVTable {
    pub query_interface: QueryInterface,
    pub add_ref: AddRef,
    pub release: Release,
    pub get_thumbnail: unsafe extern "system" fn(
        this: *mut c_void,
        edge: u32,
        bitmap: *mut HBITMAP,
        alpha_type: *mut i32,
    ) -> HRESULT,
}

#[repr(C)]
pub struct StreamVTable {
    pub query_interface: QueryInterface,
    pub add_ref: AddRef,
    pub release: Release,
    pub read: unsafe extern "system" fn(
        this: *mut c_void,
        buffer: *mut c_void,
        bytes: u32,
        read: *mut u32,
    ) -> HRESULT,
    pub write: *const c_void,
    pub seek: unsafe extern "system" fn(
        this: *mut c_void,
        offset: i64,
        origin: u32,
        position: *mut u64,
    ) -> HRESULT,
    pub set_size: *const c_void,
    pub copy_to: *const c_void,
    pub commit: *const c_void,
    pub revert: *const c_void,
    pub lock_region: *const c_void,
    pub unlock_region: *const c_void,
    pub stat:
        unsafe extern "system" fn(this: *mut c_void, stat: *mut STATSTG, flags: u32) -> HRESULT,
    pub clone_stream: *const c_void,
}

pub unsafe fn stream_vtable(stream: *mut c_void) -> &'static StreamVTable {
    unsafe { &**(stream.cast::<*const StreamVTable>()) }
}
