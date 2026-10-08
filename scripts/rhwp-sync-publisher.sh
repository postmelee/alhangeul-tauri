#!/usr/bin/env bash
# Commit locally, then publish only after the workflow's committed-candidate gates.
set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN is required}" "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"
: "${BRANCH:?BRANCH is required}" "${TARGET_TAG:?TARGET_TAG is required}"
[[ "$TARGET_TAG" =~ ^v(0|[1-9][0-9]*)[.](0|[1-9][0-9]*)[.](0|[1-9][0-9]*)$ ]]
[[ "$BRANCH" == "automation/rhwp-${TARGET_TAG}-full-sync" ]]

require_absent_branch() {
  local remote_status=0
  git ls-remote --exit-code origin "refs/heads/$BRANCH" >/dev/null 2>&1 || remote_status=$?
  if (( remote_status == 0 )); then
    echo "Automation branch appeared after resolve; refusing to overwrite it." >&2
    exit 1
  elif (( remote_status != 2 )); then
    echo "Failed to verify the automation branch (exit $remote_status)." >&2
    exit "$remote_status"
  fi
}

commit_candidate() {
  : "${APP_SLUG:?APP_SLUG is required}" "${RUNNER_TEMP:?RUNNER_TEMP is required}"
  require_absent_branch
  local app_user_id
  app_user_id="$(gh api "/users/${APP_SLUG}[bot]" --jq .id)"
  [[ "$app_user_id" =~ ^[0-9]+$ ]]
  git config user.name "${APP_SLUG}[bot]"
  git config user.email "${app_user_id}+${APP_SLUG}[bot]@users.noreply.github.com"
  git switch -c "$BRANCH"
  git add -- \
    README.md apps/desktop/src-tauri/Cargo.lock \
    crates/document-preview/Cargo.lock apps/thumbnail-worker/Cargo.lock \
    apps/linux-thumbnailer/Cargo.lock \
    apps/studio-host/src/core/upstream-boundary.test.ts \
    apps/studio-host/vendor/rhwp-core \
    docs/DEVELOPMENT.md docs/architecture/UPSTREAM.md \
    scripts/linux-thumbnail-core-fixtures.mjs scripts/windows-thumbnail-fixtures.json \
    rhwp-core.lock tests/rhwp-pin.test.mjs third_party/rhwp
  git diff --cached --name-only | LC_ALL=C sort -u > "$RUNNER_TEMP/rhwp-sync-staged-paths.txt"
  diff -u "$RUNNER_TEMP/rhwp-sync-changed-paths.txt" "$RUNNER_TEMP/rhwp-sync-staged-paths.txt"
  git commit -m "Sync rhwp upstream to $TARGET_TAG"
  local candidate_sha
  candidate_sha="$(git rev-parse HEAD)"
  [[ "$candidate_sha" =~ ^[0-9a-f]{40}$ ]]
  echo "candidate_sha=$candidate_sha" >> "$GITHUB_OUTPUT"
}

publish_candidate() {
  : "${BASE_BRANCH:?BASE_BRANCH is required}" "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
  : "${RUNNER_TEMP:?RUNNER_TEMP is required}" "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"
  : "${GITHUB_STEP_SUMMARY:?GITHUB_STEP_SUMMARY is required}"
  : "${CANDIDATE_SHA:?CANDIDATE_SHA is required}"
  [[ "$CANDIDATE_SHA" =~ ^[0-9a-f]{40}$ ]]
  if [[ "$(git rev-parse HEAD)" != "$CANDIDATE_SHA" ]]; then
    echo 'Candidate HEAD changed after the committed-candidate gates.' >&2
    exit 1
  fi
  require_absent_branch
  gh auth setup-git
  git push origin "HEAD:refs/heads/$BRANCH"
  local pr_url
  pr_url="$(gh pr create --repo "$GITHUB_REPOSITORY" \
    --base "$BASE_BRANCH" --head "$BRANCH" --draft \
    --title "Sync rhwp upstream to $TARGET_TAG" \
    --body-file "$RUNNER_TEMP/rhwp-sync-pr-body.md")"
  echo "pr_url=$pr_url" >> "$GITHUB_OUTPUT"
  echo "Draft candidate: $pr_url" >> "$GITHUB_STEP_SUMMARY"
}

case "${1:-}" in
  commit) commit_candidate ;;
  publish) publish_candidate ;;
  *) echo 'Usage: rhwp-sync-publisher.sh <commit|publish>' >&2; exit 64 ;;
esac
