# API Documentation

Complete API reference for the Payment Notification System control server.

Base URL: `http://your-server-ip:3000`

---

## Configuration Management

### Get Current Configuration

**Endpoint:** `GET /config`

**Description:** Returns the current system configuration including all settings and toggles.

**Response:**
```json
{
  "API_ENDPOINT": "http://103.163.97.35:8080/ords/cpabank_ws/cpa/payment/spyTransactions",
  "SMS_ENDPOINT": "http://localhost:9090/api/sms/send",
  "EMAIL_ENDPOINT": "http://localhost:9090/api/email/send",
  "CONTROL_SERVER_PORT": 3000,
  "CONTROL_SERVER_URL": "http://192.168.1.249:3000",
  "ENABLE_SMS": true,
  "ENABLE_EMAIL": true,
  "ENABLE_MANUAL_MUTE": true,
  "ENABLE_RECOVERY_EMAIL": true,
  "CHECK_INTERVAL": 30000,
  "PHONE_NUMBERS": ["01571306597"],
  "EMAIL_ADDRESSES": ["user@example.com"]
}
```

---

### Update Configuration

**Endpoint:** `POST /config`

**Description:** Update system configuration. Changes apply immediately for new notifications. Check interval requires scheduler restart.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "phoneNumbers": "01571306597, 01XXXXXXXXX",
  "emailAddresses": "user1@example.com, user2@example.com",
  "checkIntervalMinutes": 1,
  "enableSms": true,
  "enableEmail": true,
  "enableManualMute": true
}
```

**Parameters:**
- `phoneNumbers` (string): Comma-separated phone numbers
- `emailAddresses` (string): Comma-separated email addresses
- `checkIntervalMinutes` (number): API check interval in minutes (min: 0.1)
- `enableSms` (boolean): Enable/disable SMS notifications
- `enableEmail` (boolean): Enable/disable email notifications
- `enableManualMute` (boolean): Enable/disable manual mute controls

**Response:**
```json
{
  "ok": true,
  "config": {
    "API_ENDPOINT": "...",
    "PHONE_NUMBERS": ["01571306597", "01XXXXXXXXX"],
    "EMAIL_ADDRESSES": ["user1@example.com", "user2@example.com"],
    "ENABLE_SMS": true,
    "ENABLE_EMAIL": true,
    "ENABLE_MANUAL_MUTE": true,
    "CHECK_INTERVAL": 60000
  }
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Error message"
}
```

---

### Configuration UI

**Endpoint:** `GET /config/ui`

**Description:** Web interface for managing configuration settings.

**Features:**
- Toggle SMS/Email on/off with live sections
- Add/remove recipients
- Control manual mute availability
- Adjust check interval
- Real-time status badges
- Save confirmation

---

## State Management

### Get System State

**Endpoint:** `GET /state`

**Description:** Returns current runtime state including mute status and processed payments.

**Response:**
```json
{
  "mutePayment": false,
  "mutePaymentUntil": null,
  "muteApi": false,
  "lastApiStatus": "success",
  "lastFailureMessage": "",
  "processedPaymentIds": ["PAY123", "PAY124", "PAY125"]
}
```

**Fields:**
- `mutePayment` (boolean): Whether payment alerts are currently muted
- `mutePaymentUntil` (string|null): ISO timestamp when payment mute expires
- `muteApi` (boolean): Whether API failure alerts are muted
- `lastApiStatus` (string): Last API check result ("success" or "failure")
- `lastFailureMessage` (string): Last API error message
- `processedPaymentIds` (array): List of payment IDs already processed

---

## Mute Controls

### Mute Payment Alerts (UI)

**Endpoint:** `GET /mute/payment/ui`

**Description:** Web form to mute payment alerts with custom duration.

**Features:**
- Duration input (minutes)
- Live countdown timer
- Auto-unmute notification
- Responsive design

**Behavior:**
- Blocked if `ENABLE_MANUAL_MUTE` is false
- Shows guidance to enable from settings

---

### Mute Payment Alerts

**Endpoint:** `GET /mute/payment?minutes=30`

**Description:** Mute payment notifications for specified duration.

**Query Parameters:**
- `minutes` (number): Duration in minutes (default: 30, max: 720)

**Response:** HTML page with:
- Confirmation message
- Countdown timer
- Resume timestamp (Asia/Dhaka timezone)
- Link to adjust duration

**Auto-unmute Conditions:**
1. Timer expires
2. New payment ID detected (whichever comes first)

---

### Mute API Failure Alerts

**Endpoint:** `GET /mute/api`

**Description:** Mute API failure notifications. Auto-unmutes when API recovers.

**Response:** HTML confirmation page

**Behavior:**
- Prevents API failure emails
- Auto-unmutes on successful API response
- Recovery email still sent (if enabled)

---

### Unmute API Alerts

**Endpoint:** `GET /unmute/api`

**Description:** Manually unmute API failure alerts and reset API status.

**Response:** HTML confirmation page

---

### Reset Payment State

**Endpoint:** `GET /reset/payment`

**Description:** Clear payment history and unmute payment alerts.

**Response:** HTML confirmation page

**Effect:**
- Unmutes payment alerts
- Clears processed payment IDs
- All subsequent transactions will trigger notifications

---

## Logging

### Get Logs (JSON)

**Endpoint:** `GET /api/logs`

**Description:** Retrieve logs in JSON format with filtering options.

**Query Parameters:**
- `lines` (number): Number of recent logs to return (default: 50)
- `type` (string): Filter by log type

**Type Values:**
- `SMS`: SMS notifications sent
- `EMAIL`: Email notifications sent
- `MUTE`: Manual mute actions
- `UNMUTE`: Manual unmute actions
- `AUTO-UNMUTE`: Automatic unmute events
- `API-FAILURE`: API failures detected
- `API-RECOVERY`: API recoveries
- `SYSTEM`: System messages

**Examples:**
```
GET /api/logs?lines=100
GET /api/logs?type=SMS
GET /api/logs?lines=50&type=EMAIL
```

**Response:**
```json
{
  "ok": true,
  "count": 10,
  "logs": [
    {
      "timestamp": "2026-01-26 13:30:45",
      "type": "SMS",
      "message": "Sent to: 01571306597 | Message: Payment notification: 3 transactions detected..."
    },
    {
      "timestamp": "2026-01-26 13:31:00",
      "type": "EMAIL",
      "message": "Sent to: user@example.com | Subject: 💳 Payment Notification: 3 Transactions"
    }
  ]
}
```

---

### Clear All Logs

**Endpoint:** `DELETE /api/logs`

**Description:** Delete all log entries. Creates new log file with header.

**Response:**
```json
{
  "ok": true,
  "message": "Logs cleared successfully"
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Failed to clear logs"
}
```

---

### Logs Dashboard (UI)

**Endpoint:** `GET /logs/ui`

**Description:** Interactive web dashboard for viewing and managing logs.

**Features:**
- Filter by log type dropdown
- Limit results (50/100/200/500)
- Statistics overview by type
- Sortable table view
- Refresh button
- Clear logs with confirmation
- Real-time updates

**Displays:**
- Timestamp (Asia/Dhaka timezone)
- Type badge with color coding
- Full message text

---

### Get Logs (Plain Text)

**Endpoint:** `GET /logs`

**Description:** Returns last 100 log entries in plain text format.

**Response:** Plain text
```
[2026-01-26 13:30:45] [SMS] Sent to: 01571306597 | Message: Payment notification...
[2026-01-26 13:31:00] [EMAIL] Sent to: user@example.com | Subject: Payment Notification
[2026-01-26 13:32:15] [MUTE] User muted payment (30 minutes)
```

---

## Response Formats

### HTML Responses

Most mute control endpoints return styled HTML pages with:
- Responsive design
- Confirmation messages
- Action buttons
- Status indicators
- Dhaka timezone timestamps

### JSON Responses

API endpoints return structured JSON:

**Success:**
```json
{
  "ok": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "ok": false,
  "error": "Error description"
}
```

---

## Status Codes

- `200 OK`: Successful request
- `500 Internal Server Error`: Server-side error

---

## CORS and Headers

Currently no CORS restrictions. Add if needed:

```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

