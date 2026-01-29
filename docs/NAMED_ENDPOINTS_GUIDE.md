# Named API Endpoints Configuration Guide

## Overview
The system supports monitoring multiple **named endpoints** simultaneously. Each endpoint has its own independent configuration for API monitoring, error detection, and notification settings.

## Configuration for Each Endpoint

```javascript
{
  tag: 'unique-identifier',           // Unique name/tag
  apiEndpoint: 'http://...',           // API URL
  method: 'GET',                       // GET, POST, PUT, DELETE
  headers: {},                         // Custom headers
  authType: 'bearer',                  // '', 'bearer', 'basic'
  authToken: 'token_value',            // Bearer token
  authUsername: 'user',                // Basic auth username
  authPassword: 'pass',                // Basic auth password
  query: {},                           // Query parameters
  body: {},                            // Request body
  smsEndpoint: 'http://...',          // SMS service URL
  emailEndpoint: 'http://...',        // Email service URL
  checkInterval: 30000,                // Check interval in milliseconds
  enableSms: true,                     // SMS enabled/disabled
  enableEmail: true,                   // Email enabled/disabled
  enableManualMute: true,              // Manual mute permission
  enableRecoveryEmail: true,           // Send recovery email
  phoneNumbers: ['01...'],             // Phone number list
  emailAddresses: ['email@...'],       // Email list
  mapItemsPath: 'items',               // Items path from API response
  mapIdPath: 'id',                     // Path for ID
  mapTimestampPath: 'created_at',      // Timestamp path
  mapTitlePath: 'title',               // Title path
  mapDetailsPath: 'details'            // Details path
}
```

## File Structure

### 1. **config.js** - Main Configuration
Defines default configuration for all named endpoints.

```javascript
const NAMED_ENDPOINTS = {
  'user-service': { ... },
  'order-service': { ... },
  'inventory-api': { ... },
  // Add more endpoints
};

const DEFAULT_ENDPOINT_TAG = 'user-service';
```

### 2. **config-state.json** - Runtime Configuration
Runtime settings modified by the user.

```json
{
  "activeEndpointTag": "user-service",
  "endpointOverrides": {
    "user-service": { ... }
  },
  "globalSettings": { ... }
}
```

### 3. **config-endpoints.js** - Helper Functions
Helper functions to get endpoint configuration.

```javascript
getEndpointConfig('user-service')     // Specific endpoint config
getAvailableEndpoints()               // All endpoint tags
endpointExists('user-service')        // Check if tag exists
getAllEndpoints()                     // Return all endpoints
```

## Usage Examples

### Adding a New Endpoint
```javascript
// Add to config.js:
const NAMED_ENDPOINTS = {
  'user-service': { ... },
  
  // New endpoint
  'order-service': {
    tag: 'order-service',
    apiEndpoint: 'http://api.example.com/orders',
    method: 'GET',
    smsEndpoint: 'http://localhost:9090/api/sms/send',
    emailEndpoint: 'http://localhost:9090/api/email/send',
    checkInterval: 60000,
    enableSms: true,
    enableEmail: true,
    // ... other settings
  }
};
```

### Fetching Configuration
```javascript
const { getEndpointConfig } = require('./config-endpoints');

// Get active endpoint config
const config = getEndpointConfig(); // uses default

// Get specific endpoint config
const orderConfig = getEndpointConfig('order-service');

// Access SMS endpoint
console.log(config.smsEndpoint);     // 'http://localhost:9090/api/sms/send'

// Access Email settings
console.log(config.enableEmail);     // true
```

## API Endpoints (REST)

### 1. View All Endpoints
```
GET /api/endpoints
Response:
[
  { tag: 'user-service', apiEndpoint: '...', enableSms: true, ... },
  { tag: 'order-service', apiEndpoint: '...', enableSms: false, ... },
  { tag: 'inventory-api', apiEndpoint: '...', enableSms: true, ... }
]
```

### 2. Get Specific Endpoint Configuration
```
GET /api/endpoints/:tag
Response:
{
  tag: 'user-service',
  apiEndpoint: '...',
  method: 'GET',
  // ... all settings
}
```

### 3. Update Endpoint Configuration
```
PUT /api/endpoints/:tag
Request Body:
{
  apiEndpoint: 'http://api.example.com/v2/users',
  enableSms: false,
  checkInterval: 60000,
  phoneNumbers: ['01...'],
  // ... fields you want to change
}
```

### 4. Change Active Endpoint
```
POST /api/endpoints/activate/:tag
Response:
{
  message: 'Endpoint activated',
  activeTag: 'order-service'
}
```

### 5. Add New Endpoint (Runtime)
```
POST /api/endpoints
Request Body:
{
  tag: 'notification-service',
  apiEndpoint: 'http://api.example.com/notifications',
  enableSms: true,
  // ... other settings
}
```

## Migration Guide (Old to New)

Old System:
```javascript
const API_ENDPOINT = '...';
const ENABLE_SMS = true;
const PHONE_NUMBERS = ['01...'];
```

New System:
```javascript
const config = getEndpointConfig('user-service');
// config.apiEndpoint -> instead of API_ENDPOINT
// config.enableSms -> instead of ENABLE_SMS
// config.phoneNumbers -> instead of PHONE_NUMBERS
```

## Benefits

✅ **Run multiple API endpoints simultaneously**  
✅ **Independent SMS/Email settings for each endpoint**  
✅ **Separate check interval for each endpoint**  
✅ **Easily add/remove new endpoints**  
✅ **Change configuration at runtime**  
✅ **No namespace conflicts**
