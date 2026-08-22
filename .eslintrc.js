module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  settings: {
    react: { version: 'detect' },
  },
  env: {
    es2021: true,
    node: true,
    jest: true,
  },
  rules: {
    // React 17+ JSX transform — no need to import React
    'react/react-in-jsx-scope': 'off',
    // Allow require() for assets and dynamic imports
    '@typescript-eslint/no-require-imports': 'off',
    // Allow explicit `any` in migration phase; tighten later
    '@typescript-eslint/no-explicit-any': 'warn',
    // Unused vars: error, but allow _ prefix
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    // React Native animation refs and initial effect synchronization are valid in this codebase.
    'react-hooks/refs': 'off',
    'react-hooks/set-state-in-effect': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.expo/',
    'supabase/functions/',
    'android/',
    'ios/',
    'babel.config.js',
    'metro.config.js',
    'jest.config.js',
    'jest.setup.js',
  ],
};
