use crate::process::BitmapData;
use alhangeul_document_preview::limits::checked_bgra_len;
use core::ffi::c_void;
use windows_sys::Win32::Graphics::Gdi::{
    CreateDIBSection, BITMAPINFO, BI_RGB, DIB_RGB_COLORS, HBITMAP,
};

pub fn create_bitmap(bitmap: &BitmapData) -> Result<HBITMAP, ()> {
    if checked_bgra_len(bitmap.width, bitmap.height).map_err(|_| ())? != bitmap.bgra.len() {
        return Err(());
    }
    let width = i32::try_from(bitmap.width).map_err(|_| ())?;
    let height = i32::try_from(bitmap.height).map_err(|_| ())?;
    let image_size = u32::try_from(bitmap.bgra.len()).map_err(|_| ())?;
    let mut info = BITMAPINFO::default();
    info.bmiHeader.biSize =
        u32::try_from(core::mem::size_of_val(&info.bmiHeader)).map_err(|_| ())?;
    info.bmiHeader.biWidth = width;
    info.bmiHeader.biHeight = -height;
    info.bmiHeader.biPlanes = 1;
    info.bmiHeader.biBitCount = 32;
    info.bmiHeader.biCompression = BI_RGB;
    info.bmiHeader.biSizeImage = image_size;
    let mut bits: *mut c_void = core::ptr::null_mut();
    let handle = unsafe {
        CreateDIBSection(
            core::ptr::null_mut(),
            &info,
            DIB_RGB_COLORS,
            &mut bits,
            core::ptr::null_mut(),
            0,
        )
    };
    if handle.is_null() || bits.is_null() {
        return Err(());
    }
    unsafe { core::ptr::copy_nonoverlapping(bitmap.bgra.as_ptr(), bits.cast(), bitmap.bgra.len()) };
    Ok(handle)
}
