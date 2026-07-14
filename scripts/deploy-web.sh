#!/usr/bin/env bash
#
# Atomic, secure web deploy for ROCCO playtesting.
#
# Uploads the built web app to an immutable, versioned release directory on the
# remote server, verifies integrity, then atomically swaps the `current` symlink.
# If the post-switch smoke test fails, the previous `current` target is restored
# before the script exits with an error.
#
# Required environment variables:
#   DEPLOY_HOST      remote SSH host
#   DEPLOY_PORT      remote SSH port (default 22)
#   DEPLOY_USER      remote deploy user
#   DEPLOY_BASE      remote absolute base dir (contains releases/ and current)
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
DEPLOY_HOST="${DEPLOY_HOST:?DEPLOY_HOST is required}"
DEPLOY_USER="${DEPLOY_USER:?DEPLOY_USER is required}"
DEPLOY_BASE="${DEPLOY_BASE:?DEPLOY_BASE is required}"
RELEASE_ID="${GITHUB_SHA:?GITHUB_SHA is required}"

SSH_OPTS=(-o StrictHostKeyChecking=yes -o BatchMode=yes -p "$DEPLOY_PORT")
SCP_OPTS=(-o StrictHostKeyChecking=yes -o BatchMode=yes -P "$DEPLOY_PORT")
REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
REMOTE_RELEASE="${DEPLOY_BASE}/releases/${RELEASE_ID}"
LOCK_DIR="${DEPLOY_BASE}/.deploy-lock"
CURRENT_LINK="${DEPLOY_BASE}/current"
MANIFEST="$(mktemp)"
LOCK_HELD=0

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

run_remote() {
  ssh "${SSH_OPTS[@]}" "$REMOTE" "$1"
}

release_lock() {
  if [ "$LOCK_HELD" -eq 1 ]; then
    if ! run_remote "rmdir '${LOCK_DIR}'" >/dev/null 2>&1; then
      printf '%s\n' "Warning: failed to release remote deploy lock at ${LOCK_DIR}" >&2
    fi
    LOCK_HELD=0
  fi
}

cleanup() {
  local exit_code=$?
  rm -f "$MANIFEST"
  release_lock
  exit "$exit_code"
}

trap cleanup EXIT

validate_absolute_remote_path() {
  local path_value="$1"
  local label="$2"
  if [ -z "$path_value" ]; then
    fail "${label} must not be empty"
  fi
  case "$path_value" in
    /*) ;;
    *)
      fail "${label} must be an absolute path"
      ;;
  esac
  case "$path_value" in
    /|*"/../"*|*"/.."|*"./"*|*"."|*".."*)
      fail "${label} must not point at a dangerous path"
      ;;
  esac
}

if [[ ! "$RELEASE_ID" =~ ^[0-9a-f]{7,40}$ ]]; then
  fail "GITHUB_SHA must be a hexadecimal commit SHA"
fi

if [[ ! "$DEPLOY_PORT" =~ ^[0-9]+$ ]] || [ "$DEPLOY_PORT" -lt 1 ] || [ "$DEPLOY_PORT" -gt 65535 ]; then
  fail "DEPLOY_PORT must be a number between 1 and 65535"
fi

if [[ ! "$DEPLOY_KEEP" =~ ^[1-9][0-9]*$ ]]; then
  fail "DEPLOY_KEEP_RELEASES must be a positive integer"
fi

if [[ "$DEPLOY_HOST" =~ [[:space:]] ]]; then
  fail "DEPLOY_HOST must not contain whitespace"
fi

if [[ "$DEPLOY_USER" =~ [[:space:]] ]]; then
  fail "DEPLOY_USER must not contain whitespace"
fi

if [ ! -d "$DIST_DIR" ]; then
  fail "DIST_DIR must point to an existing directory"
fi

validate_absolute_remote_path "$DEPLOY_BASE" "DEPLOY_BASE"

# Build an integrity manifest of every file in the build output.
( cd "$DIST_DIR" && find . -type f -print0 | sort -z | xargs -0 sha256sum ) > "$MANIFEST"

# Acquire an exclusive remote lock shared with rollback.
run_remote "umask 077 && mkdir '${LOCK_DIR}'"
LOCK_HELD=1

PREVIOUS_TARGET="$(run_remote "if [ -L '${CURRENT_LINK}' ]; then readlink '${CURRENT_LINK}'; fi")"

# Ensure the release directory exists on the server. scp -r requires the final
# target dir to already exist, so create it and replace any partial leftover
# from a prior failed upload of the same SHA.
run_remote "mkdir -p '${DEPLOY_BASE}/releases' && rm -rf '${REMOTE_RELEASE}' && mkdir -p '${REMOTE_RELEASE}'"

# Upload the build into a brand-new release directory that nothing serves yet.
scp "${SCP_OPTS[@]}" -r "$DIST_DIR/." "$REMOTE:${REMOTE_RELEASE}/"
scp "${SCP_OPTS[@]}" "$MANIFEST" "$REMOTE:${REMOTE_RELEASE}/integrity.sha256"

# Verify integrity on the remote side and confirm critical files exist.
run_remote "cd '${REMOTE_RELEASE}' && sha256sum -c integrity.sha256"
run_remote "test -f '${REMOTE_RELEASE}/index.html' && test -f '${REMOTE_RELEASE}/sw.js'"

# Atomically switch `current` to the new release.
RELATIVE_TARGET="releases/${RELEASE_ID}"
run_remote "ln -sfn '${RELATIVE_TARGET}' '${DEPLOY_BASE}/.current-link' && mv -Tf '${DEPLOY_BASE}/.current-link' '${CURRENT_LINK}'"

ACTIVE_TARGET="$(run_remote "readlink '${CURRENT_LINK}'")"
if [ "$ACTIVE_TARGET" != "$RELATIVE_TARGET" ]; then
  fail "Current release did not switch to ${RELATIVE_TARGET}"
fi

# Smoke test the deployed version (opt-in via DEPLOY_URL). On failure, restore
# the previous target before exiting.
if [ -n "${DEPLOY_URL:-}" ]; then
  if ! curl -fIL --retry 3 --retry-delay 2 "${DEPLOY_URL%/}/index.html"; then
    if [ -n "$PREVIOUS_TARGET" ]; then
      run_remote "ln -sfn '${PREVIOUS_TARGET}' '${DEPLOY_BASE}/.current-link' && mv -Tf '${DEPLOY_BASE}/.current-link' '${CURRENT_LINK}'"
      RESTORED_TARGET="$(run_remote "readlink '${CURRENT_LINK}'")"
      if [ "$RESTORED_TARGET" != "$PREVIOUS_TARGET" ]; then
        fail "Smoke test failed and automatic rollback could not restore ${PREVIOUS_TARGET}"
      fi
    else
      run_remote "rm -f '${CURRENT_LINK}'"
    fi
    fail "Smoke test failed for ${RELEASE_ID}; previous release restored"
  fi
fi

# Prune old releases while preserving the active target and the freshly uploaded
# release for diagnosis.
ACTIVE_TARGET="$(run_remote "readlink '${CURRENT_LINK}'")"
ACTIVE_SHA="$(basename "${ACTIVE_TARGET%/}")"
run_remote "cd '${DEPLOY_BASE}/releases' && ls -1t | tail -n +$((DEPLOY_KEEP + 1)) | while read -r old; do if [ \"\$old\" != '${RELEASE_ID}' ] && [ \"\$old\" != '${ACTIVE_SHA}' ]; then rm -rf \"\$old\"; fi; done"

echo "Deployed ${RELEASE_ID} to ${CURRENT_LINK}"
