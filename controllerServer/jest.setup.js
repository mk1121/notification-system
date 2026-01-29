// Jest setup file - runs before all tests
// Add global test configuration here

// Ensure jest globals are available
const { describe, it, test, beforeEach, afterEach, expect } = require('@jest/globals');

// Make globals available
global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.beforeEach = beforeEach;
global.afterEach = afterEach;

// Suppress console logs during tests (optional)
// global.console = {
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

beforeEach(() => {
  // Clear any mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllTimers();
  jest.useRealTimers();
});
