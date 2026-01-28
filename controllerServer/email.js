const axios = require('axios');
const { getConfig } = require('./config-store');
const consoleLog = require('./console-logger');

/**
 * Send email notification to email address
 * @param {string} emailAddress - Single email address to send to
 * @param {string} subject - Email subject
 * @param {string} text - Email body text
 * @param {string} [html] - Optional HTML body
 * @param {string} [emailEndpoint] - Optional email endpoint URL. If not provided, uses config
 */
async function sendEmail(emailAddress, subject, text, html, emailEndpoint) {
  try {
    const config = getConfig();
    
    // Use provided endpoint or fall back to config
    const endpoint = emailEndpoint || config.EMAIL_ENDPOINT;
    
    if (!endpoint) {
      consoleLog.error('Email endpoint not configured', 'EMAIL');
      throw new Error('Email endpoint not configured');
    }
    
    const payload = {
      to: emailAddress,
      subject,
      text
    };

    if (html) {
      payload.html = html;
    }

    // Prepare headers with API key if configured
    const headers = { 'Content-Type': 'application/json' };
    const apiKey = process.env.GATEWAY_API_KEY;
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    consoleLog.debug(`Sending email to ${emailAddress} via ${endpoint}`, 'EMAIL');
    const response = await axios.post(endpoint, payload, { headers });
    
    consoleLog.debug(`Email sent successfully to ${emailAddress}`, 'EMAIL');
    consoleLog.debug(`Email Response: ${JSON.stringify(response.data)}`, 'EMAIL');
    
    return response.data;
  } catch (error) {
    consoleLog.error(`Error sending email to ${emailAddress}: ${error.message}`, 'EMAIL', error);
    if (error.response) {
      consoleLog.error(`Email API Response: ${JSON.stringify(error.response.data)}`, 'EMAIL');
    }
    throw error;
  }
}

module.exports = {
  sendEmail
};
