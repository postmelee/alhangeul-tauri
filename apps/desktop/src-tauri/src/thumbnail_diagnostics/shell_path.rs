//! Shell parsing names are not Win32 extended-length file names.
//! Input is already canonical, local and held by the caller's verified handles.
//! Do not change filesystem/identity paths; adapt only the Shell API argument.
pub fn parsing_name(path: &[u16]) -> Result<Vec<u16>, ()> {
    let prefix: Vec<u16> = r"\\?\".encode_utf16().collect();
    let path = path.strip_prefix(prefix.as_slice()).unwrap_or(path);
    // Shell support for extended/long paths differs across Windows versions.
    // Never truncate, substitute a short alias, or turn an unsupported name into
    // a different file. This diagnostic's generated local fixtures are short.
    if path.len() < 4
        || path.len() >= 260
        || !matches!(path[0], 65..=90 | 97..=122)
        || path[1] != b':' as u16
        || path[2] != b'\\' as u16
    {
        return Err(());
    }
    for part in path[3..].split(|unit| *unit == b'\\' as u16) {
        if part.is_empty()
            || matches!(part.last(), Some(32 | 46))
            || part
                .iter()
                .any(|unit| matches!(*unit, 0..=31 | 34 | 42 | 47 | 58 | 60 | 62 | 63 | 124))
            || device_name(part)
        {
            return Err(());
        }
    }
    Ok(path.iter().copied().chain([0]).collect())
}

fn device_name(part: &[u16]) -> bool {
    let stem: Vec<_> = part
        .iter()
        .take_while(|unit| **unit != 46)
        .map(|unit| {
            if (97..=122).contains(unit) {
                unit - 32
            } else {
                *unit
            }
        })
        .collect();
    let ascii = |name: &str| stem.iter().copied().eq(name.encode_utf16());
    ["CON", "PRN", "AUX", "NUL", "CONIN$", "CONOUT$"]
        .into_iter()
        .any(ascii)
        || stem.len() == 4
            && matches!(stem[3], 49..=57 | 0x00b9 | 0x00b2 | 0x00b3)
            && (stem[..3] == [67, 79, 77] || stem[..3] == [76, 80, 84])
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn extended_local_path_becomes_shell_name_without_unicode_loss() {
        let expected: Vec<_> = "C:\\한글 space\\😀.jpg\0".encode_utf16().collect();
        for path in [r"C:\한글 space\😀.jpg", r"\\?\C:\한글 space\😀.jpg"] {
            assert_eq!(
                parsing_name(&path.encode_utf16().collect::<Vec<_>>()),
                Ok(expected.clone())
            );
        }
        let path = [67, 58, 92, 0xd800, 46, 106, 112, 103];
        assert_eq!(parsing_name(&path).unwrap()[3], 0xd800);
    }
    #[test]
    fn ambiguous_device_and_unsupported_names_are_never_reinterpreted() {
        for path in [
            r"\\server\share\a.jpg",
            r"\\?\UNC\server\share\a.jpg",
            r"\\.\C:\a.jpg",
            r"C:a.jpg",
            r"C:\..\a.jpg",
            r"C:\.\a.jpg",
            r"C:\dir.\a.jpg",
            r"C:\dir \a.jpg",
            r"C:\a.jpg:stream",
            r"C:\a/b.jpg",
            r"C:\NUL.jpg",
            r"C:\com1\a.jpg",
            r"C:\LPT¹.txt",
            r"C:\\a.jpg",
            "C:\\a\0.jpg",
        ] {
            assert!(
                parsing_name(&path.encode_utf16().collect::<Vec<_>>()).is_err(),
                "{path}"
            );
        }
        assert!(parsing_name(&vec![65; 260]).is_err());
    }
}
