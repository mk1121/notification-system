const axios = require('axios');
const { getConfig } = require('./config-store');
const consoleLog = require('./console-logger');

/**
 * Send SMS notification to phone number(s)
 * @param {string} phoneNumber - Single phone number to send to
 * @param {string} message - Message text to send
 * @param {string} [smsEndpoint] - Optional SMS endpoint URL. If not provided, uses config
 */
async function sendSMS(phoneNumber, message, smsEndpoint) {
  try {
    const config = getConfig();
    
    // Use provided endpoint or fall back to config
    const endpoint = smsEndpoint || config.SMS_ENDPOINT;
    
    if (!endpoint) {
      consoleLog.error('SMS endpoint not configured', 'SMS');
      throw new Error('SMS endpoint not configured');
    }
    
    const encodedMessage = encodeURIComponent(message);
    const url = `${endpoint}?to=${phoneNumber}&text=${encodedMessage}`;
    
    // Prepare headers with API key if configured
    const headers = {};
    const apiKey = process.env.GATEWAY_API_KEY;
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    
    consoleLog.debug(`Sending SMS to ${phoneNumber} via ${endpoint}`, 'SMS');
    const response = await axios.get(url, { headers });
    
    consoleLog.debug(`SMS sent successfully to ${phoneNumber}`, 'SMS');
    consoleLog.debug(`SMS Response: ${JSON.stringify(response.data)}`, 'SMS');
    
    return response.data;
  } catch (error) {
    consoleLog.error(`Error sending SMS to ${phoneNumber}: ${error.message}`, 'SMS', error);
    if (error.response) {
      consoleLog.error(`SMS API Response: ${JSON.stringify(error.response.data)}`, 'SMS');
    }
    throw error;
  }
}

module.exports = {
  sendSMS
};
