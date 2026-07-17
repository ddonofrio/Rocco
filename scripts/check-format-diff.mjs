import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prettierExtensions = new Set([
  '.cjs',
  '.css',
  '.cts',
  '.html',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.mdx',
  '.mjs',
  '.scss',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);

function git(gitArguments) {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- Git is the repository's required local diff source.
  const result = spawnSync('git', gitArguments, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${gitArguments.join(' ')} failed`);
  }

  return result.stdout
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);
}

function resolveDiffFiles() {
  const baseReference = process.env.FORMAT_BASE_REF ?? process.env.GITHUB_BASE_REF;
  const diffReference = baseReference ? `${baseReference}...HEAD` : 'HEAD';
  const trackedDiff = git(['diff', '--name-only', '--diff-filter=ACMRTUXB', diffReference]);
  const stagedDiff = baseReference
    ? []
    : git(['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB']);
  const untrackedFiles = baseReference ? [] : git(['ls-files', '--others', '--exclude-standard']);

  return [...new Set([...trackedDiff, ...stagedDiff, ...untrackedFiles])]
    .filter((file) => file.lastIndexOf('.') > file.lastIndexOf('/'))
    .filter((file) => prettierExtensions.has(file.slice(file.lastIndexOf('.')).toLowerCase()))
    .toSorted((left, right) => left.localeCompare(right));
}

const files = resolveDiffFiles();

if (files.length === 0) {
  console.log('No modified Prettier-supported files found in the diff.');
  process.exitCode = 0;
} else {
  console.log(
    `Checking ${files.length} modified file${files.length === 1 ? '' : 's'} with Prettier...`,
  );
  const prettierScript = path.join(
    fileURLToPath(new URL('..', import.meta.url)),
    'node_modules',
    'prettier',
    'bin',
    'prettier.cjs',
  );
  const result = spawnSync(
    process.execPath,
    [prettierScript, '--check', '--ignore-unknown', ...files],
    {
      stdio: 'inherit',
    },
  );

  if (result.error) {
    throw new Error(`Unable to execute Prettier: ${result.error.message}`);
  }

  process.exitCode = result.status ?? 1;
}
