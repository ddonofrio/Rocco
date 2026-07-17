import { describe, expect, it } from 'vitest';

import { scanText } from '../../scripts/check-tracked-content.mjs';

describe('check-tracked-content scanner', () => {
  it('reports BOM and invalid UTF-8 at the file boundary', () => {
    expect(() => scanText('fixture.ts', new Uint8Array([0xef, 0xbb, 0xbf, 0x61]))).toThrow(
      expect.objectContaining({ ruleId: 'utf8-bom', lineNumber: 1 }),
    );
    expect(() => scanText('fixture.ts', new Uint8Array([0xc3, 0x28]))).toThrow(
      expect.objectContaining({ ruleId: 'invalid-utf8', lineNumber: 1 }),
    );
  });

  it('reports literal replacement characters and likely mojibake', () => {
    const replacementFailures = scanText(
      'fixture.ts',
      new TextEncoder().encode('const text = "\u{FFFD}";'),
    );
    const mojibakeFailures = scanText(
      'fixture.ts',
      new TextEncoder().encode('const name = "caf\u{00C3}\u{00A9}";'),
    );

    expect(replacementFailures).toEqual([
      expect.objectContaining({ ruleId: 'replacement-character', lineNumber: 1 }),
    ]);
    expect(mojibakeFailures).toEqual([
      expect.objectContaining({ ruleId: 'likely-mojibake', lineNumber: 1 }),
    ]);
  });

  it('keeps the narrow local-path allowlist scoped to its declared files', () => {
    const localDirectory = ['.', 'local'].join('');
    const localCachePath = `${localDirectory}/cache`;
    const localIgnoreGlob = `${localDirectory}/**`;
    expect(
      scanText('fixture.ts', new TextEncoder().encode(`const path = '${localCachePath}';`)),
    ).toEqual([expect.objectContaining({ ruleId: 'local-only-path', lineNumber: 1 })]);
    expect(
      scanText('eslint.config.js', new TextEncoder().encode(`const path = '${localIgnoreGlob}';`)),
    ).toEqual([]);
    expect(scanText('.prettierignore', new TextEncoder().encode(`${localDirectory}/`))).toEqual([]);
  });
});
