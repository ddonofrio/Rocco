import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const specificCoverageThresholds = {
  'src/console/action-dispatcher.ts': {
    lines: 95,
    functions: 100,
    statements: 95,
    branches: 85,
  },
  'src/console/input/input-policy-stack.ts': {
    lines: 90,
    functions: 85,
    statements: 90,
    branches: 75,
  },
  'src/console/persistence/database.ts': {
    lines: 95,
    functions: 100,
    statements: 95,
    branches: 80,
  },
  'src/console/persistence/save-repo.ts': {
    lines: 88,
    functions: 100,
    statements: 88,
    branches: 80,
  },
  'src/cartridges/rocco/levels/runtime/rocco-level-transition-service.ts': {
    lines: 85,
    functions: 95,
    statements: 85,
    branches: 70,
  },
  'src/cartridges/rocco/rpce/core/rpce-game-compiler.ts': {
    lines: 80,
    functions: 65,
    statements: 80,
    branches: 75,
  },
  'src/console/audio/runtime-audio-system.ts': {
    lines: 80,
    functions: 75,
    statements: 80,
    branches: 65,
  },
  'src/console/audio/jukebox/jukebox-system.ts': {
    lines: 75,
    functions: 70,
    statements: 75,
    branches: 60,
  },
  'src/console/composition/composition-service.ts': {
    lines: 95,
    functions: 96,
    statements: 95,
    branches: 72,
  },
  'src/console/cartridges/sdk-v1/adapter.ts': {
    lines: 84,
    functions: 63,
    statements: 84,
    branches: 71,
  },
};

for (const filePath of Object.keys(specificCoverageThresholds)) {
  if (!existsSync(resolve(__dirname, filePath))) {
    throw new Error(`Coverage threshold target does not exist: ${filePath}`);
  }
}

const coverageThresholds = Object.fromEntries(
  Object.entries(specificCoverageThresholds).map(([filePath, threshold]) => [
    `**/${filePath}`,
    threshold,
  ]),
);

export default defineConfig({
  resolve: {
    alias: {
      'virtual:pwa-register': resolve(__dirname, 'tests/mocks/virtual-pwa-register.ts'),
    },
  },
  test: {
    dir: 'tests',
    include: ['**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    pool: 'vmForks',
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.d.ts', 'src/**/index.ts'],
    thresholds: {
      lines: 57,
      functions: 62,
      statements: 57,
      branches: 46,
      ...coverageThresholds,
    },
  },
});
