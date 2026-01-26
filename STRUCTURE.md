# Project Structure

```
notification/
├── controllerServer/           # Main notification system
│   ├── api.js                 # Payment API client
│   ├── config.js              # Static configuration defaults
│   ├── config-store.js        # Dynamic configuration manager
│   ├── control-server.js      # Web server for UI and API endpoints
│   ├── email.js               # Email notification sender
│   ├── logger.js              # Logging system
│   ├── scheduler.js           # Main scheduler and notification logic
│   ├── server.js              # Scheduler entry point
│   ├── sms.js                 # SMS notification sender
│   ├── config-state.json      # Runtime config overrides (auto-generated)
│   └── notification-state.json # System state persistence (auto-generated)
│
├── email-sms-gateway/         # SMS and Email gateway service
│   ├── server.js              # Gateway HTTP server
│   ├── teletalkClient.js      # Teletalk SMS API client
│   ├── emailClient.js         # SMTP email client
│   ├── test-send.js           # SMS testing script
│   ├── test-send-email.js     # Email testing script
│   ├── package.json           # Gateway dependencies
│   └── .env                   # Gateway credentials (git-ignored)
│
├── package.json               # Main project dependencies
├── README.md                  # Complete documentation
├── API.md                     # API reference
├── STRUCTURE.md               # This file
└── .git/                      # Git repository
```

## Module Descriptions

### controllerServer/

#### api.js
**Purpose:** Payment API client  
**Responsibilities:**
- Fetch transaction data from payment API
- Handle API errors and timeouts
- Return standardized response format
- Use dynamic configuration from config-store

**Key Functions:**
- `fetchTransactions()` - Get payment transactions from API

**Dependencies:**
- axios - HTTP client
- config-store - Dynamic configuration

---

#### config.js
**Purpose:** Static configuration defaults  
**Responsibilities:**
- Define default endpoints and settings
- Provide fallback values
- Export configuration constants

**Configuration:**
- `API_ENDPOINT` - Payment API URL
- `SMS_ENDPOINT` - SMS gateway URL
- `EMAIL_ENDPOINT` - Email gateway URL
- `CONTROL_SERVER_PORT` - Web server port (3000)
- `CONTROL_SERVER_URL` - Public URL for email links
- `ENABLE_SMS` - Default SMS toggle (true)
- `ENABLE_EMAIL` - Default email toggle (true)
- `ENABLE_MANUAL_MUTE` - Default manual mute toggle (true)
- `ENABLE_RECOVERY_EMAIL` - Send recovery emails (true)
- `CHECK_INTERVAL` - API poll interval (30 seconds)
- `PHONE_NUMBERS` - Default SMS recipients
- `EMAIL_ADDRESSES` - Default email recipients

---

#### config-store.js
**Purpose:** Dynamic configuration management  
**Responsibilities:**
- Load/save runtime configuration
- Merge with static defaults
- Normalize user input (arrays, booleans, numbers)
- Persist changes across restarts

**Key Functions:**
- `getConfig()` - Get merged configuration
- `setConfig(partial)` - Update configuration
- `toBool(value, fallback)` - Boolean parser
- `normalizeArray(value)` - Array parser

**Storage:** `config-state.json`

---

#### control-server.js
**Purpose:** Web server for UI and API  
**Responsibilities:**
- Serve configuration UI
- Expose REST API endpoints
- Handle mute/unmute requests
- Serve logging dashboard
- Manage HTML pages

**Endpoints:**
- `GET /config` - Get configuration JSON
- `POST /config` - Update configuration
- `GET /config/ui` - Configuration web UI
- `GET /state` - System state JSON
- `GET /api/logs` - Logs JSON with filters
- `DELETE /api/logs` - Clear all logs
- `GET /logs/ui` - Logs dashboard
- `GET /logs` - Plain text logs
- `GET /mute/payment/ui` - Payment mute form
- `GET /mute/payment` - Mute payment alerts
- `GET /mute/api` - Mute API alerts
- `GET /unmute/api` - Unmute API alerts
- `GET /reset/payment` - Reset payment state

**Port:** 3000 (configurable)

---

#### email.js
**Purpose:** Email notification sender  
**Responsibilities:**
- Send emails via gateway
- Format recipient list
- Handle HTML/text content
- Use dynamic configuration
- Log sending activities

**Key Functions:**
- `sendEmail(recipients, subject, text, html)` - Send email notification

**Dependencies:**
- axios - HTTP client
- config-store - Dynamic recipients and endpoint

---

#### logger.js
**Purpose:** System logging  
**Responsibilities:**
- Write logs to file with timestamps
- Asia/Dhaka timezone formatting
- Parse logs for API consumption
- Provide log filtering
- Clear logs functionality

