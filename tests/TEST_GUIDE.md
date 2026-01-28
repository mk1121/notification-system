# Test Documentation

## Overview

This project includes comprehensive test suites to verify functionality of:
- Gateway authentication and kill switch
- Control server API endpoints
- Configuration and state management
- File structure and documentation

## Test Files

### 1. Shell Script Test Suite (`run-tests.sh`)

**Purpose**: Quick integration tests checking servers and APIs
**Run**: `bash tests/run-tests.sh`

**Features**:
- Checks Node.js installation
- Tests gateway health check
- Tests API authentication
- Tests kill switch functionality
- Verifies file structure
- Validates documentation

**Requirements**:
- Both servers running (gateway + control server)
- Valid API_KEY environment variable

**Example**:
```bash
# Set API key
export API_KEY="your-secret-key"

# Run tests
bash tests/run-tests.sh
```

### 2. Gateway Tests (`gateway-tests.js`)

**Purpose**: Detailed tests for authentication and kill switch
**Run**: `node tests/gateway-tests.js`

**Test Cases** (14 tests):
1. Health check
2. Valid API key authentication
3. Invalid API key returns 401
4. Missing API key returns 401
5. Get kill switch status
6. Disable gateway
7. SMS blocked when gateway disabled
8. Re-enable gateway
9. Disable SMS only
10. SMS blocked when SMS disabled
11. Re-enable SMS
12. Disable email only
13. Email blocked when email disabled
14. Re-enable all services

**Requirements**:
- Gateway server running on port 9090
- Valid API_KEY set

**Example**:
```bash
# Start gateway
cd email-sms-gateway
npm start &

# Run tests
node tests/gateway-tests.js
```

### 3. Control Server Tests (`control-server-tests.js`)

**Purpose**: Tests for control server endpoints
**Run**: `node tests/control-server-tests.js`

**Test Cases** (10 tests):
1. Home page loads
2. Setup UI requires login
3. Endpoints UI requires login
4. Logs UI requires login
5. Health check endpoint
6. Login page accessible
7. Invalid login fails
8. API endpoints exist
9. Static files accessible
10. Response headers present

**Requirements**:
- Control server running on port 3000
- Express server properly configured

**Example**:
```bash
# Start control server
cd controllerServer
npm start &

# Run tests
node tests/control-server-tests.js
```

## Running All Tests

### Option 1: Quick Integration Tests

```bash
# Set environment
export API_KEY="test-secret-key-12345"
export GATEWAY_URL="http://localhost:9090"
export CONTROL_URL="http://localhost:3000"

# Run integration tests
bash tests/run-tests.sh
```

### Option 2: Individual Test Suites

```bash
# Terminal 1: Start servers
cd controllerServer
npm start

# Terminal 2: Run gateway tests
node tests/gateway-tests.js

# Terminal 3: Run control server tests
node tests/control-server-tests.js
```

### Option 3: Full Test Cycle

```bash
#!/bin/bash
# Start servers in background
cd email-sms-gateway
npm start &
GATEWAY_PID=$!

cd ../controllerServer
npm start &
CONTROL_PID=$!

# Wait for servers to start
sleep 5

# Run all tests
export API_KEY="test-secret-key-12345"
bash tests/run-tests.sh
INTEGRATION_RESULT=$?

node tests/gateway-tests.js
GATEWAY_RESULT=$?

node tests/control-server-tests.js
CONTROL_RESULT=$?

# Stop servers
kill $GATEWAY_PID $CONTROL_PID

# Report results
echo ""
echo "=== FINAL RESULTS ==="
echo "Integration: $([[ $INTEGRATION_RESULT -eq 0 ]] && echo 'PASS' || echo 'FAIL')"
echo "Gateway:     $([[ $GATEWAY_RESULT -eq 0 ]] && echo 'PASS' || echo 'FAIL')"
echo "Control:     $([[ $CONTROL_RESULT -eq 0 ]] && echo 'PASS' || echo 'FAIL')"

exit $((INTEGRATION_RESULT + GATEWAY_RESULT + CONTROL_RESULT))
```

## Environment Variables

### For Shell Tests

```bash
# API Key for authentication
export API_KEY="test-secret-key-12345"

# Gateway URL (default: http://localhost:9090)
export GATEWAY_URL="http://localhost:9090"

# Control Server URL (default: http://localhost:3000)
export CONTROL_URL="http://localhost:3000"
```

### For Node Tests

```bash
# Add to environment before running
export API_KEY="test-secret-key-12345"
export GATEWAY_URL="http://localhost:9090"
export CONTROL_URL="http://localhost:3000"
```

## Test Results Interpretation

### Passing Test
```
  [1] Testing health check ... PASS
```

### Failing Test
```
  [2] Testing invalid API key returns 401 ... FAIL: Expected 401, got 403
```

## Common Issues

### Gateway Tests Failing

**Issue**: `Connection refused`
- **Solution**: Start gateway server: `cd email-sms-gateway && npm start`

**Issue**: `API Key always invalid`
- **Solution**: Ensure API_KEY matches in gateway `.env` and test environment

### Control Server Tests Failing

**Issue**: `Connection refused`
- **Solution**: Start control server: `cd controllerServer && npm start`

**Issue**: `Protected routes not redirecting`
- **Solution**: Verify login system is working properly

## Writing Custom Tests

### Test Template

```javascript
/**
 * Custom Test Suite
 * Run with: node tests/custom-tests.js
 */

const http = require('http');
const assert = require('assert');

function makeRequest(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, 'http://localhost:9090');
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    body: data ? JSON.parse(data) : null
                });
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log('\n=== CUSTOM TESTS ===\n');
    
    try {
        // Test 1
        console.log('[1] Testing something...');
        const res = await makeRequest('GET', '/path');
        assert.strictEqual(res.status, 200);
        console.log('    ✓ PASS\n');
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
    }
}

runTests();
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Run Tests

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd controllerServer && npm install
          cd ../email-sms-gateway && npm install
      
      - name: Start servers
        run: |
          cd controllerServer
          npm start &
          cd ../email-sms-gateway
          npm start &
          sleep 5
      
      - name: Run tests
        env:
          API_KEY: test-key
        run: bash tests/run-tests.sh
```

## Test Coverage Goals

- **Gateway**: 95%+ coverage
- **Authentication**: 100% coverage
- **Kill Switch**: 100% coverage
- **Control Server**: 80%+ coverage
- **API Endpoints**: 85%+ coverage

## বাংলা সারসংক্ষেপ

### টেস্ট চালান

**দ্রুত পরীক্ষা:**
```bash
bash tests/run-tests.sh
```

**বিস্তারিত Gateway টেস্ট:**
```bash
node tests/gateway-tests.js
```

**Control Server টেস্ট:**
```bash
node tests/control-server-tests.js
```

### টেস্ট সেটআপ

1. **দুটি টার্মিনাল খুলুন**

Terminal 1:
```bash
cd controllerServer
npm start
```

Terminal 2:
```bash
cd email-sms-gateway
npm start
```

Terminal 3:
```bash
export API_KEY="your-key"
bash tests/run-tests.sh
```

### টেস্ট ধরনসমূহ

- **Integration Tests** - সম্পূর্ণ সিস্টেম
- **Gateway Tests** - Auth + Kill Switch
- **Control Server Tests** - API endpoints
- **Custom Tests** - কাস্টম লজিক

### পাস/ফেইল দেখুন

সবুজ checkmark = পাস
লাল X = ফেইল

### সমস্যা সমাধান

- Gateway off? Start করুন
- API Key ভুল? `echo $API_KEY` চেক করুন
- Control server off? Start করুন
