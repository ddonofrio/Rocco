import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.kilo/**', '.local/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    ignores: ['dist/**'],
    languageOptions: {
      globals: globals.browser,
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...tsPlugin.configs['recommended-type-checked'].rules,
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'off',
    },
  },
];