**Key Functions:**
- `log(type, message)` - Generic log writer
- `logSmsSent(phones, message)` - Log SMS
- `logEmailSent(emails, subject)` - Log email
- `logMuteAction(type)` - Log mute
- `logUnmuteAction(type)` - Log unmute
- `logAutoUnmute(reason)` - Log auto-unmute
- `logApiFailure(error, status)` - Log API failure
- `logApiRecovery()` - Log API recovery
- `getLogs(lines)` - Get plain text logs
- `getLogsJSON(lines, type)` - Get parsed logs
- `clearLogs()` - Clear log file

**Log Types:**
- SMS, EMAIL, MUTE, UNMUTE, AUTO-UNMUTE
- API-FAILURE, API-RECOVERY, SYSTEM

**Storage:** `notification.log`

---

#### scheduler.js
**Purpose:** Main notification orchestrator  
**Responsibilities:**
- Poll payment API at intervals
- Detect failures and recoveries
- Send notifications (SMS/Email)
- Manage mute state and auto-unmute
- Track processed payments
- Apply configuration toggles

**Key Functions:**
- `checkAndNotify()` - Main check cycle
- `startScheduler()` - Initialize and start polling

**Logic Flow:**
1. Load dynamic configuration
2. Fetch API transactions
3. Handle API failure → Send failure alert
4. Handle API recovery → Send recovery email
5. Check payment mute status
6. Auto-unmute if timer expired or new payment
7. Send payment notifications (if not muted)
8. Track payment IDs

**Dependencies:**
- api.js - Fetch transactions
- sms.js - Send SMS
- email.js - Send emails
- logger.js - Log activities
- config-store - Get live configuration

---

#### server.js
**Purpose:** Scheduler entry point  
**Responsibilities:**
- Start scheduler process
- Handle graceful shutdown
- Log startup information

**Signals:** SIGINT, SIGTERM

---

#### sms.js
**Purpose:** SMS notification sender  
**Responsibilities:**
- Send SMS via gateway
- Format recipient list
- URL-encode messages
- Use dynamic configuration
- Log sending activities

**Key Functions:**
- `sendSMS(recipients, message)` - Send SMS notification

**Dependencies:**
- axios - HTTP client
- config-store - Dynamic recipients and endpoint

---

### email-sms-gateway/

#### server.js
**Purpose:** Gateway HTTP server  
**Responsibilities:**
- Expose SMS/Email endpoints
- Route requests to clients
- Handle errors
- CORS support

**Endpoints:**
- `GET /api/sms/send?to=01XXX&text=message` - Send SMS
- `POST /api/email/send` - Send email

**Port:** 9090 (configurable via .env)

---

#### teletalkClient.js
**Purpose:** Teletalk SMS integration  
**Responsibilities:**
- Connect to Teletalk gateway
- Format SMS requests
- Handle credentials
- Return send status

**Configuration (via .env):**
- `TELETALK_BASE_URL`
- `TELETALK_USERNAME`
- `TELETALK_PASSWORD`
- `TELETALK_MASK`

---

#### emailClient.js
**Purpose:** SMTP email integration  
**Responsibilities:**
- Connect to SMTP server
- Send HTML/text emails
- Handle attachments (if needed)
- Return send status

**Configuration (via .env):**
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`

---

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Start Scheduler                      │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Load Configuration (Dynamic)               │
│  • Get endpoints, intervals, toggles from config-store  │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│           Load State from notification-state.json       │
│  • Get mute status, last API status, payment IDs        │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                 Fetch API Transactions                  │
└───────────┬──────────────────────┬──────────────────────┘
            │                      │
         Success                Failure
            │                      │
            ▼                      ▼
┌──────────────────┐    ┌──────────────────────────────┐
│  Check Last      │    │   Update State: failure      │
│  Status was      │    │   Log API-FAILURE           │
│  Failure?        │    │                              │
└────┬─────────────┘    │   Check if API muted?       │
     │                  │                              │
    Yes                 └────┬──────────────┬──────────┘
     │                      Yes             No
     ▼                       │              │
┌──────────────────┐         │              ▼
│ Send Recovery    │         │    ┌─────────────────────┐
│ Email (if        │         │    │  Send API Failure   │
│ enabled)         │         │    │  Email (with mute   │
│ Log RECOVERY     │         │    │  button if enabled) │
└──────────────────┘         │    └─────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Skip failure  │
                    │  notification  │
                    └────────────────┘
                             │
┌──────────────────┬─────────┴──────────────────┐
│                  │                             │
│   Continue with payments processing            │
│                  │                             │
└──────────────────┴────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Check Payment Transactions                 │
│  • Track new payment IDs                                │
│  • Check mute timer expiry                              │
│  • Check for new payment IDs                            │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   Payment Muted?      │
        └────┬──────────┬───────┘
            Yes        No
             │          │
             │          ▼
             │  ┌─────────────────────────────┐
             │  │  Send SMS (if enabled)      │
             │  │  Send Email (if enabled)    │
             │  │  Log notifications          │
             │  └─────────────────────────────┘
             │
             ▼
    ┌─────────────────────┐
    │ Check auto-unmute:  │
    │ 1. Timer expired?   │
    │ 2. New payment ID?  │
    └────┬────────────┬───┘
        Yes          No
         │            │
         ▼            ▼
    ┌────────┐   ┌──────────┐
    │ Unmute │   │   Skip   │
    │  Log   │   │  notify  │
    └────────┘   └──────────┘
         │            │
         └────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│         Wait for CHECK_INTERVAL and Repeat              │
└─────────────────────────────────────────────────────────┘
```

