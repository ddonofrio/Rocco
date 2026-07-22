/// <reference types="node" />

import { createHash, type BinaryLike } from 'node:crypto';
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
const APPROVED_MUSIC_MODULE = 'src/cartridges/rocco/games/rocco-default/audio/rocco-game-music.ts';

// eslint-disable-next-line sonarjs/super-linear-regex -- The bounded asset literal and URL syntax keep this scan local to one declaration.
const NEW_URL_ASSET_PATTERN = /new URL\(\s*(['"`])([^'"`]+)\1\s*,\s*import\.meta\.url\s*,?\s*\)/g;
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

function listAssetFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listAssetFiles(entryPath));
      continue;
    }

    if (entry.isFile() && isTrackedAssetExtension(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

function isTrackedAssetExtension(fileName: string): boolean {
  return TRACKED_ASSET_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function isTrackedAssetPath(assetPath: string): boolean {
  return TRACKED_ASSET_EXTENSIONS.has(path.extname(assetPath).toLowerCase());
}

function normalizeModuleRelativeAssetPath(assetPath: string): string {
  return assetPath.startsWith('assets/') ? `./${assetPath}` : assetPath;
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function toRepoRelativePath(filePath: string): string {
  return toPosixPath(path.relative(REPO_ROOT, filePath));
}

function isApprovedDeclarationFile(filePath: string): boolean {
  const relativePath = toRepoRelativePath(filePath);
  if (relativePath === APPROVED_MUSIC_MODULE) {
    return true;
  }
  const fileName = path.basename(filePath);
  return fileName.endsWith('-assets.ts');
}

function sha256(content: BinaryLike): string {
  return createHash('sha256').update(content).digest('hex');
}

function collectDeclaredAssetReferences(): DeclaredAssetReference[] {
  const references = new Map<string, DeclaredAssetReference>();

  for (const filePath of listTypeScriptFiles(ROCCO_SOURCE_ROOT)) {
    const sourceFile = toRepoRelativePath(filePath);
    const source = readFileSync(filePath, 'utf8');

    NEW_URL_ASSET_PATTERN.lastIndex = 0;
    for (const match of source.matchAll(NEW_URL_ASSET_PATTERN)) {
      const sourceAssetPath = match[2];
      if (sourceAssetPath && isTrackedAssetPath(sourceAssetPath)) {
        const assetPath = normalizeModuleRelativeAssetPath(sourceAssetPath);
        const resolvedPath = path.resolve(path.dirname(filePath), sourceAssetPath);
        const key = `module-relative:${sourceFile}:${assetPath}`;
        references.set(key, {
          sourceFile,
          assetPath,
          resolvedPath,
          resolutionKind: 'module-relative',
        });
      }
    }

    BASE_URL_ASSET_PATTERN.lastIndex = 0;
    for (const match of source.matchAll(BASE_URL_ASSET_PATTERN)) {
      const assetPath = match[1];
      if (assetPath && isTrackedAssetPath(assetPath)) {
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
  }

  const sortedReferences = references
    .values()
    .toArray()
    .toSorted((left, right) => {
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
  return sortedReferences;
}

function collectDeclarationLocationViolations(): string[] {
  const violations: string[] = [];

  for (const filePath of listTypeScriptFiles(ROCCO_SOURCE_ROOT)) {
    if (isApprovedDeclarationFile(filePath)) {
      continue;
    }

    const source = readFileSync(filePath, 'utf8');
    NEW_URL_ASSET_PATTERN.lastIndex = 0;
    for (const match of source.matchAll(NEW_URL_ASSET_PATTERN)) {
      const assetPath = match[2];
      if (assetPath && isTrackedAssetPath(assetPath)) {
        violations.push(
          `${toRepoRelativePath(filePath)} declares asset URL '${assetPath}' via new URL(..., import.meta.url) outside an approved module`,
        );
      }
    }

    BASE_URL_ASSET_PATTERN.lastIndex = 0;
    for (const match of source.matchAll(BASE_URL_ASSET_PATTERN)) {
      const assetPath = match[1];
      if (assetPath && isTrackedAssetPath(assetPath)) {
        violations.push(
          `${toRepoRelativePath(filePath)} declares asset URL '${assetPath}' via \${import.meta.env.BASE_URL} outside an approved module`,
        );
      }
    }
  }

  return violations.toSorted((left, right) => left.localeCompare(right));
}

function collectDuplicatePhysicalAssets(): string[] {
  const hashToPaths = new Map<string, string[]>();

  for (const filePath of listAssetFiles(ROCCO_SOURCE_ROOT)) {
    const content = readFileSync(filePath);
    const hash = sha256(content);
    const existing = hashToPaths.get(hash);
    if (existing) {
      existing.push(toRepoRelativePath(filePath));
    } else {
      hashToPaths.set(hash, [toRepoRelativePath(filePath)]);
    }
  }

  const duplicates: string[] = [];
  for (const paths of hashToPaths.values()) {
    if (paths.length > 1) {
      duplicates.push(`DUP: ${paths.map((pathItem) => pathItem).join(' | ')}`);
    }
  }

  return duplicates.toSorted((left, right) => left.localeCompare(right));
}

function collectOrphanPhysicalAssets(
  declaredReferences: readonly DeclaredAssetReference[],
): string[] {
  const declaredPaths = new Set(
    declaredReferences.map((reference) => toPosixPath(reference.resolvedPath)),
  );
  const orphans: string[] = [];

  for (const filePath of listAssetFiles(ROCCO_SOURCE_ROOT)) {
    if (!declaredPaths.has(toPosixPath(filePath))) {
      orphans.push(toRepoRelativePath(filePath));
    }
  }

  return orphans.toSorted((left, right) => left.localeCompare(right));
}

describe('Rocco asset references', () => {
  const references = collectDeclaredAssetReferences();

  it('resolve every declared cartridge asset path to a real file', () => {
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
    expect(
      references.map((reference) => ({
        sourceFile: reference.sourceFile,
        assetPath: reference.assetPath,
        resolutionKind: reference.resolutionKind,
      })),
    ).toMatchSnapshot();
  });

  it('only declares asset URLs in approved modules', () => {
    const violations = collectDeclarationLocationViolations();
    expect(violations).toEqual([]);
  });

  it('has no duplicate physical assets', () => {
    const duplicates = collectDuplicatePhysicalAssets();
    expect(duplicates).toEqual([]);
  });

  it('has no orphan physical assets without a URL declaration', () => {
    const orphans = collectOrphanPhysicalAssets(references);
    expect(orphans).toEqual([]);
  });
});
