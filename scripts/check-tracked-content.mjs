import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptFilePath), '..');
const localWorkspaceDir = '.local';
const localWorkspaceGlob = localWorkspaceDir + '/**';
const localPathPattern = /(^|[^A-Za-z0-9_-])(?:\.\/)?\.local[\\/]/;
const mojibakeFragments = [
  '\u00C3',
  '\u00C2',
  '\u00E2\u20AC',
  '\u00E2\u201A\u00AC',
  '\uFFFD',
];

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
  {
    filePath: 'DEVELOPMENT.md',
    ruleId: 'mojibake-fragment',
    matches: (line) => line.includes('mojibake fragments such as'),
  },
];

const workspacePathCandidates = Array.from(
  new Set([
    repoRoot,
    repoRoot.replace(/\\/g, '/'),
    repoRoot.replace(/\\/g, '\\\\'),
  ]),
);

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

  const fileContent = readFileSync(absolutePath);
  return !fileContent.includes(0);
}

function readTrackedFiles() {
  const gitOutput = execFileSync('git', ['-C', repoRoot, 'ls-files', '-z']);
  return gitOutput
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter((filePath) => isTrackedTextFile(filePath));
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

function findMojibakeFragment(line) {
  return mojibakeFragments.find((fragment) => line.includes(fragment));
}

function scanFile(filePath) {
  const absolutePath = path.join(repoRoot, filePath);
  const fileContent = readFileSync(absolutePath, 'utf8');
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

    const mojibakeFragment = findMojibakeFragment(line);
    if (mojibakeFragment && !isAllowlisted(filePath, 'mojibake-fragment', line)) {
      failures.push(
        createFailure(
          filePath,
          lineIndex + 1,
          'mojibake-fragment',
          `contains suspicious mojibake fragment \`${mojibakeFragment}\``,
        ),
      );
    }
  });

  return failures;
}

function main() {
  const failures = readTrackedFiles().flatMap((filePath) => scanFile(filePath));

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
