const axios = require('axios');
const { getConfig } = require('./config-store');

/**
 * Send email notification to multiple email addresses
 * @param {Array} emailAddresses - List of email addresses
 * @param {string} subject - Email subject
 * @param {string} text - Email body text
 * @param {string} [html] - Optional HTML body
 */
async function sendEmail(emailAddresses, subject, text, html) {
  try {
    const config = getConfig();
    const recipients = emailAddresses && emailAddresses.length ? emailAddresses : config.EMAIL_ADDRESSES;
    const emailAddressesString = recipients.join(',');
    
    const payload = {
      to: emailAddressesString,
      subject,
      text
    };

    if (html) {
      payload.html = html;
    }

    const response = await axios.post(config.EMAIL_ENDPOINT, payload);
    
    console.log(`[${new Date().toISOString()}] Email sent successfully to ${emailAddressesString}`);
    console.log('Email Response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending email:`, error.message);
    if (error.response) {
      console.error('Email API Response:', error.response.data);
    }
    throw error;
  }
}

module.exports = {
  sendEmail
};
