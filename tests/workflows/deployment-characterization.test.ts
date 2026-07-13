import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(import.meta.url), '..', '..', '..');
const workflowPath = join(repoRoot, '.github', 'workflows', 'build.yml');
const deployScriptPath = join(repoRoot, 'scripts', 'deploy-web.sh');

describe('Deployment workflow characterization', () => {
  it('SEC-001: workflow verifies the SSH host and fails closed', async () => {
    const content = await readFile(workflowPath, 'utf-8');
    expect(content).not.toContain('StrictHostKeyChecking=no');
    expect(content).not.toContain('|| true');
    expect(content).toContain('SSH_KNOWN_HOSTS');
    expect(content).toContain('known_hosts');
  });

  it('SEC-001: deploy script does not suppress SSH/auth errors', async () => {
    const script = await readFile(deployScriptPath, 'utf-8');
    expect(script).not.toContain('|| true');
    expect(script).toContain('StrictHostKeyChecking=yes');
  });

  it('DEP-001: deploy publishes immutable releases and switches them atomically', async () => {
    const workflow = await readFile(workflowPath, 'utf-8');
    const script = await readFile(deployScriptPath, 'utf-8');

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
});
