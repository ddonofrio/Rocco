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
      lines: 0,
      functions: 0,
      statements: 0,
      branches: 0,
    },
  },
});
