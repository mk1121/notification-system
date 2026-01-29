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

function parseObject(value, fallback = {}) {
  try {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim().length) {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    }
  } catch (_err) {
    // ignore parse errors and fallback
  }
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

  // Universal API config
  if (overrides.API_METHOD !== undefined) {
    merged.API_METHOD = String(overrides.API_METHOD).trim().toUpperCase() || baseConfig.API_METHOD;
  }
  if (overrides.API_HEADERS !== undefined) {
    merged.API_HEADERS = parseObject(overrides.API_HEADERS, baseConfig.API_HEADERS);
  }
  if (overrides.API_AUTH_TYPE !== undefined) {
    merged.API_AUTH_TYPE = String(overrides.API_AUTH_TYPE).trim().toLowerCase();
  }
  if (overrides.API_AUTH_TOKEN !== undefined) {
    merged.API_AUTH_TOKEN = String(overrides.API_AUTH_TOKEN).trim();
  }
  if (overrides.API_AUTH_USERNAME !== undefined) {
    merged.API_AUTH_USERNAME = String(overrides.API_AUTH_USERNAME).trim();
  }
  if (overrides.API_AUTH_PASSWORD !== undefined) {
    merged.API_AUTH_PASSWORD = String(overrides.API_AUTH_PASSWORD).trim();
  }
  if (overrides.API_QUERY !== undefined) {
    merged.API_QUERY = parseObject(overrides.API_QUERY, baseConfig.API_QUERY);
  }
  if (overrides.API_BODY !== undefined) {
    merged.API_BODY = parseObject(overrides.API_BODY, baseConfig.API_BODY);
  }

  // Mapping paths
  if (overrides.MAP_ITEMS_PATH !== undefined) {
    merged.MAP_ITEMS_PATH = String(overrides.MAP_ITEMS_PATH).trim();
  }
  if (overrides.MAP_ID_PATH !== undefined) {
    merged.MAP_ID_PATH = String(overrides.MAP_ID_PATH).trim();
  }
  if (overrides.MAP_TIMESTAMP_PATH !== undefined) {
    merged.MAP_TIMESTAMP_PATH = String(overrides.MAP_TIMESTAMP_PATH).trim();
  }
  if (overrides.MAP_TITLE_PATH !== undefined) {
    merged.MAP_TITLE_PATH = String(overrides.MAP_TITLE_PATH).trim();
  }
  if (overrides.MAP_DETAILS_PATH !== undefined) {
    merged.MAP_DETAILS_PATH = String(overrides.MAP_DETAILS_PATH).trim();
  }

  return merged;
}

