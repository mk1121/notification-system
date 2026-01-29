module.exports = {
  testEnvironment: 'node',
  testRunner: 'jest-circus/runner',
  collectCoverageFrom: [
    '*.js',
    '!node_modules/**',
    '!coverage/**',
    '!dist/**',
    '!__tests__/**',
    '!jest.config.js',
    '!jest.setup.js'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'package.json',
    '__tests__'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30
    }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  verbose: true,
  bail: 0,
  errorOnDeprecated: false,
  detectOpenHandles: false,
  forceExit: true,
  maxWorkers: 1,
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};
