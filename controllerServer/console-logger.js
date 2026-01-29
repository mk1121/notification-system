/**
 * Console Logger - Environment-aware logging utility
 *
 * Usage:
 * - Development: Shows all logs (debug, info, warn, error)
 * - Production: Shows only important logs (warn, error, critical info)
 *
 * Set NODE_ENV=production for production mode
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Log levels
 */
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS'
};

/**
 * Color codes for terminal output
 */
const COLORS = {
  RESET: '\x1b[0m',
  DEBUG: '\x1b[36m',    // Cyan
  INFO: '\x1b[34m',     // Blue
  WARN: '\x1b[33m',     // Yellow
  ERROR: '\x1b[31m',    // Red
  SUCCESS: '\x1b[32m',  // Green
  DIM: '\x1b[2m'
};

/**
 * Format timestamp in Asia/Dhaka timezone
 */
function getTimestamp() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date()).replace(/(\d+)\/(\d+)\/(\d+),?\s?(\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');
}

/**
 * Format log message
 */
function formatMessage(level, message, tag = '') {
  const timestamp = getTimestamp();
  const tagStr = tag ? `[${tag}] ` : '';
  return `${COLORS[level]}[${timestamp}] [${level}]${COLORS.RESET} ${tagStr}${message}`;
}

/**
 * Debug log (only in development)
 */
function debug(message, tag = '') {
  if (isDevelopment) {
    console.log(formatMessage('DEBUG', message, tag));
  }
}

/**
 * Info log (always shown for important info, filtered in production for verbose info)
 */
function info(message, tag = '', alwaysShow = false) {
  if (isDevelopment || alwaysShow) {
    console.log(formatMessage('INFO', message, tag));
  }
}

/**
 * Success log (always shown)
 */
function success(message, tag = '') {
  console.log(formatMessage('SUCCESS', message, tag));
}

/**
 * Warning log (always shown)
 */
function warn(message, tag = '') {
  console.warn(formatMessage('WARN', message, tag));
}

/**
 * Error log (always shown)
 */
function error(message, tag = '', errorObj = null) {
  console.error(formatMessage('ERROR', message, tag));
  if (errorObj && isDevelopment) {
    console.error(COLORS.DIM + errorObj.stack + COLORS.RESET);
  }
}

/**
 * Log startup information (always shown)
 */
function startup(message) {
  console.log(`\n${COLORS.SUCCESS}════════════════════════════════════════${COLORS.RESET}`);
  console.log(`${COLORS.SUCCESS}  ${message}${COLORS.RESET}`);
  console.log(`${COLORS.SUCCESS}════════════════════════════════════════${COLORS.RESET}\n`);
}

/**
 * Log section header (only in development)
 */
function section(title) {
  if (isDevelopment) {
    console.log(`\n${COLORS.INFO}━━━ ${title} ━━━${COLORS.RESET}`);
  }
}

/**
 * Get environment info
 */
function getEnvironment() {
  return {
    mode: isDevelopment ? 'Development' : 'Production',
    isDevelopment,
    isProduction: !isDevelopment
  };
}

module.exports = {
  debug,
  info,
  success,
  warn,
  error,
  startup,
  section,
  getEnvironment,
  LOG_LEVELS
};
