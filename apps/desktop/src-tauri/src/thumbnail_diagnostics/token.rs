use super::{handle::OwnedHandle, model::Observation};
use windows::Win32::{Foundation::HANDLE, Security::*, System::Threading::*};

pub struct Token {
    pub elevated: Observation<bool>,
    pub elevation_type: Observation<u32>,
    pub integrity_rid: Observation<u32>,
}

pub fn read() -> Token {
    let mut token = HANDLE::default();
    // SAFETY: output handle is valid writable storage; the pseudo-handle is borrowed.
    if unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) }.is_err() {
        return Token {
            elevated: Observation::Unreadable,
            elevation_type: Observation::Unreadable,
            integrity_rid: Observation::Unreadable,
        };
    }
    let token = OwnedHandle(token);
    let elevated = match integer(token.0, TokenElevation) {
        Observation::Known(value @ 0..=1) => Observation::Known(value != 0),
        _ => Observation::Unreadable,
    };
    Token {
        elevated,
        elevation_type: integer(token.0, TokenElevationType),
        integrity_rid: integrity(token.0).map_or(Observation::Unreadable, Observation::Known),
    }
}

fn integer(token: HANDLE, kind: TOKEN_INFORMATION_CLASS) -> Observation<u32> {
    let (mut value, mut length) = (0u32, 0u32);
    // SAFETY: both integer information classes have a four-byte output.
    let result = unsafe {
        GetTokenInformation(
            token,
            kind,
            Some((&mut value as *mut u32).cast()),
            4,
            &mut length,
        )
    };
    if result.is_ok() && length == 4 {
        Observation::Known(value)
    } else {
        Observation::Unreadable
    }
}

fn integrity(token: HANDLE) -> Option<u32> {
    let mut length = 0;
    // SAFETY: a null, zero-length output requests the size only.
    let _ = unsafe { GetTokenInformation(token, TokenIntegrityLevel, None, 0, &mut length) };
    if !(std::mem::size_of::<TOKEN_MANDATORY_LABEL>() as u32..=65536).contains(&length) {
        return None;
    }
    let capacity = length;
    let mut buffer = vec![0usize; (length as usize).div_ceil(std::mem::size_of::<usize>())];
    // SAFETY: usize storage provides pointer alignment and at least capacity bytes.
    unsafe {
        GetTokenInformation(
            token,
            TokenIntegrityLevel,
            Some(buffer.as_mut_ptr().cast()),
            capacity,
            &mut length,
        )
        .ok()?;
        if length > capacity {
            return None;
        }
        let label = &*buffer.as_ptr().cast::<TOKEN_MANDATORY_LABEL>();
        // Validate the embedded SID lies entirely inside the returned allocation
        // before accessing its subauthority count. Never serialize the SID itself.
        let offset = (label.Label.Sid.0 as usize).checked_sub(buffer.as_ptr() as usize)?;
        if offset.checked_add(8)? > length as usize {
            return None;
        }
        let count = *(label.Label.Sid.0 as *const u8).add(1) as usize;
        if count == 0 || count > 15 || offset.checked_add(8 + count * 4)? > length as usize {
            return None;
        }
        if !IsValidSid(label.Label.Sid).as_bool() {
            return None;
        }
        Some(*GetSidSubAuthority(label.Label.Sid, (count - 1) as u32))
    }
}
