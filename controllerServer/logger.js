const fs = require('fs');
const path = require('path');

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
 * @param {string} message - Log message
 */
function log(type, message) {
  initializeLog();
  const timestamp = getTimestamp();
  const logEntry = `[${timestamp}] [${type}] ${message}\n`;
  
  fs.appendFileSync(logFile, logEntry);
  console.log(logEntry.trim());
}

/**
 * Log SMS sending
 * @param {Array} phoneNumbers - Recipients
 * @param {string} message - SMS text
 */
function logSmsSent(phoneNumbers, message) {
  const recipients = phoneNumbers.join(', ');
  log('SMS', `Sent to: ${recipients} | Message: ${message.substring(0, 80)}...`);
}

/**
 * Log Email sending
 * @param {Array} emailAddresses - Recipients
 * @param {string} subject - Email subject
 */
function logEmailSent(emailAddresses, subject) {
  const recipients = emailAddresses.join(', ');
  log('EMAIL', `Sent to: ${recipients} | Subject: ${subject}`);
}

/**
 * Log manual mute action
 * @param {string} type - 'payment' or 'api'
 */
function logMuteAction(type) {
  log('MUTE', `User muted ${type} alerts`);
}

/**
 * Log manual unmute action
 * @param {string} type - 'payment' or 'api'
 */
function logUnmuteAction(type) {
  log('UNMUTE', `User unmuted ${type} alerts`);
}

/**
 * Log auto-unmute action
 * @param {string} reason - Reason for auto-unmute (e.g., 'API recovered', 'new payment detected')
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
      const match = line.match(/\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)/);
      if (match) {
        return {
          timestamp: match[1],
          type: match[2],
          message: match[3]
        };
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
