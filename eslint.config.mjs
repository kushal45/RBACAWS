// @ts-check
import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'dist/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
      '*.js',
      '*.mjs',
      '.next/**',
      '.cache/**',
      '.nx/**',
    ],
  },

  // Base configurations
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  // Plugin configurations
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.es2022,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: true,
      },
    },

    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

      // Import rules
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // Built-in imports (come first)
            'external', // External library imports
            'internal', // Internal imports (our packages)
            'parent', // Parent imports
            'sibling', // Sibling imports
            'index', // Index imports
            'type', // Type-only imports (come last)
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          warnOnUnassignedImports: true,
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'error',
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': 'error',
      'import/prefer-default-export': 'off',
      'import/no-default-export': 'error',

      // General ESLint rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'prefer-destructuring': [
        'error',
        { array: true, object: true },
        { enforceForRenamedProperties: false },
      ],
      'no-param-reassign': ['error', { props: false }],
      'no-return-assign': 'error',
      'no-return-await': 'error',
      'require-await': 'off', // Handled by TypeScript version
      'no-unused-expressions': 'error',
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      'spaced-comment': ['error', 'always'],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },

  // Test files configuration
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  // Configuration files
  {
    files: ['*.config.js', '*.config.mjs', '*.config.ts'],
    rules: {
      'import/no-default-export': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
);
