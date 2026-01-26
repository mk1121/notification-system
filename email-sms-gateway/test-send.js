/**
 * Test script to send SMS to specific number
 * Usage: node test-send.js
 */

require('dotenv').config();
const TeletalkSmsClient = require('./teletalkClient');

// Initialize client
const client = new TeletalkSmsClient({
    user: process.env.TELETALK_USER,
    userId: parseInt(process.env.TELETALK_USER_ID),
    encrKey: process.env.TELETALK_ENCR_KEY,
    password: process.env.TELETALK_PASSWORD,
    baseUrl: process.env.TELETALK_BASE_URL
});

// =============================================
// TEST CONFIGURATION
// =============================================
const TEST_NUMBER = '01700000000';  // Change this to your test number
const TEST_MESSAGE = 'Test SMS from Node.js Gateway';
// =============================================

async function testSendSms() {
    console.log('\n========================================');
    console.log('  Testing SMS Send');
    console.log('========================================');
    console.log(`To: ${TEST_NUMBER}`);
    console.log(`Message: ${TEST_MESSAGE}`);
    console.log('========================================\n');

    try {
        const response = await client.sendSms(TEST_NUMBER, TEST_MESSAGE, 'GENERAL');
        console.log('\n✓ SMS sent successfully!');
        console.log('Provider Response:', response);
    } catch (error) {
        console.error('\n✗ Error sending SMS:');
        console.error(error.message);
    }
}

async function testBalance() {
    console.log('\n========================================');
    console.log('  Testing Balance Check');
    console.log('========================================\n');

    try {
        const response = await client.getBalance();
        console.log('\n✓ Balance retrieved successfully!');
        console.log('Provider Response:', response);
    } catch (error) {
        console.error('\n✗ Error getting balance:');
        console.error(error.message);
    }
}

// Run tests
async function runTests() {
    console.log('\n🚀 Starting SMS Gateway Tests...\n');
    
    // Test 1: Check balance
    await testBalance();
    
    // Wait a bit between calls
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Send SMS
    await testSendSms();
    
    console.log('\n\n✅ All tests completed!\n');
}

// Run the tests
runTests().catch(err => {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
});
