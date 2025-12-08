// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      'no-console': 'error',
    },
  },
  {
    // Ignore import/no-unresolved for packages with pnpm symlink resolution issues
    files: ['components/GlassView.tsx'],
    rules: {
      'import/no-unresolved': ['error', { ignore: ['expo-glass-effect'] }],
    },
  },
  {
    files: ['lib/logger.ts', 'lib/sentry.ts', 'jest.setup.js'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['jest.setup.js', '__tests__/**/*.{js,jsx,ts,tsx}', '**/*.test.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        test: 'readonly',
        global: 'writable',
        require: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
]);