## State Persistence

### config-state.json
Generated by: `config-store.js`  
Updated by: User via `/config` API  
Contains: Runtime configuration overrides

```json
{
  "PHONE_NUMBERS": ["01571306597"],
  "EMAIL_ADDRESSES": ["user@example.com"],
  "CHECK_INTERVAL_MINUTES": 0.5,
  "ENABLE_SMS": true,
  "ENABLE_EMAIL": true,
  "ENABLE_MANUAL_MUTE": true
}
```

### notification-state.json
Generated by: `scheduler.js`, `control-server.js`  
Updated by: System during operation  
Contains: Runtime state

```json
{
  "mutePayment": false,
  "mutePaymentUntil": null,
  "muteApi": false,
  "lastApiStatus": "success",
  "lastFailureMessage": "",
  "processedPaymentIds": ["PAY123", "PAY124"]
}
```

### notification.log
Generated by: `logger.js`  
Append-only log file  
Format: `[timestamp] [type] message`

---

## Component Dependencies

```
scheduler.js
  ├── api.js
  │   └── config-store.js
  ├── sms.js
  │   └── config-store.js
  ├── email.js
  │   └── config-store.js
  ├── logger.js
  └── config-store.js
      └── config.js

control-server.js
  ├── config-store.js
  │   └── config.js
  └── logger.js

server.js
  └── scheduler.js
      └── (all scheduler dependencies)
```

---

## File Permissions

Recommended permissions for production:

```bash
# Configuration files
chmod 600 config-state.json
chmod 600 notification-state.json
chmod 600 email-sms-gateway/.env

# Log file
chmod 644 notification.log

# Scripts
chmod 755 *.js

# Directories
chmod 755 controllerServer/
chmod 755 email-sms-gateway/
```

---

## Environment Variables

### Main System
Uses configuration files, no env vars needed.

### Gateway (.env)
```bash
# Teletalk
TELETALK_BASE_URL=https://vas.teletalk.com.bd/cgi-bin/httpnorm
TELETALK_USERNAME=your_username
TELETALK_PASSWORD=your_password
TELETALK_MASK=YourMask

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Server
PORT=9090
```

---

## Process Flow

### Startup Sequence
1. Load `config.js` defaults
2. Load `config-state.json` overrides
3. Merge configurations
4. Load `notification-state.json` state
5. Start control server (port 3000)
6. Start scheduler with CHECK_INTERVAL
7. Execute first API check immediately
8. Continue polling at intervals

### Shutdown Sequence
1. Receive SIGINT/SIGTERM
2. Log shutdown message
3. Exit gracefully (no cleanup needed, state already saved)

---

## Memory Footprint

Typical memory usage:
- Scheduler: ~30-50MB
- Control Server: ~30-50MB
- Gateway: ~30-50MB
- Total: ~100-150MB

Log file grows over time. Implement rotation if needed.

---

## Extension Points

To extend the system:

1. **Add new notification channel:**
   - Create `controllerServer/push.js` (example)
   - Add `ENABLE_PUSH` to config
   - Integrate in scheduler.js

2. **Add new mute logic:**
   - Extend state in notification-state.json
   - Add endpoint in control-server.js
   - Update scheduler mute checks

3. **Add authentication:**
   - Add middleware to control-server.js
   - Store credentials securely
   - Update API documentation

4. **Add database storage:**
   - Replace JSON files with DB queries
   - Keep same interfaces
   - Add connection pooling

5. **Add queue system:**
   - Add Redis/RabbitMQ client
   - Queue notifications instead of direct send
   - Add worker processes
