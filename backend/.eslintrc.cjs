module.exports = {
  root: true,
  env: { node: true, es2022: true, jest: true },
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended'],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': 'error',
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
