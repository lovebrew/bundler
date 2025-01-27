import pluginJs from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import pluginReact from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
  },
  {
    languageOptions: { globals: globals.browser },
    rules: {
      quotes: ['error', 'single'],
      'comma-dangle': ['error', 'always-multiline'],
       // Enable import order rule
      'import/order': [
        'warn',
        {
          groups: [
            ['builtin', 'external'], // Node.js built-ins and external packages
            ['internal'], // Internal modules
            ['parent', 'sibling', 'index'], // Parent, sibling, and index imports
            ['type'], // Type imports (for TypeScript)
          ],
          pathGroups: [
            {
              pattern: '@/**', // Group for alias imports (if using aliases)
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always', // Add newlines between groups
          alphabetize: {
            order: 'asc', // Sort in ascending order
            caseInsensitive: true, // Case-insensitive sorting
          },
        },
      ],
    },
    plugins: {
      import: importPlugin,
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
];
