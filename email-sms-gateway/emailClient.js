const nodemailer = require('nodemailer');

class EmailClient {
    constructor(config) {
        this.config = config;
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        try {
            this.transporter = nodemailer.createTransport({
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure, // true for 465, false for other ports
                auth: {
                    user: this.config.user,
                    pass: this.config.password
                }
            });
            console.log('Email transporter initialized successfully');
        } catch (error) {
            console.error('Error initializing email transporter:', error);
            throw error;
        }
    }

    async sendEmail(to, subject, text, html = null) {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }

            const mailOptions = {
                from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
                to: Array.isArray(to) ? to.join(', ') : to,
                subject: subject,
                text: text
            };

            // Add HTML if provided
            if (html) {
                mailOptions.html = html;
            }

            const info = await this.transporter.sendMail(mailOptions);
            
            return {
                success: true,
                messageId: info.messageId,
                response: info.response
            };
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    async sendBulkEmail(recipients, subject, text, html = null) {
        const results = [];
        
        for (const recipient of recipients) {
            try {
                const result = await this.sendEmail(recipient, subject, text, html);
                results.push({
                    email: recipient,
                    status: 'SUCCESS',
                    messageId: result.messageId
                });
            } catch (error) {
                results.push({
                    email: recipient,
                    status: 'ERROR',
                    error: error.message
                });
            }
        }
        
        return results;
    }

    async verifyConnection() {
        try {
            await this.transporter.verify();
            return { success: true, message: 'Email server connection verified' };
        } catch (error) {
            console.error('Email server connection failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = EmailClient;
