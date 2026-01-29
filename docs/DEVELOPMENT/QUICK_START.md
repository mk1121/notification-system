# Quick Start - Development

Get the development environment running in 5 minutes.

## Prerequisites
```bash
node -v  # v18+
npm -v   # v9+
```

## Installation

```bash
cd controllerServer
npm install
```

## Run Tests

```bash
npm test
```

Expected output:
```
PASS  __tests__/setup-page.test.js
Test Suites: 1 passed, 1 total
Tests:       58 passed, 58 total
```

## Start Development Mode

```bash
npm run dev
```

This will start both the control server and gateway server with auto-reload.

## Check Code Quality

```bash
npm run lint:fix
npm run format
```

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Run tests |
| `npm run test:watch` | Watch mode |
| `npm run lint` | Check code |
| `npm run lint:fix` | Fix code |
| `npm run format` | Format code |
| `npm run dev` | Dev mode |
| `npm start` | Production |

## Next Steps

- Read [TESTING_GUIDE.md](TESTING_GUIDE.md) for comprehensive testing information
- Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for common commands
- See [PROJECT_STATUS.md](PROJECT_STATUS.md) for current status

---

**Status**: ✅ Ready to develop