function getConfig() {
  const overrides = loadOverrides();
  const activeTag = overrides.activeConfigTag;

  // If there's an active config, merge its settings
  if (activeTag && overrides.apiConfigs && overrides.apiConfigs[activeTag]) {
    const activeConfig = overrides.apiConfigs[activeTag];

    // Merge active config settings with overrides
    const merged = { ...overrides };

    // Store the active config tag
    merged.ACTIVE_CONFIG_TAG = activeTag;

    // Override with active config's API settings
    if (activeConfig.apiEndpoint) merged.API_ENDPOINT = activeConfig.apiEndpoint;
    if (activeConfig.apiMethod) merged.API_METHOD = activeConfig.apiMethod;
    if (activeConfig.apiHeaders) merged.API_HEADERS = activeConfig.apiHeaders;
    if (activeConfig.apiAuthType) merged.API_AUTH_TYPE = activeConfig.apiAuthType;
    if (activeConfig.apiAuthToken) merged.API_AUTH_TOKEN = activeConfig.apiAuthToken;
    if (activeConfig.apiAuthUsername) merged.API_AUTH_USERNAME = activeConfig.apiAuthUsername;
    if (activeConfig.apiAuthPassword) merged.API_AUTH_PASSWORD = activeConfig.apiAuthPassword;
    if (activeConfig.apiQuery) merged.API_QUERY = activeConfig.apiQuery;
    if (activeConfig.apiBody) merged.API_BODY = activeConfig.apiBody;

    // Override with active config's mapping settings
    if (activeConfig.mapItemsPath) merged.MAP_ITEMS_PATH = activeConfig.mapItemsPath;
    if (activeConfig.mapIdPath) merged.MAP_ID_PATH = activeConfig.mapIdPath;
    if (activeConfig.mapTimestampPath) merged.MAP_TIMESTAMP_PATH = activeConfig.mapTimestampPath;
    if (activeConfig.mapTitlePath !== undefined) merged.MAP_TITLE_PATH = activeConfig.mapTitlePath;
    if (activeConfig.mapDetailsPath !== undefined) merged.MAP_DETAILS_PATH = activeConfig.mapDetailsPath;

    // Override with active config's notification settings
    if (activeConfig.enableSms !== undefined) merged.ENABLE_SMS = activeConfig.enableSms;
    if (activeConfig.enableEmail !== undefined) merged.ENABLE_EMAIL = activeConfig.enableEmail;
    if (activeConfig.enableManualMute !== undefined) merged.ENABLE_MANUAL_MUTE = activeConfig.enableManualMute;
    if (activeConfig.phoneNumbers) merged.PHONE_NUMBERS = activeConfig.phoneNumbers;
    if (activeConfig.emailAddresses) merged.EMAIL_ADDRESSES = activeConfig.emailAddresses;
    if (activeConfig.checkIntervalMinutes) merged.CHECK_INTERVAL_MINUTES = activeConfig.checkIntervalMinutes;

    return buildConfig(merged);
  }

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

  // Universal API config setters
  if (partial.API_METHOD !== undefined) {
    next.API_METHOD = String(partial.API_METHOD).trim().toUpperCase();
  }
  if (partial.API_HEADERS !== undefined) {
    next.API_HEADERS = parseObject(partial.API_HEADERS, current.API_HEADERS || baseConfig.API_HEADERS);
  }
  if (partial.API_AUTH_TYPE !== undefined) {
    next.API_AUTH_TYPE = String(partial.API_AUTH_TYPE).trim().toLowerCase();
  }
  if (partial.API_AUTH_TOKEN !== undefined) {
    next.API_AUTH_TOKEN = String(partial.API_AUTH_TOKEN).trim();
  }
  if (partial.API_AUTH_USERNAME !== undefined) {
    next.API_AUTH_USERNAME = String(partial.API_AUTH_USERNAME).trim();
  }
  if (partial.API_AUTH_PASSWORD !== undefined) {
    next.API_AUTH_PASSWORD = String(partial.API_AUTH_PASSWORD).trim();
  }
  if (partial.API_QUERY !== undefined) {
    next.API_QUERY = parseObject(partial.API_QUERY, current.API_QUERY || baseConfig.API_QUERY);
  }
  if (partial.API_BODY !== undefined) {
    next.API_BODY = parseObject(partial.API_BODY, current.API_BODY || baseConfig.API_BODY);
  }

  // Mapping paths setters
  if (partial.MAP_ITEMS_PATH !== undefined) {
    next.MAP_ITEMS_PATH = String(partial.MAP_ITEMS_PATH).trim();
  }
  if (partial.MAP_ID_PATH !== undefined) {
    next.MAP_ID_PATH = String(partial.MAP_ID_PATH).trim();
  }
  if (partial.MAP_TIMESTAMP_PATH !== undefined) {
    next.MAP_TIMESTAMP_PATH = String(partial.MAP_TIMESTAMP_PATH).trim();
  }
  if (partial.MAP_TITLE_PATH !== undefined) {
    next.MAP_TITLE_PATH = String(partial.MAP_TITLE_PATH).trim();
  }
  if (partial.MAP_DETAILS_PATH !== undefined) {
    next.MAP_DETAILS_PATH = String(partial.MAP_DETAILS_PATH).trim();
  }

  saveOverrides(next);
  return getConfig();
}

/**
 * Multi-config management (named configs with tags)
 */
function getMultiConfigs() {
  const overrides = loadOverrides();
  return overrides.apiConfigs || {};
}

function saveMultiConfigs(configs) {
  const overrides = loadOverrides();
  overrides.apiConfigs = configs;
  saveOverrides(overrides);
}

function createConfig(tag, data = {}) {
  const configs = getMultiConfigs();
  if (configs[tag]) return { ok: false, error: `Config '${tag}' already exists` };
  configs[tag] = {
    tag,
    createdAt: new Date().toISOString(),
    ...data
  };
  saveMultiConfigs(configs);
  return { ok: true, config: configs[tag] };
}

function getConfigByTag(tag) {
  const configs = getMultiConfigs();
  return configs[tag] || null;
}

function updateConfigByTag(tag, data = {}) {
  const configs = getMultiConfigs();
  if (!configs[tag]) return { ok: false, error: `Config '${tag}' not found` };
  configs[tag] = { ...configs[tag], ...data, tag, updatedAt: new Date().toISOString() };
  saveMultiConfigs(configs);
  return { ok: true, config: configs[tag] };
}

function deleteConfigByTag(tag) {
  const configs = getMultiConfigs();
  if (!configs[tag]) return { ok: false, error: `Config '${tag}' not found` };
  delete configs[tag];
  saveMultiConfigs(configs);
  return { ok: true };
}

function listConfigs() {
  const configs = getMultiConfigs();
  return Object.values(configs).map(c => ({
    tag: c.tag,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    apiEndpoint: c.apiEndpoint
  }));
}

function getActiveConfigTag() {
  const overrides = loadOverrides();
  return overrides.activeConfigTag || null;
}

function setActiveConfigTag(tag) {
  if (tag) {
    const configs = getMultiConfigs();
    if (!configs[tag]) return { ok: false, error: `Config '${tag}' not found` };
  }
  const overrides = loadOverrides();
  overrides.activeConfigTag = tag;
  saveOverrides(overrides);
  return { ok: true, activeTag: tag };
}

module.exports = {
  getConfig,
  setConfig,
  createConfig,
  getConfigByTag,
  updateConfigByTag,
  deleteConfigByTag,
  listConfigs,
  getActiveConfigTag,
  setActiveConfigTag,
  getMultiConfigs,
  saveMultiConfigs
};
