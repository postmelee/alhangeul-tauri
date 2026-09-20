use windows::Win32::Foundation::{CloseHandle, HANDLE};

/// Owned kernel handles only; never wrap GetCurrentProcess's pseudo-handle.
pub struct OwnedHandle(pub HANDLE);

impl Drop for OwnedHandle {
    fn drop(&mut self) {
        if !self.0.is_invalid() {
            // SAFETY: this wrapper uniquely owns the successful API result.
            let _ = unsafe { CloseHandle(self.0) };
        }
    }
}
