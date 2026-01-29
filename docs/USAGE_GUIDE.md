# Complete Usage Guide

## Table of Contents
1. [Web Interface](#web-interface)
2. [Managing Endpoints](#managing-endpoints)
3. [Monitoring Notifications](#monitoring-notifications)
4. [Managing Kill Switch](#managing-kill-switch)
5. [Viewing Logs](#viewing-logs)
6. [Managing Mute Status](#managing-mute-status)
7. [API Integration](#api-integration)
8. [Troubleshooting](#troubleshooting)

---

## Web Interface

### Accessing the System

**Main Dashboard**: http://localhost:3000
**Setup Wizard**: http://localhost:3000/setup/ui
**Endpoints Management**: http://localhost:3000/endpoints/ui
**Logs Viewer**: http://localhost:3000/logs/ui

### Login

1. Navigate to http://localhost:3000
2. Enter credentials:
   - **Username**: `admin` (default)
   - **Password**: (as configured in users.json)
3. Click **Login**

**Note**: All pages require authentication. Unauthorized access redirects to login.

---

## Managing Endpoints

### Creating an Endpoint

**Step 1: Navigate to Setup Wizard**
- URL: http://localhost:3000/setup/ui
- Requires login

**Step 2: Fill Endpoint Details**

**Basic Settings**
```
Tag: unique-identifier (e.g., "bank", "payment-api", "transaction-monitor")
API Endpoint: https://api.example.com/transactions
Method: GET or POST
Active: Checked (✓) - uncheck to disable
```

**Authentication**
```
Auth Type: 
  - blank: No authentication
  - bearer: Bearer token
  - basic: Basic auth (username:password)

Auth Token: (for bearer auth)
Auth Username: (for basic auth)
Auth Password: (for basic auth)
```

**Request Configuration** (Optional)
```
Headers: JSON object with custom headers
  Example: {"X-Custom-Header": "value"}

Query Parameters: Key-value pairs
  Key: limit        Value: 100
  Key: status       Value: pending

Body: JSON body (for POST requests)
  Example: {"filter": "active"}
```

**Notification Settings**
```
Check Interval: Milliseconds (e.g., 30000 = 30 seconds)
  Minimum: 5000 (5 seconds)
  Default: 30000
  
Enable SMS: Checked to send SMS notifications
Enable Email: Checked to send email notifications
Enable Manual Mute: Allow users to mute alerts temporarily
Enable Recovery Email: Send email when issue resolves
```

**Contact Information**
```
Phone Numbers: Comma-separated (e.g., 01712345678, 01987654321)
Email Addresses: Comma-separated (e.g., admin@example.com, ops@example.com)
```

**Data Mapping** (Critical for correct operation)
```
Items Path: JSON path to array of items (e.g., "items", "data.transactions")
Item ID Path: Path to unique identifier (e.g., "id", "transaction_id")
Timestamp Path: Path to creation time (e.g., "created_at", "timestamp")
Title Path: Optional - path to item title
Details Path: Optional - path to item description
```

**Example API Response Mapping**:
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": "TXN001",
        "created_at": "2026-01-28T10:00:00Z",
        "title": "Deposit",
        "description": "Deposit from account 123456"
      }
    ]
  }
}
```

**Mapping Configuration**:
```
Items Path: data.items
Item ID Path: id
Timestamp Path: created_at
Title Path: title
Details Path: description
```

**Step 3: Save Configuration**
- Click **Save Configuration**
- Receives confirmation with endpoint tag
- Endpoint is automatically activated

### Viewing Endpoints

**Go to Endpoints UI**: http://localhost:3000/endpoints/ui

**Shows for each endpoint**:
- ✓ Name/Tag
- ✓ Status (ACTIVE/INACTIVE)
- ✓ Last check time
- ✓ Next scheduled check
- ✓ Recent notifications
- ✓ Mute status
- ✓ Action buttons

### Editing an Endpoint

**From Endpoints UI**:
1. Find endpoint in list
2. Click **Edit** button (pencil icon)
3. Modify settings
4. Click **Save** button
5. Changes take effect immediately

**Note**: Existing processed items are preserved.

### Toggling Endpoint Status

**To Deactivate**:
1. Go to Endpoints UI
2. Click endpoint name
3. Toggle **Active** switch
4. Scheduler stops checking this endpoint

**To Reactivate**:
1. Go to Endpoints UI
2. Click endpoint name
3. Toggle **Active** switch
4. Scheduler resumes checking

### Deleting an Endpoint

**Warning**: This is permanent and cannot be undone!

```bash
# Via API (if available)
curl -X DELETE http://localhost:3000/api/endpoints/your-endpoint-tag \
  -H "Cookie: sessionid=your-session"

# Via File (backup first!)
# Edit controllerServer/config-state.json
# Remove the endpoint object
```

### Reset Endpoint

**To reset processed items** (useful if you want to re-process):

1. Go to Endpoints UI
2. Click endpoint
3. Click **Reset** button
4. Confirm action
5. All processed items are cleared
6. Next check will process all items again

---

## Monitoring Notifications

### Understanding the Notification Flow

```
1. Scheduler checks endpoint (every check interval)
   ↓
2. Fetches data from API
   ↓
3. Detects new items (by ID and timestamp)
   ↓
4. Checks mute status
   ↓
5. Sends SMS/Email to configured numbers
   ↓
6. Logs notification in notification.log
```

### Viewing Recent Notifications

**Go to Logs UI**: http://localhost:3000/logs/ui

**Filter by**:
- Endpoint tag (bank, payment-api, etc.)
- Date range
- Log type (SMS, EMAIL, MUTE, etc.)

**Displayed information**:
```
[Timestamp] [TYPE] [TAG] Details

Examples:
[2026-01-28 16:30:45] [EMAIL] [bank] Sent to: admin@example.com | Subject: 22 item(s) detected
[2026-01-28 16:30:45] [SMS] [bank] Sent to: 01712345678 | Message: 22 new transactions detected...
[2026-01-28 16:30:46] [MUTE] [bank] User muted item alerts
```

### Notification Status

**Successful**:
```
[2026-01-28 16:30:45] [EMAIL] [bank] Sent to: admin@example.com | Subject: [bank] 22 item(s) detected
✓ Email sent successfully to admin@example.com
```

**Failed**:
```
[2026-01-28 16:30:45] [ERROR] Sending failed: Connection refused
✗ Gateway not responding
```

**Muted**:
```
[2026-01-28 16:30:45] [MUTE] [bank] User muted item alerts
⊘ Notifications suppressed
```

### Tracking Individual Items

Each notification includes:
- **Endpoint Tag**: Which endpoint triggered
- **Item Count**: How many new items
- **Recipients**: Phone numbers and emails
- **Timestamp**: When notification was sent
- **Status**: Success or failure

---

## Managing Kill Switch

### Understanding Kill Switch

**Purpose**: Emergency mechanism to stop SMS/Email sending without restart

**Three levels**:
1. **Gateway Kill Switch**: Stops ALL SMS and Email
2. **SMS Kill Switch**: Stops only SMS, Email continues
3. **Email Kill Switch**: Stops only Email, SMS continues

### Emergency Shutdown

**Via API** (no restart needed):
```bash
# Disable entire gateway
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"gateway": false}'
```

**Response**:
```json
{
  "status": "OK",
  "message": "Kill switch updated",
  "killSwitch": {
    "gateway": false,
    "sms": true,
    "email": true
  }
}
```

### Disable Specific Services

**Disable SMS only**:
```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"sms": false}'
```

**Disable Email only**:
```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"email": false}'
```

### Check Kill Switch Status

```bash
curl http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-api-key"
```

**Response**:
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

### Re-enable Services

```bash
# Enable everything
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"gateway": true, "sms": true, "email": true}'
```

### Kill Switch via Environment Variable

For permanent disable (requires restart):

Edit `email-sms-gateway/.env`:
```env
GATEWAY_ENABLED=false
SMS_ENABLED=false
EMAIL_ENABLED=false
```

Then restart gateway.

---

## Viewing Logs

### Log UI

**Access**: http://localhost:3000/logs/ui

**Features**:
- Real-time log viewing
- Filter by endpoint tag
- Search by keyword
- Color-coded by type
- Sortable by date

### Log Types

| Type | Color | Meaning |
|------|-------|---------|
| SMS | Blue | SMS sent successfully |
| EMAIL | Green | Email sent successfully |
| MUTE | Yellow | Notification muted |
| UNMUTE | Cyan | Mute status cleared |
| ERROR | Red | Error occurred |
| SYSTEM | Gray | System message |

### Sample Log Output

```
[2026-01-28 16:30:00] [EMAIL] [bank] Sent to: admin@example.com | Subject: [bank] 22 item(s) detected
[2026-01-28 16:30:01] [SMS] [bank] Sent to: 01712345678 | Message: 22 item(s) detected...
[2026-01-28 16:30:45] [MUTE] [bank] User muted item alerts
[2026-01-28 16:30:46] [SYSTEM] Scheduler check completed for bank
```

### Log File Location

**Main Log**: `controllerServer/notification.log`

**Read current logs**:
```bash
# View last 100 lines
tail -100 controllerServer/notification.log

