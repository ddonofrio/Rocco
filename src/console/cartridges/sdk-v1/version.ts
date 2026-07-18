/**
 * Minimal semantic-version compatibility used to decide whether a cartridge's
 * requested SDK range is satisfied by the console's implemented SDK version.
 *
 * Only the subset needed for SDK negotiation is implemented: exact versions,
 * `^` (compatible-with), `~` (approximate), and `=` (explicit equals).
 * No external dependency is introduced because the matcher is intentionally small.
 */

export const CARTRIDGE_SDK_VERSION = '1.0.0';

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

function parseVersion(version: string): ParsedVersion | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) {
    return undefined;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compare(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }

  return a.patch - b.patch;
}

/**
 * Returns `true` when `version` satisfies `range` using a reduced semver
 * grammar. Supported range forms:
 *
 * - `1.2.3` / `=1.2.3` — exact match.
 * - `^1.2.3` — `major` locked, `minor`/`patch` may increase.
 * - `~1.2.3` — `major.minor` locked, `patch` may increase.
 */
// eslint-disable-next-line unicorn/consistent-boolean-name
export function satisfies(range: string, version: string): boolean {
  if (typeof range !== 'string' || typeof version !== 'string') {
    return false;
  }

  const target = parseVersion(version);
  const required = parseVersion(range.replace(/^[=^~]/, ''));
  if (!target || !required) {
    return false;
  }

  const mode = range.trim()[0];

  if (mode === '^') {
    if (target.major !== required.major) {
      return false;
    }

    return compare(target, required) >= 0;
  }

  if (mode === '~') {
    if (target.major !== required.major || target.minor !== required.minor) {
      return false;
    }

    return target.patch >= required.patch;
  }

  return compare(target, required) === 0;
}
