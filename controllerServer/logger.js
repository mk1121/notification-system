const fs = require('fs');
const path = require('path');
const consoleLog = require('./console-logger');

const logFile = path.join(__dirname, 'notification.log');

/**
 * Get timestamp in Asia/Dhaka timezone
 */
function getTimestamp() {
  const now = new Date();
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now).replace(/(\d+)\/(\d+)\/(\d+),?\s?(\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');
}

/**
 * Initialize log file with header if it doesn't exist
 */
function initializeLog() {
  if (!fs.existsSync(logFile)) {
    const header = `\n========== NOTIFICATION SYSTEM LOG ==========\nStarted at: ${getTimestamp()}\nTimezone: Asia/Dhaka (UTC+6)\n\n`;
    fs.writeFileSync(logFile, header);
  }
}

/**
 * Log a message to file
 * @param {string} type - Log type (SMS, EMAIL, MUTE, UNMUTE, SYSTEM)
 * @param {string} message - Log message (may contain [tag] anywhere in the message)
 */
function log(type, message) {
  initializeLog();
  const timestamp = getTimestamp();

  // Extract tag from message - look for [tag] pattern anywhere in the message
  let tag = '';
  let cleanMessage = message;

  // First try: tag at the start "[tag] message"
  let tagMatch = message.match(/^\[([^\]]+)\]\s*(.*)/);
  if (tagMatch) {
    tag = tagMatch[1];
    cleanMessage = tagMatch[2];
  } else {
    // Second try: look for [tag] pattern anywhere (e.g., in "Message: [tag]" or "Subject: [tag]")
    tagMatch = message.match(/\[([a-zA-Z0-9_-]+)\]/);
    if (tagMatch) {
      tag = tagMatch[1];
      // Don't remove it from cleanMessage for the second case, as it's part of the content
    }
  }

  // Format: [timestamp] [type] [tag] message
  let logEntry;
  if (tag) {
    logEntry = `[${timestamp}] [${type}] [${tag}] ${cleanMessage}\n`;
  } else {
    logEntry = `[${timestamp}] [${type}] ${cleanMessage}\n`;
  }

  fs.appendFileSync(logFile, logEntry);
  consoleLog.debug(logEntry.trim(), 'NOTIFY');
}

/**
 * Log SMS sending
 * @param {string|Array} phoneNumbers - Single phone number or array of phone numbers
 * @param {string} message - SMS text
 */
function logSmsSent(phoneNumbers, message) {
  const recipients = Array.isArray(phoneNumbers) ? phoneNumbers.join(', ') : phoneNumbers;
  log('SMS', `Sent to: ${recipients} | Message: ${message.substring(0, 80)}...`);
}

/**
 * Log Email sending
 * @param {string|Array} emailAddresses - Single email address or array of email addresses
 * @param {string} subject - Email subject
 */
function logEmailSent(emailAddresses, subject) {
  const recipients = Array.isArray(emailAddresses) ? emailAddresses.join(', ') : emailAddresses;
  log('EMAIL', `Sent to: ${recipients} | Subject: ${subject}`);
}

/**
 * Log manual mute action
 * @param {string} type - 'item' or 'api'
 */
function logMuteAction(type) {
  log('MUTE', `User muted ${type} alerts`);
}

/**
 * Log manual unmute action
 * @param {string} type - 'item' or 'api'
 */
function logUnmuteAction(type) {
  log('UNMUTE', `User unmuted ${type} alerts`);
}

/**
 * Log auto-unmute action
 * @param {string} reason - Reason for auto-unmute (e.g., 'API recovered', 'new item detected')
 */
function logAutoUnmute(reason) {
  log('AUTO-UNMUTE', reason);
}

/**
 * Log API failure
 * @param {string} error - Error message
 * @param {number} status - HTTP status
 */
function logApiFailure(error, status) {
  log('API-FAILURE', `Status: ${status || 'N/A'} | Error: ${error}`);
}

/**
 * Log API recovery
 */
function logApiRecovery() {
  log('API-RECOVERY', 'API is now working normally');
}

/**
 * Get all logs (for viewing in a dashboard if needed)
 */
function getLogs(lines = 50) {
  try {
    if (!fs.existsSync(logFile)) {
      return 'No logs yet';
    }
    const content = fs.readFileSync(logFile, 'utf8');
    const logLines = content.split('\n');
    return logLines.slice(-lines).join('\n');
  } catch (err) {
    return `Error reading logs: ${err.message}`;
  }
}

/**
 * Get logs in JSON format for API consumption
 * @param {number} lines - Number of recent log lines to return
 * @param {string} type - Filter by log type (SMS, EMAIL, MUTE, etc.)
 * @returns {Array} Array of log objects
 */
function getLogsJSON(lines = 50, type = null) {
  try {
    if (!fs.existsSync(logFile)) {
      return [];
    }
    const content = fs.readFileSync(logFile, 'utf8');
    const logLines = content.split('\n').filter(line => line.trim() && line.includes('['));

    const logs = logLines.map(line => {
      // Format: [timestamp] [type] [tag] message OR [timestamp] [type] message
      const match = line.match(/\[([^\]]+)\]\s*\[([^\]]+)\]\s*(?:\[([^\]]+)\]\s+)?(.*)/);
      if (match) {
        const logObj = {
          timestamp: match[1],
          type: match[2],
          tag: match[3] || null, // Tag may be null if not present
          message: match[4]
        };
        return logObj;
      }
      return null;
    }).filter(Boolean);

    let filtered = logs;
    if (type) {
      filtered = logs.filter(log => log.type === type.toUpperCase());
    }

    return filtered.slice(-lines);
  } catch (err) {
    return [];
  }
}

/**
 * Clear all logs
 */
function clearLogs() {
  try {
    const header = `\n========== NOTIFICATION SYSTEM LOG ==========\nCleared at: ${getTimestamp()}\nTimezone: Asia/Dhaka (UTC+6)\n\n`;
    fs.writeFileSync(logFile, header);
    return true;
  } catch (err) {
    console.error('Error clearing logs:', err.message);
    return false;
  }
}

module.exports = {
  log,
  logSmsSent,
  logEmailSent,
  logMuteAction,
  logUnmuteAction,
  logAutoUnmute,
  logApiFailure,
  logApiRecovery,
  getLogs,
  getLogsJSON,
  clearLogs
};