# Follow live updates
tail -f controllerServer/notification.log

# Search for specific endpoint
grep "\[bank\]" controllerServer/notification.log
```

### Log Rotation

Logs are appended to single file. To archive:

```bash
# Backup and clear log
cp controllerServer/notification.log logs/notification-backup-$(date +%Y%m%d).log
> controllerServer/notification.log

# Or compress old logs
gzip controllerServer/notification.log
```

---

## Managing Mute Status

### Muting Notifications

**Via UI**:
1. Go to Logs UI: http://localhost:3000/logs/ui
2. Find endpoint in list
3. Click **Mute** button
4. Notifications stop immediately

**Via API**:
```bash
curl -X POST http://localhost:3000/api/endpoints/bank/mute \
  -H "Cookie: sessionid=your-session"
```

### Unmuting Notifications

**Via UI**:
1. Go to Logs UI
2. Click **Unmute** button for muted endpoint

**Via API**:
```bash
curl -X POST http://localhost:3000/api/endpoints/bank/unmute \
  -H "Cookie: sessionid=your-session"
```

### Checking Mute Status

**Via UI**:
- Mute status shown in Endpoints UI
- Muted endpoints marked with ⊘ icon

**Via File**:
```bash
# Check notification-state.json
cat controllerServer/notification-state.json | jq '.muteStatus'
```

---

## API Integration

### Direct API Calls

**Send SMS**:
```bash
curl -X GET "http://localhost:9090/api/sms/send" \
  -H "X-API-Key: your-api-key" \
  --data-urlencode "to=01712345678" \
  --data-urlencode "text=Test message"
