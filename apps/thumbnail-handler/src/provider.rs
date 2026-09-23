use crate::abi::{
    stream_vtable, InitializeWithStreamVTable, InterfaceHeader, ThumbnailProviderVTable,
};
use crate::registration::{
    guid_matches, INITIALIZE_WITH_STREAM_IID, THUMBNAIL_PROVIDER_IID, UNKNOWN_IID,
};
use alhangeul_document_preview::limits::MAX_INPUT_BYTES;
use core::ffi::c_void;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use windows_sys::core::{GUID, HRESULT};
use windows_sys::Win32::Foundation::{
    ERROR_ALREADY_INITIALIZED, E_FAIL, E_INVALIDARG, E_NOINTERFACE, E_POINTER, E_UNEXPECTED,
    STG_E_MEDIUMFULL, S_OK,
};
use windows_sys::Win32::Graphics::Gdi::HBITMAP;
use windows_sys::Win32::System::Com::STATSTG;

#[repr(C)]
struct Provider {
    initialize: InterfaceHeader<InitializeWithStreamVTable>,
    thumbnail: InterfaceHeader<ThumbnailProviderVTable>,
    references: AtomicU32,
    bytes: Mutex<Option<Arc<[u8]>>>,
}

static INITIALIZE_VTABLE: InitializeWithStreamVTable = InitializeWithStreamVTable {
    query_interface,
    add_ref,
    release,
    initialize,
};

static THUMBNAIL_VTABLE: ThumbnailProviderVTable = ThumbnailProviderVTable {
    query_interface,
    add_ref,
    release,
    get_thumbnail,
};

pub unsafe fn create_instance(iid: *const GUID, object: *mut *mut c_void) -> HRESULT {
    if object.is_null() || iid.is_null() {
        return E_POINTER;
    }
    unsafe { *object = core::ptr::null_mut() };
    let provider = create_provider();
    let initialize: *mut InterfaceHeader<InitializeWithStreamVTable> =
        unsafe { &mut (*provider).initialize };
    let result = unsafe { query_interface(initialize.cast(), iid, object) };
    unsafe { release(initialize.cast()) };
    result
}

fn create_provider() -> *mut Provider {
    let mut provider = Box::new(Provider {
        initialize: InterfaceHeader {
            vtable: &INITIALIZE_VTABLE,
            owner: core::ptr::null_mut(),
        },
        thumbnail: InterfaceHeader {
            vtable: &THUMBNAIL_VTABLE,
            owner: core::ptr::null_mut(),
        },
        references: AtomicU32::new(1),
        bytes: Mutex::new(None),
    });
    let owner = (&mut *provider as *mut Provider).cast();
    provider.initialize.owner = owner;
    provider.thumbnail.owner = owner;
    crate::object_created();
    Box::into_raw(provider)
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
        let provider = unsafe { owner(this) };
        let interface: *mut c_void = if unsafe { guid_matches(iid, UNKNOWN_IID) }
            || unsafe { guid_matches(iid, INITIALIZE_WITH_STREAM_IID) }
        {
            unsafe {
                (&mut (*provider).initialize as *mut InterfaceHeader<InitializeWithStreamVTable>)
                    .cast()
            }
        } else if unsafe { guid_matches(iid, THUMBNAIL_PROVIDER_IID) } {
            unsafe {
                (&mut (*provider).thumbnail as *mut InterfaceHeader<ThumbnailProviderVTable>).cast()
            }
        } else {
            return E_NOINTERFACE;
        };
        unsafe { *object = interface };
        unsafe { add_ref(interface) };
        S_OK
    })
}

unsafe extern "system" fn add_ref(this: *mut c_void) -> u32 {
    crate::guard_u32(|| {
        let provider = unsafe { owner(this) };
        unsafe { &*provider }
            .references
            .fetch_add(1, Ordering::AcqRel)
            + 1
    })
}

unsafe extern "system" fn release(this: *mut c_void) -> u32 {
    crate::guard_u32(|| {
        let provider = unsafe { owner(this) };
        let remaining = unsafe { &*provider }
            .references
            .fetch_sub(1, Ordering::AcqRel)
            - 1;
        if remaining == 0 {
            crate::object_destroyed();
            drop(unsafe { Box::from_raw(provider) });
        }
        remaining
    })
}

