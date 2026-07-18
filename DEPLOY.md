# Deployment (Playtesting Web)

ROCCO deploys the built web app to a playtesting server over SSH. The pipeline is
**secure** (it verifies the server identity and fails closed) and **atomic** (it
publishes immutable, versioned releases and swaps them with a single symlink
rename, so the server never serves a mix of two builds).

The deploy job lives in
`.github/workflows/build.yml` and delegates the steps to `scripts/deploy-web.sh`.

## How it works

```text
REMOTE_PATH/                 <- DEPLOY_BASE: the *parent* deploy base (not the docroot)
  releases/
    <github-sha>/            <- immutable build; never served until linked
    <older-sha>/
    ...
  current -> releases/<github-sha>   <- atomically swapped symlink
```

1. The CI job checks out and downloads the `web-app-latest` artifact (built by
   `build-web`, which depends on the `quality` gate that runs tests).
2. `scripts/deploy-web.sh` generates a `sha256` manifest of `dist`.
3. It uploads the build to `REMOTE_PATH/releases/<github-sha>` — a directory nothing
   serves yet.
4. It verifies integrity (`sha256sum -c`) and asserts `index.html`/`sw.js` exist.
5. It atomically swaps `current` to the new release with
   `mv -Tf` (a single rename on the same filesystem).
6. It runs an optional smoke test (`curl` the deployed `index.html`).
7. It prunes releases older than the 5 most recent, never deleting the active one.

Rollback is a one-command atomic symlink swap to a previous release (see below).

## Required repository secrets

| Secret            | Purpose                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `SSH_PRIVATE_KEY` | Private key for the deploy user (loaded by `webfactory/ssh-agent`).                                                             |
| `SSH_KNOWN_HOSTS` | **Verified** `known_hosts` line(s) for the server (`host:port <type> <key>`). Obtain it once out-of-band and paste it verbatim. |
| `SERVER_HOST`     | SSH host of the playtesting server.                                                                                             |
| `SERVER_PORT`     | SSH port (e.g. `22`).                                                                                                           |
| `SERVER_USER`     | Deploy user on the server.                                                                                                      |
| `REMOTE_PATH`     | **Parent** deploy base dir on the server (contains `releases/` and `current`). This is no longer the docroot.                   |
| `DEPLOY_URL`      | (Optional) Base URL for the post-deploy smoke test, e.g. `https://playtest.example.com`.                                        |

## Server setup (one time)

1. Create the deploy user and `REMOTE_PATH` directory.
2. Set the web server docroot to `REMOTE_PATH/current` (the symlink), not
   `REMOTE_PATH` directly. Restart/reload the web server.
3. Create the initial `current` symlink:
   ```bash
   ln -sfn releases/<initial-sha> REMOTE_PATH/current
   ```
4. (Recommended) Restrict the deploy key in `authorized_keys` to the deploy base
   only, e.g. a forced command or a chroot/jail, and scope it to the `releases/`
   tree. The key should not be able to write outside `REMOTE_PATH`.
5. Capture the verified host key for `SSH_KNOWN_HOSTS`:
   ```bash
   ssh-keyscan -p "$SERVER_PORT" "$SERVER_HOST"
   ```
   Verify the fingerprint through a trusted channel before saving it as a secret.

> **Breaking change:** previously `REMOTE_PATH` was the live docroot and files were
> copied straight into it. Now `REMOTE_PATH` is the parent base and the docroot must
> be `REMOTE_PATH/current`. Update the server config when adopting this pipeline.

## Rollback

Releases are immutable, so rollback is an atomic symlink swap:

```bash
TARGET_SHA=<previous-sha> \
DEPLOY_BASE=<remote-base> \
DEPLOY_USER=<user> DEPLOY_HOST=<host> DEPLOY_PORT=<port> \
bash scripts/rollback-web.sh
```

List available releases with `ssh <user>@<host> ls <remote-base>/releases`.

## Notes

- `StrictHostKeyChecking=yes` is enforced; a changed host key fails the deploy.
- No `|| true` swallows auth or transport errors; the job fails closed.
- The deploy job uses least-privilege permissions (`contents: read`, `actions: read`)
  and the `playtesting` environment, so protection rules apply.
- Concurrent deploys serialize via `concurrency: deploy-playtesting`
  (`cancel-in-progress: false`), so two pushes cannot interleave writes.
