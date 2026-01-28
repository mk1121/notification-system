# Gateway Authentication Documentation

## Overview

The SMS/Email Gateway supports API Key authentication to secure all endpoints. This prevents unauthorized access to your gateway services.

## Features

- **API Key Authentication**: Simple header-based authentication
- **Optional**: Can be disabled for backward compatibility
- **Protected Endpoints**: All SMS and Email sending endpoints require authentication
- **Admin Endpoints**: Kill switch management also requires authentication

## Setup

### 1. Configure API Key

Edit the gateway's `.env` file:

```bash
# API Authentication (optional - leave empty to disable)
API_KEY=your-secret-api-key-here
```

**Important**: Use a strong, random API key. Generate one using:
```bash
# Linux/Mac
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Configure Client

Edit the main app's `.env` file:

```bash
# SMS/Email Gateway Authentication (optional)
GATEWAY_API_KEY=your-secret-api-key-here
```

**Note**: The API key must match on both server and client.

### 3. Restart Services

```bash
# Restart gateway server
cd email-sms-gateway
npm start

# Restart main application
cd ../controllerServer
npm start
```

## Usage

### Authentication Headers

All protected endpoints require one of these headers:

**Option 1: X-API-Key Header (Recommended)**
```bash
curl -H "X-API-Key: your-secret-api-key-here" \
     http://localhost:9090/api/sms/send?to=01234567890&text=Test
```

**Option 2: Authorization Bearer Token**
```bash
curl -H "Authorization: Bearer your-secret-api-key-here" \
     http://localhost:9090/api/sms/send?to=01234567890&text=Test
```

### Protected Endpoints

The following endpoints require authentication:

- `GET /api/sms/send` - Send SMS
- `POST /api/email/send` - Send Email
- `POST /api/email/send-batch` - Send Bulk Email
- `POST /api/admin/kill-switch` - Toggle Kill Switch
- `GET /api/admin/kill-switch` - Get Kill Switch Status

### Public Endpoints

These endpoints do NOT require authentication:

- `GET /` - Health check

## Disabling Authentication

To disable authentication (not recommended for production):

1. Remove or leave empty the `API_KEY` in gateway's `.env`:
```bash
API_KEY=
```

2. Restart the gateway server

When `API_KEY` is empty, authentication is skipped for backward compatibility.

## Error Responses

### 401 Unauthorized

When API key is missing or invalid:

```json
{
  "status": "ERROR",
  "error": "Unauthorized - Invalid API Key"
}
```

**Causes:**
- API key not provided in headers
- API key doesn't match server configuration
- Wrong header format

**Solutions:**
- Verify API key matches on both client and server
- Check header format: `X-API-Key: your-key` or `Authorization: Bearer your-key`
- Ensure `.env` files are loaded properly

## Security Best Practices

### 1. Use Strong API Keys
- Minimum 32 characters
- Random alphanumeric characters
- Don't use predictable values

### 2. Keep Keys Secret
- Never commit `.env` files to git
- Use environment variables in production
- Rotate keys periodically

### 3. Use HTTPS in Production
- API keys are transmitted in headers
- Use SSL/TLS to encrypt traffic
- Consider using a reverse proxy (nginx, Apache)

### 4. Monitor Access Logs
- Review gateway logs regularly
- Watch for failed authentication attempts
- Set up alerts for suspicious activity

### 5. Separate Keys by Environment
- Use different keys for dev/staging/production
- Don't reuse keys across environments

## Testing Authentication

### Test with Valid Key

```bash
curl -v -H "X-API-Key: your-secret-key" \
     "http://localhost:9090/api/sms/send?to=01234567890&text=Test"
```

**Expected**: Status 200, SMS sent

### Test with Invalid Key

```bash
curl -v -H "X-API-Key: wrong-key" \
     "http://localhost:9090/api/sms/send?to=01234567890&text=Test"
```

**Expected**: Status 401, Unauthorized error

### Test without Key

```bash
curl -v "http://localhost:9090/api/sms/send?to=01234567890&text=Test"
```

**Expected**: Status 401, Unauthorized error (if API_KEY is configured)

## Troubleshooting

### Problem: Always getting 401 errors

**Check:**
1. API key matches in both `.env` files
2. `.env` file is in the correct location
3. Server was restarted after changing `.env`
4. Header is correctly formatted

### Problem: Authentication not working

**Check:**
1. `dotenv` package is installed: `npm ls dotenv`
2. `.env` file is being loaded: Add `console.log(process.env.API_KEY)` temporarily
3. No typos in environment variable names

### Problem: Works locally but not in production

**Check:**
1. `.env` file exists in production
2. Environment variables are properly set
3. File permissions allow reading `.env`
4. Server has been restarted

## বাংলা সারসংক্ষেপ

### সেটআপ করুন

1. **Gateway Server এ** (email-sms-gateway/.env):
```bash
API_KEY=আপনার-সিক্রেট-কী
```

2. **Main App এ** (/.env):
```bash
GATEWAY_API_KEY=আপনার-সিক্রেট-কী
```

3. **উভয় সার্ভার রিস্টার্ট করুন**

### ব্যবহার করুন

সব API request এ header পাঠান:
```bash
X-API-Key: আপনার-সিক্রেট-কী
```

### নিরাপত্তা টিপস

- শক্তিশালী, র‍্যান্ডম API key ব্যবহার করুন
- `.env` file কখনো git এ commit করবেন না
- Production এ HTTPS ব্যবহার করুন
- নিয়মিত API key পরিবর্তন করুন
