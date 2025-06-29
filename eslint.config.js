import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },

      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },

    extends: compat.extends('eslint:recommended', 'prettier'),

    plugins: {
      'no-only-tests': noOnlyTests,
    },

    rules: {
      'no-only-tests/no-only-tests': 'error',
      'no-console': 'error',
    },
  },
  globalIgnores(['**/node_modules', '**/dist']),
  {
    files: ['**/*.ts', '**/*.tsx'],

    languageOptions: {
      parserOptions: {
        EXPERIMENTAL_useProjectService: true,
      },
    },

    extends: compat.extends(
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking'
    ),

    rules: {
      '@typescript-eslint/no-use-before-define': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/no-floating-promises': ['error'],
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
]);
