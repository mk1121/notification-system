const fs = require('fs');
const path = require('path');
const { fetchTransactions, mapItemsFromData } = require('./api');
const { sendSMS } = require('./sms');
const { sendEmail } = require('./email');
const { getConfig } = require('./config-store');
const { getEndpointConfig, getActiveTags } = require('./endpoints-store');
const { logSmsSent, logEmailSent, logApiFailure, logApiRecovery, logAutoUnmute, log } = require('./logger');
const consoleLog = require('./console-logger');

const stateFile = path.join(__dirname, 'notification-state.json');

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      // Ensure endpoints state exists
      if (!state.endpoints) {
        state.endpoints = {};
      }
      return state;
    }
  } catch (err) {
    console.error('Error reading state file:', err.message);
  }
  return {
    mutePayment: false,
    muteApi: false,
    lastApiStatus: 'success',
    lastFailureMessage: '',
    processedPaymentIds: [],
    endpoints: {} // endpoint-specific states
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
 * Check API status and send notifications for a specific endpoint
 * @param {string} endpointTag - The endpoint tag to check
 */
async function checkAndNotifyEndpoint(endpointTag) {
  try {
    consoleLog.debug('Starting transaction check', endpointTag);

    // ========================================
    // STEP 1: VALIDATE ENDPOINT CONFIGURATION
    // ========================================
    let endpointConfig;
    try {
      endpointConfig = getEndpointConfig(endpointTag);
    } catch (err) {
      consoleLog.error(`Failed to get config: ${err.message}`, endpointTag);
      log('SYSTEM', `[${endpointTag}] Endpoint config error: ${err.message}`);
      return;
    }

    // Validate required config fields
    if (!endpointConfig.apiEndpoint) {
      consoleLog.error('Missing API endpoint in configuration', endpointTag);
      log('SYSTEM', `[${endpointTag}] Configuration error: Missing API endpoint`);
      return;
    }

    const {
      smsEndpoint,
      emailEndpoint,
      phoneNumbers = [],
      emailAddresses = [],
      enableSms = false,
      enableEmail = false,
      enableRecoveryEmail = false
    } = endpointConfig;

    // Validate notification channels are configured
    const notificationChannelsConfigured =
      (enableSms && phoneNumbers.length > 0 && smsEndpoint) ||
      (enableEmail && emailAddresses.length > 0 && emailEndpoint);

    if (!notificationChannelsConfigured) {
      consoleLog.warn('No notification channels configured (SMS/Email disabled or missing recipients)', endpointTag);
      log('SYSTEM', `[${endpointTag}] Warning: No notification channels configured`);
      return;
    }

    consoleLog.debug('Endpoint configuration validated', endpointTag);

    // ========================================
    // STEP 2: FETCH AND MAP DATA
    // ========================================
    const result = await fetchTransactions(endpointConfig);

    if (!result.ok) {
      consoleLog.error(`API failure detected: ${result.error || 'Unknown error'}`, endpointTag);
      logApiFailure(`[${endpointTag}] ${result.error || 'Unknown error'}`, result.status);

      // Handle API failure notification
      await handleApiFailure(endpointTag, endpointConfig, result);
      return;
    }

    // Map items from response
    const items = mapItemsFromData(result.data, endpointConfig);
    consoleLog.debug(`Found ${items.length} transaction(s)`, endpointTag);

    // ========================================
    // STEP 3: LOAD AND VALIDATE STATE
    // ========================================
    const state = loadState();

    // Initialize endpoint-specific state if not exists
    if (!state.endpoints[endpointTag]) {
      state.endpoints[endpointTag] = {
        mutePayment: false,
        muteApi: false,
        lastApiStatus: 'success',
        lastFailureMessage: '',
        processedPaymentIds: []
      };
    }

    const endpointState = state.endpoints[endpointTag];

    // Handle API recovery
    if (endpointState.lastApiStatus === 'failure') {
      consoleLog.success('API recovered!', endpointTag);
      endpointState.lastApiStatus = 'success';
      endpointState.lastFailureMessage = '';
      saveState(state);
      logApiRecovery(`[${endpointTag}] API is now working`);

      if (enableRecoveryEmail && emailAddresses.length > 0) {
        await sendApiRecoveryEmail(endpointTag, emailAddresses, emailEndpoint);
      }
    }

    // Initialize mutedPaymentIds if not exists
    if (!endpointState.mutedPaymentIds) {
      endpointState.mutedPaymentIds = [];
    }

    // ========================================
    // STEP 4: CHECK MUTE/UNMUTE STATUS
    // ========================================
    consoleLog.debug('Checking mute status', endpointTag);

    // Check if there are new item IDs (not in mutedPaymentIds)
    const newPaymentIds = items.filter(item => !endpointState.mutedPaymentIds.includes(item.id)).map(item => item.id);

    // Auto-unmute if new item(s) detected
    if (endpointState.mutePayment && newPaymentIds.length > 0) {
      console.log(`[${endpointTag}] New item(s) detected (${newPaymentIds.join(', ')}). Auto-unmuting.`);
      endpointState.mutePayment = false;
      endpointState.mutedPaymentIds = []; // Clear muted IDs when new item arrives
      saveState(state);
      logAutoUnmute(`[${endpointTag}] New item(s): ${newPaymentIds.join(', ')}`);
    }

    // Check for mute expiry
    if (endpointState.mutePayment && endpointState.mutePaymentUntil) {
      if (new Date() > new Date(endpointState.mutePaymentUntil)) {
        consoleLog.info('Mute timer expired. Auto-unmuting.', endpointTag, true);
        endpointState.mutePayment = false;
        endpointState.mutedPaymentIds = [];
        delete endpointState.mutePaymentUntil;
        saveState(state);
        logAutoUnmute(`[${endpointTag}] Mute timer expired`);
      }
    }

    // If still muted, skip notifications
    if (endpointState.mutePayment) {
      consoleLog.debug('Notifications muted. Skipping send.', endpointTag);
      return;
    }

    consoleLog.debug('Mute checks passed', endpointTag);

    // ========================================
    // STEP 5: FILTER ITEMS FOR NOTIFICATION
    // ========================================
    const paymentsToNotify = items.filter(item => !endpointState.mutedPaymentIds.includes(item.id));

    if (paymentsToNotify.length === 0) {
      consoleLog.debug('No new items to notify', endpointTag);
      return;
    }

    consoleLog.debug(`Preparing to send notifications for ${paymentsToNotify.length} item(s)`, endpointTag);

    // ========================================
    // STEP 6: SEND NOTIFICATIONS
    // ========================================
    const CONTROL_SERVER_URL = require('./config').CONTROL_SERVER_URL;
    const muteLink = `${CONTROL_SERVER_URL}/mute/payment/ui?endpoint=${endpointTag}`;

    await sendNotifications(endpointTag, paymentsToNotify, endpointConfig, muteLink);

    // ========================================
    // STEP 7: UPDATE STATE WITH PROCESSED ITEMS
    // ========================================
    paymentsToNotify.forEach(item => {
      if (!endpointState.processedPaymentIds) {
        endpointState.processedPaymentIds = [];
      }
      if (!endpointState.processedPaymentIds.includes(item.id)) {
        endpointState.processedPaymentIds.push(item.id);
      }
    });
    saveState(state);

    consoleLog.debug('Notifications sent successfully', endpointTag);

    // ========================================
    // STEP 8: RESCHEDULE WITH CURRENT INTERVAL
    // ========================================
    // After notification, check the current interval from config and reschedule
    rescheduleEndpointCheck(endpointTag);

  } catch (err) {
    consoleLog.error(`Error in checkAndNotifyEndpoint: ${err.message}`, endpointTag, err);
    log('SYSTEM', `[${endpointTag}] Error: ${err.message}`);

    // Even on error, reschedule the check
    rescheduleEndpointCheck(endpointTag);
  }
}

/**
 * Handle API failure and send failure notification
 */
async function handleApiFailure(endpointTag, endpointConfig, result) {
  const state = loadState();
  const endpointState = state.endpoints[endpointTag];

  endpointState.lastApiStatus = 'failure';
  endpointState.lastFailureMessage = result.error || `HTTP ${result.status || 'N/A'}`;
  saveState(state);

  const { enableManualMute, enableSms, phoneNumbers = [], enableEmail, emailAddresses = [], smsEndpoint, emailEndpoint } = endpointConfig;
  const CONTROL_SERVER_URL = require('./config').CONTROL_SERVER_URL;

  if (endpointState.muteApi) {
    console.log(`[${endpointTag}] API alerts muted. Skipping failure notification.`);
    return;
  }

  const muteLink = `${CONTROL_SERVER_URL}/mute/api?endpoint=${endpointTag}`;
  const bodyText = `[${endpointTag}] API failure detected. Status: ${result.status || 'N/A'}. Error: ${endpointState.lastFailureMessage}.`;

  const bodyHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f0f4f8;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background:white;padding:30px;border-radius:10px;">
        <div style="background:#dc3545;color:white;padding:4px 12px;border-radius:12px;font-size:12px;display:inline-block;margin-bottom:10px;">Endpoint: ${endpointTag}</div>
        <h2 style="color:#dc3545;margin-top:0;">⚠️ API Service Failure</h2>
        <div style="background:#f8d7da;border-left:4px solid #dc3545;padding:15px;margin:20px 0;border-radius:4px;">
          <strong>Status:</strong> ${result.status || 'N/A'}<br>
          <strong>Error:</strong> ${endpointState.lastFailureMessage}<br>
          <strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}
        </div>
        ${enableManualMute ? `<a href="${muteLink}" style="display:inline-block;background:#dc3545;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">Mute Alerts</a>` : ''}
      </div>
    </body>
    </html>
  `;

  if (enableSms && phoneNumbers.length > 0 && smsEndpoint) {
    for (const phone of phoneNumbers) {
      try {
        await sendSMS(phone, bodyText, smsEndpoint);
        logSmsSent(phone, `[${endpointTag}] API failure alert`);
      } catch (err) {
        console.error(`[${endpointTag}] Failed to send SMS: ${err.message}`);
      }
    }
  }

  if (enableEmail && emailAddresses.length > 0 && emailEndpoint) {
    for (const email of emailAddresses) {
      try {
        await sendEmail(email, `API FAILURE [${endpointTag}]`, bodyText, bodyHtml, emailEndpoint);
        logEmailSent(email, `[${endpointTag}] API failure alert`);
      } catch (err) {
        console.error(`[${endpointTag}] Failed to send Email: ${err.message}`);
      }
    }
  }
}

/**
 * Send API recovery email notification
 */
async function sendApiRecoveryEmail(endpointTag, emailAddresses, emailEndpoint) {
  const subject = `API RECOVERED [${endpointTag}]`;
  const bodyText = `[${endpointTag}] API service is now working normally.`;
  const bodyHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f0f4f8;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background:white;padding:30px;border-radius:10px;">
        <div style="background:#28a745;color:white;padding:4px 12px;border-radius:12px;font-size:12px;display:inline-block;margin-bottom:10px;">Endpoint: ${endpointTag}</div>
        <h2 style="color:#28a745;margin-top:0;">✅ API Service Recovered</h2>
        <div style="background:#d4edda;border-left:4px solid #28a745;padding:15px;margin:20px 0;border-radius:4px;">
          The API endpoint is now responding normally.
        </div>
      </div>
    </body>
    </html>
  `;

  for (const email of emailAddresses) {
    try {
      await sendEmail(email, subject, bodyText, bodyHtml, emailEndpoint);
      logEmailSent(email, `[${endpointTag}] API recovery notification`);
    } catch (err) {
      console.error(`[${endpointTag}] Failed to send recovery email: ${err.message}`);
    }
  }
}

