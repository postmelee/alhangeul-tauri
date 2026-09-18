//! Bounded REG_SZ payload decoding, independent of Windows registry IO.
pub fn decode_sz(bytes: &[u8], allow_empty: bool) -> Option<String> {
    if bytes.len() > 32768 || !bytes.len().is_multiple_of(2) {
        return None;
    }
    let mut units: Vec<_> = bytes
        .as_chunks::<2>()
        .0
        .iter()
        .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
        .collect();
    if units.pop() != Some(0) || units.contains(&0) {
        return None;
    }
    let value = String::from_utf16(&units).ok()?;
    (allow_empty || !value.is_empty()).then_some(value)
}

// DisplayName discovery may encounter literal REG_EXPAND_SZ names in other
// products. Never expand environment variables or assume unresolved names are
// unrelated: keep those ambiguous records unreadable instead of skipping them.
pub fn decode_display_name(bytes: &[u8], expandable: bool) -> Option<String> {
    let value = decode_sz(bytes, true)?;
    if expandable && value.contains('%') {
        return None;
    }
    Some(value)
}

#[cfg(test)]
mod tests {
    use super::{decode_display_name, decode_sz};

    fn encoded(text: &str) -> Vec<u8> {
        text.encode_utf16()
            .chain([0])
            .flat_map(u16::to_le_bytes)
            .collect()
    }

    #[test]
    fn empty_display_name_is_readable_but_not_a_product_match() {
        let bytes = encoded("");
        assert_eq!(decode_sz(&bytes, false), None); // Former collector abort.
        let display = decode_sz(&bytes, true).unwrap();
        assert!(!display.eq_ignore_ascii_case("Alhangeul"));
        assert_eq!(display, "");
    }

    #[test]
    fn product_and_unicode_names_are_preserved() {
        for name in ["Alhangeul", "Other application", "한글", "📄"] {
            for allow in [false, true] {
                assert_eq!(decode_sz(&encoded(name), allow).as_deref(), Some(name));
            }
        }
    }

    #[test]
    fn literal_expandable_display_names_are_readable() {
        for name in ["", "Other application", "Alhangeul", "한글 📄"] {
            assert_eq!(
                decode_display_name(&encoded(name), true).as_deref(),
                Some(name)
            );
        }
    }

    #[test]
    fn unresolved_expandable_names_are_not_silently_skipped() {
        for name in ["%PRODUCT%", "%PRODUCT", "Product 100%"] {
            assert_eq!(decode_display_name(&encoded(name), true), None);
            // REG_SZ is literal, so '%' does not require expansion there.
            assert_eq!(
                decode_display_name(&encoded(name), false).as_deref(),
                Some(name)
            );
        }
    }

    #[test]
    fn malformed_payloads_remain_unreadable_in_both_modes() {
        for bytes in [
            vec![],
            vec![0],
            vec![65, 0],
            vec![0, 0, 0, 0],
            vec![0, 216, 0, 0],
            encoded("A\0B"),
            vec![65; 32770],
        ] {
            assert_eq!(decode_sz(&bytes, false), None);
            assert_eq!(decode_sz(&bytes, true), None);
            assert_eq!(decode_display_name(&bytes, false), None);
            assert_eq!(decode_display_name(&bytes, true), None);
        }
    }
}
