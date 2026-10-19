/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.ts'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // The build fails if coverage drops below these gates.
  coverageThreshold: {
    global: { statements: 90, branches: 85, functions: 90, lines: 90 },
  },
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'reports', outputName: 'junit.xml' }],
  ],
};
