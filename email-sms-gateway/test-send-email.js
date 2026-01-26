require('dotenv').config();
const EmailClient = require('./emailClient');

// Initialize Email Client
const emailClient = new EmailClient({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    fromEmail: process.env.EMAIL_FROM,
    fromName: process.env.EMAIL_FROM_NAME || 'SMS Gateway'
});

async function testEmailSend() {
    console.log('Testing Email Send...\n');
    
    try {
        // Test 1: Verify email connection
        console.log('1. Verifying email connection...');
        const verifyResult = await emailClient.verifyConnection();
        console.log('Result:', verifyResult);
        console.log('');
        
        if (!verifyResult.success) {
            console.error('Email connection failed. Please check your .env configuration.');
            return;
        }
        
        // Test 2: Send single email
        console.log('2. Sending single email...');
        const singleResult = await emailClient.sendEmail(
            'test@example.com',
            'Test Email from SMS Gateway',
            'This is a test email sent from the SMS Gateway API.',
            '<h1>Test Email</h1><p>This is a test email sent from the SMS Gateway API.</p>'
        );
        console.log('Result:', singleResult);
        console.log('');
        
        // Test 3: Send bulk emails
        console.log('3. Sending bulk emails...');
        const bulkResult = await emailClient.sendBulkEmail(
            ['test1@example.com', 'test2@example.com'],
            'Bulk Test Email',
            'This is a bulk test email.',
            '<p>This is a bulk test email.</p>'
        );
        console.log('Results:', bulkResult);
        console.log('');
        
        console.log('✅ Email tests completed successfully!');
    } catch (error) {
        console.error('❌ Error during email test:', error.message);
    }
}

testEmailSend();