---

## Rate Limiting

Not currently implemented. Consider adding for production:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## Authentication

Base version has no authentication. For production, implement:

1. **API Key Authentication:**
```javascript
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey === process.env.API_KEY) {
    next();
  } else {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
};

app.use('/api/', apiKeyAuth);
```

2. **Basic Auth for UI:**
```javascript
const basicAuth = require('express-basic-auth');

app.use('/config/ui', basicAuth({
  users: { 'admin': 'password' },
  challenge: true
}));
```

---

## Webhooks

To receive webhook notifications from the system, implement a custom endpoint:

```javascript
// In your application
app.post('/webhook/notification', (req, res) => {
  const { type, message, timestamp } = req.body;
  console.log(`Received ${type} notification: ${message}`);
  res.json({ ok: true });
});
```

Then modify scheduler to call your webhook:
```javascript
// In scheduler.js
async function sendWebhook(type, message) {
  await axios.post('http://your-app/webhook/notification', {
    type,
    message,
    timestamp: new Date().toISOString()
  });
}
```

---

## Testing Endpoints

Use curl or any HTTP client:

```bash
# Get config
curl http://localhost:3000/config

# Update config
curl -X POST http://localhost:3000/config \
  -H "Content-Type: application/json" \
  -d '{"phoneNumbers":"01571306597","enableSms":true}'

# Get logs
curl http://localhost:3000/api/logs?type=SMS&lines=10

# Mute payment
curl "http://localhost:3000/mute/payment?minutes=60"

# Get state
curl http://localhost:3000/state

# Clear logs
curl -X DELETE http://localhost:3000/api/logs
```

