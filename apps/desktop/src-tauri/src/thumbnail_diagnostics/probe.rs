//! Called only in a bounded STA child, after registration and fixture preflight.
use super::{
    com::Sta,
    model::{Extension, Probe},
};
use std::{os::windows::ffi::OsStrExt, path::Path, time::Instant};
use windows::{
    core::{w, IUnknown, Interface, GUID, HRESULT, PCWSTR, PWSTR},
    Win32::{Foundation::SIZE, Graphics::Gdi::*, System::Com::*, UI::Shell::*},
};

const HANDLER: GUID = GUID::from_u128(0xc1dcf316_0771_49dd_bfea_c85f69b1674b);
const CACHE: GUID = GUID::from_u128(0x50ef4544_ac9f_4a8e_b21b_8a26180db13f);

pub enum ImageMode {
    Shell,
    CacheOnly,
    ForceExtract,
}

fn record(mode: &str) -> Probe {
    Probe {
        schema_version: 1,
        mode: mode.into(),
        phase: "input".into(),
        status: "failed".into(),
        hresult: "0x80004005".into(),
        apartment: "STA".into(),
        elapsed_ms: 0,
        bitmap_present: None,
        width: None,
        height: None,
        request_flags: None,
        cache_flags: None,
        resolved_handler: None,
    }
}

fn checked(probe: &mut Probe, result: HRESULT) -> bool {
    probe.hresult = format!("0x{:08X}", result.0 as u32);
    result.0 == 0
}

fn duration(probe: &mut Probe, start: Instant) {
    probe.elapsed_ms = start.elapsed().as_millis().min(i64::MAX as u128) as i64;
}

pub fn association(_sta: &Sta, extension: Extension) -> Probe {
    let start = Instant::now();
    let mut probe = record("association");
    probe.phase = "AssocQueryStringW".into();
    let extension = match extension {
        Extension::Hwp => w!(".hwp"),
        Extension::Hwpx => w!(".hwpx"),
    };
    let mut output = [0u16; 1024];
    let mut length = output.len() as u32;
    // SAFETY: fixed strings, bounded writable UTF-16 output, no document access.
    let result = unsafe {
        AssocQueryStringW(
            ASSOCF_NONE,
            ASSOCSTR_SHELLEXTENSION,
            extension,
            w!("{E357FCCD-A995-4576-B01F-234630154E96}"),
            Some(PWSTR(output.as_mut_ptr())),
            &mut length,
        )
    };
    if checked(&mut probe, result) && (1..=output.len() as u32).contains(&length) {
        let units = &output[..length as usize];
        if units.last() == Some(&0) {
            if let Ok(value) = String::from_utf16(&units[..units.len() - 1]) {
                // Only a GUID can leave the process, not arbitrary registry text.
                if let Ok(id) = uuid::Uuid::parse_str(&value) {
                    probe.resolved_handler = Some(format!("{{{id}}}").to_uppercase());
                    probe.status = "ok".into();
                }
            }
        }
    }
    duration(&mut probe, start);
    probe
}

pub fn activate(_sta: &Sta) -> Probe {
    let start = Instant::now();
    let mut probe = record("activate");
    probe.phase = "CoCreateInstance.handler".into();
    // SAFETY: fixed verified handler, IUnknown only, in the isolated child.
    let instance: windows::core::Result<IUnknown> =
        unsafe { CoCreateInstance(&HANDLER, None, CLSCTX_INPROC_SERVER) };
    match instance {
        Ok(instance) => {
            checked(&mut probe, HRESULT(0));
            probe.status = "ok".into();
            drop(instance);
        }
        Err(error) => {
            checked(&mut probe, error.code());
        }
    }
    duration(&mut probe, start);
    probe
}

pub fn image(_sta: &Sta, path: &Path, mode: ImageMode) -> Probe {
    let start = Instant::now();
    let mut probe = record(match mode {
        ImageMode::Shell => "shell",
        ImageMode::CacheOnly => "cache-only",
        ImageMode::ForceExtract => "force-extract",
    });
    let mut path: Vec<u16> = path.as_os_str().encode_wide().collect();
    if path.contains(&0) || path.len() > 32766 {
        return probe;
    }
    path.push(0);
    // SAFETY: caller supplies only owned, preflighted fixture paths. Storage
    // remains alive for the whole synchronous call in this bounded child.
    let result = unsafe {
        match mode {
            ImageMode::Shell => shell(PCWSTR(path.as_ptr()), &mut probe),
            ImageMode::CacheOnly => cache(PCWSTR(path.as_ptr()), WTS_INCACHEONLY, &mut probe),
            ImageMode::ForceExtract => {
                cache(PCWSTR(path.as_ptr()), WTS_FORCEEXTRACTION, &mut probe)
            }
        }
    };
    if let Err(error) = result {
        checked(&mut probe, error.code());
    }
    duration(&mut probe, start);
    probe
}

