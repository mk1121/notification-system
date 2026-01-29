# Complete Setup Guide

## Table of Contents
1. [Pre-Setup Checklist](#pre-setup-checklist)
2. [Initial Configuration](#initial-configuration)
3. [Database/State Setup](#database-state-setup)
4. [User Management](#user-management)
5. [Adding Your First Endpoint](#adding-your-first-endpoint)
6. [Testing Configuration](#testing-configuration)
7. [Verification](#verification)

---

## Pre-Setup Checklist

Before starting setup, verify:

- [ ] Installation completed (see [INSTALLATION.md](./INSTALLATION.md))
- [ ] Node.js v18+ installed: `node --version`
- [ ] npm v9+ installed: `npm --version`
- [ ] `.env` file created and configured
- [ ] State files created
- [ ] User credentials set
- [ ] Ports 3000 and 9090 available
- [ ] Network connectivity available

---

## Initial Configuration

### Step 1: Verify Environment Files

**Check Main App Config** (`.env`):
```bash
cd /path/to/notification

# View config
cat .env

# Should contain:
# NODE_ENV=development
# CONTROL_SERVER_PORT=3000
# CONTROL_SERVER_URL=http://localhost:3000
# GATEWAY_API_KEY=<your-generated-key>
```

**Check Gateway Config** (`email-sms-gateway/.env`):
```bash
cd email-sms-gateway

# View config
cat .env

# Should contain:
# PORT=9090
# API_KEY=<your-generated-key>
# GATEWAY_ENABLED=true
# SMS_ENABLED=true
# EMAIL_ENABLED=true
```

**Verify API Keys Match:**
```bash
# From main app directory
echo "Main API Key: $(grep GATEWAY_API_KEY .env | cut -d= -f2)"
echo "Gateway API Key: $(grep 'API_KEY=' email-sms-gateway/.env | cut -d= -f2)"

# Output should be identical
```

### Step 2: Configure Email Gateway (Optional)

For email notifications to work:

```bash
# Edit gateway config
nano email-sms-gateway/.env
```

Set email configuration:
```env
# Gmail SMTP Example
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password    # Not your Gmail password!
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Payment Notifications
```

**Gmail App Password:**
1. Go to https://myaccount.google.com/
2. Select "Security" in left menu
3. Enable "2-Step Verification"
4. Find "App passwords"
5. Select "Mail" and "Windows Computer"
6. Copy 16-character password
7. Use in EMAIL_PASSWORD

### Step 3: Configure SMS Gateway (Optional)

For SMS notifications:

```bash
# Edit gateway config
nano email-sms-gateway/.env
```

Set SMS configuration:
```env
# Teletalk Configuration
TELETALK_USER=your_username
TELETALK_USER_ID=your_user_id
TELETALK_ENCR_KEY=your_encryption_key
TELETALK_PASSWORD=your_password
TELETALK_BASE_URL=https://bulksms.teletalk.com.bd/jlinktbls.php
```

Contact Teletalk to get credentials.

### Step 4: Start Services

**Terminal 1: Start Gateway**
```bash
cd email-sms-gateway
npm start

# Output should show:
# [2026-01-28 16:30:45] [INFO] [SERVER] Server: http://0.0.0.0:9090
# [2026-01-28 16:30:45] [INFO] [SERVER] Access: http://localhost:9090
```

**Terminal 2: Start Main Application**
```bash
cd controllerServer
npm start

# Output should show:
# [2026-01-28 16:30:50] [INFO] [SERVER] Setup Wizard: http://localhost:3000/setup/ui
# [2026-01-28 16:30:50] [INFO] [SERVER] Endpoints: http://localhost:3000/endpoints/ui
```

**Terminal 3: Monitor Services**
```bash
# Keep running to check logs
tail -f /tmp/gateway.log /tmp/control.log
```

---

## Database/State Setup

### Understanding State Files

The system uses JSON files for state management:

**`config-state.json`** - Endpoint configurations
**`notification-state.json`** - Notification processing state
**`users.json`** - User credentials

### Create Initial State Files

```bash
cd controllerServer

# 1. Create endpoint config
cat > config-state.json << 'EOF'
{
  "endpoints": {}
}
EOF

# 2. Create notification state
cat > notification-state.json << 'EOF'
{
  "processedItems": {},
  "muteStatus": {},
  "endpoints": []
}
EOF

# 3. Create users (IMPORTANT: Change password!)
cat > users.json << 'EOF'
{
  "admin": {
    "username": "admin",
    "password": "your-secure-password-here",
    "role": "admin",
    "createdAt": "2026-01-28T00:00:00Z"
  }
}
EOF

# 4. Secure users file
chmod 600 users.json

# 5. Verify files created
ls -la *.json
```

### Backup State Files

Create backup before making changes:

```bash
# Backup configuration
cp config-state.json config-state.json.bak
cp notification-state.json notification-state.json.bak
cp users.json users.json.bak

# Archive backups
tar -czf backup-$(date +%Y%m%d).tar.gz *.json.bak
```

---

## User Management

### Default Credentials

By default:
- **Username**: `admin`
- **Password**: `your-secure-password-here` (as set in `users.json`)

**IMPORTANT**: Change this immediately!

### Add New User

Edit `controllerServer/users.json`:

```json
{
  "admin": {
    "username": "admin",
    "password": "secure-password-123",
    "role": "admin",
    "createdAt": "2026-01-28T00:00:00Z"
  },
  "operator": {
    "username": "operator",
    "password": "operator-password-456",
    "role": "operator",
    "createdAt": "2026-01-28T00:00:00Z"
  }
}
```

**Note**: Currently all users have same access level. Future: implement role-based access.

### Change Password

Edit `users.json` and update password for user:

```json
{
  "admin": {
    "username": "admin",
    "password": "new-secure-password-789",
    "role": "admin",
    "createdAt": "2026-01-28T00:00:00Z"
  }
}
```

Restart both servers for changes to take effect.

### Reset All Users

```bash
cd controllerServer

# Delete users.json
rm users.json

# Recreate with defaults
cat > users.json << 'EOF'
{
  "admin": {
    "username": "admin",
    "password": "change-me",
    "role": "admin"
  }
}
EOF

chmod 600 users.json
```

---

## Adding Your First Endpoint

### Step 1: Access Setup UI

1. **Start both servers** (as shown above)
2. **Open browser**: http://localhost:3000
3. **Login with credentials**: 
   - Username: `admin`
   - Password: (as set in users.json)

### Step 2: Create First Endpoint

Click "Setup Wizard" or go to http://localhost:3000/setup/ui

**Fill in endpoint details:**

**Basic Information**
```
Tag: bank                    # Unique identifier (no spaces)
API Endpoint: https://api.example.com/transactions
Method: GET                  # GET or POST
Enable: ✓ (checked)
```

**Authentication**
```
Auth Type: bearer            # '', 'bearer', or 'basic'
Auth Token: your-bearer-token

# Or for basic auth:
Auth Username: username
Auth Password: password
```

**Query Parameters** (Optional)
```
Key: limit
Value: 100

Key: status
Value: pending
```

**Notification Settings**
```
Check Interval: 30000        # milliseconds (30 seconds)
Enable SMS: ✓
Enable Email: ✓
Enable Manual Mute: ✓
Enable Recovery Email: ✓
```

**Contact Information**
```
Phone Numbers: 01712345678, 01987654321
Email Addresses: admin@example.com, ops@example.com
```

**Data Mapping**
```
Items Path: items            # JSON path to items array
Item ID Path: id            # Path to item ID
Timestamp Path: created_at  # Path to timestamp
Title Path: title           # Path to title (optional)
Details Path: description   # Path to details (optional)
```

### Step 3: Save Configuration

Click **"Save Configuration"** button

**Success Response:**
```json
{
  "ok": true,
  "message": "Configuration saved successfully",
  "tag": "bank"
}
```

### Step 4: Verify Endpoint

Go to **Endpoints UI**: http://localhost:3000/endpoints/ui

You should see your endpoint listed with:
- Name: `bank`
- Status: `ACTIVE` or `INACTIVE`
- Last Check: Recent timestamp
- Next Check: Future timestamp

---

## Testing Configuration

### Step 1: Manual API Test

Test if your endpoint is accessible:

```bash
# Replace with your endpoint details
curl -X GET https://api.example.com/transactions \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json"

# Should return JSON with items array
```

### Step 2: Test Notifications

After endpoint is configured, the scheduler will:

1. **Check endpoint** every 30 seconds (or configured interval)
2. **Fetch transactions** from your API
3. **Detect new items** based on ID and timestamp
4. **Send notifications** via SMS/Email if configured

**Check logs** to see activity:

```bash
# Gateway logs
tail -f email-sms-gateway.log

# Control server logs
tail -f controllerServer.log

# File-based logs
tail -f controllerServer/notification.log
```

### Step 3: Trigger Test Notification

You can manually test notification system:

```bash
# Test SMS
curl -X GET "http://localhost:9090/api/sms/send?to=01234567890&text=Test%20SMS" \
  -H "X-API-Key: your-api-key"

# Test Email
curl -X POST "http://localhost:9090/api/email/send" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "text": "This is a test email"
  }'
```

**Check Response:**
- Should return `{"status": "OK", ...}`
- Check logs for details
- Verify SMS/Email received

---

## Verification

### Complete Setup Checklist

- [ ] Both servers running
- [ ] Can access http://localhost:3000
- [ ] Can login with credentials
- [ ] First endpoint created
- [ ] Endpoint marked as ACTIVE
- [ ] SMS settings configured (if using SMS)
- [ ] Email settings configured (if using Email)
- [ ] Test notification sent successfully
- [ ] Logs showing activity
- [ ] Kill switch tested and working
- [ ] Authentication tested and working

### Performance Verification

```bash
# Check memory usage
ps aux | grep "node server.js"

# Check if servers are responsive
curl -s http://localhost:3000/ > /dev/null && echo "Control Server: OK"
curl -s http://localhost:9090/ > /dev/null && echo "Gateway Server: OK"

# Check CPU usage
top -b -n 1 | grep node
```

### Data Verification

```bash
cd controllerServer

# Check endpoint configuration
cat config-state.json | python -m json.tool

# Check notification state
cat notification-state.json | python -m json.tool

# Check logs
tail -100 notification.log
```

---

## Troubleshooting Setup

### "Cannot connect to API endpoint"

**Issue**: Scheduler can't reach your API

**Solutions**:
1. Verify endpoint URL is correct
2. Check authentication (bearer token, credentials)
3. Verify network connectivity: `ping api.example.com`
4. Check firewall allows outbound connections
5. Test directly: `curl https://api.example.com/transactions`

### "SMS/Email not sending"

**Issue**: Notifications not being sent

**Solutions**:
1. Check SMS/Email enabled in endpoint config
2. Verify phone numbers/emails are valid
3. Test gateway directly (see Testing Configuration)
4. Check API_KEY matches on both servers
5. Verify gateway is running: `curl http://localhost:9090/`

### "Endpoint not checking"

**Issue**: Scheduler not running checks

**Solutions**:
1. Verify endpoint is marked ACTIVE
2. Check interval > 0
3. Verify scheduler is running (see logs)
4. Restart control server
5. Check file permissions: `ls -la config-state.json`

### "Login not working"

**Issue**: Cannot login to UI

**Solutions**:
1. Verify `users.json` exists: `ls -la controllerServer/users.json`
2. Check username/password are correct
3. Verify JSON format is valid
4. Clear browser cache/cookies
5. Restart control server
6. Check server logs for errors

---

## Next Steps

After successful setup:

1. **Monitor System**: Watch logs and logs UI
2. **Add More Endpoints**: Follow "Adding Your First Endpoint" for each API
3. **Configure Notifications**: Set phone numbers and email addresses
4. **Test Thoroughly**: Run test suite: `bash tests/quick-test.sh`
5. **Read Documentation**: Review [USAGE_GUIDE.md](./USAGE_GUIDE.md)
6. **Check API Reference**: See [API_REFERENCE.md](./email-sms-gateway/EMAIL_API_DOCS.md)

---

## Getting Help

For setup issues:

1. Check [INSTALLATION.md](./INSTALLATION.md)
2. Review logs: `tail -f /tmp/gateway.log`
3. Check file structure: `find controllerServer -type f`
4. Verify network: `curl http://localhost:9090/`
5. Review API docs: [EMAIL_API_DOCS.md](./email-sms-gateway/EMAIL_API_DOCS.md)

---

## বাংলা সেটআপ গাইড

### প্রাথমিক সেটআপ

```bash
# 1. Environment files চেক করুন
cat .env
cat email-sms-gateway/.env

# 2. সার্ভার শুরু করুন
cd email-sms-gateway && npm start &
cd ../controllerServer && npm start &

# 3. ব্রাউজারে যান
# http://localhost:3000
```

### প্রথম এন্ডপয়েন্ট যোগ করুন

1. Login করুন (admin/password)
2. Setup Wizard এ যান
3. API endpoint বিস্তারিত ভরুন
4. Phone numbers এবং email যোগ করুন
5. Save করুন

### পরীক্ষা করুন

```bash
# লগ দেখুন
tail -f controllerServer/notification.log

# টেস্ট SMS পাঠান
curl "http://localhost:9090/api/sms/send?to=01234567890&text=Test" \
  -H "X-API-Key: your-key"

# টেস্ট Email পাঠান
curl -X POST "http://localhost:9090/api/email/send" \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com", "subject":"Test", "text":"Test message"}'
```
