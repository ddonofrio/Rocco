import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptFilePath), '..');
const roccoSourceRoot = path.join(repoRoot, 'src', 'cartridges', 'rocco');
const roccoPublicRoot = path.join(repoRoot, 'public', 'cartridges', 'rocco');
const trackedAssetExtensions = new Set([
  '.gif',
  '.jpeg',
  '.jpg',
  '.mp3',
  '.ogg',
  '.png',
  '.svg',
  '.wav',
  '.webp',
]);
// eslint-disable-next-line sonarjs/super-linear-regex -- The bounded asset literal and URL syntax keep this scan local to one declaration.
const newUrlAssetPattern = /new URL\(\s*(['"`])([^'"`]+)\1\s*,\s*import\.meta\.url\s*,?\s*\)/g;
const baseUrlAssetPattern = /`\$\{import\.meta\.env\.BASE_URL\}([^`]+)`/g;

function writeStdout(message) {
  process.stdout.write(`${message}\n`);
}

function writeStderr(message) {
  process.stderr.write(`${message}\n`);
}

function listTypeScriptFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(entryPath);
    }
  }

  return files;
}

function isTrackedAssetPath(assetPath) {
  return trackedAssetExtensions.has(path.extname(assetPath).toLowerCase());
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function toRepoRelativePath(filePath) {
  return toPosixPath(path.relative(repoRoot, filePath));
}

function isInsideDirectory(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function collectNewUrlAssetFailures(filePath, sourceFile, source, failures) {
  newUrlAssetPattern.lastIndex = 0;
  for (const match of source.matchAll(newUrlAssetPattern)) {
    const assetPath = match[2];
    if (!assetPath || !isTrackedAssetPath(assetPath)) {
      continue;
    }

    const resolvedPath = path.resolve(path.dirname(filePath), assetPath);
    if (!isInsideDirectory(roccoSourceRoot, resolvedPath)) {
      failures.push(`${sourceFile} references '${assetPath}' outside 'src/cartridges/rocco'`);
      continue;
    }

    if (!existsSync(resolvedPath)) {
      failures.push(`${sourceFile} references missing asset '${assetPath}'`);
    }
  }
}

function collectBaseUrlAssetFailures(filePath, sourceFile, source, failures) {
  baseUrlAssetPattern.lastIndex = 0;
  for (const match of source.matchAll(baseUrlAssetPattern)) {
    const assetPath = match[1];
    if (!assetPath || !isTrackedAssetPath(assetPath)) {
      continue;
    }

    const resolvedPath = path.join(repoRoot, 'public', ...assetPath.split('/'));
    if (!isInsideDirectory(roccoPublicRoot, resolvedPath)) {
      failures.push(
        `${sourceFile} references public asset '${assetPath}' outside 'public/cartridges/rocco'`,
      );
      continue;
    }

    if (!existsSync(resolvedPath)) {
      failures.push(`${sourceFile} references missing public asset '${assetPath}'`);
    }
  }
}

function collectFailures() {
  const failures = [];

  for (const filePath of listTypeScriptFiles(roccoSourceRoot)) {
    const sourceFile = toRepoRelativePath(filePath);
    const source = readFileSync(filePath, 'utf8');
    collectNewUrlAssetFailures(filePath, sourceFile, source, failures);
    collectBaseUrlAssetFailures(filePath, sourceFile, source, failures);
  }

  return failures.toSorted((left, right) => left.localeCompare(right));
}

function main() {
  const failures = collectFailures();

  if (failures.length === 0) {
    writeStdout('Rocco asset reference check passed.');
    return;
  }

  writeStderr('Rocco asset reference check failed:');
  for (const failure of failures) {
    writeStderr(`- ${failure}`);
  }
  process.exitCode = 1;
}

main();
