# Kill Switch Documentation

## Overview

The Kill Switch is an emergency mechanism to instantly disable SMS and/or Email services without restarting the server. This is critical for emergency situations where you need to immediately stop sending notifications.

## Features

- **Instant Toggle**: No server restart required
- **Granular Control**: Disable entire gateway, only SMS, or only Email
- **Runtime Control**: Toggle via API or environment variables
- **Protected**: Requires API authentication
- **Persistent**: Can be set permanently via environment variables

## Types of Kill Switches

### 1. Gateway Kill Switch
Disables the entire gateway - both SMS and Email services.

### 2. SMS Kill Switch
Disables only SMS sending. Email continues to work.

### 3. Email Kill Switch
Disables only Email sending. SMS continues to work.

## Setup

### Environment Variables (Static Configuration)

Edit `email-sms-gateway/.env`:

```bash
# Emergency Kill Switch (set to false to disable services)
GATEWAY_ENABLED=true   # Main gateway switch
SMS_ENABLED=true       # SMS service switch
EMAIL_ENABLED=true     # Email service switch
```

**Values:**
- `true` = Service enabled (default)
- `false` = Service disabled

**Note**: Requires server restart to apply changes.

## Runtime Control (Recommended)

### Enable/Disable via API

No server restart needed. Changes apply immediately.

#### Disable Entire Gateway

```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"gateway": false}'
```

#### Enable Gateway

```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"gateway": true}'
```

#### Disable Only SMS

```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"sms": false}'
```

#### Disable Only Email

```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"email": false}'
```

#### Disable Both Services (Keep Gateway Running)

```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"sms": false, "email": false}'
```

### Check Kill Switch Status

```bash
curl http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-secret-key"
```

**Response:**
```json
{
  "status": "OK",
  "killSwitch": {
    "gateway": true,
    "sms": true,
    "email": false
  }
}
```

### Check Health Status

Public endpoint (no authentication required):

```bash
curl http://localhost:9090/
```

**Response when services are running:**
```json
{
  "status": "OK",
  "message": "SMS & Email Gateway is running",
  "version": "1.0.0",
  "services": {
    "gateway": "enabled",
    "sms": "enabled",
    "email": "enabled"
  }
}
```

**Response when gateway is disabled:**
```json
{
  "status": "DISABLED",
  "message": "Gateway is currently disabled (Kill Switch Active)",
  "version": "1.0.0",
  "services": {
    "gateway": "disabled",
    "sms": "disabled",
    "email": "disabled"
  }
}
```

## Error Responses

### When Service is Disabled

#### Gateway Kill Switch Active

```json
{
  "status": "ERROR",
  "error": "Gateway is currently disabled (Emergency Kill Switch Active)",
  "service": "all"
}
```

HTTP Status: `503 Service Unavailable`

#### SMS Service Disabled

```json
{
  "status": "ERROR",
  "error": "SMS service is currently disabled",
  "service": "sms"
}
```

HTTP Status: `503 Service Unavailable`

#### Email Service Disabled

```json
{
  "status": "ERROR",
  "error": "Email service is currently disabled",
  "service": "email"
}
```

HTTP Status: `503 Service Unavailable`

## Use Cases

### 1. Emergency Shutdown

**Scenario**: Billing issue, need to stop all notifications immediately.

**Action**:
```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"gateway": false}'
```

### 2. SMS Provider Maintenance

**Scenario**: Teletalk SMS gateway is down for maintenance.

**Action**:
```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"sms": false}'
```

Email continues to work. Re-enable SMS after maintenance.

### 3. Email Server Issues

**Scenario**: SMTP server is experiencing issues.

**Action**:
```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"email": false}'
```

SMS continues to work. Re-enable email after resolution.

### 4. Rate Limit Protection

**Scenario**: Approaching SMS/Email quota limits.

**Action**: Disable specific service temporarily to prevent overages.

### 5. Testing & Debugging

**Scenario**: Testing notification logic without actually sending.

**Action**: Disable services during testing, re-enable for production.

## Integration with Monitoring

### Automated Kill Switch

You can integrate with monitoring systems to automatically trigger kill switches:

