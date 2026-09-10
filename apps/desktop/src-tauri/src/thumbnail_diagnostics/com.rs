use std::{marker::PhantomData, rc::Rc};
use windows::{core::HRESULT, Win32::System::Com::*};

/// COM initialization is thread-affine; Rc deliberately prevents Send/Sync.
pub struct Sta(PhantomData<Rc<()>>);

impl Sta {
    pub fn enter() -> Result<Self, HRESULT> {
        // SAFETY: no reserved pointer; balanced for S_OK and S_FALSE on this thread.
        let result = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
        if result.is_err() {
            return Err(result);
        }
        Ok(Self(PhantomData))
    }
}

impl Drop for Sta {
    fn drop(&mut self) {
        // SAFETY: cannot move across threads and only constructed after success.
        unsafe { CoUninitialize() };
    }
}