struct OwnedBitmap(HBITMAP);
impl Drop for OwnedBitmap {
    fn drop(&mut self) {
        if !self.0.is_invalid() {
            // SAFETY: GetImage transfers ownership, including unexpected error output.
            let _ = unsafe { DeleteObject(HGDIOBJ(self.0 .0)) };
        }
    }
}

unsafe fn shell(path: PCWSTR, probe: &mut Probe) -> windows::core::Result<()> {
    probe.phase = "SHCreateItemFromParsingName.imageFactory".into();
    let factory: IShellItemImageFactory = SHCreateItemFromParsingName(path, None)?;
    probe.phase = "IShellItemImageFactory.GetImage".into();
    probe.request_flags = Some(SIIGBF_THUMBNAILONLY.0 as u32);
    let mut bitmap = OwnedBitmap(HBITMAP::default());
    // Raw vtable preserves S_FALSE and an unexpected bitmap on failure; the
    // generated Result<HBITMAP> wrapper would discard that evidence/ownership.
    let result = (factory.vtable().GetImage)(
        factory.as_raw(),
        SIZE { cx: 256, cy: 256 },
        SIIGBF_THUMBNAILONLY,
        &mut bitmap.0,
    );
    probe.bitmap_present = Some(!bitmap.0.is_invalid());
    if checked(probe, result) {
        inspect_bitmap(bitmap.0, probe);
    }
    Ok(())
}

unsafe fn cache(path: PCWSTR, flags: WTS_FLAGS, probe: &mut Probe) -> windows::core::Result<()> {
    probe.phase = "SHCreateItemFromParsingName.shellItem".into();
    let item: IShellItem = SHCreateItemFromParsingName(path, None)?;
    probe.phase = "CoCreateInstance.thumbnailCache".into();
    let cache: IThumbnailCache = CoCreateInstance(&CACHE, None, CLSCTX_INPROC_SERVER)?;
    probe.phase = "IThumbnailCache.GetThumbnail".into();
    probe.request_flags = Some(flags.0 as u32);
    let mut shared = std::ptr::null_mut();
    let mut cache_flags = WTS_CACHEFLAGS::default();
    let mut id = WTS_THUMBNAILID::default();
    let result = (cache.vtable().GetThumbnail)(
        cache.as_raw(),
        item.as_raw(),
        256,
        flags,
        &mut shared,
        &mut cache_flags,
        &mut id,
    );
    let shared = (!shared.is_null()).then(|| ISharedBitmap::from_raw(shared));
    if !checked(probe, result) {
        return Ok(());
    }
    probe.cache_flags = Some(cache_flags.0 as u32);
    let Some(shared) = shared else {
        probe.bitmap_present = Some(false);
        return Ok(());
    };
    probe.phase = "ISharedBitmap.GetSharedBitmap".into();
    let mut bitmap = HBITMAP::default();
    let result = (shared.vtable().GetSharedBitmap)(shared.as_raw(), &mut bitmap);
    if checked(probe, result) {
        inspect_bitmap(bitmap, probe);
    }
    // Borrowed bitmap: release the shared interface, never DeleteObject/Detach.
    Ok(())
}

unsafe fn inspect_bitmap(bitmap: HBITMAP, probe: &mut Probe) {
    probe.bitmap_present = Some(!bitmap.is_invalid());
    if bitmap.is_invalid() {
        return;
    }
    let mut value = BITMAP::default();
    let size = std::mem::size_of::<BITMAP>() as i32;
    if GetObjectW(
        HGDIOBJ(bitmap.0),
        size,
        Some((&mut value as *mut BITMAP).cast()),
    ) != size
    {
        return;
    }
    probe.width = Some(value.bmWidth);
    probe.height = Some(value.bmHeight);
    if (1..=1024).contains(&value.bmWidth) && (1..=1024).contains(&value.bmHeight) {
        probe.status = "ok".into();
    }
}
