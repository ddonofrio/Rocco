#!/usr/bin/env bash
#
# Atomic rollback for the ROCCO playtesting web deploy.
#
# Points the `current` symlink at a previously deployed release directory. Because
# releases are immutable, rollback is just an atomic symlink swap.
#
# Required environment variables:
#   DEPLOY_HOST    remote SSH host
#   DEPLOY_PORT    remote SSH port (default 22)
#   DEPLOY_USER    remote deploy user
#   DEPLOY_BASE    remote absolute base dir (contains releases/ and current)
#   TARGET_SHA     SHA of the release to roll back to (must exist under releases/)

set -euo pipefail

DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_HOST="${DEPLOY_HOST:?DEPLOY_HOST is required}"
DEPLOY_USER="${DEPLOY_USER:?DEPLOY_USER is required}"
DEPLOY_BASE="${DEPLOY_BASE:?DEPLOY_BASE is required}"
TARGET_SHA="${TARGET_SHA:?TARGET_SHA is required (the release SHA to roll back to)}"
TARGET_RELEASE="$DEPLOY_BASE/releases/$TARGET_SHA"
LOCK_DIR="${DEPLOY_BASE}/.deploy-lock"

SSH_OPTS=(-o StrictHostKeyChecking=yes -o BatchMode=yes -p "$DEPLOY_PORT")
REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
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
  release_lock
  exit "$exit_code"
}

trap cleanup EXIT

if [[ ! "$TARGET_SHA" =~ ^[0-9a-f]{7,40}$ ]]; then
  fail "TARGET_SHA must be a hexadecimal commit SHA"
fi

if [[ ! "$DEPLOY_PORT" =~ ^[0-9]+$ ]] || [ "$DEPLOY_PORT" -lt 1 ] || [ "$DEPLOY_PORT" -gt 65535 ]; then
  fail "DEPLOY_PORT must be a number between 1 and 65535"
fi

case "$DEPLOY_BASE" in
  /*) ;;
  *)
    fail "DEPLOY_BASE must be an absolute path"
    ;;
esac

case "$DEPLOY_BASE" in
  /|*"/../"*|*"/.."|*"./"*|*"."|*".."*)
    fail "DEPLOY_BASE must not point at a dangerous path"
    ;;
esac

if [[ "$DEPLOY_HOST" =~ [[:space:]] ]]; then
  fail "DEPLOY_HOST must not contain whitespace"
fi

if [[ "$DEPLOY_USER" =~ [[:space:]] ]]; then
  fail "DEPLOY_USER must not contain whitespace"
fi

run_remote "umask 077 && mkdir '${LOCK_DIR}'"
LOCK_HELD=1

# Ensure the target release still exists.
run_remote "test -d '${TARGET_RELEASE}'"

# Atomically swap `current` to the previous release.
RELATIVE_TARGET="releases/${TARGET_SHA}"
run_remote "ln -sfn '${RELATIVE_TARGET}' '${DEPLOY_BASE}/.current-link' && mv -Tf '${DEPLOY_BASE}/.current-link' '${DEPLOY_BASE}/current'"

echo "Rolled back to ${TARGET_SHA}"
