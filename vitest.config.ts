import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

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
      lines: 56,
      functions: 58,
      statements: 56,
      branches: 45,
      '**/src/console/action-dispatcher.ts': {
        lines: 95,
        functions: 100,
        statements: 95,
        branches: 85,
      },
      '**/src/console/input/input-policy-stack.ts': {
        lines: 90,
        functions: 85,
        statements: 90,
        branches: 75,
      },
      '**/src/console/persistence/db.ts': {
        lines: 95,
        functions: 100,
        statements: 95,
        branches: 80,
      },
      '**/src/console/persistence/save-repository.ts': {
        lines: 88,
        functions: 100,
        statements: 88,
        branches: 80,
      },
      '**/src/cartridges/rocco/levels/runtime/rocco-level-transition-service.ts': {
        lines: 85,
        functions: 95,
        statements: 85,
        branches: 70,
      },
      '**/src/cartridges/rocco/rpce/core/rpce-game-compiler.ts': {
        lines: 80,
        functions: 65,
        statements: 80,
        branches: 75,
      },
      '**/src/console/audio/runtime-audio-system.ts': {
        lines: 80,
        functions: 75,
        statements: 80,
        branches: 65,
      },
      '**/src/console/audio/jukebox/jukebox-system.ts': {
        lines: 75,
        functions: 70,
        statements: 75,
        branches: 60,
      },
    },
  },
});
