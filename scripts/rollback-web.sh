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
#   DEPLOY_BASE    remote *parent* base dir (contains releases/ and current)
#   TARGET_SHA     SHA of the release to roll back to (must exist under releases/)

set -euo pipefail

DEPLOY_PORT="${DEPLOY_PORT:-22}"
TARGET_SHA="${TARGET_SHA:?TARGET_SHA is required (the release SHA to roll back to)}"
TARGET_RELEASE="$DEPLOY_BASE/releases/$TARGET_SHA"

SSH_OPTS=(-o StrictHostKeyChecking=yes -o BatchMode=yes -p "$DEPLOY_PORT")
REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"

# Ensure the target release still exists.
ssh "${SSH_OPTS[@]}" "$REMOTE" "test -d '${TARGET_RELEASE}'"

# Atomically swap `current` to the previous release.
RELATIVE_TARGET="releases/${TARGET_SHA}"
ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "ln -sfn '${RELATIVE_TARGET}' '${TARGET_RELEASE}/.current-link' && mv -Tf '${TARGET_RELEASE}/.current-link' '${DEPLOY_BASE}/current'"

echo "Rolled back to ${TARGET_SHA}"
