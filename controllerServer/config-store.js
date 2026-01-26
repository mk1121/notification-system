const fs = require('fs');
const path = require('path');
const baseConfig = require('./config');

const overridePath = path.join(__dirname, 'config-state.json');

function loadOverrides() {
  try {
    if (fs.existsSync(overridePath)) {
      return JSON.parse(fs.readFileSync(overridePath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading config overrides:', err.message);
  }
  return {};
}

function saveOverrides(overrides) {
  try {
    fs.writeFileSync(overridePath, JSON.stringify(overrides, null, 2));
  } catch (err) {
    console.error('Error saving config overrides:', err.message);
  }
}

function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean);
  return [];
}

function toBool(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'true' || lowered === 'yes' || lowered === '1') return true;
    if (lowered === 'false' || lowered === 'no' || lowered === '0') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

function buildConfig(overrides) {
  const merged = { ...baseConfig, ...overrides };

  const phoneNumbers = normalizeArray(overrides.PHONE_NUMBERS);
  if (overrides.PHONE_NUMBERS !== undefined) {
    merged.PHONE_NUMBERS = phoneNumbers;
  }

  const emailAddresses = normalizeArray(overrides.EMAIL_ADDRESSES);
  if (overrides.EMAIL_ADDRESSES !== undefined) {
    merged.EMAIL_ADDRESSES = emailAddresses;
  }

  if (overrides.CHECK_INTERVAL !== undefined) {
    const value = Number(overrides.CHECK_INTERVAL);
    if (!Number.isNaN(value)) {
      merged.CHECK_INTERVAL = value;
    }
  }

  if (overrides.CHECK_INTERVAL_MINUTES !== undefined) {
    const mins = Number(overrides.CHECK_INTERVAL_MINUTES);
    if (!Number.isNaN(mins)) {
      merged.CHECK_INTERVAL = mins * 60 * 1000;
    }
  }

  merged.ENABLE_SMS = toBool(overrides.ENABLE_SMS, baseConfig.ENABLE_SMS);
  merged.ENABLE_EMAIL = toBool(overrides.ENABLE_EMAIL, baseConfig.ENABLE_EMAIL);
  merged.ENABLE_MANUAL_MUTE = toBool(overrides.ENABLE_MANUAL_MUTE, baseConfig.ENABLE_MANUAL_MUTE);

  merged.CONTROL_SERVER_URL = overrides.CONTROL_SERVER_URL || baseConfig.CONTROL_SERVER_URL;

  return merged;
}

function getConfig() {
  const overrides = loadOverrides();
  return buildConfig(overrides);
}

function setConfig(partial = {}) {
  const current = loadOverrides();
  const next = { ...current };

  if (partial.API_ENDPOINT !== undefined) {
    next.API_ENDPOINT = String(partial.API_ENDPOINT).trim();
  }
  if (partial.SMS_ENDPOINT !== undefined) {
    next.SMS_ENDPOINT = String(partial.SMS_ENDPOINT).trim();
  }
  if (partial.EMAIL_ENDPOINT !== undefined) {
    next.EMAIL_ENDPOINT = String(partial.EMAIL_ENDPOINT).trim();
  }
  if (partial.CONTROL_SERVER_URL !== undefined) {
    next.CONTROL_SERVER_URL = String(partial.CONTROL_SERVER_URL).trim();
  }

  if (partial.ENABLE_SMS !== undefined) {
    next.ENABLE_SMS = toBool(partial.ENABLE_SMS, baseConfig.ENABLE_SMS);
  }
  if (partial.ENABLE_EMAIL !== undefined) {
    next.ENABLE_EMAIL = toBool(partial.ENABLE_EMAIL, baseConfig.ENABLE_EMAIL);
  }
  if (partial.ENABLE_MANUAL_MUTE !== undefined) {
    next.ENABLE_MANUAL_MUTE = toBool(partial.ENABLE_MANUAL_MUTE, baseConfig.ENABLE_MANUAL_MUTE);
  }

  const phoneInput = partial.PHONE_NUMBERS ?? partial.phoneNumbers;
  if (phoneInput !== undefined) {
    next.PHONE_NUMBERS = normalizeArray(phoneInput);
  }

  const emailInput = partial.EMAIL_ADDRESSES ?? partial.emailAddresses;
  if (emailInput !== undefined) {
    next.EMAIL_ADDRESSES = normalizeArray(emailInput);
  }

  if (partial.CHECK_INTERVAL !== undefined) {
    const value = Number(partial.CHECK_INTERVAL);
    if (!Number.isNaN(value)) {
      next.CHECK_INTERVAL = value;
    }
  }

  const minutes = partial.CHECK_INTERVAL_MINUTES ?? partial.checkIntervalMinutes;
  if (minutes !== undefined) {
    const mins = Number(minutes);
    if (!Number.isNaN(mins)) {
      next.CHECK_INTERVAL = mins * 60 * 1000;
      next.CHECK_INTERVAL_MINUTES = mins;
    }
  }

  saveOverrides(next);
  return getConfig();
}

module.exports = {
  getConfig,
  setConfig
};
