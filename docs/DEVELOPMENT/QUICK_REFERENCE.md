# Quick Reference - Common Commands

Fast reference for frequently used commands.

## Testing

```bash
npm test                    # Run all tests with coverage
npm run test:watch         # Auto-rerun tests on changes
npm run test:debug         # Debug tests (chrome://inspect)
npm test -- file.test.js   # Run specific test file
```

## Code Quality

```bash
npm run lint               # Check code quality
npm run lint:fix           # Auto-fix linting issues
npm run format             # Auto-format code with Prettier
```

## Running Application

```bash
npm run dev               # Development mode (auto-reload)
npm start                # Production mode
```

## npm Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm test` | `jest --coverage --verbose` | Run all tests |
| `npm run test:watch` | `jest --watch` | Watch mode |
| `npm run test:debug` | `node --inspect-brk ...` | Debug mode |
| `npm run lint` | `eslint .` | Check code |
| `npm run lint:fix` | `eslint . --fix` | Fix code |
| `npm run format` | `prettier --write **/*.js` | Format code |
| `npm run dev` | `concurrently ...` | Dev mode |
| `npm start` | `concurrently ...` | Prod mode |

## File Locations

| File | Purpose |
|------|---------|
| `__tests__/setup-page.test.js` | Test suite (58 tests) |
| `jest.config.js` | Jest configuration |
| `jest.setup.js` | Test setup/globals |
| `.eslintrc.json` | ESLint rules |
| `.prettierrc.json` | Prettier config |
| `package.json` | Dependencies/scripts |

## Troubleshooting

### Tests fail with "jest.mock is not a function"
```bash
# Wrong - uses Bun test runner
bun test

# Correct - uses Jest
npm test
npx jest
```

### Code quality issues
```bash
npm run lint:fix   # Auto-fix most issues
npm run format     # Format code
```

### Can't find modules
```bash
npm install       # Reinstall dependencies
npm ci            # Clean install from lock file
```

## Environment Setup

```bash
cd controllerServer
npm install
npm test
```

## Useful Patterns

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="Configuration"
```

### Run single test file
```bash
npm test -- setup-page.test.js
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run tests without watch
```bash
npm test -- --no-coverage
```

## Watch Mode Tips

- Press `a` to run all tests
- Press `p` to filter by filename
- Press `t` to filter by test name
- Press `q` to quit

---

**For detailed information**, see:
- [QUICK_START.md](QUICK_START.md) - Getting started
- [JEST_SETUP.md](JEST_SETUP.md) - Testing setup
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Comprehensive testing
- [README.md](README.md) - Full development guide