```bash
#!/bin/bash
# Example: Disable gateway if error rate exceeds threshold

ERROR_RATE=$(check_error_rate)
if [ $ERROR_RATE -gt 50 ]; then
  curl -X POST http://localhost:9090/api/admin/kill-switch \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"gateway": false}'
  
  # Send alert
  echo "ALERT: Gateway disabled due to high error rate"
fi
```

### Status Monitoring

```bash
#!/bin/bash
# Check kill switch status periodically

STATUS=$(curl -s http://localhost:9090/ | jq -r '.status')

if [ "$STATUS" = "DISABLED" ]; then
  echo "WARNING: Gateway is disabled"
  # Send notification to admins
fi
```

## Client Behavior

When the kill switch is active, client applications (notification system) will receive 503 errors:

- **SMS Module**: Will log error and skip sending
- **Email Module**: Will log error and skip sending
- **Scheduler**: Continues checking but won't send notifications

This prevents notification loss - the system will attempt to send again on the next check cycle after services are re-enabled.

## Best Practices

### 1. Document Procedures

Create runbooks for:
- When to activate kill switch
- Who has authority to activate
- How to re-enable services
- Communication protocols

### 2. Test Regularly

- Test kill switch activation monthly
- Verify monitoring alerts work
- Practice emergency procedures

### 3. Monitor Status

- Set up alerts for kill switch activation
- Log all kill switch changes
- Review logs regularly

### 4. Gradual Re-enabling

After an incident:
1. Investigate root cause
2. Fix the issue
3. Enable one service at a time
4. Monitor for issues before enabling next service

### 5. Combine with Rate Limiting

- Use kill switch for immediate stop
- Implement rate limiting for gradual control
- Monitor quotas and usage

## Logging

All kill switch changes are logged to console:

```
[ADMIN] Kill Switch Updated: { gateway: false, sms: true, email: true }
```

Monitor these logs to track who activated/deactivated services and when.

## Security

### Authentication Required

All kill switch management endpoints require API authentication:

```bash
-H "X-API-Key: your-secret-key"
```

Without valid authentication, requests will be rejected with 401 Unauthorized.

### Protect API Keys

- Store API keys securely
- Don't expose in client-side code
- Use environment variables
- Rotate keys periodically

## Troubleshooting

### Kill Switch Not Working

**Check:**
1. API key is correct
2. Request format is valid JSON
3. Content-Type header is set
4. Server logs for errors

### Can't Re-enable Services

**Check:**
1. Not blocked by environment variables (check `.env`)
2. Server is running
3. No network connectivity issues

### Services Stay Disabled After Restart

**Check:**
1. Environment variables in `.env` file
2. Set to `true` to enable by default
3. Restart server after changing `.env`

## বাংলা সারসংক্ষেপ

### জরুরি পরিস্থিতিতে সব বন্ধ করুন

```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: আপনার-কী" \
  -H "Content-Type: application/json" \
  -d '{"gateway": false}'
```

### শুধু SMS বন্ধ করুন

```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: আপনার-কী" \
  -H "Content-Type: application/json" \
  -d '{"sms": false}'
```

### শুধু Email বন্ধ করুন

```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: আপনার-কী" \
  -H "Content-Type: application/json" \
  -d '{"email": false}'
```

### সব চালু করুন

```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: আপনার-কী" \
  -H "Content-Type: application/json" \
  -d '{"gateway": true, "sms": true, "email": true}'
```

### স্ট্যাটাস চেক করুন

```bash
curl http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: আপনার-কী"
```

### বৈশিষ্ট্য

- ✅ তাৎক্ষণিক চালু/বন্ধ - রিস্টার্ট লাগবে না
- ✅ আলাদাভাবে SMS/Email নিয়ন্ত্রণ
- ✅ API Key দিয়ে সুরক্ষিত
- ✅ হেলথ চেক endpoint
- ✅ স্বয়ংক্রিয় লগিং

### ব্যবহারের উদাহরণ

1. **জরুরি পরিস্থিতি**: সব বন্ধ করুন (`gateway: false`)
2. **SMS Provider সমস্যা**: শুধু SMS বন্ধ (`sms: false`)
3. **Email সমস্যা**: শুধু Email বন্ধ (`email: false`)
4. **টেস্টিং**: Testing এর সময় বন্ধ, পরে চালু করুন
