import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/index.ts'],
  coverageThreshold: {
    global: { branches: 70, functions: 70, lines: 70, statements: 70 },
  },
};

export default config;
