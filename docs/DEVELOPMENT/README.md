# Development Documentation

Complete guide for developing, testing, and maintaining the API Monitoring & Notification System.

## 📋 Documentation Index

### Quick Start & Setup
- [**QUICK_START.md**](QUICK_START.md) - Get started with development in 5 minutes
- [**SETUP_COMPLETE.md**](SETUP_COMPLETE.md) - Complete setup verification and summary
- [**QUICK_REFERENCE.md**](QUICK_REFERENCE.md) - Common commands and quick reference

### Testing Framework
- [**JEST_SETUP.md**](JEST_SETUP.md) - Jest testing framework configuration
- [**TEST_RESULTS.md**](TEST_RESULTS.md) - Current test results and coverage
- [**TEST_QUICK_REFERENCE.md**](TEST_QUICK_REFERENCE.md) - Quick test command reference
- [**TESTING_GUIDE.md**](TESTING_GUIDE.md) - Comprehensive testing guide

### Code Quality
- [**LINT_FIXES.md**](LINT_FIXES.md) - ESLint and code quality fixes
- [**PROJECT_STATUS.md**](PROJECT_STATUS.md) - Project status dashboard

### Verification & Checklists
- [**VERIFICATION_CHECKLIST.md**](VERIFICATION_CHECKLIST.md) - Complete setup verification checklist

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- npm v9+

### Installation
```bash
cd controllerServer
npm install
```

### Run Tests
```bash
npm test                    # All tests with coverage
npm run test:watch         # Auto-rerun on changes
npm run test:debug         # Debug mode
```

### Code Quality
```bash
npm run lint               # Check code
npm run lint:fix           # Auto-fix
npm run format             # Format code
```

### Development Mode
```bash
npm run dev               # Auto-reload mode
npm start                # Production mode
```

---

## 📊 Project Status

| Aspect | Status |
|--------|--------|
| Tests | ✅ 58/58 passing |
| Linting | ✅ 0 errors, 0 warnings |
| Coverage | ✅ 30% threshold met |
| Demo Credentials | ✅ Removed |
| Documentation | ✅ Complete |

---

## 🗂️ Directory Structure

```
controllerServer/
├── __tests__/
│   └── setup-page.test.js           # 58 unit tests
├── .eslintrc.json                   # ESLint configuration
├── .prettierrc.json                 # Prettier configuration
├── .npmrc                           # NPM settings
├── jest.config.js                   # Jest configuration
├── jest.setup.js                    # Test setup
├── package.json                     # Dependencies & scripts
└── [source files]
```

---

## 📦 Dependencies

### Production
- axios ^1.6.0 - HTTP client
- express ^4.18.2 - Web framework
- dotenv ^16.3.1 - Environment variables
- concurrently ^9.2.1 - Run multiple commands

### Development
- jest ^29.7.0 - Testing framework
- @jest/globals ^29.7.0 - Jest globals
- supertest ^6.3.3 - HTTP testing
- eslint ^8.55.0 - Code linting
- prettier ^3.1.1 - Code formatting
- nodemon ^3.0.1 - Auto-restart

---

## 📝 npm Scripts

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests with coverage |
| `npm run test:watch` | Auto-rerun tests on changes |
| `npm run test:debug` | Debug mode with breakpoints |
| `npm run lint` | Check code quality |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm run dev` | Development mode (auto-reload) |
| `npm start` | Production mode |

---

## 🧪 Testing

### Test Coverage
- ✅ Configuration creation & validation
- ✅ URL validation (HTTP/HTTPS)
- ✅ JSON parsing & structures
- ✅ Authentication types (None, Bearer, Basic)
- ✅ HTTP methods (GET, POST, PUT, PATCH, DELETE)
- ✅ SMS/Email notifications
- ✅ Response mapping
- ✅ Input validation & sanitization
- ✅ Configuration management
- ✅ Check intervals
- ✅ Data persistence
- ✅ Error handling & edge cases

### Run Specific Tests
```bash
# Run specific test file
npm test -- setup-page.test.js

# Run tests matching pattern
npm test -- --testNamePattern="Configuration Creation"

# Run with coverage report
npm test -- --coverage
```

---

## 🔍 Code Quality

### ESLint Configuration
- 2-space indentation
- Single quotes
- Semicolons required
- Strict equality (===)
- No unused variables

### Prettier Configuration
- 100 character line width
- 2-space indentation
- Single quotes
- No trailing commas

### Commands
```bash
npm run lint               # Check code
npm run lint:fix           # Auto-fix issues
npm run format             # Format code
```

---

## ⚠️ Important Notes

### Do NOT use `bun test`
Use `npm test` instead. Bun's native test runner is incompatible with Jest.

```bash
❌ bun test              # Causes jest.mock() errors
✅ npm test              # Correct
✅ npx jest              # Also correct
```

### Demo Credentials
Demo credentials have been removed from the login page for security. The UI now shows a clean login form without hints.

---

## 🔧 Troubleshooting

### "jest.mock is not a function"
```bash
# Wrong
bun test

# Right
npm test
```

### Tests not found
```bash
# Make sure you're in the right directory
cd controllerServer
npm test
```

### Port already in use
```bash
# Dev mode handles concurrent processes
npm run dev
```

### Linting errors
```bash
npm run lint:fix    # Auto-fix most issues
npm run format      # Format code
```

---

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
- [Express Documentation](https://expressjs.com/)

---

## ✅ Verification Checklist

- [x] Jest testing framework installed
- [x] 58 unit tests created and passing
- [x] ESLint configured with rules
- [x] Prettier configured for formatting
- [x] npm scripts working correctly
- [x] Demo credentials removed
- [x] All documentation complete
- [x] Code quality verified
- [x] Tests passing with 0 errors

---

**Last Updated**: January 29, 2026  
**Status**: ✅ Production Ready  
**Framework**: Node.js + Express + Jest
