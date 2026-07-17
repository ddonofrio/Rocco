import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';

const scriptFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptFilePath), '..');
const localWorkspaceDirectory = '.local';
const localWorkspaceGlob = localWorkspaceDirectory + '/**';
const gitExecutable =
  process.platform === 'win32' ? String.raw`C:\Program Files\Git\bin\git.exe` : '/usr/bin/git';
const localPathPattern = /(^|[^A-Za-z0-9_-])(?:\.\/)?\.local[\\/]/;
const utf8FatalDecoder = new TextDecoder('utf-8', { fatal: true });
const suspiciousMojibakeLeadPattern = /[\u{C2}\u{C3}\u{E2}\u{80}-\u{9F}\u{FFFD}]/u;
const replacementCharacter = '\u{FFFD}';
const maxReportedMojibakeLines = 5;

// Keep allowlist entries narrow and line-specific so the check stays meaningful.
const allowlist = [
  {
    filePath: '.prettierignore',
    ruleId: 'local-only-path',
    matches: (line) => line.trim() === `${localWorkspaceDirectory}/`,
  },
  {
    filePath: '.gitignore',
    ruleId: 'local-only-path',
    matches: (line) => {
      const trimmedLine = line.trim();
      return (
        trimmedLine === localWorkspaceDirectory || trimmedLine === `${localWorkspaceDirectory}/`
      );
    },
  },
  {
    filePath: 'eslint.config.js',
    ruleId: 'local-only-path',
    matches: (line) => line.includes(localWorkspaceGlob),
  },
  {
    filePath: 'vite.config.ts',
    ruleId: 'local-only-path',
    matches: (line) => line.includes('(.local/).'),
  },
  {
    filePath: 'vite.config.ts',
    ruleId: 'local-only-path',
    matches: (line) => line.includes("deny: ['.local/**']"),
  },
  {
    filePath: 'scripts/check-tracked-content.mjs',
    ruleId: 'local-only-path',
    matches: (line) => line.includes('(.local/).'),
  },
  {
    filePath: 'scripts/check-tracked-content.mjs',
    ruleId: 'local-only-path',
    matches: (line) => line.includes('.local/**'),
  },
];

const workspacePathCandidates = [
  ...new Set([repoRoot, repoRoot.replaceAll('\\', '/'), repoRoot.replaceAll('\\', '\\\\')]),
];
const windows1252CodePointToByte = new Map([
  [0x20_ac, 0x80],
  [0x00_81, 0x81],
  [0x20_1a, 0x82],
  [0x01_92, 0x83],
  [0x20_1e, 0x84],
  [0x20_26, 0x85],
  [0x20_20, 0x86],
  [0x20_21, 0x87],
  [0x02_c6, 0x88],
  [0x20_30, 0x89],
  [0x01_60, 0x8a],
  [0x20_39, 0x8b],
  [0x01_52, 0x8c],
  [0x00_8d, 0x8d],
  [0x01_7d, 0x8e],
  [0x00_8f, 0x8f],
  [0x00_90, 0x90],
  [0x20_18, 0x91],
  [0x20_19, 0x92],
  [0x20_1c, 0x93],
  [0x20_1d, 0x94],
  [0x20_22, 0x95],
  [0x20_13, 0x96],
  [0x20_14, 0x97],
  [0x02_dc, 0x98],
  [0x21_22, 0x99],
  [0x01_61, 0x9a],
  [0x20_3a, 0x9b],
  [0x01_53, 0x9c],
  [0x00_9d, 0x9d],
  [0x01_7e, 0x9e],
  [0x01_78, 0x9f],
]);

function writeStdout(message) {
  process.stdout.write(`${message}\n`);
}

function writeStderr(message) {
  process.stderr.write(`${message}\n`);
}

function trackedFileExistsInWorktree(filePath) {
  const absolutePath = path.join(repoRoot, filePath);
  return !!existsSync(absolutePath);
}

