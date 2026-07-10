import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    dir: 'tests',
    include: ['**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    pool: 'vmForks',
  },
});
