import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import sonarjs from 'eslint-plugin-sonarjs';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

const tsFiles = ['src/**/*.ts', 'tests/**/*.ts'];
const scriptFiles = ['scripts/**/*.mjs', 'electron/**/*.mjs'];

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.kilo/**', '.local/**'],
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 500,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'max-lines-per-function': [
        'error',
        {
          max: 60,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  js.configs.recommended,
  {
    files: tsFiles,
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
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  // SonarJS recommended (bug detection, cognitive complexity, duplication) for TypeScript.
  {
    ...sonarjs.configs.recommended,
    files: tsFiles,
  },
  // Unicorn recommended (modern JS/TS best practices) for TypeScript.
  {
    ...eslintPluginUnicorn.configs.recommended,
    files: tsFiles,
  },
  // Node scripts (.mjs): apply Unicorn + SonarJS without type-aware requirements.
  {
    ...sonarjs.configs.recommended,
    files: scriptFiles,
  },
  {
    ...eslintPluginUnicorn.configs.recommended,
    files: scriptFiles,
  },
  {
    files: scriptFiles,
    languageOptions: {
      globals: globals.node,
    },
  },
  // Prettier must go last to disable stylistic rules that conflict with formatting.
  eslintConfigPrettier,
];
