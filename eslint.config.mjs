// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default tseslint.config({
  ignores: [
    'dist/**',
    'coverage/**',
    'node_modules/**',
    'engine-wasm/**',
    '**/*.cjs',
    'commitlint.config.js',
    '.releaserc.js',
    'scripts/**',
    'public/service-worker.js',
    'public/icons/generate-icons.js',
    'public/sw.js',
    'storybook-static/**',
    'schach9x9/**/*.js',
    'trischach/**/*.js',
    'trischach/sw.js',
    'trischach/generate-*.js',
    'trischach/tournament.js',
    'trischach/auto-battle-learn.js',
    'trischach/playwright.config.ts',
    'trischach/vite.config.ts',
    'trischach/scripts/**',
    'e2e/**',
    'tests/trischach/**/*.js',
    'tests/vitest.setup.ts',
    'vitest.ci.config.ts',
    'tests/mocks/**',
    'docs/**',
    'vitest.shims.d.ts',
    '.storybook/**',
    'stories/**',
  ],
}, ...tseslint.configs.recommended, {
  files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: {
      ...globals.browser,
      ...globals.node,
      vi: 'readonly',
      describe: 'readonly',
      it: 'readonly',
      test: 'readonly',
      expect: 'readonly',
      beforeEach: 'readonly',
      afterEach: 'readonly',
      beforeAll: 'readonly',
      afterAll: 'readonly',
    },
    parserOptions: {
      project: ['./tsconfig.json', './tsconfig.schach9x9.json', './tsconfig.trischach.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.schach9x9.json', './tsconfig.trischach.json'],
      },
    },
  },
  plugins: {
    import: importPlugin,
  },
  rules: {
    indent: 'off',
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single', { avoidEscape: true }],
    semi: ['error', 'always'],
    'no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'no-console': 'off',
    'no-debugger': 'warn',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'off',
    'arrow-spacing': 'error',
    'no-multiple-empty-lines': ['error', { max: 2 }],
    'eol-last': ['error', 'always'],
    'comma-dangle': ['error', 'only-multiline'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-require-imports': 'off',
  },
}, {
  files: ['tests/**/*.ts', 'tests/**/*.js', 'tests/**/*.tsx', 'tests/**/*.jsx', 'tests-e2e/**/*.ts', 'tests-e2e/**/*.js'],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
  },
}, {
  files: ['vite.config.ts', 'vite.config.*.ts', 'vitest.config.ts', 'playwright.config.ts', 'service-worker.ts', 'vite.landing.config.ts'],
  languageOptions: {
    parserOptions: {
      project: null,
    },
  },
}, storybook.configs["flat/recommended"]);