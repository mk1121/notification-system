const fs = require('fs');
const path = require('path');
const { fetchTransactions } = require('./api');
const { sendSMS } = require('./sms');
const { sendEmail } = require('./email');
const { getConfig } = require('./config-store');
const { CHECK_INTERVAL: DEFAULT_CHECK_INTERVAL } = require('./config');
const { logSmsSent, logEmailSent, logApiFailure, logApiRecovery, logAutoUnmute, log } = require('./logger');

const stateFile = path.join(__dirname, 'notification-state.json');

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading state file:', err.message);
  }
  return {
    mutePayment: false,
    muteApi: false,
    lastApiStatus: 'success',
    lastFailureMessage: '',
    processedPaymentIds: []
  };
}

function saveState(state) {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Error saving state file:', err.message);
  }
}

/**
 * Check API status and send notifications based on failure/success and mute state.
 */
async function checkAndNotify() {
  try {
    console.log(`\n[${new Date().toISOString()}] Starting transaction check...`);
    const config = getConfig();
    const { EMAIL_ADDRESSES, PHONE_NUMBERS, CONTROL_SERVER_URL, ENABLE_RECOVERY_EMAIL, ENABLE_SMS, ENABLE_EMAIL, ENABLE_MANUAL_MUTE } = config;
    const state = loadState();

    const result = await fetchTransactions();

    // Handle API failure
    if (!result.ok) {
      console.log(`[${new Date().toISOString()}] API failure detected: ${result.error || 'Unknown error'}`);
      logApiFailure(result.error || 'Unknown error', result.status);
      state.lastApiStatus = 'failure';
      state.lastFailureMessage = result.error || `HTTP ${result.status || 'N/A'}`;
      saveState(state);

      if (state.muteApi) {
        console.log(`[${new Date().toISOString()}] API alerts muted. Skipping failure notification.`);
        return;
      }

      const subject = `API FAILURE: ${result.status || 'No Status'}`;
      const muteLink = `${CONTROL_SERVER_URL}/mute/api`;
      const bodyText = ENABLE_MANUAL_MUTE
        ? `API failure detected. Status: ${result.status || 'N/A'}. Error: ${state.lastFailureMessage}.\n\nMute alerts: ${muteLink}`
        : `API failure detected. Status: ${result.status || 'N/A'}. Error: ${state.lastFailureMessage}.\n\nManual mute is disabled in settings.`;
      const bodyHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h2 { color: #d9534f; margin-top: 0; }
            .alert { background: #f8d7da; border-left: 4px solid #d9534f; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .details { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; font-family: monospace; font-size: 14px; }
            .button { display: inline-block; background: #d9534f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .button:hover { background: #c9302c; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>⚠️ API Service Failure</h2>
            <div class="alert">
              <strong>Your payment system API is currently unavailable.</strong>
            </div>
            <div class="details">
              <strong>Status:</strong> ${result.status || 'N/A'}<br>
              <strong>Error:</strong> ${state.lastFailureMessage}
            </div>
            <p>This notification is being sent to alert you of a critical service issue. Please check your API server status.</p>
            ${ENABLE_MANUAL_MUTE ? `
              <center>
                <a href="${muteLink}" class="button">Mute Failure Alerts</a>
              </center>
            ` : `
              <div class="alert" style="background:#f8f9fa;border-left-color:#adb5bd;color:#495057;">
                Manual mute is turned off in settings.
              </div>
            `}
            <div class="footer">
              <p>System Time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (!ENABLE_EMAIL) {
        console.log(`[${new Date().toISOString()}] Email alerts disabled. Skipping API failure email.`);
        return;
      }

      logEmailSent(EMAIL_ADDRESSES, subject);
      await sendEmail(EMAIL_ADDRESSES, subject, bodyText, bodyHtml);
      return;
    }

    // API success path
    if (state.lastApiStatus === 'failure' && ENABLE_RECOVERY_EMAIL) {
      if (!ENABLE_EMAIL) {
        console.log(`[${new Date().toISOString()}] Email alerts disabled. Skipping recovery email.`);
      } else {
      const recoverySubject = '✓ API RECOVERED';
      const recoveryBody = `API recovered at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}. Previous error: ${state.lastFailureMessage || 'N/A'}.`;
      const recoveryHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h2 { color: #28a745; margin-top: 0; }
            .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .details { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>✓ API Service Recovered</h2>
            <div class="success">
              <strong>Your payment system API is now online and working normally.</strong>
            </div>
            <div class="details">
              <p><strong>Recovered at:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</p>
              <p><strong>Previous issue:</strong> ${state.lastFailureMessage || 'N/A'}</p>
            </div>
            <p>All systems are back to normal. Payment monitoring has resumed.</p>
            <div class="footer">
              <p>No action required.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      logApiRecovery();
      logEmailSent(EMAIL_ADDRESSES, recoverySubject);
      await sendEmail(EMAIL_ADDRESSES, recoverySubject, recoveryBody, recoveryHtml);
      }
    }
    state.lastApiStatus = 'success';
    state.muteApi = false; // auto-unmute on recovery
    saveState(state);

    const data = result.data;
    if (!data || !data.items || data.items.length === 0) {
      console.log(`[${new Date().toISOString()}] No transactions found or empty response`);
      return;
    }

    // Payment notifications: notify on ALL transactions, auto-unmute on new payment IDs or time expiry
    const processed = new Set(state.processedPaymentIds || []);
    const hasNewPaymentId = data.items.some(item => !processed.has(item.payment_id));

    // Track payment IDs for auto-unmute logic
    data.items.forEach(item => processed.add(item.payment_id));
    state.processedPaymentIds = [...processed];

    // Check if time-based mute has expired
    if (state.mutePayment && state.mutePaymentUntil) {
      const now = new Date();
      const muteUntil = new Date(state.mutePaymentUntil);
      if (now >= muteUntil) {
        console.log(`[${new Date().toISOString()}] Payment mute timer expired -> auto-unmuting.`);
        logAutoUnmute('Payment alerts auto-unmuted: mute timer expired');
        state.mutePayment = false;
        state.mutePaymentUntil = null;
      }
    }

    if (state.mutePayment && hasNewPaymentId) {
      console.log(`[${new Date().toISOString()}] Payment alerts muted. New payment ID detected -> auto-unmuting to notify.`);
      logAutoUnmute('Payment alerts auto-unmuted: new payment detected');
      state.mutePayment = false;
      state.mutePaymentUntil = null;
    }
    saveState(state);

    if (state.mutePayment) {
      const message = 'Payment alerts muted. Skipping notification.';
      console.log(`[${new Date().toISOString()}] ${message}`);
      log('SYSTEM', message);
      return;
    }

    const smsMessage = `Payment notification: ${data.items.length} transactions detected. Please check the system.`;
    const transactionDetails = data.items
      .map((item, index) => `${index + 1}. Payment ID: ${item.payment_id}, Date: ${item.approval_date}`)
      .join('\n');
    const emailSubject = `💳 Payment Notification: ${data.items.length} Transactions`;
    const mutePaymentLinkUI = `${CONTROL_SERVER_URL}/mute/payment/ui`;
    const muteText = ENABLE_MANUAL_MUTE ? `Mute payment alerts (choose duration): ${mutePaymentLinkUI}` : 'Manual mute is currently disabled.';
    const emailBody = `Dear Admin,\n\nPayment transactions have been detected:\n\n${transactionDetails}\n\nTotal Transactions: ${data.items.length}\n\n${muteText}\n\nTimestamp: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h2 { color: #0275d8; margin-top: 0; }
          .alert { background: #d1ecf1; border-left: 4px solid #0275d8; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .transactions { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .transaction-item { padding: 8px; border-bottom: 1px solid #ddd; font-size: 14px; }
          .transaction-item:last-child { border-bottom: none; }
          .mute-section { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 4px; margin: 20px 0; text-align: center; }
          .mute-section h3 { margin-top: 0; color: #856404; }
          .button { display: inline-block; background: #0275d8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; text-align: center; font-size: 14px; }
          .button:hover { background: #025aa5; }
          .footer { font-size: 12px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>💳 Payment Transactions Detected</h2>
          <div class="alert">
            <strong>New payment activity has been detected in your system.</strong>
          </div>
          <div class="transactions">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Transaction Details:</p>
            ${data.items.map((item, index) => `
              <div class="transaction-item">
                <strong>${index + 1}.</strong> Payment ID: <code>${item.payment_id}</code><br>
                Date: ${item.approval_date}
              </div>
            `).join('')}
          </div>
          <p style="background: #e8f4f8; padding: 10px; border-radius: 4px; color: #333;">
            <strong>Total Transactions:</strong> ${data.items.length}
          </p>
          ${ENABLE_MANUAL_MUTE ? `
            <div class="mute-section">
              <h3>🔇 Mute Payment Alerts</h3>
              <p style="margin: 8px 0 16px 0; color: #555;">Click below to choose your own duration (minutes).</p>
              <a href="${mutePaymentLinkUI}" class="button">Open Mute Controls</a>
              <p style="font-size: 12px; color: #666; margin: 12px 0 0 0;">Alerts auto-resume when timer expires or a new payment is detected.</p>
            </div>
          ` : `
            <div class="mute-section" style="background:#f8f9fa;border-left-color:#adb5bd;">
              <h3 style="color:#495057;">Mute Controls Disabled</h3>
              <p style="margin: 0; color: #555;">Manual mute is turned off in settings.</p>
            </div>
          `}
          <div class="footer">
            <p>Sent: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</p>
            <p style="color: #bbb;">Payment Notification System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`[${new Date().toISOString()}] Sending payment notifications for ${data.items.length} transactions...`);
    if (ENABLE_SMS) {
      logSmsSent(PHONE_NUMBERS, smsMessage);
      await sendSMS(PHONE_NUMBERS, smsMessage);
    } else {
      console.log(`[${new Date().toISOString()}] SMS alerts disabled. Skipping SMS send.`);
    }

    if (ENABLE_EMAIL) {
      logEmailSent(EMAIL_ADDRESSES, emailSubject);
      await sendEmail(EMAIL_ADDRESSES, emailSubject, emailBody, emailHtml);
    } else {
      console.log(`[${new Date().toISOString()}] Email alerts disabled. Skipping email send.`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in checkAndNotify:`, error.message);
  }
}

/**
 * Start the scheduler
 */
function startScheduler() {
  const config = getConfig();
  const interval = config.CHECK_INTERVAL || DEFAULT_CHECK_INTERVAL;
  const state = loadState();
  console.log(`[${new Date().toISOString()}] Notification system started`);
  console.log(`Checking API every ${interval / 60000} minutes`);
  console.log(`API Endpoint: ${config.API_ENDPOINT}`);
  console.log(`SMS Recipients: ${config.PHONE_NUMBERS.join(', ')}`);
  console.log(`Email Recipients: ${config.EMAIL_ADDRESSES.join(', ')}`);
  console.log(`SMS enabled=${config.ENABLE_SMS}, Email enabled=${config.ENABLE_EMAIL}, Manual mute=${config.ENABLE_MANUAL_MUTE}`);
  console.log(`Initial state: API muted=${state.muteApi}, Payment muted=${state.mutePayment}`);
  
  // Run check immediately on startup
  checkAndNotify();
  
  // Then run every CHECK_INTERVAL
  setInterval(checkAndNotify, interval);
}

module.exports = {
  startScheduler,
  checkAndNotify
};
