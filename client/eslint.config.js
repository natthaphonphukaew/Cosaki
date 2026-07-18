// Lenient ESLint (flat config) for the React client. Catches real bugs, not
// style — Prettier owns formatting. Most rules WARN so designers aren't blocked.
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'warn',
      'react/jsx-uses-react': 'off', // React 17+ JSX transform
      'react/react-in-jsx-scope': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]' }],
      'no-empty': ['warn', { allowEmptyCatch: true }], // swallowing a catch is intentional here
      'no-undef': 'error',
    },
  },
  prettier, // must be last — disables rules that conflict with Prettier
];
