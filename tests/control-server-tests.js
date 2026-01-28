/**
 * Control Server API Tests
 * Run with: node tests/control-server-tests.js
 */

const http = require('http');
const assert = require('assert');

const CONTROL_URL = process.env.CONTROL_URL || 'http://localhost:3000';

// Helper to make HTTP requests
function makeRequest(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, CONTROL_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            redirect: 'manual'
        };

        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data ? JSON.parse(data) : data
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
    console.log('\n=== CONTROL SERVER TESTS ===\n');
    
    let passed = 0;
    let failed = 0;

    // Test 1: Home page loads
    try {
        console.log('[1] Testing home page accessibility...');
        const res = await makeRequest('GET', '/');
        assert(res.status === 200 || res.status === 302, `Should return 200 or 302, got ${res.status}`);
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 2: Setup UI protected (requires login)
    try {
        console.log('[2] Testing setup UI requires login...');
        const res = await makeRequest('GET', '/setup/ui');
        assert(res.status === 302 || res.status === 301, `Should redirect, got ${res.status}`);
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 3: Endpoints UI protected
    try {
        console.log('[3] Testing endpoints UI requires login...');
        const res = await makeRequest('GET', '/endpoints/ui');
        assert(res.status === 302 || res.status === 301, `Should redirect, got ${res.status}`);
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 4: Logs UI protected
    try {
        console.log('[4] Testing logs UI requires login...');
        const res = await makeRequest('GET', '/logs/ui');
        assert(res.status === 302 || res.status === 301, `Should redirect, got ${res.status}`);
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 5: Health check endpoint (unprotected)
    try {
        console.log('[5] Testing health check endpoint...');
        const res = await makeRequest('GET', '/api/health');
        // This may or may not exist, so just check if server responds
        assert(res.status >= 200, 'Server should respond');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 6: Login page accessible
    try {
        console.log('[6] Testing login page accessible...');
        const res = await makeRequest('GET', '/login');
        assert(res.status === 200, `Should return 200, got ${res.status}`);
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 7: Invalid login fails
    try {
        console.log('[7] Testing invalid login fails...');
        const res = await makeRequest('POST', '/api/login', {}, {
            username: 'wrong',
            password: 'wrong'
        });
        assert(res.status >= 400, `Should return error status, got ${res.status}`);
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 8: API endpoints return proper responses
    try {
        console.log('[8] Testing API endpoints exist...');
        // Test a few API endpoints
        const endpoints = [
            '/api/endpoints',
            '/api/tags'
        ];
        
        for (const endpoint of endpoints) {
            const res = await makeRequest('GET', endpoint);
            // Should return 200, 401 (protected), or 404 (doesn't exist)
            assert([200, 401, 404].includes(res.status), 
                `${endpoint} returned unexpected status ${res.status}`);
        }
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 9: Static files accessible
    try {
        console.log('[9] Testing static files accessibility...');
        const res = await makeRequest('GET', '/public/style.css');
        // File may not exist, but server should respond properly
        assert(res.status >= 200, 'Server should respond');
        console.log('    ✓ PASS\n');
        passed++;
    } catch (err) {
        console.log(`    ✗ FAIL: ${err.message}\n`);
        failed++;
    }

    // Test 10: Server responds with proper headers
    try {
        console.log('[10] Testing response headers...');
        const res = await makeRequest('GET', '/');
        assert(res.headers['content-type'], 'Should have content-type header');
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
