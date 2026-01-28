// ============================================
// NAMED API ENDPOINTS CONFIGURATION
// ============================================
// All endpoints are configured via Setup UI
// No default configs - create your first config at http://localhost:3000/setup/ui

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const NAMED_ENDPOINTS = {
  // All endpoints will be created via Setup UI
  // Example structure (DO NOT UNCOMMENT - use Setup UI instead):
  /*
  myapi: {
    tag: 'myapi',
    apiEndpoint: 'http://api.example.com/endpoint',
    method: 'GET',
    headers: {},
    authType: '', // '' | 'bearer' | 'basic'
    authToken: '',
    authUsername: '',
    authPassword: '',
    query: {},
    body: {},
    smsEndpoint: 'http://localhost:9090/api/sms/send',
    emailEndpoint: 'http://localhost:9090/api/email/send',
    checkInterval: 30000, // milliseconds
    enableSms: true,
    enableEmail: true,
    enableManualMute: true,
    enableRecoveryEmail: true,
    phoneNumbers: ['01XXXXXXXXX'],
    emailAddresses: ['email@example.com'],
    mapItemsPath: 'items',
    mapIdPath: 'id',
    mapTimestampPath: 'created_at',
    mapTitlePath: '',
    mapDetailsPath: ''
  }
  */
};

// No default endpoint - must be set via Setup UI
const DEFAULT_ENDPOINT_TAG = null;

// Control Server Configuration
const CONTROL_SERVER_PORT = parseInt(process.env.CONTROL_SERVER_PORT || '3000', 10);
const CONTROL_SERVER_URL = process.env.CONTROL_SERVER_URL || `http://localhost:${CONTROL_SERVER_PORT}`;

// Backward compatibility: export undefined values for old-style config
// These will be populated from config-store which reads from setup configs
const API_ENDPOINT = undefined;
const API_METHOD = undefined;
const API_HEADERS = undefined;
const API_AUTH_TYPE = undefined;
const API_AUTH_TOKEN = undefined;
const API_AUTH_USERNAME = undefined;
const API_AUTH_PASSWORD = undefined;
const API_QUERY = undefined;
const API_BODY = undefined;
const SMS_ENDPOINT = undefined;
const EMAIL_ENDPOINT = undefined;
const ENABLE_SMS = undefined;
const ENABLE_EMAIL = undefined;
const ENABLE_MANUAL_MUTE = undefined;
const ENABLE_RECOVERY_EMAIL = undefined;
const CHECK_INTERVAL = undefined;
const PHONE_NUMBERS = undefined;
const EMAIL_ADDRESSES = undefined;
const MAP_ITEMS_PATH = undefined;
const MAP_ID_PATH = undefined;
const MAP_TIMESTAMP_PATH = undefined;
const MAP_TITLE_PATH = undefined;
const MAP_DETAILS_PATH = undefined;

module.exports = {
  // Named endpoints
  NAMED_ENDPOINTS,
  DEFAULT_ENDPOINT_TAG,
  
  // Backward compatibility exports (old style)
  API_ENDPOINT,
  API_METHOD,
  API_HEADERS,
  API_AUTH_TYPE,
  API_AUTH_TOKEN,
  API_AUTH_USERNAME,
  API_AUTH_PASSWORD,
  API_QUERY,
  API_BODY,
  SMS_ENDPOINT,
  EMAIL_ENDPOINT,
  CONTROL_SERVER_PORT,
  CONTROL_SERVER_URL,
  ENABLE_SMS,
  ENABLE_EMAIL,
  ENABLE_MANUAL_MUTE,
  ENABLE_RECOVERY_EMAIL,
  CHECK_INTERVAL,
  PHONE_NUMBERS,
  EMAIL_ADDRESSES,
  MAP_ITEMS_PATH,
  MAP_ID_PATH,
  MAP_TIMESTAMP_PATH,
  MAP_TITLE_PATH,
  MAP_DETAILS_PATH
};
