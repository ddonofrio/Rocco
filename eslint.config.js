import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import sonarjs from 'eslint-plugin-sonarjs';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

const tsFiles = ['src/**/*.ts', 'tests/**/*.ts'];
const scriptFiles = ['scripts/**/*.mjs', 'electron/**/*.mjs'];
const maxLinesAllowlist = [
  ['src/console/runtime.ts', 'Console composition root'],
  ['src/console/cartridge-menu/system-settings-page-renderer.ts', 'System settings renderer'],
  ['src/console/cartridge-menu/cartridge-menu.ts', 'Cartridge menu composition'],
  ['src/console/video/scene-target-resolution.ts', 'Scene target resolution pipeline'],
  ['src/console/video/planes/pixi-renderer.ts', 'Pixi plane renderer'],
  ['src/console/video/sprites/motion-animation-driver.ts', 'Sprite motion animation driver'],
  ['src/console/video/sprites/system.ts', 'Sprite video subsystem'],
  ['src/cartridges/rocco/levels/rocco-level-manager.ts', 'Rocco level orchestration'],
  [
    'src/cartridges/rocco/levels/runtime/rocco-level-transition-service.ts',
    'Rocco level transition orchestration',
  ],
  [
    'src/cartridges/rocco/levels/runtime/rocco-dropped-inventory-controller.ts',
    'Dropped inventory runtime controller',
  ],
  [
    'src/cartridges/rocco/levels/runtime/rocco-developer-runtime-controller.ts',
    'Developer runtime controller',
  ],
  [
    'src/cartridges/rocco/games/rocco-default/maps/nether/nether-end-of-hallway-door-level.ts',
    'Nether hallway door level',
  ],
  [
    'src/cartridges/rocco/games/rocco-default/maps/nether/nether-console-hardware-spawn-level.ts',
    'Nether console hardware spawn level',
  ],
  ['src/cartridges/rocco/games/rocco-default/maps/shop/bait-shop-level.ts', 'Bait shop level'],
  [
    'src/cartridges/rocco/games/rocco-default/maps/shop/bait-shop-second-level.ts',
    'Bait shop second level',
  ],
  [
    'src/cartridges/rocco/games/rocco-default/maps/shop/bait-shop-toilet-level.ts',
    'Bait shop toilet level',
  ],
  ['src/cartridges/rocco/games/rocco-default/maps/pier/pier-pelikan.ts', 'Pier Pelikan level'],
  ['src/cartridges/rocco/games/rocco-default/maps/pier/pier-stan.ts', 'Pier Stan level'],
  [
    'src/cartridges/rocco/interactions/register-pier-interactions.ts',
    'Pier interaction registration',
  ],
].map(([file, reason]) => ({
  files: [file],
  name: `max-lines allowlist: ${reason}`,
  rules: {
    'max-lines': 'off',
    'max-lines-per-function': 'off',
  },
}));

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.kilo/**', '.local/**'],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
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
      'unicorn/no-null': 'off',
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
  {
    files: tsFiles,
    rules: {
      'unicorn/no-null': 'off',
    },
  },
  ...maxLinesAllowlist,
  // Prettier must go last to disable stylistic rules that conflict with formatting.
  eslintConfigPrettier,
];
