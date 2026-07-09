import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';

const scriptFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptFilePath), '..');
const localWorkspaceDir = '.local';
const localWorkspaceGlob = localWorkspaceDir + '/**';
const localPathPattern = /(^|[^A-Za-z0-9_-])(?:\.\/)?\.local[\\/]/;
const utf8FatalDecoder = new TextDecoder('utf-8', { fatal: true });
const suspiciousMojibakeLeadPattern = /[\u00C2\u00C3\u00E2\u0080-\u009F\uFFFD]/u;
const replacementCharacter = '\uFFFD';
const maxReportedMojibakeLines = 5;

const allowlist = [
  {
    filePath: '.gitignore',
    ruleId: 'local-only-path',
    matches: (line) => {
      const trimmedLine = line.trim();
      return trimmedLine === localWorkspaceDir || trimmedLine === `${localWorkspaceDir}/`;
    },
  },
  {
    filePath: 'eslint.config.js',
    ruleId: 'local-only-path',
    matches: (line) => line.includes(localWorkspaceGlob),
  },
];

const workspacePathCandidates = Array.from(
  new Set([
    repoRoot,
    repoRoot.replace(/\\/g, '/'),
    repoRoot.replace(/\\/g, '\\\\'),
  ]),
);
const windows1252CodePointToByte = new Map([
  [0x20ac, 0x80],
  [0x0081, 0x81],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x008d, 0x8d],
  [0x017d, 0x8e],
  [0x008f, 0x8f],
  [0x0090, 0x90],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x009d, 0x9d],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

function writeStdout(message) {
  process.stdout.write(`${message}\n`);
}

function writeStderr(message) {
  process.stderr.write(`${message}\n`);
}

function isTrackedTextFile(filePath) {
  const absolutePath = path.join(repoRoot, filePath);
  if (!existsSync(absolutePath)) {
    return false;
  }

  return true;
}

function readTrackedTextFiles() {
  const gitOutput = execFileSync('git', ['-C', repoRoot, 'ls-files', '-z']);
  const trackedFiles = gitOutput
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter((filePath) => isTrackedTextFile(filePath));

  if (trackedFiles.length === 0) {
    return [];
  }

  const attrOutput = execFileSync('git', ['-C', repoRoot, 'check-attr', '-z', '--stdin', 'text'], {
    input: `${trackedFiles.join('\0')}\0`,
  });
  const attrTokens = attrOutput.toString('utf8').split('\0');
  const textFiles = [];

  for (let index = 0; index + 2 < attrTokens.length; index += 3) {
    const filePath = attrTokens[index];
    const attributeName = attrTokens[index + 1];
    const attributeValue = attrTokens[index + 2];
    if (attributeName !== 'text') {
      continue;
    }
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
  return workspacePathCandidates.find((candidate) => normalizedLine.includes(candidate.toLowerCase()));
}

function createFailure(filePath, lineNumber, ruleId, message) {
  return { filePath, lineNumber, ruleId, message };
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
      character === '\u00C2' ||
      character === '\u00C3' ||
      character === '\u00E2' ||
      (codePoint >= 0x0080 && codePoint <= 0x009f)
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
      return null;
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
    if (codePoint <= 0x7f || (codePoint >= 0x00a0 && codePoint <= 0x00ff)) {
      bytes[index] = codePoint;
      index += 1;
      continue;
    }
    const mappedByte = windows1252CodePointToByte.get(codePoint);
    if (mappedByte === undefined) {
      return null;
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
    return null;
  }
}

function tryRepairMojibake(text) {
  if (!suspiciousMojibakeLeadPattern.test(text)) {
    return null;
  }

  const originalScore = countSuspiciousCodePoints(text);
  const candidates = [
    {
      encoding: 'latin1',
      repairedText: (() => {
        const bytes = encodeLatin1(text);
        return bytes ? tryDecodeAsUtf8(bytes) : null;
      })(),
    },
    {
      encoding: 'windows-1252',
      repairedText: (() => {
        const bytes = encodeWindows1252(text);
        return bytes ? tryDecodeAsUtf8(bytes) : null;
      })(),
    },
  ]
    .filter((candidate) => candidate.repairedText && candidate.repairedText !== text)
    .map((candidate) => ({
      ...candidate,
      score: countSuspiciousCodePoints(candidate.repairedText),
    }))
    .filter((candidate) => candidate.score < originalScore)
    .sort((left, right) => left.score - right.score || left.encoding.localeCompare(right.encoding));

  return candidates[0] ?? null;
}

function truncateForMessage(text, maxLength = 96) {
  const normalized = text.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function collectReplacementCharacterFailures(filePath, fileContent) {
  const failures = [];
  const lines = fileContent.split(/\r?\n/);
  lines.forEach((line, lineIndex) => {
    if (!line.includes(replacementCharacter)) {
      return;
    }
    failures.push(
      createFailure(
        filePath,
        lineIndex + 1,
        'replacement-character',
        'contains a literal Unicode replacement character; text data is already lossy',
      ),
    );
  });
  return failures;
}

function collectMojibakeRepairFailures(filePath, fileContent, repair) {
  if (!repair?.repairedText) {
    return [];
  }

  const originalLines = fileContent.split(/\r?\n/);
  const repairedLines = repair.repairedText.split(/\r?\n/);
  const failures = [];

  for (let index = 0; index < originalLines.length && failures.length < maxReportedMojibakeLines; index += 1) {
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

function scanFile(filePath) {
  const absolutePath = path.join(repoRoot, filePath);
  const fileBuffer = readFileSync(absolutePath);
  const fileContent = decodeUtf8Text(filePath, fileBuffer);
  const lines = fileContent.split(/\r?\n/);
  const failures = [];

  lines.forEach((line, lineIndex) => {
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
  });

  failures.push(...collectReplacementCharacterFailures(filePath, fileContent));
  failures.push(...collectMojibakeRepairFailures(filePath, fileContent, tryRepairMojibake(fileContent)));

  return failures;
}

function main() {
  const failures = [];
  for (const filePath of readTrackedTextFiles()) {
    try {
      failures.push(...scanFile(filePath));
    } catch (failure) {
      failures.push(failure);
    }
  }

  if (failures.length === 0) {
    writeStdout('Tracked-content hygiene check passed.');
    return;
  }

  writeStderr('Tracked-content hygiene check failed:');
  failures.forEach((failure) => {
    writeStderr(`- [${failure.ruleId}] ${failure.filePath}:${failure.lineNumber} ${failure.message}`);
  });
  process.exitCode = 1;
}

main();
