use crate::abi::{ClassFactoryVTable, InterfaceHeader};
use crate::registration::{guid_matches, CLASS_FACTORY_IID, HANDLER_CLSID, UNKNOWN_IID};
use core::ffi::c_void;
use std::sync::atomic::{AtomicU32, Ordering};
use windows_sys::core::{GUID, HRESULT};
use windows_sys::Win32::Foundation::{
    CLASS_E_CLASSNOTAVAILABLE, CLASS_E_NOAGGREGATION, E_NOINTERFACE, E_POINTER, S_OK,
};

#[repr(C)]
struct Factory {
    interface: InterfaceHeader<ClassFactoryVTable>,
    references: AtomicU32,
}

static VTABLE: ClassFactoryVTable = ClassFactoryVTable {
    query_interface,
    add_ref,
    release,
    create_instance,
    lock_server,
};

pub unsafe fn get_class_object(
    class_id: *const GUID,
    iid: *const GUID,
    object: *mut *mut c_void,
) -> HRESULT {
    if object.is_null() {
        return E_POINTER;
    }
    unsafe { *object = core::ptr::null_mut() };
    if !unsafe { guid_matches(class_id, HANDLER_CLSID) } {
        return CLASS_E_CLASSNOTAVAILABLE;
    }
    let factory = create_factory();
    let result = unsafe { query_interface(factory.cast(), iid, object) };
    unsafe { release(factory.cast()) };
    result
}

fn create_factory() -> *mut Factory {
    let mut factory = Box::new(Factory {
        interface: InterfaceHeader {
            vtable: &VTABLE,
            owner: core::ptr::null_mut(),
        },
        references: AtomicU32::new(1),
    });
    let owner = (&mut *factory as *mut Factory).cast();
    factory.interface.owner = owner;
    crate::object_created();
    Box::into_raw(factory)
}

unsafe extern "system" fn query_interface(
    this: *mut c_void,
    iid: *const GUID,
    object: *mut *mut c_void,
) -> HRESULT {
    crate::guard_hresult(|| {
        if object.is_null() || iid.is_null() {
            return E_POINTER;
        }
        unsafe { *object = core::ptr::null_mut() };
        if unsafe { guid_matches(iid, UNKNOWN_IID) }
            || unsafe { guid_matches(iid, CLASS_FACTORY_IID) }
        {
            unsafe { *object = this };
            unsafe { add_ref(this) };
            S_OK
        } else {
            E_NOINTERFACE
        }
    })
}

unsafe extern "system" fn add_ref(this: *mut c_void) -> u32 {
    crate::guard_u32(|| {
        let factory = unsafe { owner(this) };
        unsafe { &*factory }
            .references
            .fetch_add(1, Ordering::AcqRel)
            + 1
    })
}

unsafe extern "system" fn release(this: *mut c_void) -> u32 {
    crate::guard_u32(|| {
        let factory = unsafe { owner(this) };
        let remaining = unsafe { &*factory }
            .references
            .fetch_sub(1, Ordering::AcqRel)
            - 1;
        if remaining == 0 {
            crate::object_destroyed();
            drop(unsafe { Box::from_raw(factory) });
        }
        remaining
    })
}

unsafe extern "system" fn create_instance(
    _this: *mut c_void,
    outer: *mut c_void,
    iid: *const GUID,
    object: *mut *mut c_void,
) -> HRESULT {
    crate::guard_hresult(|| {
        if object.is_null() || iid.is_null() {
            return E_POINTER;
        }
        unsafe { *object = core::ptr::null_mut() };
        if !outer.is_null() {
            return CLASS_E_NOAGGREGATION;
        }
        unsafe { crate::provider::create_instance(iid, object) }
    })
}

unsafe extern "system" fn lock_server(_this: *mut c_void, lock: i32) -> HRESULT {
    crate::guard_hresult(|| {
        crate::set_server_lock(lock != 0);
        S_OK
    })
}

unsafe fn owner(this: *mut c_void) -> *mut Factory {
    let header = this.cast::<InterfaceHeader<ClassFactoryVTable>>();
    unsafe { (*header).owner.cast() }
}