```

**Send Email**:
```bash
curl -X POST "http://localhost:9090/api/email/send" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Test Subject",
    "text": "Test message"
  }'
```

**Bulk Email**:
```bash
curl -X POST "http://localhost:9090/api/email/send-batch" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": ["user1@example.com", "user2@example.com"],
    "subject": "Bulk Test",
    "text": "Message for all recipients"
  }'
```

---

## Troubleshooting Usage

### Endpoint Not Checking

**Issue**: Scheduler not running checks

**Check**:
1. Is endpoint ACTIVE? (Endpoints UI)
2. Is interval > 0? (Edit endpoint)
3. Check scheduler logs: `grep scheduler controllerServer.log`
4. Verify API endpoint is accessible

**Solution**:
1. Toggle endpoint off/on to restart
2. Verify API connectivity: `curl https://your-api.com/endpoint`
3. Check endpoint configuration
4. Restart control server

### Notifications Not Sending

**Issue**: Notifications triggered but not received

**Check**:
1. Is SMS/Email enabled in endpoint config?
2. Are phone numbers/emails configured?
3. Is gateway running? `curl http://localhost:9090/`
4. Check kill switch status
5. Review logs for errors

**Solution**:
1. Verify phone numbers are valid
2. Test gateway directly: `curl -X GET http://localhost:9090/api/sms/send?to=01234567890&text=test`
3. Check API key configuration
4. Review gateway logs

### Wrong Items Detected

**Issue**: Detecting items that shouldn't be notified

**Check**:
1. Verify data mapping paths are correct
2. Check timestamp comparison logic
3. Verify item ID extraction

**Solution**:
1. Edit endpoint
2. Verify Items Path points to correct array
3. Verify ID Path points to unique identifier
4. Reset endpoint to clear processed items
5. Test again

---

## বাংলা ব্যবহার গাইড

### প্রথম এন্ডপয়েন্ট যোগ করুন

1. Setup Wizard এ যান
2. API endpoint URL ভরুন
3. Authentication type সেট করুন
4. Phone numbers এবং email যোগ করুন
5. Save করুন

### লগ দেখুন

```bash
tail -f controllerServer/notification.log
```

### Kill Switch ব্যবহার করুন

জরুরি পরিস্থিতিতে:
```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"gateway": false}'
```

### Mute/Unmute করুন

Logs UI থেকে মুট/আনমুট বাটন ক্লিক করুন।

### Test করুন

```bash
# Test SMS
curl "http://localhost:9090/api/sms/send?to=01234567890&text=Test" \
  -H "X-API-Key: your-key"

# Test Email
curl -X POST "http://localhost:9090/api/email/send" \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","text":"Test message"}'
```
