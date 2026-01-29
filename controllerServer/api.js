const axios = require('axios');
const { getConfig } = require('./config-store');
const consoleLog = require('./console-logger');

/**
 * Build axios request config from configuration
 * @param {Object} customConfig - Optional custom config (for endpoint-specific config)
 */
function buildRequestConfig(customConfig = null) {
  const cfg = customConfig || getConfig();
  const {
    API_ENDPOINT,
    apiEndpoint,
    API_METHOD,
    method,
    API_HEADERS,
    headers,
    API_AUTH_TYPE,
    authType,
    API_AUTH_TOKEN,
    authToken,
    API_AUTH_USERNAME,
    authUsername,
    API_AUTH_PASSWORD,
    authPassword,
    API_QUERY,
    query,
    API_BODY,
    body
  } = cfg;

  // Support both naming conventions
  const endpoint = apiEndpoint || API_ENDPOINT;
  const httpMethod = (method || API_METHOD || 'GET').toUpperCase();
  const reqHeaders = { ...(headers || API_HEADERS || {}) };
  const params = query || API_QUERY || {};
  const data = body || API_BODY || {};

  const requestConfig = {
    url: endpoint,
    method: httpMethod,
    headers: reqHeaders,
    params
  };

  if (httpMethod !== 'GET') {
    requestConfig.data = data;
  }

  const authTypeValue = (authType || API_AUTH_TYPE || '').toLowerCase();
  const tokenValue = authToken || API_AUTH_TOKEN;
  const usernameValue = authUsername || API_AUTH_USERNAME;
  const passwordValue = authPassword || API_AUTH_PASSWORD;

  if (authTypeValue === 'bearer' && tokenValue) {
    requestConfig.headers = requestConfig.headers || {};
    requestConfig.headers.Authorization = `Bearer ${tokenValue}`;
  } else if (authTypeValue === 'basic' && usernameValue) {
    requestConfig.auth = {
      username: usernameValue,
      password: passwordValue || ''
    };
  }

  return requestConfig;
}

/**
 * Fetch data from the configured API endpoint
 * @param {Object} customConfig - Optional custom config (for endpoint-specific config)
 * @returns {Promise<Object>} { ok, status, data, error }
 */
async function fetchTransactions(customConfig = null) {
  try {
    const requestConfig = buildRequestConfig(customConfig);
    const response = await axios(requestConfig);
    const ok = response.status >= 200 && response.status < 300;
    if (ok) {
      consoleLog.debug('Successfully fetched data', 'API');
    } else {
      consoleLog.debug(`API returned status code: ${response.status}`, 'API');
    }
    return { ok, status: response.status, data: response.data, error: ok ? null : `HTTP ${response.status}` };
  } catch (error) {
    consoleLog.error(`Error fetching data: ${error.message}`, 'API', error);
    return { ok: false, status: null, data: null, error: error.message };
  }
}

/**
 * Safely resolve a value from an object using a dot/bracket path.
 * Supports paths like 'a.b[0].c'.
 */
function getPath(obj, path) {
  if (!obj || !path) return undefined;
  const tokens = [];
  // Split by dots and brackets
  path.split('.').forEach(part => {
    const re = /([^[\]]+)|(\[(\d+)\])/g;
    let m;
    while ((m = re.exec(part)) !== null) {
      if (m[1]) tokens.push(m[1]);
      else if (m[3] !== undefined) tokens.push(Number(m[3]));
    }
  });
  let cur = obj;
  for (const key of tokens) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[key];
  }
  return cur;
}

/**
 * Map raw API response into normalized items using configured paths.
 * Returns an array of { id, timestamp, title, details, raw }.
 * @param {Object} data - Raw API response data
 * @param {Object} customConfig - Optional custom config (for endpoint-specific config)
 */
function mapItemsFromData(data, customConfig = null) {
  const cfg = customConfig || getConfig();
  const {
    MAP_ITEMS_PATH,
    mapItemsPath,
    MAP_ID_PATH,
    mapIdPath,
    MAP_TIMESTAMP_PATH,
    mapTimestampPath,
    MAP_TITLE_PATH,
    mapTitlePath,
    MAP_DETAILS_PATH,
    mapDetailsPath
  } = cfg;

  // Support both naming conventions
  const itemsPath = mapItemsPath || MAP_ITEMS_PATH;
  const idPath = mapIdPath || MAP_ID_PATH;
  const timestampPath = mapTimestampPath || MAP_TIMESTAMP_PATH;
  const titlePath = mapTitlePath || MAP_TITLE_PATH;
  const detailsPath = mapDetailsPath || MAP_DETAILS_PATH;

  let items = getPath(data, itemsPath);
  if (!Array.isArray(items)) {
    if (Array.isArray(data)) items = data;
    else if (Array.isArray(data?.items)) items = data.items;
    else items = [];
  }

  return items.map(item => ({
    id: getPath(item, idPath),
    timestamp: getPath(item, timestampPath),
    title: titlePath ? getPath(item, titlePath) : undefined,
    details: detailsPath ? getPath(item, detailsPath) : undefined,
    raw: item
  }));
}

module.exports = {
  fetchTransactions,
  buildRequestConfig,
  mapItemsFromData
};
