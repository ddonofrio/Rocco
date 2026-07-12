declare const __ROCCO_VERSION__: string | undefined;
declare const __ROCCO_COMMIT_COUNT__: string | undefined;
declare const __ROCCO_PLAYTEST_STAGE__: string | undefined;

export interface RoccoBuildMeta {
  version: string;
  commitCount: string;
  playtestStage: string;
  label: string;
}

function readDefined<T>(value: T | undefined, fallback: T): T {
  return typeof value !== 'undefined' ? value : fallback;
}

function resolveBuildMeta(): RoccoBuildMeta {
  const version = readDefined(__ROCCO_VERSION__, '0.1.0');
  const commitCount = readDefined(__ROCCO_COMMIT_COUNT__, '0');
  const playtestStage = readDefined(__ROCCO_PLAYTEST_STAGE__, 'development');
  const label = `Rocco Video Games console v${version}.${commitCount} - Playtesting ${playtestStage}`;

  return { version, commitCount, playtestStage, label };
}

export const roccoBuildMeta = resolveBuildMeta();
