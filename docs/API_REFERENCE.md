# Complete API Reference

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Control Server API](#control-server-api)
4. [Gateway API](#gateway-api)
5. [Response Formats](#response-formats)
6. [Error Codes](#error-codes)
7. [Examples](#examples)
8. [Rate Limiting](#rate-limiting)

---

## Overview

The Notification System provides two main APIs:

- **Control Server API** (port 3000): Endpoint management, scheduling, monitoring
- **Gateway API** (port 9090): SMS/Email sending, kill switch control

### Base URLs

```
Control Server: http://localhost:3000
Gateway:        http://localhost:9090
```

### Environment Variables

All URLs assume localhost. For production, use actual server IP/domain.

---

## Authentication

### API Key Authentication

Used for Gateway API endpoints.

**Header Format:**
```http
X-API-Key: your-api-key-here
```

**Example Request:**
```bash
curl http://localhost:9090/api/sms/send \
  -H "X-API-Key: abc123def456..."
```

### Session Authentication

Used for Control Server web endpoints.

**How it works:**
1. POST to `/login` with credentials
2. Receive session cookie
3. Cookie automatically sent in subsequent requests

**Example:**
```bash
curl -c cookies.txt -X POST http://localhost:3000/login \
  -d "username=admin&password=admin123"

curl -b cookies.txt http://localhost:3000/setup/ui
```

### Bearer Token (Alternative)

Some endpoints accept Bearer token instead of X-API-Key header.

**Format:**
```http
Authorization: Bearer your-api-key-here
```

**Example:**
```bash
curl http://localhost:9090/api/sms/send \
  -H "Authorization: Bearer abc123..."
```

---

## Control Server API

### Web Interface Endpoints

These require session authentication (via login).

#### GET `/`
Home page - redirects to login if not authenticated.

**Response:** HTML page

#### GET `/setup/ui`
Setup wizard for endpoint configuration.

**Response:** HTML page with setup form

#### POST `/login`
User login endpoint.

**Parameters:**
```
username: string (required)
password: string (required)
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/login \
  -d "username=admin&password=admin123"
```

**Response:** 
```json
{
  "success": true,
  "message": "Login successful",
  "redirect": "/setup/ui"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

#### GET `/logout`
User logout endpoint.

**Example Request:**
```bash
curl http://localhost:3000/logout
```

**Response:** Redirects to login page

---

### API Endpoints

#### GET `/api/endpoints`
Get all configured endpoints.

**Response:**
```json
[
  {
    "name": "Banking API",
    "url": "https://api.example.com/notify",
    "recipients": ["01234567890", "01987654321"],
    "emails": ["admin@example.com"],
    "status": "active"
  },
  {
    "name": "E-commerce",
    "url": "https://shop.example.com/webhook",
    "recipients": ["01234567890"],
    "emails": ["support@shop.com"],
    "status": "active"
  }
]
```

#### POST `/api/endpoints/create`
Create a new endpoint configuration.

**Request Body:**
```json
{
  "name": "My Endpoint",
  "url": "https://api.example.com/webhook",
  "recipients": [
    "01234567890",
    "01987654321"
  ],
  "emails": [
    "user@example.com",
    "admin@example.com"
  ]
}
```

**Required Fields:**
- `name`: Unique endpoint name
- `url`: Webhook URL to call for notifications
- `recipients`: Array of phone numbers (Bangladeshi format)
- `emails`: Array of email addresses

**Phone Number Format:**
- Valid: `01234567890` (11 digits, starts with 01)
- Valid: `8801234567890` (country code prefix)
- Invalid: `1234567890` (too short)

**Response:**
```json
{
  "success": true,
  "message": "Endpoint created successfully",
  "endpoint": {
    "id": "endpoint_123",
    "name": "My Endpoint",
    "url": "https://api.example.com/webhook",
    "recipients": ["01234567890", "01987654321"],
    "emails": ["user@example.com"],
    "createdAt": "2024-01-15T10:30:00Z",
    "status": "active"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Endpoint name already exists"
}
```

#### PUT `/api/endpoints/update/:id`
Update existing endpoint.

**Request Body:**
```json
{
  "name": "Updated Name",
  "url": "https://new-api.example.com/webhook",
  "recipients": ["01234567890"],
  "emails": ["new@example.com"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Endpoint updated",
  "endpoint": { ... }
}
```

#### DELETE `/api/endpoints/delete/:id`
Delete an endpoint.

**Response:**
```json
{
  "success": true,
  "message": "Endpoint deleted"
}
```

#### GET `/api/endpoints/:id`
Get specific endpoint details.

**Response:**
```json
{
  "name": "My Endpoint",
  "url": "https://api.example.com/webhook",
  "recipients": ["01234567890"],
  "emails": ["user@example.com"],
  "status": "active",
  "notificationsSent": 42,
  "lastNotification": "2024-01-15T10:25:00Z"
}
```

---

### Mute Endpoints

#### POST `/api/endpoints/:id/mute`
Mute notifications for an endpoint.

**Request Body:**
```json
{
  "duration": 3600000,
  "reason": "Maintenance window"
}
```

**Parameters:**
- `duration`: Milliseconds (optional, default: 1 hour)
- `reason`: Mute reason (optional)

**Response:**
```json
{
  "success": true,
  "message": "Endpoint muted for 1 hour",
  "endpoint": {
    "id": "endpoint_123",
    "isMuted": true,
    "muteExpiresAt": "2024-01-15T11:30:00Z",
    "muteReason": "Maintenance window"
  }
}
```

#### POST `/api/endpoints/:id/unmute`
Unmute an endpoint.

**Response:**
```json
{
  "success": true,
  "message": "Endpoint unmuted",
  "endpoint": {
    "id": "endpoint_123",
    "isMuted": false
  }
}
```

#### GET `/api/endpoints/:id/mute-status`
Check if endpoint is muted.

**Response:**
```json
{
  "id": "endpoint_123",
  "isMuted": true,
  "muteExpiresAt": "2024-01-15T11:30:00Z",
  "reason": "Maintenance window"
}
```

---

### Monitoring & Status

#### GET `/api/status`
System health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "controlServer": "running",
    "gateway": "running",
    "database": "connected"
  },
  "endpoints": {
    "total": 5,
    "active": 4,
    "muted": 1
  },
  "notifications": {
    "todayCount": 142,
    "successCount": 140,
    "failureCount": 2
  }
}
```

#### GET `/api/logs`
Get recent logs (requires authentication).

**Query Parameters:**
```
limit=100       # Number of logs to return (default: 50)
offset=0        # Offset for pagination (default: 0)
level=error     # Filter by log level (error, warn, info, debug)
since=1hour     # Logs since (1hour, 1day, 1week)
```

**Example Request:**
```bash
curl "http://localhost:3000/api/logs?limit=100&level=error" \
  -H "Cookie: session=..."
```

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2024-01-15T10:30:45.123Z",
      "level": "INFO",
      "category": "ENDPOINT",
      "message": "Endpoint 'Banking API' notification queued"
    },
    {
      "timestamp": "2024-01-15T10:30:43.456Z",
      "level": "DEBUG",
      "category": "GATEWAY",
      "message": "SMS sent to 01234567890"
    }
  ],
  "total": 1250,
  "limit": 100,
  "offset": 0
}
```

#### GET `/api/stats`
Get statistics.

**Response:**
```json
{
  "endpoints": {
    "total": 5,
    "active": 4,
    "muted": 1
  },
  "notifications": {
    "today": 142,
    "week": 1024,
    "month": 4892,
    "success": 4850,
    "failed": 42
  },
  "sms": {
    "sent": 3200,
    "failed": 15
  },
  "email": {
    "sent": 1650,
    "failed": 27
  }
}
```

---

## Gateway API

These endpoints require `X-API-Key` header authentication.

### SMS Endpoints

#### GET `/api/sms/send`
Send SMS via GET request.

**Query Parameters:**
```
to:   Phone number (required) - 01234567890 or 8801234567890
text: Message text (required) - URL encoded
```

**Example Request:**
```bash
curl "http://localhost:9090/api/sms/send?to=01234567890&text=Hello%20World" \
  -H "X-API-Key: your-api-key"
```

**Response:**
```json
{
  "success": true,
  "message": "SMS queued for sending",
  "sms": {
    "id": "sms_abc123",
    "to": "01234567890",
    "text": "Hello World",
    "status": "queued",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### POST `/api/sms/send`
Send SMS via POST request (recommended for longer messages).

**Request Body:**
```json
{
  "to": "01234567890",
  "text": "This is a longer message that might contain special characters & symbols!",
  "endpoint": "Banking API",
  "priority": "high"
}
```

**Parameters:**
- `to`: Phone number (required)
- `text`: Message (required)
- `endpoint`: Endpoint name (optional, for tracking)
- `priority`: high/normal/low (optional, default: normal)

**Response:**
```json
{
  "success": true,
  "message": "SMS queued",
  "sms": {
    "id": "sms_xyz789",
    "to": "01234567890",
    "text": "Message text...",
    "status": "queued",
    "priority": "high"
  }
}
```

#### GET `/api/sms/status/:id`
Check SMS delivery status.

**Example Request:**
```bash
curl http://localhost:9090/api/sms/status/sms_abc123 \
  -H "X-API-Key: your-api-key"
```

**Response:**
```json
{
  "id": "sms_abc123",
  "to": "01234567890",
  "status": "delivered",
  "sentAt": "2024-01-15T10:30:02Z",
  "deliveredAt": "2024-01-15T10:30:15Z"
}
```

---

### Email Endpoints

#### POST `/api/email/send`
Send email notification.

**Request Body:**
```json
{
  "to": "user@example.com",
  "subject": "Transaction Alert",
  "text": "Plain text body",
  "html": "<h1>Transaction Alert</h1><p>Amount: 1000 BDT</p>",
  "endpoint": "Banking API",
  "cc": ["manager@example.com"],
  "bcc": ["audit@example.com"]
}
```

**Parameters:**
- `to`: Email address (required)
- `subject`: Email subject (required)
- `text`: Plain text body (required)
- `html`: HTML body (optional)
- `endpoint`: Endpoint name (optional)
- `cc`: CC recipients (optional, array)
- `bcc`: BCC recipients (optional, array)

**Response:**
```json
{
  "success": true,
  "message": "Email queued for sending",
  "email": {
    "id": "email_def456",
    "to": "user@example.com",
    "subject": "Transaction Alert",
    "status": "queued",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### POST `/api/email/send-bulk`
Send email to multiple recipients.

**Request Body:**
```json
{
  "recipients": [
    "user1@example.com",
    "user2@example.com",
    "user3@example.com"
  ],
  "subject": "System Notification",
  "text": "Important notification",
  "html": "<p>Important notification</p>"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Emails queued",
  "emailIds": [
    "email_abc1",
    "email_abc2",
    "email_abc3"
  ],
  "count": 3
}
```

#### GET `/api/email/status/:id`
Check email delivery status.

**Response:**
```json
{
  "id": "email_def456",
  "to": "user@example.com",
  "status": "sent",
  "sentAt": "2024-01-15T10:30:05Z"
}
```

---

### Kill Switch (Admin Only)

#### GET `/api/admin/kill-switch`
Get current kill switch status.

**Request:**
```bash
curl http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-api-key"
```

**Response:**
```json
{
  "gateway": true,
  "sms": true,
  "email": true,
  "lastToggled": "2024-01-15T10:25:00Z",
  "toggledBy": "admin"
}
```

**Status Values:**
- `true`: Service enabled
- `false`: Service disabled (kill switch active)

#### POST `/api/admin/kill-switch`
Toggle kill switch for services.

**Request Body:**
```json
{
  "gateway": false,
  "sms": true,
  "email": true,
  "reason": "Emergency: High SMS failure rate"
}
```

**Parameters:**
- `gateway`: Enable/disable entire gateway
- `sms`: Enable/disable SMS sending
- `email`: Enable/disable Email sending
- `reason`: Reason for toggle (optional)

**Response:**
```json
{
  "success": true,
  "message": "Kill switch updated",
  "status": {
    "gateway": false,
    "sms": true,
    "email": true
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### POST `/api/admin/kill-switch/all`
Emergency: Disable everything.

**Request:**
```bash
curl -X POST http://localhost:9090/api/admin/kill-switch/all \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"disable": true}'
```

**Response:**
```json
{
  "success": true,
  "message": "All services disabled",
  "status": {
    "gateway": false,
    "sms": false,
    "email": false
  }
}
```

---

### Gateway Status

#### GET `/api/health`
Gateway health check.

**Response:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "sms": {
      "enabled": true,
      "provider": "TeletalkClient",
      "lastCheck": "2024-01-15T10:30:00Z"
    },
    "email": {
      "enabled": true,
      "provider": "EmailClient",
      "lastCheck": "2024-01-15T10:29:55Z"
    }
  }
}
```

#### GET `/`
Gateway root endpoint.

**Response:**
```json
{
  "service": "Notification Gateway",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "sms": "/api/sms/send",
    "email": "/api/email/send",
    "health": "/api/health",
    "killSwitch": "/api/admin/kill-switch"
  }
}
```

---

## Response Formats

### Success Response

```json
{
  "success": true,
  "message": "Operation completed",
  "data": {
    // Response data here
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request validation failed",
    "details": {
      "field": "phone_number",
      "reason": "Invalid format"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [
    { /* item 1 */ },
    { /* item 2 */ },
    { /* item 3 */ }
  ],
  "pagination": {
    "total": 250,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Error Codes

### Common Error Codes

| Code | HTTP Status | Meaning | Solution |
|------|-------------|---------|----------|
| `INVALID_API_KEY` | 401 | API key missing or invalid | Check X-API-Key header |
| `UNAUTHORIZED` | 401 | Not authenticated | Login first or provide valid API key |
| `INVALID_REQUEST` | 400 | Request data invalid | Check request format and parameters |
| `NOT_FOUND` | 404 | Resource not found | Check resource ID/name |
| `CONFLICT` | 409 | Resource already exists | Use different name/ID |
| `RATE_LIMITED` | 429 | Too many requests | Wait before making more requests |
| `SERVER_ERROR` | 500 | Server error | Check logs, retry later |
| `GATEWAY_ERROR` | 503 | Gateway unavailable | Check if gateway is running |
| `INVALID_PHONE` | 400 | Invalid phone number | Use format: 01234567890 |
| `INVALID_EMAIL` | 400 | Invalid email address | Check email format |
| `SERVICE_DISABLED` | 503 | Service disabled (kill switch) | Re-enable in kill switch |

### Error Response Examples

**Invalid API Key:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API key is invalid or expired"
  }
}
```

**Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request validation failed",
    "details": {
      "field": "phone",
      "value": "123",
      "reason": "Phone number must be 11 digits"
    }
  }
}
```

**Rate Limited:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

---

## Examples

### Example 1: Complete SMS Workflow

```bash
#!/bin/bash

API_KEY="abc123def456..."

# 1. Check gateway health
echo "Checking gateway..."
curl http://localhost:9090/api/health \
  -H "X-API-Key: $API_KEY"

# 2. Send SMS
echo ""
echo "Sending SMS..."
curl -X POST http://localhost:9090/api/sms/send \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "01234567890",
    "text": "Test SMS",
    "priority": "high"
  }'

# 3. Check status
echo ""
echo "Checking status..."
curl http://localhost:9090/api/sms/status/sms_abc123 \
  -H "X-API-Key: $API_KEY"
```

### Example 2: Create Endpoint and Send Notification

```bash
#!/bin/bash

# Login and get session
curl -c cookies.txt -X POST http://localhost:3000/login \
  -d "username=admin&password=admin123"

# Create endpoint
curl -b cookies.txt -X POST http://localhost:3000/api/endpoints/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API",
    "url": "https://api.example.com/notify",
    "recipients": ["01234567890"],
    "emails": ["admin@example.com"]
  }'

# Get all endpoints
curl -b cookies.txt http://localhost:3000/api/endpoints | jq '.'
```

### Example 3: Bulk Email Send

```bash
#!/bin/bash

API_KEY="your-api-key"

curl -X POST http://localhost:9090/api/email/send-bulk \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      "user1@example.com",
      "user2@example.com",
      "user3@example.com"
    ],
    "subject": "Important Update",
    "html": "<h1>Update</h1><p>New features available</p>",
    "endpoint": "Email Campaign"
  }'
```

### Example 4: Emergency Kill Switch

```bash
#!/bin/bash

API_KEY="your-api-key"

echo "Activating emergency kill switch..."
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "gateway": false,
    "sms": false,
    "email": false,
    "reason": "Emergency: High error rate"
  }' | jq '.'

echo ""
echo "Services disabled. Use UI to re-enable."
```

### Example 5: Monitor with Logs

```bash
#!/bin/bash

# Get error logs from last hour
curl -s "http://localhost:3000/api/logs?level=error&since=1hour" \
  -H "Cookie: session=$SESSION" | jq '.logs[] | {timestamp, message}'
```

---

## Rate Limiting

### Rate Limits

By default, no rate limiting is applied. To enable:

**In .env:**
```
RATE_LIMIT_WINDOW=60000        # Window in milliseconds (1 minute)
RATE_LIMIT_MAX_REQUESTS=100    # Max requests per window
```

### Rate Limit Headers

When rate limiting is enabled, responses include:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705329000000
```

### Rate Limit Exceeded

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retryAfter": 45
  }
}
```

---

## Request/Response Examples

### Curl Examples

**SMS Send:**
```bash
curl -X POST http://localhost:9090/api/sms/send \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "01234567890",
    "text": "Hello!"
  }' | jq '.'
```

**Email Send:**
```bash
curl -X POST http://localhost:9090/api/email/send \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Test",
    "text": "Test email",
    "html": "<p>Test</p>"
  }' | jq '.'
```

**Create Endpoint:**
```bash
curl -X POST http://localhost:3000/api/endpoints/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API1",
    "url": "https://example.com/hook",
    "recipients": ["01234567890"],
    "emails": ["user@example.com"]
  }' | jq '.'
```

### JavaScript Examples

```javascript
// Send SMS
const response = await fetch('http://localhost:9090/api/sms/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    to: '01234567890',
    text: 'Hello!'
  })
});

const result = await response.json();
console.log(result);
```

### Python Examples

```python
import requests
import json

API_KEY = 'your-api-key'
headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# Send SMS
data = {
    'to': '01234567890',
    'text': 'Hello from Python!'
}

response = requests.post(
    'http://localhost:9090/api/sms/send',
    headers=headers,
    json=data
)

print(response.json())
```

---

## Best Practices

1. **Always use HTTPS in production**
2. **Keep API keys secure** - don't commit to git
3. **Use POST for sensitive data** instead of GET
4. **Implement retry logic** for failed requests
5. **Log all API calls** for audit trail
6. **Monitor rate limits** to avoid throttling
7. **Validate input** before sending
8. **Handle errors gracefully** in your code
9. **Use bulk APIs** when sending multiple items
10. **Check kill switch status** before assuming service is available

---

## বাংলা API উদাহরণ

### SMS পাঠানো

```bash
curl -X POST http://localhost:9090/api/sms/send \
  -H "X-API-Key: আপনার-এপিআই-কী" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "01234567890",
    "text": "আপনার লেনদেন সফল হয়েছে"
  }'
```

### ইমেইল পাঠানো

```bash
curl -X POST http://localhost:9090/api/email/send \
  -H "X-API-Key: আপনার-এপিআই-কী" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "লেনদেন বিজ্ঞপ্তি",
    "text": "আপনার লেনদেন সফল হয়েছে"
  }'
```

### Endpoint তৈরি করা

```bash
curl -X POST http://localhost:3000/api/endpoints/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "আমার API",
    "url": "https://api.example.com/notify",
    "recipients": ["01234567890"],
    "emails": ["admin@example.com"]
  }'
```

---

**Last Updated**: 2024
**Status**: ✓ Complete API Reference
