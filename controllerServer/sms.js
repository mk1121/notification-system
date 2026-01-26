const axios = require('axios');
const { getConfig } = require('./config-store');

/**
 * Send SMS notification to multiple phone numbers
 * @param {Array} phoneNumbers - List of phone numbers
 * @param {string} message - Message text to send
 */
async function sendSMS(phoneNumbers, message) {
  try {
    const config = getConfig();
    const { SMS_ENDPOINT } = config;
    const recipients = phoneNumbers && phoneNumbers.length ? phoneNumbers : config.PHONE_NUMBERS;
    const phoneNumbersString = recipients.join(',');
    const encodedMessage = encodeURIComponent(message);
    
    const url = `${SMS_ENDPOINT}?to=${phoneNumbersString}&text=${encodedMessage}`;
    
    const response = await axios.get(url);
    
    console.log(`[${new Date().toISOString()}] SMS sent successfully to ${phoneNumbersString}`);
    console.log('SMS Response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending SMS:`, error.message);
    if (error.response) {
      console.error('SMS API Response:', error.response.data);
    }
    throw error;
  }
}

module.exports = {
  sendSMS
};
