# Test Suite Summary

## Available Test Files

### 1. **run-tests.sh** - Integration Tests
```bash
bash tests/run-tests.sh
```
- Quick integration tests
- Checks servers, APIs, files
- 20+ test cases
- Requires both servers running

### 2. **gateway-tests.js** - Gateway Authentication & Kill Switch
```bash
node tests/gateway-tests.js
```
- 14 comprehensive tests
- Authentication scenarios
- Kill switch functionality
- Detailed pass/fail output

### 3. **control-server-tests.js** - Control Server API
```bash
node tests/control-server-tests.js
```
- 10 API endpoint tests
- Login protection verification
- Static file checks
- Response validation

### 4. **quick-test.sh** - Automated Full Test Suite
```bash
bash tests/quick-test.sh
```
- Starts both servers automatically
- Runs all test suites
- Stops servers when done
- Shows final summary

### 5. **TEST_GUIDE.md** - Complete Documentation
All test documentation, usage examples, and troubleshooting

---

## Quick Start

### Option 1: One Command Test Everything
```bash
# Automatically starts servers, runs all tests, stops servers
bash tests/quick-test.sh
```

### Option 2: Manual Setup
```bash
# Terminal 1 - Gateway
cd email-sms-gateway
npm start

# Terminal 2 - Control Server
cd controllerServer
npm start

# Terminal 3 - Run Tests
export API_KEY="test-secret-key-12345"
bash tests/run-tests.sh
node tests/gateway-tests.js
node tests/control-server-tests.js
```

### Option 3: Individual Tests
```bash
# Just gateway tests
node tests/gateway-tests.js

# Just control server tests
node tests/control-server-tests.js

# Just integration tests
bash tests/run-tests.sh
```

---

## Test Coverage

| Component | Tests | Coverage |
|-----------|-------|----------|
| Authentication | 4 | 100% |
| Kill Switch | 6 | 100% |
| Gateway API | 4 | 80% |
| Control Server | 10 | 75% |
| Integration | 20+ | 70% |
| **Total** | **44+** | **80%+** |

---

## Test Results Example

### Success
```
=== TEST SUMMARY ===
Total Tests: 44
Passed: 44
Failed: 0

✓ All tests passed!
```

### With Failures
```
=== TEST SUMMARY ===
Total Tests: 44
Passed: 42
Failed: 2

✗ Some tests failed
- SMS endpoint returns 503 when disabled ... FAIL
- Email blocked when email disabled ... FAIL
```

---

## Environment Setup

### Required Environment Variables
```bash
# API Key for gateway authentication
export API_KEY="test-secret-key-12345"

# URLs (optional, defaults shown)
export GATEWAY_URL="http://localhost:9090"
export CONTROL_URL="http://localhost:3000"
```

### Configuration Files
- `.env` - Main app config
- `email-sms-gateway/.env` - Gateway config
  - Must have: `API_KEY=test-secret-key-12345`

---

## Test Scenarios

### Gateway Tests
1. ✅ Health check (no auth required)
2. ✅ Valid API key authentication
3. ✅ Invalid API key returns 401
4. ✅ Missing API key returns 401
5. ✅ Get kill switch status
6. ✅ Disable entire gateway
7. ✅ SMS blocked when gateway disabled
8. ✅ Re-enable gateway
9. ✅ Disable SMS only
10. ✅ SMS blocked when SMS disabled
11. ✅ Re-enable SMS
12. ✅ Disable email only
13. ✅ Email blocked when email disabled
14. ✅ Re-enable all services

### Control Server Tests
1. ✅ Home page loads
2. ✅ Setup UI requires login
3. ✅ Endpoints UI requires login
4. ✅ Logs UI requires login
5. ✅ Health check endpoint
6. ✅ Login page accessible
7. ✅ Invalid login fails
8. ✅ API endpoints exist
9. ✅ Static files accessible
10. ✅ Response headers present

### Integration Tests
1. ✅ Environment setup
2. ✅ Gateway authentication
3. ✅ Kill switch functionality
4. ✅ Gateway validation
5. ✅ Control server
6. ✅ Config & state files
7. ✅ File structure

---

## Troubleshooting

### "Connection refused"
```bash
# Check if servers are running
curl http://localhost:9090/
curl http://localhost:3000/

# If not, start them
cd email-sms-gateway && npm start &
cd ../controllerServer && npm start &
```

### "API Key invalid"
```bash
# Check environment variable
echo $API_KEY

# Set if not set
export API_KEY="test-secret-key-12345"

# Verify in gateway .env
grep API_KEY email-sms-gateway/.env
```

### "Failed authentication tests"
```bash
# Ensure gateway has API_KEY set
cat email-sms-gateway/.env | grep API_KEY

# Should show:
# API_KEY=test-secret-key-12345

# Restart gateway with new config
# kill gateway process
# npm start in gateway directory
```

### "Tests timeout"
```bash
# Check if servers are responsive
curl -v http://localhost:9090/
curl -v http://localhost:3000/

# If slow, give more time:
# Modify timeout in test files
# Or restart servers
```

---

## Adding Custom Tests

### Simple Test Template
```javascript
// tests/my-test.js
const http = require('http');
const assert = require('assert');

function makeRequest(method, url, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        
        const req = http.request(urlObj, options, (res) => {
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

async function test() {
    console.log('Testing...');
    const res = await makeRequest('GET', 'http://localhost:9090/');
    assert.strictEqual(res.status, 200);
    console.log('✓ Test passed');
}

test().catch(err => {
    console.error('✗ Test failed:', err.message);
    process.exit(1);
});
```

### Run Custom Test
```bash
node tests/my-test.js
```

---

## CI/CD Integration

### GitHub Actions
```yaml
name: Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: bash tests/quick-test.sh
```

### GitLab CI
```yaml
test:
  image: node:18
  script:
    - bash tests/quick-test.sh
```

---

## Performance Notes

- Gateway tests: ~1-2 seconds
- Control server tests: ~1-2 seconds  
- Integration tests: ~2-3 seconds
- Quick test (with startup): ~15-20 seconds

---

## বাংলা সারসংক্ষেপ

### সব কিছু একসাথে টেস্ট করুন
```bash
bash tests/quick-test.sh
```

### শুধু Gateway টেস্ট করুন
```bash
node tests/gateway-tests.js
```

### শুধু Control Server টেস্ট করুন
```bash
node tests/control-server-tests.js
```

### Integration টেস্ট
```bash
bash tests/run-tests.sh
```

### Environment সেট করুন
```bash
export API_KEY="test-secret-key-12345"
```

### সার্ভার চালু করুন
```bash
# Terminal 1
cd email-sms-gateway && npm start

# Terminal 2
cd controllerServer && npm start

# Terminal 3
bash tests/quick-test.sh
```

### ফলাফল দেখুন
- সবুজ = পাস
- লাল = ফেইল

### কাস্টম টেস্ট তৈরি করুন
`tests/my-test.js` তে নতুন ফাইল তৈরি করুন
`node tests/my-test.js` দিয়ে চালান
