import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workflowPath = join(fileURLToPath(import.meta.url), '..', '..', '..', '.github', 'workflows', 'build.yml');

describe('Deployment workflow characterization', () => {
  it('SEC-001: workflow contains StrictHostKeyChecking=no', async () => {
    const content = await readFile(workflowPath, 'utf-8');
    expect(content).toContain('StrictHostKeyChecking=no');
  });

  it('SEC-001: workflow suppresses SSH errors with || true', async () => {
    const content = await readFile(workflowPath, 'utf-8');
    expect(content).toContain('|| true');
  });

  it('DEP-001: workflow copies directly over active path without atomic release', async () => {
    const content = await readFile(workflowPath, 'utf-8');
    expect(content).toContain('scp -r');
    expect(content).toContain('dist/*');
    expect(content).not.toContain('releases/');
    expect(content).not.toContain('current ->');
  });
});
