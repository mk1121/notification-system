# Testing Guide - Comprehensive

Complete guide to testing the API Monitoring & Notification System.

## Overview

The project uses **Jest 29.7.0** with a comprehensive test suite of **58 unit tests** organized into **13 test suites**.

## Quick Start

### Run All Tests
```bash
npm test
```

### Expected Output
```
PASS  __tests__/setup-page.test.js
  Setup Page Configuration Tests
    ✓ 58 tests passing

Test Suites: 1 passed, 1 total
Tests:       58 passed, 58 total
Snapshots:   0 total
Time:        1.189 s
```

## Test Organization

### 13 Test Suites

**1. Configuration Creation** (4 tests)
- Create new configurations with valid data
- Validate required fields
- Reject empty values

**2. API Endpoint URL Validation** (4 tests)
- Validate HTTP/HTTPS URLs
- Reject invalid formats
- Enforce protocol requirement

**3. JSON Configuration Parsing** (5 tests)
- Parse headers and query parameters
- Handle nested structures
- Error handling for invalid JSON

**4. Authentication Types** (3 tests)
- No authentication support
- Bearer token authentication
- Basic authentication

**5. HTTP Method Support** (5 tests)
- GET, POST, PUT, PATCH, DELETE
- Body handling
- Method validation

**6. Notification Configuration** (7 tests)
- SMS and Email configuration
- Multiple recipient support
- Format validation

**7. API Response Mapping** (3 tests)
- Path mapping configuration
- Nested path handling
- Deep structure support

**8. Input Validation & Sanitization** (4 tests)
- Whitespace trimming
- Format validation
- Special character handling

**9. Active Configuration Management** (4 tests)
- Configuration switching
- Active state management
- Configuration lookup

**10. Check Interval Configuration** (5 tests)
- Interval setup in milliseconds
- Minimum interval validation
- Time unit conversion

**11. Configuration Persistence** (5 tests)
- Save operations
- Update operations
- Delete operations
- Property preservation

**12. Configuration Data Structure** (2 tests)
- Required properties
- Optional properties

**13. Error Handling & Edge Cases** (5 tests)
- Null value handling
- Undefined values
- Empty strings
- Large data objects
- Type consistency

## Running Tests

### All Tests with Coverage
```bash
npm test
```

### Watch Mode (auto-rerun)
```bash
npm run test:watch
```

### Debug Mode
```bash
npm run test:debug
# Then open: chrome://inspect
```

### Specific Test File
```bash
npm test -- setup-page.test.js
```

### Tests Matching Pattern
```bash
npm test -- --testNamePattern="Configuration Creation"
```

### Generate Coverage Report
```bash
npm test -- --coverage
```

## Test Development

### Test File Location
`controllerServer/__tests__/setup-page.test.js`

### Test Structure
```javascript
describe('Suite Name', () => {
  describe('Sub-suite Name', () => {
    test('should do something', () => {
      // Arrange
      const config = { label: 'test' };

      // Act & Assert
      expect(config.label).toBe('test');
    });
  });
});
```

### Writing New Tests

1. Add to existing suite or create new one
2. Follow naming convention: "should [expected behavior]"
3. Use clear assertions
4. Test both positive and negative cases

Example:
```javascript
test('should validate email format', () => {
  const validEmail = 'user@example.com';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  expect(validEmail).toMatch(emailRegex);
});
```

## Jest Configuration

### jest.config.js
```javascript
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['*.js', '!node_modules/**', '!__tests__/**'],
  testMatch: ['**/__tests__/**/*.test.js'],
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
  forceExit: true,
  maxWorkers: 1
};
```

### jest.setup.js
```javascript
const { describe, it, test, expect } = require('@jest/globals');

global.describe = describe;
global.test = test;
global.expect = expect;

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllTimers();
});
```

## Available Jest Globals

```javascript
// Describe test suite
describe('Suite', () => {});

// Individual test
test('should do something', () => {});
it('should do something', () => {});

// Assertions
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toMatch(regex);
expect(value).toBeTruthy();
expect(value).toContain(value);

// Setup/Teardown
beforeEach(() => {});
afterEach(() => {});
beforeAll(() => {});
afterAll(() => {});
```

## Coverage Reports

### Generate Coverage
```bash
npm test -- --coverage
```

### Coverage Metrics
- Statements: % of statements executed
- Branches: % of conditional branches executed
- Functions: % of functions called
- Lines: % of lines executed

### Current Thresholds
- Branches: 30%
- Functions: 30%
- Lines: 30%
- Statements: 30%

## Troubleshooting

### "jest.mock is not a function"
```bash
# Wrong - uses Bun runner
bun test

# Correct - uses Jest
npm test
```

### Test file not found
- Verify file is in `__tests__/` directory
- Check filename ends with `.test.js`
- Verify jest.config.js testMatch pattern

### Tests not updating
```bash
npm run test:watch
# or
npm test -- --clearCache
```

### Memory issues with large test suite
```bash
# Run with single worker
npm test -- --maxWorkers=1
```

## Best Practices

1. ✅ **Keep tests focused** - One concept per test
2. ✅ **Use descriptive names** - "should validate email format"
3. ✅ **Test both cases** - Positive and negative scenarios
4. ✅ **Keep tests fast** - Avoid external dependencies
5. ✅ **Organize logically** - Group related tests in suites
6. ✅ **Use clear assertions** - Avoid confusing expect chains
7. ✅ **DRY principle** - Extract common test setup
8. ✅ **Run tests frequently** - Use watch mode during development

## Continuous Integration

For CI/CD pipelines:
```bash
npm test -- --ci --coverage --maxWorkers=2
```

## Additional Resources

- [Jest Official Documentation](https://jestjs.io/)
- [Jest API Reference](https://jestjs.io/docs/api)
- [Testing Best Practices](https://jestjs.io/docs/testing-frameworks)

---

**Status**: ✅ Testing Framework Ready
**Framework**: Jest 29.7.0
**Tests**: 58 total, all passing
**Coverage**: 30% minimum threshold
