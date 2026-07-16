import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(import.meta.url), '..', '..', '..');
const workflowPath = join(repoRoot, '.github', 'workflows', 'build.yml');
const deployScriptPath = join(repoRoot, 'scripts', 'deploy-web.sh');

describe('Deployment workflow characterization', () => {
  it('SEC-001: workflow verifies the SSH host and fails closed', async () => {
    const content = await readFile(workflowPath, 'utf8');
    expect(content).not.toContain('StrictHostKeyChecking=no');
    expect(content).not.toContain('|| true');
    expect(content).toContain('SSH_KNOWN_HOSTS');
    expect(content).toContain('known_hosts');
  });

  it('SEC-001: deploy script does not suppress SSH/auth errors', async () => {
    const script = await readFile(deployScriptPath, 'utf8');
    expect(script).not.toContain('|| true');
    expect(script).toContain('StrictHostKeyChecking=yes');
  });

  it('DEP-001: deploy publishes immutable releases and switches them atomically', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    const script = await readFile(deployScriptPath, 'utf8');

    // The workflow no longer copies straight over the live path.
    expect(workflow).not.toContain('scp -r');
    expect(workflow).not.toContain('dist/*');

    // The deploy script uploads to a new immutable release directory and flips
    // a single symlink atomically, instead of overwriting the active path.
    expect(script).toContain('releases/');
    expect(script).toContain('mv -Tf');
    expect(script).toContain('current');
    expect(script).toContain('integrity.sha256');
  });

  it('CLOSE-011: deploy restores the previous release when the smoke test fails', async () => {
    const script = await readFile(deployScriptPath, 'utf8');
    expect(script).toContain('PREVIOUS_TARGET=');
    expect(script).toContain('Smoke test failed');
    expect(script).toContain("readlink '${CURRENT_LINK}'");
  });

  it('CLOSE-011: deploy and rollback share a remote lock and cleanup trap', async () => {
    const deployScript = await readFile(deployScriptPath, 'utf8');
    const rollbackScript = await readFile(join(repoRoot, 'scripts', 'rollback-web.sh'), 'utf8');

    expect(deployScript).toContain('.deploy-lock');
    expect(deployScript).toContain('trap cleanup EXIT');
    expect(rollbackScript).toContain('.deploy-lock');
    expect(rollbackScript).toContain('trap cleanup EXIT');
  });
});