unsafe extern "system" fn initialize(
    this: *mut c_void,
    stream: *mut c_void,
    _mode: u32,
) -> HRESULT {
    crate::guard_hresult(|| match unsafe { initialize_inner(this, stream) } {
        Ok(()) => S_OK,
        Err(error) => error,
    })
}

unsafe extern "system" fn get_thumbnail(
    this: *mut c_void,
    edge: u32,
    bitmap: *mut HBITMAP,
    alpha_type: *mut i32,
) -> HRESULT {
    crate::guard_hresult(
        || match unsafe { get_thumbnail_inner(this, edge, bitmap, alpha_type) } {
            Ok(()) => S_OK,
            Err(error) => error,
        },
    )
}

unsafe fn initialize_inner(this: *mut c_void, stream: *mut c_void) -> Result<(), HRESULT> {
    if stream.is_null() {
        return Err(E_POINTER);
    }
    let provider = unsafe { &*owner(this) };
    let mut slot = provider.bytes.lock().map_err(|_| E_FAIL)?;
    if slot.is_some() {
        return Err(hresult_from_win32(ERROR_ALREADY_INITIALIZED));
    }
    let bytes = unsafe { read_stream(stream) }?;
    *slot = Some(Arc::from(bytes));
    Ok(())
}

unsafe fn get_thumbnail_inner(
    this: *mut c_void,
    edge: u32,
    bitmap: *mut HBITMAP,
    alpha_type: *mut i32,
) -> Result<(), HRESULT> {
    if bitmap.is_null() || alpha_type.is_null() {
        return Err(E_POINTER);
    }
    unsafe {
        *bitmap = core::ptr::null_mut();
        *alpha_type = 0;
    }
    if edge == 0 {
        return Err(E_INVALIDARG);
    }
    let provider = unsafe { &*owner(this) };
    let bytes = provider
        .bytes
        .lock()
        .map_err(|_| E_FAIL)?
        .clone()
        .ok_or(E_UNEXPECTED)?;
    let rendered = crate::process::render_thumbnail(bytes, edge).map_err(|_| E_FAIL)?;
    let handle = crate::bitmap::create_bitmap(&rendered).map_err(|_| E_FAIL)?;
    unsafe {
        *bitmap = handle;
        *alpha_type = 2;
    }
    Ok(())
}

unsafe fn read_stream(stream: *mut c_void) -> Result<Vec<u8>, HRESULT> {
    let vtable = unsafe { stream_vtable(stream) };
    let mut stat = STATSTG::default();
    let status = unsafe { (vtable.stat)(stream, &mut stat, 1) };
    if status < 0 {
        return Err(status);
    }
    if stat.cbSize > MAX_INPUT_BYTES as u64 {
        return Err(STG_E_MEDIUMFULL);
    }
    let status = unsafe { (vtable.seek)(stream, 0, 0, core::ptr::null_mut()) };
    if status < 0 {
        return Err(status);
    }
    read_stream_chunks(
        stream,
        vtable,
        usize::try_from(stat.cbSize).map_err(|_| STG_E_MEDIUMFULL)?,
    )
}

fn read_stream_chunks(
    stream: *mut c_void,
    vtable: &crate::abi::StreamVTable,
    expected: usize,
) -> Result<Vec<u8>, HRESULT> {
    let mut bytes = Vec::with_capacity(expected);
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let mut read = 0_u32;
        let status = unsafe {
            (vtable.read)(
                stream,
                buffer.as_mut_ptr().cast(),
                u32::try_from(buffer.len()).map_err(|_| E_FAIL)?,
                &mut read,
            )
        };
        if status < 0 {
            return Err(status);
        }
        if read == 0 {
            break;
        }
        let read = usize::try_from(read).map_err(|_| E_FAIL)?;
        if bytes.len().saturating_add(read) > MAX_INPUT_BYTES {
            return Err(STG_E_MEDIUMFULL);
        }
        bytes.extend_from_slice(&buffer[..read]);
    }
    Ok(bytes)
}

unsafe fn owner(this: *mut c_void) -> *mut Provider {
    let header = this.cast::<InterfaceHeader<InitializeWithStreamVTable>>();
    unsafe { (*header).owner.cast() }
}

const fn hresult_from_win32(error: u32) -> HRESULT {
    (0x8007_0000_u32 | (error & 0xffff)) as i32
}
