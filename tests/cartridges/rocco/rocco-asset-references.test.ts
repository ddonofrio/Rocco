/// <reference types="node" />

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

interface DeclaredAssetReference {
  sourceFile: string;
  assetPath: string;
  resolvedPath: string;
  resolutionKind: 'module-relative' | 'public-base-url';
}

const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIRECTORY, '../../..');
const ROCCO_SOURCE_ROOT = path.join(REPO_ROOT, 'src', 'cartridges', 'rocco');
const PUBLIC_ROOT = path.join(REPO_ROOT, 'public');
const TRACKED_ASSET_EXTENSIONS = new Set([
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
const NEW_URL_ASSET_PATTERN = /new URL\(\s*(['"`])([^'"`]+)\1\s*,\s*import\.meta\.url\s*\)/g;
const BASE_URL_ASSET_PATTERN = /`\$\{import\.meta\.env\.BASE_URL\}([^`]+)`/g;

function listTypeScriptFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

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

function isTrackedAssetPath(assetPath: string): boolean {
  return TRACKED_ASSET_EXTENSIONS.has(path.extname(assetPath).toLowerCase());
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function toRepoRelativePath(filePath: string): string {
  return toPosixPath(path.relative(REPO_ROOT, filePath));
}

function collectDeclaredAssetReferences(): DeclaredAssetReference[] {
  const references = new Map<string, DeclaredAssetReference>();

  for (const filePath of listTypeScriptFiles(ROCCO_SOURCE_ROOT)) {
    const sourceFile = toRepoRelativePath(filePath);
    const source = readFileSync(filePath, 'utf8');

    NEW_URL_ASSET_PATTERN.lastIndex = 0;
    for (const match of source.matchAll(NEW_URL_ASSET_PATTERN)) {
      const assetPath = match[2];
      if (!assetPath || !isTrackedAssetPath(assetPath)) {
        continue;
      }

      const resolvedPath = path.resolve(path.dirname(filePath), assetPath);
      const key = `module-relative:${sourceFile}:${assetPath}`;
      references.set(key, {
        sourceFile,
        assetPath,
        resolvedPath,
        resolutionKind: 'module-relative',
      });
    }

    BASE_URL_ASSET_PATTERN.lastIndex = 0;
    for (const match of source.matchAll(BASE_URL_ASSET_PATTERN)) {
      const assetPath = match[1];
      if (!assetPath || !isTrackedAssetPath(assetPath)) {
        continue;
      }

      const resolvedPath = path.join(PUBLIC_ROOT, ...assetPath.split('/'));
      const key = `public-base-url:${sourceFile}:${assetPath}`;
      references.set(key, {
        sourceFile,
        assetPath,
        resolvedPath,
        resolutionKind: 'public-base-url',
      });
    }
  }

  return [...references.values()].sort((left, right) => {
    const sourceComparison = left.sourceFile.localeCompare(right.sourceFile);
    if (sourceComparison !== 0) {
      return sourceComparison;
    }

    const assetComparison = left.assetPath.localeCompare(right.assetPath);
    if (assetComparison !== 0) {
      return assetComparison;
    }

    return left.resolutionKind.localeCompare(right.resolutionKind);
  });
}

describe('Rocco asset references', () => {
  it('resolve every declared cartridge asset path to a real file', () => {
    const references = collectDeclaredAssetReferences();
    expect(references.length).toBeGreaterThan(0);

    const missing = references.filter((reference) => !existsSync(reference.resolvedPath));
    if (missing.length > 0) {
      const details = missing
        .map(
          (reference) =>
            `- ${reference.sourceFile} -> ${reference.assetPath} (${reference.resolutionKind})`,
        )
        .join('\n');
      throw new Error(`Missing declared Rocco asset files:\n${details}`);
    }
  });

  it('keeps an explicit snapshot of the declared cartridge asset paths', () => {
    const references = collectDeclaredAssetReferences().map((reference) => ({
      sourceFile: reference.sourceFile,
      assetPath: reference.assetPath,
      resolutionKind: reference.resolutionKind,
    }));

    expect(references).toMatchSnapshot();
  });
});