/**
 * Send notifications (SMS and Email) for detected items
 */
async function sendNotifications(endpointTag, paymentsToNotify, endpointConfig, muteLink) {
  const { enableSms, phoneNumbers = [], enableEmail, emailAddresses = [], enableManualMute, smsEndpoint, emailEndpoint } = endpointConfig;

  consoleLog.debug(`Items to notify: ${paymentsToNotify.length}`, endpointTag);
  if (consoleLog.getEnvironment().isDevelopment) {
    paymentsToNotify.forEach(p => consoleLog.debug(`  - ${p.id}`, endpointTag));
  }

  // Create combined SMS message
  const smsText = `[${endpointTag}] ${paymentsToNotify.length} item(s) detected`;

  // Create combined Email subject
  const emailSubject = `[${endpointTag}] ${paymentsToNotify.length} item(s) detected`;

  // Create combined Email body (text format)
  let emailBodyText = `[${endpointTag}] Detected ${paymentsToNotify.length} item(s):\n\n`;
  paymentsToNotify.forEach((item, index) => {
    emailBodyText += `${index + 1}. Item ID: ${item.id}\n`;
    emailBodyText += `   Time: ${item.timestamp || 'N/A'}\n`;
    if (item.title) emailBodyText += `   Title: ${item.title}\n`;
    if (item.details) emailBodyText += `   Details: ${item.details}\n`;
    emailBodyText += '\n';
  });
  if (enableManualMute) {
    emailBodyText += `\nMute these items: ${muteLink}`;
  }

  // Create combined Email body (HTML format)
  let paymentRows = '';
  paymentsToNotify.forEach((item, index) => {
    paymentRows += `
      <div style="background:#e9f5ff;border-left:4px solid #0275d8;padding:15px;margin:10px 0;border-radius:4px;">
        <p style="margin:5px 0;"><strong>Item #${index + 1}</strong></p>
        <p style="margin:5px 0;"><strong>ID:</strong> ${item.id}</p>
        <p style="margin:5px 0;"><strong>Timestamp:</strong> ${item.timestamp || 'N/A'}</p>
        ${item.title ? `<p style="margin:5px 0;"><strong>Title:</strong> ${item.title}</p>` : ''}
        ${item.details ? `<p style="margin:5px 0;"><strong>Details:</strong> ${item.details}</p>` : ''}
      </div>
    `;
  });

  const emailBodyHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f0f4f8;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background:white;padding:30px;border-radius:10px;">
        <div style="display:inline-block;background:#0275d8;color:white;padding:4px 12px;border-radius:12px;font-size:12px;margin-bottom:10px;">Endpoint: ${endpointTag}</div>
        <h2 style="color:#0275d8;margin-top:0;">📦 ${paymentsToNotify.length} Item(s) Detected</h2>
        <p style="color:#666;">Total items: <strong>${paymentsToNotify.length}</strong></p>
        ${paymentRows}
        ${enableManualMute ? `<a href="${muteLink}" style="display:inline-block;background:#0275d8;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;margin:20px 0;">Mute These Items</a>` : ''}
      </div>
    </body>
    </html>
  `;

  // Send SMS
  if (enableSms && phoneNumbers.length > 0 && smsEndpoint) {
    consoleLog.debug(`Sending SMS for ${paymentsToNotify.length} item(s)`, endpointTag);
    for (const phone of phoneNumbers) {
      try {
        await sendSMS(phone, smsText, smsEndpoint);
        logSmsSent(phone, `[${endpointTag}] ${paymentsToNotify.length} item(s) detected`);
        consoleLog.debug(`SMS sent to ${phone}`, endpointTag);
      } catch (err) {
        consoleLog.error(`Failed to send SMS to ${phone}: ${err.message}`, endpointTag);
      }
    }
  } else {
    consoleLog.debug('SMS not sent - SMS disabled or no recipients', endpointTag);
  }

  // Send Email
  if (enableEmail && emailAddresses.length > 0 && emailEndpoint) {
    consoleLog.debug(`Sending Email for ${paymentsToNotify.length} item(s)`, endpointTag);
    for (const email of emailAddresses) {
      try {
        await sendEmail(email, emailSubject, emailBodyText, emailBodyHtml, emailEndpoint);
        logEmailSent(email, `[${endpointTag}] ${paymentsToNotify.length} item(s) detected`);
        consoleLog.debug(`Email sent to ${email}`, endpointTag);
      } catch (err) {
        consoleLog.error(`Failed to send Email to ${email}: ${err.message}`, endpointTag);
      }
    }
  } else {
    consoleLog.debug('Email not sent - Email disabled or no recipients', endpointTag);
  }
}

/**
 * Check API status and send notifications (legacy - uses active config)        }
      }

      return;
    }

    // API is working - check for recovery
    if (endpointState.lastApiStatus === 'failure') {
      console.log(`[${endpointTag}] API recovered from failure`);
      logApiRecovery(`[${endpointTag}] API service recovered`);
      endpointState.lastApiStatus = 'success';
      endpointState.lastFailureMessage = '';
      endpointState.muteApi = false;
      saveState(state);

      if (enableRecoveryEmail && enableEmail && emailAddresses.length > 0 && emailEndpoint) {
        const subject = `API RECOVERED [${endpointTag}]`;
        const bodyText = `[${endpointTag}] Good news! The API is working again.`;
        const bodyHtml = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"></head>
          <body style="font-family:Arial,sans-serif;background:#f0f4f8;padding:20px;">
            <div style="max-width:600px;margin:0 auto;background:white;padding:30px;border-radius:10px;">
              <div style="display:inline-block;background:#28a745;color:white;padding:4px 12px;border-radius:12px;font-size:12px;margin-bottom:10px;">Endpoint: ${endpointTag}</div>
              <h2 style="color:#28a745;margin-top:0;">✅ API Service Recovered</h2>
              <div style="background:#d4edda;border-left:4px solid #28a745;padding:15px;margin:20px 0;border-radius:4px;">
                The API endpoint is now responding normally.
              </div>
              <p style="color:#666;"><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</p>
            </div>
          </body>
          </html>
        `;

        for (const email of emailAddresses) {
          await sendEmail(email, subject, bodyText, bodyHtml, emailEndpoint);
          logEmailSent(email, `[${endpointTag}] API recovery notification`);
        }
      }
    }

    // Map items from response
    const items = mapItemsFromData(result.data, endpointConfig);
    console.log(`[${endpointTag}] Found ${items.length} transaction(s)`);

    // Initialize mutedPaymentIds if not exists
    if (!endpointState.mutedPaymentIds) {
      endpointState.mutedPaymentIds = [];
    }

    // Check if there are new item IDs (not in mutedPaymentIds)
    const newPaymentIds = items.filter(item => !endpointState.mutedPaymentIds.includes(item.id)).map(item => item.id);

    // Auto-unmute if new item(s) detected
    if (endpointState.mutePayment && newPaymentIds.length > 0) {
      console.log(`[${endpointTag}] New item(s) detected (${newPaymentIds.join(', ')}). Auto-unmuting.`);
      endpointState.mutePayment = false;
      endpointState.mutedPaymentIds = []; // Clear muted IDs when new item arrives
      saveState(state);
      logAutoUnmute(`[${endpointTag}] New item(s): ${newPaymentIds.join(', ')}`);
    }

    // Check for payment mute expiry
    if (endpointState.mutePayment && endpointState.mutePaymentUntil) {
      if (new Date() > new Date(endpointState.mutePaymentUntil)) {
        console.log(`[${endpointTag}] Payment mute expired. Auto-unmuting.`);
        endpointState.mutePayment = false;
        endpointState.mutedPaymentIds = [];
        delete endpointState.mutePaymentUntil;
        saveState(state);
        logAutoUnmute(`[${endpointTag}] Mute timer expired`);
      }
    }

    if (endpointState.mutePayment) {
      console.log(`[${endpointTag}] Payment alerts muted. Skipping notifications.`);
      return;
    }

    // Collect all payments (not just new, but exclude muted IDs)
    const paymentsToNotify = items.filter(item => !endpointState.mutedPaymentIds.includes(item.id));

    if (paymentsToNotify.length === 0) {
      console.log(`[${endpointTag}] No payments to notify (all are muted)`);
      return;
    }

    console.log(`[${endpointTag}] Items to notify: ${paymentsToNotify.length}`);
    paymentsToNotify.forEach(p => console.log(`  - ${p.id}`));

    const muteLink = `${CONTROL_SERVER_URL}/mute/payment/ui?endpoint=${endpointTag}`;

    // Create combined SMS message (short format with item count)
    const smsText = `[${endpointTag}] ${paymentsToNotify.length} item(s) detected`;

    // Create combined Email subject
    const emailSubject = `[${endpointTag}] ${paymentsToNotify.length} item(s) detected`;

    // Create combined Email body (text format)
    let emailBodyText = `[${endpointTag}] Detected ${paymentsToNotify.length} item(s):\n\n`;
    paymentsToNotify.forEach((item, index) => {
      emailBodyText += `${index + 1}. Item ID: ${item.id}\n`;
      emailBodyText += `   Time: ${item.timestamp || 'N/A'}\n`;
      if (item.title) emailBodyText += `   Title: ${item.title}\n`;
      if (item.details) emailBodyText += `   Details: ${item.details}\n`;
      emailBodyText += '\n';
    });
    if (enableManualMute) {
      emailBodyText += `\nMute these items: ${muteLink}`;
    }

    // Create combined Email body (HTML format)
    let paymentRows = '';
    paymentsToNotify.forEach((item, index) => {
      paymentRows += `
        <div style="background:#e9f5ff;border-left:4px solid #0275d8;padding:15px;margin:10px 0;border-radius:4px;">
          <p style="margin:5px 0;"><strong>Item #${index + 1}</strong></p>
          <p style="margin:5px 0;"><strong>ID:</strong> ${item.id}</p>
          <p style="margin:5px 0;"><strong>Timestamp:</strong> ${item.timestamp || 'N/A'}</p>
          ${item.title ? `<p style="margin:5px 0;"><strong>Title:</strong> ${item.title}</p>` : ''}
          ${item.details ? `<p style="margin:5px 0;"><strong>Details:</strong> ${item.details}</p>` : ''}
        </div>
      `;
    });

    const emailBodyHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif;background:#f0f4f8;padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:white;padding:30px;border-radius:10px;">
          <div style="display:inline-block;background:#0275d8;color:white;padding:4px 12px;border-radius:12px;font-size:12px;margin-bottom:10px;">Endpoint: ${endpointTag}</div>
          <h2 style="color:#0275d8;margin-top:0;">📦 ${paymentsToNotify.length} Item(s) Detected</h2>
          <p style="color:#666;">Total items: <strong>${paymentsToNotify.length}</strong></p>
          ${paymentRows}
          ${enableManualMute ? `<a href="${muteLink}" style="display:inline-block;background:#0275d8;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;margin:20px 0;">Mute These Items</a>` : ''}
        </div>
      </body>
      </html>
    `;

    // Send SMS (one message with item count)
    if (enableSms && phoneNumbers.length > 0 && smsEndpoint) {
      console.log(`[${endpointTag}] Sending combined SMS for ${paymentsToNotify.length} item(s)...`);
      for (const phone of phoneNumbers) {
        try {
          await sendSMS(phone, smsText, smsEndpoint);
          logSmsSent(phone, `[${endpointTag}] ${paymentsToNotify.length} item(s) detected`);
          console.log(`[${endpointTag}] ✓ Combined SMS sent to ${phone}`);
        } catch (err) {
          console.error(`[${endpointTag}] ✗ Failed to send SMS to ${phone}:`, err.message);
        }
      }
    } else {
      console.log(`[${endpointTag}] SMS not sent - enableSms: ${enableSms}, phones: ${phoneNumbers.length}, endpoint: ${!!smsEndpoint}`);
    }

    // Send Email (one email with all item details)
    if (enableEmail && emailAddresses.length > 0 && emailEndpoint) {
      console.log(`[${endpointTag}] Sending combined Email for ${paymentsToNotify.length} item(s)...`);
      for (const email of emailAddresses) {
        try {
          await sendEmail(email, emailSubject, emailBodyText, emailBodyHtml, emailEndpoint);
          logEmailSent(email, `[${endpointTag}] ${paymentsToNotify.length} item(s) detected`);
          console.log(`[${endpointTag}] ✓ Combined Email sent to ${email}`);
        } catch (err) {
          console.error(`[${endpointTag}] ✗ Failed to send Email to ${email}:`, err.message);
        }
      }
    } else {
      console.log(`[${endpointTag}] Email not sent - enableEmail: ${enableEmail}, addresses: ${emailAddresses.length}, endpoint: ${!!emailEndpoint}`);
    }

  } catch (error) {
    console.error(`[${endpointTag}] Error in checkAndNotifyEndpoint:`, error);
    log('SYSTEM', `[${endpointTag}] Scheduler error: ${error.message}`);
  }
}

/**
 * Check API status and send notifications (legacy - uses active config)
 */
async function checkAndNotify() {
  try {
    console.log(`\n[${new Date().toISOString()}] Starting transaction check...`);
    const config = getConfig();
    const { EMAIL_ADDRESSES, PHONE_NUMBERS, CONTROL_SERVER_URL, ENABLE_RECOVERY_EMAIL, ENABLE_SMS, ENABLE_EMAIL, ENABLE_MANUAL_MUTE, ACTIVE_CONFIG_TAG } = config;
    const configTag = ACTIVE_CONFIG_TAG || 'default';
    const state = loadState();

    const result = await fetchTransactions();

    // Handle API failure
    if (!result.ok) {
      console.log(`[${new Date().toISOString()}] API failure detected: ${result.error || 'Unknown error'}`);
      logApiFailure(`[${configTag}] ${result.error || 'Unknown error'}`, result.status);
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
        ? `[${configTag}] API failure detected. Status: ${result.status || 'N/A'}. Error: ${state.lastFailureMessage}.\n\nMute alerts: ${muteLink}`
        : `[${configTag}] API failure detected. Status: ${result.status || 'N/A'}. Error: ${state.lastFailureMessage}.\n\nManual mute is disabled in settings.`;
      const bodyHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h2 { color: #d9534f; margin-top: 0; }
            .badge { display: inline-block; background: #6c757d; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-bottom: 10px; }
            .alert { background: #f8d7da; border-left: 4px solid #d9534f; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .details { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; font-family: monospace; font-size: 14px; }
            .button { display: inline-block; background: #d9534f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .button:hover { background: #c9302c; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">Config: ${configTag}</div>
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
        const recoveryBody = `[${configTag}] API recovered at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}. Previous error: ${state.lastFailureMessage || 'N/A'}.`;
        const recoveryHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h2 { color: #28a745; margin-top: 0; }
            .badge { display: inline-block; background: #6c757d; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-bottom: 10px; }
            .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .details { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="badge">Config: ${configTag}</div>
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

    const raw = result.data;
    const items = mapItemsFromData(raw);
    if (!items || items.length === 0) {
      console.log(`[${new Date().toISOString()}] No items found or empty response`);
      return;
    }

    // Notifications: notify on ALL items, auto-unmute on new IDs or time expiry
    const processed = new Set(state.processedPaymentIds || []);
    const hasNewId = items.some(item => item.id !== undefined && !processed.has(String(item.id)));

    // Track IDs for auto-unmute logic
    items.forEach(item => {
      if (item.id !== undefined) processed.add(String(item.id));
    });
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

    if (state.mutePayment && hasNewId) {
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

    const smsMessage = `[${configTag}] Notification: ${items.length} items detected. Please check the system.`;
    const transactionDetails = items
      .map((item, index) => `${index + 1}. ID: ${item.id ?? 'N/A'}, Time: ${item.timestamp ?? 'N/A'}`)
      .join('\n');
    const emailSubject = `🔔 [${configTag}] Notification: ${items.length} Items`;
    const mutePaymentLinkUI = `${CONTROL_SERVER_URL}/mute/payment/ui`;
    const muteText = ENABLE_MANUAL_MUTE ? `Mute alerts (choose duration): ${mutePaymentLinkUI}` : 'Manual mute is currently disabled.';
    const emailBody = `Dear Admin,\n\nNew items have been detected:\n\n${transactionDetails}\n\nTotal Items: ${items.length}\n\nConfig: ${configTag}\n\n${muteText}\n\nTimestamp: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h2 { color: #0275d8; margin-top: 0; }
          .badge { display: inline-block; background: #0275d8; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-bottom: 10px; }
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
          <div class="badge">Config: ${configTag}</div>
          <h2>🔔 Items Detected</h2>
          <div class="alert">
            <strong>New activity has been detected in your system.</strong>
          </div>
          <div class="transactions">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Transaction Details:</p>
            ${items.map((item, index) => `
              <div class="transaction-item">
                <strong>${index + 1}.</strong> ID: <code>${item.id ?? 'N/A'}</code><br>
                Time: ${item.timestamp ?? 'N/A'}
              </div>
            `).join('')}
          </div>
          <p style="background: #e8f4f8; padding: 10px; border-radius: 4px; color: #333;">
            <strong>Total Items:</strong> ${items.length}
          </p>
          ${ENABLE_MANUAL_MUTE ? `
            <div class="mute-section">
              <h3>🔇 Mute Alerts</h3>
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
            <p style="color: #bbb;">Universal Notification System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`[${new Date().toISOString()}] Sending notifications for ${items.length} items...`);
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
// Store active intervals for each endpoint
const activeIntervals = new Map();

/**
 * Start scheduler for all configured endpoints
 */
function startScheduler() {
  console.log(`\n[${new Date().toISOString()}] ========================================`);
  console.log('Multi-Endpoint Notification System Started');
  console.log('========================================\n');

  const activeTags = getActiveTags();

  if (activeTags.length === 0) {
    console.log('⚠️  No active endpoints configured!');
    console.log('   Activate an endpoint at: http://localhost:3000/endpoints/ui\n');
    return;
  }

  console.log(`📋 Found ${activeTags.length} active endpoint(s): ${activeTags.join(', ')}\n`);

  // Start scheduler for each active endpoint
  for (const tag of activeTags) {
    try {
      startEndpointScheduler(tag);
    } catch (err) {
      console.error(`❌ Failed to start scheduler for '${tag}': ${err.message}`);
    }
  }

  console.log('\n✅ All endpoint schedulers started successfully!\n');
}

/**
 * Reschedule endpoint check with current interval from config
 * Called after each check to apply any interval changes
 * @param {string} endpointTag - The endpoint tag
 */
function rescheduleEndpointCheck(endpointTag) {
  try {
    const config = getEndpointConfig(endpointTag);
    const currentInterval = config.checkInterval || 30000;
    if (activeIntervals.has(endpointTag)) {
      // If interval changed in config, reschedule
      const storedInterval = activeIntervals.get(`${endpointTag}_interval`);

      if (storedInterval !== currentInterval) {
        console.log(`[${endpointTag}] ⚙️  Interval changed: ${storedInterval || 30000}ms → ${currentInterval}ms`);
        stopEndpointScheduler(endpointTag);
        activeIntervals.set(`${endpointTag}_interval`, currentInterval);

        // Set new interval
        const newIntervalId = setInterval(() => {
          checkAndNotifyEndpoint(endpointTag);
        }, currentInterval);

        activeIntervals.set(endpointTag, newIntervalId);
        console.log(`[${endpointTag}] ✓ Scheduler rescheduled with new interval: ${currentInterval / 1000}s`);
      }
    }
  } catch (err) {
    console.warn(`[${endpointTag}] ⚠️  Could not reschedule check: ${err.message}`);
  }
}

/**
 * Start scheduler for a specific endpoint
 * @param {string} endpointTag - The endpoint tag
 */
function startEndpointScheduler(endpointTag) {
  // Stop existing scheduler if running
  stopEndpointScheduler(endpointTag);

  try {
    const config = getEndpointConfig(endpointTag);
    const interval = config.checkInterval || 30000;

    console.log(`🚀 Starting scheduler for: ${endpointTag}`);
    console.log(`   API: ${config.apiEndpoint || 'Not set'}`);
    console.log(`   Interval: ${interval / 1000}s (${interval / 60000} minutes)`);
    console.log(`   SMS: ${config.enableSms ? '✓' : '✗'} | Email: ${config.enableEmail ? '✓' : '✗'}`);
    console.log(`   Recipients: ${(config.phoneNumbers || []).length} SMS, ${(config.emailAddresses || []).length} Email\n`);

    // Store the initial interval for comparison in reschedule
    activeIntervals.set(`${endpointTag}_interval`, interval);

    // Run check immediately
    checkAndNotifyEndpoint(endpointTag);

    // Schedule recurring checks
    const intervalId = setInterval(() => {
      checkAndNotifyEndpoint(endpointTag);
    }, interval);

    activeIntervals.set(endpointTag, intervalId);

  } catch (err) {
    console.error(`❌ Error starting scheduler for '${endpointTag}': ${err.message}`);
  }
}

/**
 * Stop scheduler for a specific endpoint
 * @param {string} endpointTag - The endpoint tag
 */
function stopEndpointScheduler(endpointTag) {
  if (activeIntervals.has(endpointTag)) {
    const intervalId = activeIntervals.get(endpointTag);
    clearInterval(intervalId);
    activeIntervals.delete(endpointTag);
    activeIntervals.delete(`${endpointTag}_interval`); // Also remove interval tracking
    console.log(`⏹️  Stopped scheduler for: ${endpointTag}`);
    return true;
  } else {
    console.log(`⚠️  No active scheduler found for: ${endpointTag}`);
    return false;
  }
}

/**
 * Stop all schedulers
 */
function stopAllSchedulers() {
  console.log('\n⏹️  Stopping all schedulers...');
  for (const [tag, intervalId] of activeIntervals) {
    clearInterval(intervalId);
    console.log(`   Stopped: ${tag}`);
  }
  activeIntervals.clear();
  console.log('✅ All schedulers stopped\n');
}

/**
 * Restart scheduler for a specific endpoint
 * @param {string} endpointTag - The endpoint tag
 */
function restartEndpointScheduler(endpointTag) {
  console.log(`🔄 Restarting scheduler for: ${endpointTag}`);
  stopEndpointScheduler(endpointTag);
  startEndpointScheduler(endpointTag);
}

/**
 * Get active schedulers info
 */
function getActiveSchedulers() {
  const schedulers = [];
  for (const tag of activeIntervals.keys()) {
    try {
      const config = getEndpointConfig(tag);
      schedulers.push({
        tag,
        interval: config.checkInterval || 30000,
        apiEndpoint: config.apiEndpoint,
        enableSms: config.enableSms,
        enableEmail: config.enableEmail,
        running: true
      });
    } catch (err) {
      schedulers.push({
        tag,
        error: err.message,
        running: false
      });
    }
  }
  return schedulers;
}

module.exports = {
  startScheduler,
  startEndpointScheduler,
  stopEndpointScheduler,
  stopAllSchedulers,
  restartEndpointScheduler,
  getActiveSchedulers,
  checkAndNotify,
  checkAndNotifyEndpoint
};
