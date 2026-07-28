#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/update-upstream.sh --tag <vX.Y.Z> --commit <40-char-sha> [--run-checks]

Updates third_party/rhwp to an immutable Stable release tag and its verified
resolved commit. Branches, floating refs, and legacy UPSTREAM_* environment
variables are not supported.
USAGE
}

usage_error() {
  echo "error: $*" >&2
  usage >&2
  exit 2
}

release_tag=""
expected_commit=""
run_checks=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      [[ $# -ge 2 && "$2" != --* ]] || usage_error "--tag requires a value."
      [[ -z "$release_tag" ]] || usage_error "--tag may only be specified once."
      release_tag="$2"
      shift 2
      ;;
    --commit)
      [[ $# -ge 2 && "$2" != --* ]] || usage_error "--commit requires a value."
      [[ -z "$expected_commit" ]] || usage_error "--commit may only be specified once."
      expected_commit="$2"
      shift 2
      ;;
    --run-checks)
      [[ "$run_checks" == "0" ]] || usage_error "--run-checks may only be specified once."
      run_checks=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage_error "unknown option or positional ref: $1"
      ;;
  esac
done

[[ ${UPSTREAM_BRANCH+x} != x ]] || usage_error "UPSTREAM_BRANCH is no longer supported."
[[ ${UPSTREAM_REMOTE+x} != x ]] || usage_error "UPSTREAM_REMOTE is no longer supported."
[[ ${UPSTREAM_REF+x} != x ]] || usage_error "UPSTREAM_REF is no longer supported."
[[ ${RUN_CHECKS+x} != x ]] || usage_error "RUN_CHECKS is no longer supported; use --run-checks."

[[ -n "$release_tag" ]] || usage_error "--tag is required."
[[ -n "$expected_commit" ]] || usage_error "--commit is required."
[[ "$release_tag" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] \
  || usage_error "--tag must be a Stable release tag in vX.Y.Z form."
[[ ${#expected_commit} -eq 40 && "$expected_commit" =~ ^[0-9a-f]+$ ]] \
  || usage_error "--commit must be a lowercase 40-character SHA."

repo_root="$(git rev-parse --show-toplevel)"
submodule_dir="$repo_root/third_party/rhwp"

if [[ ! -d "$submodule_dir/.git" && ! -f "$submodule_dir/.git" ]]; then
  echo "Missing upstream submodule at third_party/rhwp." >&2
  echo "Run: git submodule update --init --recursive" >&2
  exit 1
fi

if [[ -n "$(git -C "$submodule_dir" status --porcelain --untracked-files=all)" ]]; then
  echo "Upstream submodule has local changes. Commit or discard them before updating." >&2
  exit 1
fi

configured_origin="$(
  git -C "$repo_root" config -f .gitmodules \
    --get submodule.third_party/rhwp.url || true
)"
actual_origin="$(git -C "$submodule_dir" remote get-url origin)"
if [[ -z "$configured_origin" || "$actual_origin" != "$configured_origin" ]]; then
  echo "Upstream submodule origin does not match .gitmodules." >&2
  echo "Configured: ${configured_origin:-<missing>}" >&2
  echo "Actual: $actual_origin" >&2
  exit 1
fi

git -C "$submodule_dir" fetch --no-tags origin \
  "refs/tags/$release_tag:refs/tags/$release_tag"

resolved_commit="$(
  git -C "$submodule_dir" rev-parse --verify "refs/tags/$release_tag^{commit}"
)"

if [[ "$resolved_commit" != "$expected_commit" ]]; then
  echo "Release tag and expected commit do not match." >&2
  echo "Tag: $release_tag" >&2
  echo "Resolved: $resolved_commit" >&2
  echo "Expected: $expected_commit" >&2
  exit 1
fi

git -C "$submodule_dir" checkout --detach "$expected_commit"

actual_commit="$(git -C "$submodule_dir" rev-parse HEAD)"
if [[ "$actual_commit" != "$expected_commit" ]]; then
  echo "Upstream checkout did not land on the expected commit." >&2
  echo "Actual: $actual_commit" >&2
  echo "Expected: $expected_commit" >&2
  exit 1
fi

if [[ "$run_checks" == "1" ]]; then
  (cd "$repo_root" && pnpm install --frozen-lockfile)
  (cd "$repo_root" && pnpm run check:product-boundary)
  (cd "$repo_root" && pnpm run test:upstream)
  (cd "$repo_root" && pnpm run test:studio)
  (cd "$repo_root" && pnpm run build:studio)
  (cd "$repo_root" && cargo metadata \
    --manifest-path apps/desktop/src-tauri/Cargo.toml \
    --locked \
    --offline \
    --no-deps)
  (cd "$repo_root" && cargo fmt \
    --manifest-path apps/desktop/src-tauri/Cargo.toml \
    --all \
    -- \
    --check)
fi

cat <<EOF
Stable upstream source checkout updated.

Path: third_party/rhwp
Release tag: $release_tag
Resolved commit: $resolved_commit

Next:
1. Review the submodule pointer diff.
2. Synchronize the native Cargo lock and freshly built WASM package.
3. Write and verify rhwp-core.lock before publishing the new pin.
EOF