function readTrackedTextFiles() {
  const gitOutput = execFileSync(gitExecutable, ['-C', repoRoot, 'ls-files', '-z']);
  const trackedFiles = gitOutput
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter((filePath) => trackedFileExistsInWorktree(filePath));

  if (trackedFiles.length === 0) {
    return [];
  }

  const attributeOutput = execFileSync(
    gitExecutable,
    ['-C', repoRoot, 'check-attr', '-z', '--stdin', 'text'],
    {
      input: `${trackedFiles.join('\0')}\0`,
    },
  );
  const attributeTokens = attributeOutput.toString('utf8').split('\0');
  const textFiles = [];

  for (let index = 0; index + 2 < attributeTokens.length; index += 3) {
    const filePath = attributeTokens[index];
    const attributeName = attributeTokens[index + 1];
    if (attributeName !== 'text') {
      continue;
    }
    const attributeValue = attributeTokens[index + 2];
    if (attributeValue !== 'unset') {
      textFiles.push(filePath);
    }
  }

  return textFiles;
}

function isAllowlisted(filePath, ruleId, line) {
  return allowlist.some(
    (entry) => entry.filePath === filePath && entry.ruleId === ruleId && entry.matches(line),
  );
}

function findWorkspacePathMatch(line) {
  const normalizedLine = line.toLowerCase();
  return workspacePathCandidates.find((candidate) =>
    normalizedLine.includes(candidate.toLowerCase()),
  );
}

function createFailure(filePath, lineNumber, ruleId, message) {
  return { filePath, lineNumber, ruleId, message };
}

function isFailure(value) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof value.filePath === 'string' &&
    typeof value.lineNumber === 'number' &&
    typeof value.ruleId === 'string' &&
    typeof value.message === 'string'
  );
}

function normalizeFailure(
  filePath,
  error,
  fallbackRuleId = 'tracked-content-error',
  fallbackMessage = 'unexpected hygiene-check error',
) {
  if (isFailure(error)) {
    return error;
  }

  const detail =
    error instanceof Error && error.message
      ? error.message
      : 'unknown failure while scanning tracked content';
  return createFailure(filePath, 1, fallbackRuleId, `${fallbackMessage} (${detail})`);
}

function decodeUtf8Text(filePath, fileContent) {
  try {
    return utf8FatalDecoder.decode(fileContent);
  } catch (error) {
    const reason =
      error instanceof Error && error.message ? error.message : 'decoder rejected the byte stream';
    throw createFailure(filePath, 1, 'invalid-utf8', `is not valid UTF-8 text (${reason})`);
  }
}

function countSuspiciousCodePoints(text) {
  let count = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (character === replacementCharacter) {
      count += 4;
      continue;
    }
    if (
      character === '\u{C2}' ||
      character === '\u{C3}' ||
      character === '\u{E2}' ||
      (codePoint >= 0x00_80 && codePoint <= 0x00_9f)
    ) {
      count += 1;
    }
  }
  return count;
}

function encodeLatin1(text) {
  const bytes = new Uint8Array(text.length);
  let index = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint > 0xff) {
      return;
    }
    bytes[index] = codePoint;
    index += 1;
  }
  return bytes;
}

function encodeWindows1252(text) {
  const bytes = new Uint8Array(text.length);
  let index = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f || (codePoint >= 0x00_a0 && codePoint <= 0x00_ff)) {
      bytes[index] = codePoint;
      index += 1;
      continue;
    }
    const mappedByte = windows1252CodePointToByte.get(codePoint);
    if (mappedByte === undefined) {
      return;
    }
    bytes[index] = mappedByte;
    index += 1;
  }
  return bytes;
}

function tryDecodeAsUtf8(bytes) {
  try {
    return utf8FatalDecoder.decode(bytes);
  } catch {
    return;
  }
}

function tryRepairMojibake(text) {
  if (!suspiciousMojibakeLeadPattern.test(text)) {
    return;
  }

  const originalScore = countSuspiciousCodePoints(text);
  const candidates = [
    {
      encoding: 'latin1',
      repairedText: (() => {
        const bytes = encodeLatin1(text);
        return bytes === undefined ? undefined : tryDecodeAsUtf8(bytes);
      })(),
    },
    {
      encoding: 'windows-1252',
      repairedText: (() => {
        const bytes = encodeWindows1252(text);
        return bytes === undefined ? undefined : tryDecodeAsUtf8(bytes);
      })(),
    },
  ]
    .filter((candidate) => candidate.repairedText && candidate.repairedText !== text)
    .map((candidate) => ({
      ...candidate,
      score: countSuspiciousCodePoints(candidate.repairedText),
    }))
    .filter((candidate) => candidate.score < originalScore)
    .toSorted(
      (left, right) => left.score - right.score || left.encoding.localeCompare(right.encoding),
    );

  return candidates[0];
}

