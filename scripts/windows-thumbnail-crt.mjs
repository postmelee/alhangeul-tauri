// Sidecars do not run tauri-build, so they must select their CRT linkage explicitly.
export function staticThumbnailEnvironment(environment = process.env) {
  const encoded = environment.CARGO_ENCODED_RUSTFLAGS;
  const flags = encoded !== undefined
    ? encoded.split('\x1f').filter(Boolean)
    : (environment.RUSTFLAGS ?? environment.CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_RUSTFLAGS ?? '')
      .trim().split(/\s+/).filter(Boolean);
  return {
    ...environment,
    CARGO_ENCODED_RUSTFLAGS: [...flags, '-C', 'target-feature=+crt-static'].join('\x1f'),
  };
}
