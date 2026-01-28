/**
 * Gateway Tests - Authentication and Kill Switch
 * Run with: node tests/gateway-tests.js
 */

const http = require('http');
const assert = require('assert');

// Test configuration
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:9090';
const API_KEY = process.env.API_KEY || 'test-secret-key-12345';

// Helper to make HTTP requests
function makeRequest(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, GATEWAY_URL);
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
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data ? JSON.parse(data) : null
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// Test suite
async function runTests() {
    console.log('\n=== GATEWAY TESTS ===\n');
    
    let passed = 0;
    let failed = 0;

    // Test 1: Health Check
    try {
        console.log('[1] Testing health check...');
        const res = await makeRequest('GET', '/');
        assert.strictEqual(res.status, 200, 'Should return 200');
        assert.strictEqual(res.body.status, 'OK', 'Should be OK');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 2: Auth - Valid API Key
    try {
        console.log('[2] Testing valid API key...');
        const res = await makeRequest('GET', '/api/admin/kill-switch', {
            'X-API-Key': API_KEY
        });
        assert.strictEqual(res.status, 200, 'Should return 200');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 3: Auth - Invalid API Key
    try {
        console.log('[3] Testing invalid API key...');
        const res = await makeRequest('GET', '/api/admin/kill-switch', {
            'X-API-Key': 'wrong-key'
        });
        assert.strictEqual(res.status, 401, 'Should return 401');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 4: Auth - Missing API Key
    try {
        console.log('[4] Testing missing API key...');
        const res = await makeRequest('GET', '/api/admin/kill-switch');
        assert.strictEqual(res.status, 401, 'Should return 401');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 5: Kill Switch - Get Status
    try {
        console.log('[5] Testing get kill switch status...');
        const res = await makeRequest('GET', '/api/admin/kill-switch', {
            'X-API-Key': API_KEY
        });
        assert.strictEqual(res.status, 200, 'Should return 200');
        assert(res.body.killSwitch, 'Should have killSwitch object');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 6: Kill Switch - Disable Gateway
    try {
        console.log('[6] Testing disable gateway...');
        const res = await makeRequest('POST', '/api/admin/kill-switch', {
            'X-API-Key': API_KEY
        }, { gateway: false });
        assert.strictEqual(res.status, 200, 'Should return 200');
        assert.strictEqual(res.body.killSwitch.gateway, false, 'Gateway should be disabled');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 7: Kill Switch - SMS blocked when disabled
    try {
        console.log('[7] Testing SMS blocked when gateway disabled...');
        const res = await makeRequest('GET', '/api/sms/send?to=01234567890&text=test', {
            'X-API-Key': API_KEY
        });
        assert.strictEqual(res.status, 503, 'Should return 503');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 8: Kill Switch - Re-enable Gateway
    try {
        console.log('[8] Testing re-enable gateway...');
        const res = await makeRequest('POST', '/api/admin/kill-switch', {
            'X-API-Key': API_KEY
        }, { gateway: true });
        assert.strictEqual(res.status, 200, 'Should return 200');
        assert.strictEqual(res.body.killSwitch.gateway, true, 'Gateway should be enabled');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 9: Kill Switch - Disable SMS only
    try {
        console.log('[9] Testing disable SMS only...');
        const res = await makeRequest('POST', '/api/admin/kill-switch', {
            'X-API-Key': API_KEY
        }, { sms: false });
        assert.strictEqual(res.status, 200, 'Should return 200');
        assert.strictEqual(res.body.killSwitch.sms, false, 'SMS should be disabled');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 10: Kill Switch - SMS blocked
    try {
        console.log('[10] Testing SMS blocked when SMS disabled...');
        const res = await makeRequest('GET', '/api/sms/send?to=01234567890&text=test', {
            'X-API-Key': API_KEY
        });
        assert.strictEqual(res.status, 503, 'Should return 503');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 11: Kill Switch - Re-enable SMS
    try {
        console.log('[11] Testing re-enable SMS...');
        const res = await makeRequest('POST', '/api/admin/kill-switch', {
            'X-API-Key': API_KEY
        }, { sms: true });
        assert.strictEqual(res.status, 200, 'Should return 200');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 12: Disable Email only
    try {
        console.log('[12] Testing disable email only...');
        const res = await makeRequest('POST', '/api/admin/kill-switch', {
            'X-API-Key': API_KEY
        }, { email: false });
        assert.strictEqual(res.status, 200, 'Should return 200');
        assert.strictEqual(res.body.killSwitch.email, false, 'Email should be disabled');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 13: Email blocked when disabled
    try {
        console.log('[13] Testing email blocked when disabled...');
        const res = await makeRequest('POST', '/api/email/send', {
            'X-API-Key': API_KEY
        }, { to: 'test@example.com', subject: 'Test', text: 'Test' });
        assert.strictEqual(res.status, 503, 'Should return 503');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 14: Re-enable all
    try {
        console.log('[14] Testing re-enable all services...');
        const res = await makeRequest('POST', '/api/admin/kill-switch', {
            'X-API-Key': API_KEY
        }, { gateway: true, sms: true, email: true });
        assert.strictEqual(res.status, 200, 'Should return 200');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Summary
    console.log('=== TEST SUMMARY ===');
    console.log(`Total: ${passed + failed}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}\n`);

    if (failed === 0) {
        console.log('✓ All tests passed!');
        process.exit(0);
    } else {
        console.log('✗ Some tests failed');
        process.exit(1);
    }
}

// Run tests
runTests().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
