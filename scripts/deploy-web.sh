#!/usr/bin/env bash
#
# Atomic, secure web deploy for ROCCO playtesting.
#
# Uploads the built web app to an immutable, versioned release directory on the
# remote server, verifies integrity, then atomically swaps the `current` symlink.
# The live site is never served a partial or mixed build.
#
# Required environment variables:
#   DEPLOY_HOST      remote SSH host
#   DEPLOY_PORT      remote SSH port (default 22)
#   DEPLOY_USER      remote deploy user
#   DEPLOY_BASE      remote *parent* base dir (contains releases/ and current)
#   GITHUB_SHA       release identifier (commit SHA)
#   DIST_DIR         local build output dir (default: dist)
#
# Optional:
#   DEPLOY_URL            base URL used for the post-switch smoke test
#   DEPLOY_KEEP_RELEASES  number of releases to keep (default 5)

set -euo pipefail

DIST_DIR="${DIST_DIR:-dist}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_KEEP="${DEPLOY_KEEP_RELEASES:-5}"
RELEASE_ID="${GITHUB_SHA:?GITHUB_SHA is required}"
REMOTE_RELEASE="$DEPLOY_BASE/releases/$RELEASE_ID"

SSH_OPTS=(-o StrictHostKeyChecking=yes -o BatchMode=yes -p "$DEPLOY_PORT")
SCP_OPTS=(-o StrictHostKeyChecking=yes -o BatchMode=yes -P "$DEPLOY_PORT")
REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"

# 1. Build an integrity manifest of every file in the build output.
MANIFEST="$(mktemp)"
( cd "$DIST_DIR" && find . -type f -print0 | sort -z | xargs -0 sha256sum ) > "$MANIFEST"

# 2. Ensure the release directory exists on the server. scp -r requires the
#    final target dir to already exist, so create it (and drop any partial
#    leftover from a previous failed upload of the same SHA).
ssh "${SSH_OPTS[@]}" "$REMOTE" "rm -rf '${REMOTE_RELEASE}' && mkdir -p '${REMOTE_RELEASE}'"

# 3. Upload the build into a brand-new release directory that nothing serves yet.
#    A partial or interrupted upload only leaves an orphan dir; it never affects
#    the live site, which still points at the previous release.
scp "${SCP_OPTS[@]}" -r "$DIST_DIR/." "$REMOTE:$REMOTE_RELEASE/"
scp "${SCP_OPTS[@]}" "$MANIFEST" "$REMOTE:$REMOTE_RELEASE/integrity.sha256"

# 4. Verify integrity on the remote side (detects in-transit corruption).
ssh "${SSH_OPTS[@]}" "$REMOTE" "cd '${REMOTE_RELEASE}' && sha256sum -c integrity.sha256"

# 5. Assert that critical files are present in the new release.
ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "test -f '${REMOTE_RELEASE}/index.html' && test -f '${REMOTE_RELEASE}/sw.js'"

# 6. Atomically switch `current` to the new release. The symlink is created in a
#    temp file inside the release dir, then renamed over `current` in a single
#    filesystem operation (mv -Tf). Readers see either the old or the new build.
RELATIVE_TARGET="releases/${RELEASE_ID}"
ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "ln -sfn '${RELATIVE_TARGET}' '${REMOTE_RELEASE}/.current-link' && mv -Tf '${REMOTE_RELEASE}/.current-link' '${DEPLOY_BASE}/current'"

# 7. Smoke test the deployed version (opt-in via DEPLOY_URL).
if [ -n "${DEPLOY_URL:-}" ]; then
  curl -fIL --retry 3 --retry-delay 2 "${DEPLOY_URL%/}/index.html"
fi

# 8. Prune old releases outside the active path. Never remove the release that
#    `current` points at (e.g. after a rollback) and never remove this release.
#    Keep the newest DEPLOY_KEEP releases.
ACTIVE_SHA="$(ssh "${SSH_OPTS[@]}" "$REMOTE" "readlink '${DEPLOY_BASE}/current'")"
ACTIVE_SHA="$(basename "${ACTIVE_SHA%/}")"
ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "cd '${DEPLOY_BASE}/releases' && ls -1t | tail -n +$((DEPLOY_KEEP + 1)) | while read -r old; do if [ \"\$old\" != '${RELEASE_ID}' ] && [ \"\$old\" != '${ACTIVE_SHA}' ]; then rm -rf \"\$old\"; fi; done"

rm -f "$MANIFEST"

echo "Deployed ${RELEASE_ID} to ${DEPLOY_BASE}/current"