function truncateForMessage(text, maxLength = 96) {
  const normalized = text.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function collectReplacementCharacterFailures(filePath, fileContent) {
  const failures = [];
  const lines = fileContent.split(/\r?\n/);
  for (const [lineIndex, line] of lines.entries()) {
    if (!line.includes(replacementCharacter)) {
      continue;
    }
    failures.push(
      createFailure(
        filePath,
        lineIndex + 1,
        'replacement-character',
        'contains a literal Unicode replacement character; text data is already lossy',
      ),
    );
  }
  return failures;
}

function collectMojibakeRepairFailures(filePath, fileContent, repair) {
  if (!repair?.repairedText) {
    return [];
  }

  const originalLines = fileContent.split(/\r?\n/);
  const repairedLines = repair.repairedText.split(/\r?\n/);
  const failures = [];

  for (
    let index = 0;
    index < originalLines.length && failures.length < maxReportedMojibakeLines;
    index += 1
  ) {
    const originalLine = originalLines[index] ?? '';
    const repairedLine = repairedLines[index] ?? '';
    if (originalLine === repairedLine) {
      continue;
    }
    failures.push(
      createFailure(
        filePath,
        index + 1,
        'likely-mojibake',
        `looks like ${repair.encoding}-decoded UTF-8; consider \`${truncateForMessage(repairedLine)}\``,
      ),
    );
  }

  if (failures.length === 0) {
    failures.push(
      createFailure(
        filePath,
        1,
        'likely-mojibake',
        `looks like ${repair.encoding}-decoded UTF-8 text`,
      ),
    );
  }

  return failures;
}

export function scanText(filePath, fileBuffer) {
  if (fileBuffer[0] === 0xef && fileBuffer[1] === 0xbb && fileBuffer[2] === 0xbf) {
    throw createFailure(filePath, 1, 'utf8-bom', 'contains an unexpected UTF-8 BOM');
  }
  const fileContent = decodeUtf8Text(filePath, fileBuffer);
  const lines = fileContent.split(/\r?\n/);
  const failures = [];

  for (const [lineIndex, line] of lines.entries()) {
    const workspacePathMatch = findWorkspacePathMatch(line);
    if (workspacePathMatch) {
      failures.push(
        createFailure(
          filePath,
          lineIndex + 1,
          'workspace-absolute-path',
          `contains workspace-specific absolute path \`${workspacePathMatch}\``,
        ),
      );
    }

    if (localPathPattern.test(line) && !isAllowlisted(filePath, 'local-only-path', line)) {
      failures.push(
        createFailure(
          filePath,
          lineIndex + 1,
          'local-only-path',
          'contains a local-only `.local` path reference',
        ),
      );
    }
  }

  failures.push(
    ...collectReplacementCharacterFailures(filePath, fileContent),
    ...collectMojibakeRepairFailures(filePath, fileContent, tryRepairMojibake(fileContent)),
  );

  return failures;
}

function scanFile(filePath) {
  return scanText(filePath, readFileSync(path.join(repoRoot, filePath)));
}

function main() {
  let trackedFiles;
  try {
    trackedFiles = readTrackedTextFiles();
  } catch (error) {
    const failure = normalizeFailure(
      '.',
      error,
      'tracked-content-bootstrap',
      'failed to enumerate tracked text files',
    );
    writeStderr('Tracked-content hygiene check failed:');
    writeStderr(
      `- [${failure.ruleId}] ${failure.filePath}:${failure.lineNumber} ${failure.message}`,
    );
    process.exitCode = 1;
    return;
  }

  const failures = [];
  for (const filePath of trackedFiles) {
    try {
      failures.push(...scanFile(filePath));
    } catch (error) {
      failures.push(normalizeFailure(filePath, error));
    }
  }

  if (failures.length === 0) {
    writeStdout('Tracked-content hygiene check passed.');
    return;
  }

  writeStderr('Tracked-content hygiene check failed:');
  for (const failure of failures) {
    writeStderr(
      `- [${failure.ruleId}] ${failure.filePath}:${failure.lineNumber} ${failure.message}`,
    );
  }
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptFilePath) {
  main();
}
