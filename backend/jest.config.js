/**
 * Jest Configuration for Backend Tests
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json'
    }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.new.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  setupFiles: ['<rootDir>/tests/env.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  maxWorkers: 1,
  testTimeout: 10000,
  // Prisma's query-engine process can linger after the suite even when all
  // application handles are closed (setup.ts disconnects Prisma in afterAll).
  // `--detectOpenHandles` reports no leak, so force a clean exit rather than
  // hang CI. Safe here precisely because there is no unreported handle.
  forceExit: true,
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
}
