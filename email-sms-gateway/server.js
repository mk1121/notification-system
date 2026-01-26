const express = require('express');
require('dotenv').config();
const TeletalkSmsClient = require('./teletalkClient');
const EmailClient = require('./emailClient');

const app = express();
const port = process.env.PORT || 9090;

// Initialize Teletalk SMS Client
const smsClient = new TeletalkSmsClient({
    user: process.env.TELETALK_USER,
    userId: parseInt(process.env.TELETALK_USER_ID),
    encrKey: process.env.TELETALK_ENCR_KEY,
    password: process.env.TELETALK_PASSWORD,
    baseUrl: process.env.TELETALK_BASE_URL
});

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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Routes

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'SMS & Email Gateway is running',
        version: '1.0.0',
        services: {
            sms: 'enabled',
            email: 'enabled'
        }
    });
});

// Send SMS (single or multiple numbers)
app.get('/api/sms/send', async (req, res) => {
    try {
        const { to, text } = req.query;
        
        if (!to || !text) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'Missing required parameters: to and text'
            });
        }

        // Handle multiple numbers separated by comma
        const numbers = to.split(',').map(num => num.trim()).filter(num => num);
        
        if (numbers.length === 0) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'No valid phone numbers provided'
            });
        }

        const results = [];
        for (const number of numbers) {
            try {
                const response = await smsClient.sendSms(number, text, 'GENERAL');
                results.push({
                    number,
                    status: 'SUCCESS',
                    response
                });
            } catch (error) {
                results.push({
                    number,
                    status: 'ERROR',
                    error: error.message
                });
            }
        }
        
        res.json({
            status: 'OK',
            totalNumbers: numbers.length,
            results
        });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({
            status: 'ERROR',
            providerResponse: error.message
        });
    }
});

// Send SMS (POST - for batch sending)
app.post('/api/sms/send-batch', async (req, res) => {
    try {
        const { numbers, text } = req.body;
        
        if (!numbers || !text) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'Missing required parameters: numbers (array) and text'
            });
        }

        if (!Array.isArray(numbers) || numbers.length === 0) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'numbers must be a non-empty array'
            });
        }

        const results = [];
        for (const number of numbers) {
            try {
                const response = await smsClient.sendSms(number.toString().trim(), text, 'GENERAL');
                results.push({
                    number,
                    status: 'SUCCESS',
                    response
                });
            } catch (error) {
                results.push({
                    number,
                    status: 'ERROR',
                    error: error.message
                });
            }
        }
        
        const successCount = results.filter(r => r.status === 'SUCCESS').length;
        const failureCount = results.filter(r => r.status === 'ERROR').length;
        
        res.json({
            status: 'OK',
            summary: {
                totalNumbers: numbers.length,
                successful: successCount,
                failed: failureCount
            },
            results
        });
    } catch (error) {
        console.error('Error sending batch SMS:', error);
        res.status(500).json({
            status: 'ERROR',
            providerResponse: error.message
        });
    }
});

// Get balance
app.get('/api/sms/balance', async (req, res) => {
    try {
        const response = await smsClient.getBalance();
        
        res.json({
            status: 'OK',
            providerResponse: response
        });
    } catch (error) {
        console.error('Error getting balance:', error);
        res.status(500).json({
            status: 'ERROR',
            providerResponse: error.message
        });
    }
});

// ==================== EMAIL API ENDPOINTS ====================

// Send Email (single or multiple recipients)
app.post('/api/email/send', async (req, res) => {
    try {
        const { to, subject, text, html } = req.body;
        
        if (!to || !subject || !text) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'Missing required parameters: to, subject, and text'
            });
        }

        // Handle multiple emails separated by comma
        const emails = typeof to === 'string' 
            ? to.split(',').map(email => email.trim()).filter(email => email)
            : Array.isArray(to) ? to : [to];
        
        if (emails.length === 0) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'No valid email addresses provided'
            });
        }

        const results = [];
        for (const email of emails) {
            try {
                const response = await emailClient.sendEmail(email, subject, text, html);
                results.push({
                    email,
                    status: 'SUCCESS',
                    messageId: response.messageId
                });
            } catch (error) {
                results.push({
                    email,
                    status: 'ERROR',
                    error: error.message
                });
            }
        }
        
        const successCount = results.filter(r => r.status === 'SUCCESS').length;
        const failureCount = results.filter(r => r.status === 'ERROR').length;
        
        res.json({
            status: 'OK',
            summary: {
                totalEmails: emails.length,
                successful: successCount,
                failed: failureCount
            },
            results
        });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({
            status: 'ERROR',
            message: error.message
        });
    }
});

// Send Bulk Email
app.post('/api/email/send-batch', async (req, res) => {
    try {
        const { emails, subject, text, html } = req.body;
        
        if (!emails || !subject || !text) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'Missing required parameters: emails (array), subject, and text'
            });
        }

        if (!Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'emails must be a non-empty array'
            });
        }

        const results = await emailClient.sendBulkEmail(emails, subject, text, html);
        
        const successCount = results.filter(r => r.status === 'SUCCESS').length;
        const failureCount = results.filter(r => r.status === 'ERROR').length;
        
        res.json({
            status: 'OK',
            summary: {
                totalEmails: emails.length,
                successful: successCount,
                failed: failureCount
            },
            results
        });
    } catch (error) {
        console.error('Error sending batch email:', error);
        res.status(500).json({
            status: 'ERROR',
            message: error.message
        });
    }
});

// Verify Email Connection
app.get('/api/email/verify', async (req, res) => {
    try {
        const result = await emailClient.verifyConnection();
        res.json({
            status: result.success ? 'OK' : 'ERROR',
            ...result
        });
    } catch (error) {
        console.error('Error verifying email connection:', error);
        res.status(500).json({
            status: 'ERROR',
            message: error.message
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`\n========================================`);
    console.log(`  SMS & Email Gateway Server is running`);
    console.log(`  Port: ${port}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`========================================\n`);
    console.log(`SMS API Endpoints:`);
    console.log(`  GET  http://localhost:${port}/api/sms/send?to=<number>&text=<message>`);
    console.log(`       (Multiple numbers: to=08801234567,08809876543)`);
    console.log(`  POST http://localhost:${port}/api/sms/send-batch`);
    console.log(`       Body: {"numbers": ["08801234567", "08809876543"], "text": "Your message"}`);
    console.log(`  GET  http://localhost:${port}/api/sms/balance`);
    console.log(`\nEmail API Endpoints:`);
    console.log(`  POST http://localhost:${port}/api/email/send`);
    console.log(`       Body: {"to": "email@example.com", "subject": "Subject", "text": "Message"}`);
    console.log(`       (Multiple emails: "to": "email1@example.com,email2@example.com")`);
    console.log(`  POST http://localhost:${port}/api/email/send-batch`);
    console.log(`       Body: {"emails": ["email1@example.com", "email2@example.com"], "subject": "Subject", "text": "Message"}`);
    console.log(`  GET  http://localhost:${port}/api/email/verify`);
    console.log(`\n`);
});