---

## Integration Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

// Update configuration
async function updateConfig(config) {
  const response = await axios.post(`${API_BASE}/config`, config);
  return response.data;
}

// Get recent SMS logs
async function getSmsLogs() {
  const response = await axios.get(`${API_BASE}/api/logs?type=SMS&lines=20`);
  return response.data.logs;
}

// Mute payment alerts
async function mutePayments(minutes) {
  await axios.get(`${API_BASE}/mute/payment?minutes=${minutes}`);
}

// Usage
(async () => {
  await updateConfig({
    phoneNumbers: '01571306597',
    enableSms: true
  });
  
  const logs = await getSmsLogs();
  console.log('Recent SMS:', logs);
  
  await mutePayments(30);
})();
```

### Python

```python
import requests

API_BASE = 'http://localhost:3000'

# Get configuration
def get_config():
    response = requests.get(f'{API_BASE}/config')
    return response.json()

# Update config
def update_config(config):
    response = requests.post(f'{API_BASE}/config', json=config)
    return response.json()

# Get logs
def get_logs(type=None, lines=50):
    params = {'lines': lines}
    if type:
        params['type'] = type
    response = requests.get(f'{API_BASE}/api/logs', params=params)
    return response.json()['logs']

# Usage
config = get_config()
print(f"SMS Enabled: {config['ENABLE_SMS']}")

logs = get_logs(type='EMAIL', lines=10)
for log in logs:
    print(f"{log['timestamp']} - {log['message']}")
```

---

## Error Handling

All endpoints handle errors gracefully:

1. **Missing parameters:** Uses defaults or returns error
2. **Invalid input:** Returns error with description
3. **File system errors:** Logs to console and returns error response
4. **Configuration errors:** Falls back to static config

Best practice: Always check `ok` field in JSON responses before processing data.
