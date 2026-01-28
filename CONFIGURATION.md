# Configuration Reference

## 📋 Table of Contents

1. [Environment Variables](#environment-variables)
2. [Configuration Files](#configuration-files)
3. [State Files](#state-files)
4. [User Management](#user-management)
5. [Logging Configuration](#logging-configuration)
6. [Service Configuration](#service-configuration)
7. [Security Configuration](#security-configuration)
8. [Performance Configuration](#performance-configuration)
9. [Example Configurations](#example-configurations)

---

## 🔧 Environment Variables

### Control Server (.env)

```ini
# Environment
NODE_ENV=development              # development or production
CONTROL_SERVER_PORT=3000          # Web server port
LOG_LEVEL=debug                   # debug, info, warn, error

# Gateway Communication
GATEWAY_API_KEY=abc123...         # Must match gateway API_KEY
GATEWAY_URL=http://localhost:9090 # Gateway server URL

# External API
API_URL=https://api.example.com/transactions
API_POLLING_INTERVAL=5000         # How often to poll (ms)
API_TIMEOUT=10000                 # Request timeout (ms)
API_RETRY_COUNT=3                 # Retry attempts on failure

# Database (if using)
DATABASE_TYPE=json                # json or postgresql
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=notification
DATABASE_PASS=password
DATABASE_NAME=notification
DATABASE_POOL_SIZE=20             # Connection pool size

# Email Service
EMAIL_ENABLED=true
EMAIL_PROVIDER=sendgrid           # Provider name
EMAIL_API_KEY=your_sendgrid_key
EMAIL_FROM=notifications@example.com
EMAIL_FROM_NAME=Notification System

# SMS Service
SMS_ENABLED=true
SMS_PROVIDER=teletalk             # SMS provider
SMS_API_URL=https://api.teletalk.com.bd/sms/send
SMS_API_KEY=your_teletalk_key
SMS_API_TIMEOUT=5000

# Session Management
SESSION_SECRET=your-secret-key    # At least 32 characters
SESSION_TIMEOUT=3600000           # 1 hour in milliseconds
SESSION_SECURE=true               # Use secure cookies (HTTPS)
SESSION_HTTP_ONLY=true            # Prevent JS access to session

# Logging
LOG_FILE=./notification.log
LOG_MAX_SIZE=10m                  # Max log file size before rotation
LOG_MAX_FILES=7                   # Keep last N log files
LOG_FORMAT=json                   # json or text

# Timezone
TZ=Asia/Dhaka                     # Server timezone

# Feature Flags
FEATURE_MUTE_ENDPOINTS=true
FEATURE_BULK_SMS=true
FEATURE_BULK_EMAIL=true
FEATURE_WEBHOOK=true

# Rate Limiting (optional)
RATE_LIMIT_WINDOW=60000           # Window in ms
RATE_LIMIT_MAX_REQUESTS=100       # Max requests per window

# Cache
CACHE_ENABLED=true
CACHE_TTL=300000                  # 5 minutes

# CORS
CORS_ORIGIN=*                     # Or specific domain
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE
```

### Gateway (.env)

```ini
# Environment
NODE_ENV=development              # development or production
PORT=9090                         # Gateway port
LOG_LEVEL=debug                   # Log level

# Authentication
API_KEY=abc123...                 # Must match GATEWAY_API_KEY
AUTH_METHOD=bearer                # bearer or header
AUTH_HEADER=X-API-Key             # Custom header name

# Email Service
EMAIL_ENABLED=true
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=your_sendgrid_key
EMAIL_FROM=notifications@example.com
EMAIL_TIMEOUT=10000

# SMS Service
SMS_ENABLED=true
SMS_PROVIDER=teletalk
SMS_API_URL=https://api.teletalk.com.bd/sms/send
SMS_API_KEY=your_teletalk_key
SMS_TIMEOUT=5000
SMS_MAX_RETRIES=3

# Kill Switch
KILL_SWITCH_STATE=active          # active or paused
KILL_SWITCH_FILE=./kill-switch.json

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_PER_PHONE=10           # Max SMS per phone per minute

# Logging
LOG_FILE=/var/log/notification/gateway.log
LOG_LEVEL=info

# Timezone
TZ=Asia/Dhaka

# Queue (if using async)
QUEUE_ENABLED=false
QUEUE_TYPE=redis                  # redis or memory
QUEUE_URL=redis://localhost:6379
QUEUE_BATCH_SIZE=10               # Process X messages at once
QUEUE_BATCH_TIMEOUT=5000          # Wait X ms before processing batch
```

---

## 📁 Configuration Files

### config-state.json

**Purpose**: Store endpoint definitions

**Structure**:
```json
{
  "endpoints": {
    "endpoint_banking": {
      "id": "endpoint_banking",
      "name": "Banking API",
      "url": "https://api.example.com/webhook",
      "recipients": [
        "01234567890",
        "01987654321"
      ],
      "emails": [
        "admin@bank.example.com",
        "support@bank.example.com"
      ],
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "active": true,
      "metadata": {
        "description": "Bank transaction notifications",
        "priority": "high"
      }
    },
    "endpoint_ecommerce": {
      "id": "endpoint_ecommerce",
      "name": "E-Commerce",
      "url": "https://shop.example.com/notify",
      "recipients": ["01234567890"],
      "emails": ["shop@example.com"],
      "createdAt": "2024-01-15T11:00:00Z",
      "updatedAt": "2024-01-15T11:00:00Z",
      "active": true
    }
  }
}
```

**Adding Endpoint (Manual)**:
1. Open `config-state.json` in editor
2. Add new entry to `endpoints` object
3. Restart service (or auto-reload if enabled)

**Example Entry**:
```json
{
  "endpoints": {
    "my_endpoint": {
      "id": "my_endpoint",
      "name": "My Service",
      "url": "https://myapi.com/notify",
      "recipients": ["01234567890"],
      "emails": ["me@example.com"],
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "active": true
    }
  }
}
```

### notification-state.json

**Purpose**: Track processed notifications and mute status

**Structure**:
```json
{
  "processedItems": {
    "transaction_001": "2024-01-15T10:30:00Z",
    "transaction_002": "2024-01-15T10:31:00Z",
    "transaction_003": "2024-01-15T10:32:00Z"
  },
  "muteStatus": {
    "endpoint_banking": {
      "muted": true,
      "muteReason": "Maintenance window",
      "mutedAt": "2024-01-15T10:00:00Z",
      "expiresAt": "2024-01-15T11:00:00Z"
    },
    "endpoint_ecommerce": {
      "muted": false
    }
  },
  "stats": {
    "totalProcessed": 1523,
    "totalFailed": 23,
    "lastUpdate": "2024-01-15T10:32:00Z"
  }
}
```

**Manual Updates**:
```json
// Mute an endpoint for 1 hour
{
  "muteStatus": {
    "endpoint_id": {
      "muted": true,
      "expiresAt": "2024-01-15T11:30:00Z"
    }
  }
}

// Mark transaction as processed
{
  "processedItems": {
    "transaction_123": "2024-01-15T10:30:00Z"
  }
}
```

### users.json

**Purpose**: Store user credentials

**Structure**:
```json
{
  "admin": {
    "username": "admin",
    "password": "admin123",
    "role": "admin",
    "email": "admin@example.com",
    "createdAt": "2024-01-15T10:30:00Z",
    "lastLogin": "2024-01-15T15:30:00Z"
  },
  "operator": {
    "username": "operator",
    "password": "operator123",
    "role": "operator",
    "email": "operator@example.com"
  },
  "viewer": {
    "username": "viewer",
    "password": "viewer123",
    "role": "viewer",
    "email": "viewer@example.com"
  }
}
```

**User Roles**:
- `admin`: Full access, can manage everything
- `operator`: Can manage endpoints and mute
- `viewer`: Read-only access

**Adding User**:
```json
{
  "newuser": {
    "username": "newuser",
    "password": "securepassword",
    "role": "operator",
    "email": "newuser@example.com"
  }
}
```

---

## 💾 State Files

### How State Files Work

```
1. Application starts
   ↓
2. Read state files into memory
   ↓
3. Scheduler uses in-memory copy
   ↓
4. When changes made: Update file
   ↓
5. Reload into memory
   ↓
6. Process continues with updated state
```

### State File Operations

**Load State**:
```javascript
const fs = require('fs');
const state = JSON.parse(fs.readFileSync('./notification-state.json', 'utf8'));
```

**Save State**:
```javascript
fs.writeFileSync(
  './notification-state.json',
  JSON.stringify(state, null, 2),
  'utf8'
);
```

**Read Config**:
```javascript
const config = JSON.parse(fs.readFileSync('./config-state.json', 'utf8'));
const endpoints = config.endpoints;
```

### State File Backup

```bash
# Backup current state
cp notification-state.json notification-state.json.$(date +%s).bak

# Keep last 5 backups
ls -t notification-state.json.*.bak | tail -n +6 | xargs rm -f
```

---

## 👥 User Management

### Default Users

```json
{
  "admin": {
    "username": "admin",
    "password": "admin123",
    "role": "admin"
  }
}
```

### Creating Users

**Via JSON Edit**:
```json
{
  "newuser": {
    "username": "newuser",
    "password": "strong_password_123",
    "role": "operator"
  }
}
```

**Via API** (if implemented):
```bash
curl -X POST http://localhost:3000/api/users/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "strong_password",
    "role": "operator"
  }'
```

### User Roles

| Role | Permissions |
|------|-------------|
| admin | Create/edit/delete endpoints, manage users, access all logs |
| operator | Edit endpoints, mute endpoints, view logs |
| viewer | View endpoints, read-only logs |

### Changing Password

```json
// Edit users.json and update password field
{
  "admin": {
    "username": "admin",
    "password": "newpassword123",  // Changed
    "role": "admin"
  }
}
```

### Disabling User

```json
{
  "disableduser": {
    "username": "disableduser",
    "password": "...",
    "role": "viewer",
    "enabled": false  // Add this field
  }
}
```

---

## 📝 Logging Configuration

### Log Levels

```
ERROR    - Critical errors (service failure, crashes)
WARN     - Warnings (retry attempts, slow operations)
INFO     - Important info (service started, user logged in)
DEBUG    - Detailed info (processing steps, data values)
TRACE    - Very detailed (all operations, variable values)
```

### Log Format

**Development**:
```
[timestamp] [LEVEL] [CATEGORY] Message
[2024-01-15T10:30:45.123Z] [INFO] [AUTH] User 'admin' logged in
```

**Production** (JSON):
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "category": "AUTH",
  "message": "User 'admin' logged in",
  "userId": "admin",
  "source": "control-server.js"
}
```

### Configuring Log Output

```env
# File logging
LOG_FILE=./notification.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=7

# Console logging (development)
LOG_TO_CONSOLE=true
LOG_COLORS=true

# Syslog (production)
LOG_TO_SYSLOG=false
LOG_SYSLOG_HOST=localhost
LOG_SYSLOG_PORT=514

# Remote logging
LOG_REMOTE_URL=https://log-service.example.com/logs
LOG_REMOTE_TOKEN=your_token
```

### Log Analysis

**Find Errors**:
```bash
grep ERROR notification.log | head -20
```

**Find by Date**:
```bash
grep "2024-01-15" notification.log | tail -50
```

**Find by Category**:
```bash
grep "\[SMS\]" notification.log
grep "\[EMAIL\]" notification.log
grep "\[AUTH\]" notification.log
grep "\[ENDPOINT\]" notification.log
```

**Count Occurrences**:
```bash
grep ERROR notification.log | wc -l
grep -c "SMS sent" notification.log
```

---

## 🔧 Service Configuration

### Scheduler Configuration

```env
# Polling
API_POLLING_INTERVAL=5000        # Poll every 5 seconds
API_TIMEOUT=10000                # Request timeout 10 seconds
API_RETRY_COUNT=3                # Retry 3 times on failure

# Processing
BATCH_SIZE=50                    # Process 50 items at once
DUPLICATE_CHECK_HOURS=24         # Consider duplicate if within 24h

# Delays
RETRY_DELAY=1000                 # Wait 1s before first retry
BACKOFF_MULTIPLIER=2             # Double delay for each retry
MAX_BACKOFF=30000                # Cap backoff at 30s
```

### Gateway Configuration

```env
# Service Toggles
SMS_ENABLED=true                 # Enable/disable SMS service
EMAIL_ENABLED=true               # Enable/disable Email service

# Timeouts
SMS_TIMEOUT=5000                 # SMS request timeout
EMAIL_TIMEOUT=10000              # Email request timeout
BATCH_TIMEOUT=5000               # Wait before processing batch

# Rate Limiting
SMS_RATE_LIMIT=100               # SMS per minute globally
SMS_PER_PHONE_LIMIT=10           # SMS per phone per minute
EMAIL_RATE_LIMIT=200             # Email per minute

# Retry
MAX_RETRIES=3
RETRY_DELAY=1000
EXPONENTIAL_BACKOFF=true
```

### Database Configuration (if using PostgreSQL)

```env
DATABASE_TYPE=postgresql
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=notification
DATABASE_PASS=secure_password
DATABASE_NAME=notification

DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=5000
```

---

## 🔐 Security Configuration

### API Key Security

```env
# Generation
API_KEY=use_32_char_hex_string

# Examples of good API keys:
# ✓ a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
# ✓ 550e8400e29b41d4a716446655440000
# ✗ password123                         (too short)
# ✗ admin                               (not hex)
```

**Generate Secure Key**:
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using tr
tr -dc 'a-f0-9' < /dev/urandom | head -c 64; echo
```

### CORS Configuration

```env
# Allow all origins (development only!)
CORS_ORIGIN=*

# Specific origin
CORS_ORIGIN=https://example.com

# Multiple origins
CORS_ORIGIN=https://example.com,https://app.example.com

# Credentials
CORS_CREDENTIALS=true            # Allow cookies
CORS_MAX_AGE=3600                # Cache preflight for 1 hour
```

### Session Security

```env
SESSION_SECRET=generate_strong_random_string
SESSION_SECURE=true              # HTTPS only (production)
SESSION_HTTP_ONLY=true           # No JS access (prevents XSS)
SESSION_SAME_SITE=strict         # CSRF protection
SESSION_TIMEOUT=3600000          # 1 hour
SESSION_REFRESH=true             # Extend on each request
```

### Password Policy

```env
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=false
PASSWORD_HISTORY=3               # Remember last 3 passwords
```

---

## ⚡ Performance Configuration

### Memory Optimization

```env
NODE_OPTIONS=--max-old-space-size=4096     # 4GB heap
NODE_OPTIONS=--enable-source-maps

# Or in systemd/pm2
memory_limit: 2G
```

### Connection Pooling

```env
# Database
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# HTTP Client
HTTP_AGENT_MAX_SOCKETS=50
HTTPS_AGENT_MAX_SOCKETS=50
```

### Caching

```env
CACHE_ENABLED=true
CACHE_TTL=300000                 # 5 minutes
CACHE_ENDPOINTS=true             # Cache endpoint list
CACHE_USERS=true                 # Cache user data
CACHE_CONFIG=true                # Cache configuration
```

### Database Query Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_endpoint_id ON endpoints(id);
CREATE INDEX idx_created_at ON notifications(created_at);
CREATE INDEX idx_status ON notifications(status);
CREATE INDEX idx_transaction_id ON notifications(transaction_id, created_at);
```

---

## 📋 Example Configurations

### Development Configuration

```env
# .env (Development)
NODE_ENV=development
CONTROL_SERVER_PORT=3000
GATEWAY_PORT=9090
LOG_LEVEL=debug
SESSION_SECRET=dev-secret-key
GATEWAY_API_KEY=dev-api-key-12345
API_URL=http://localhost:8000/api/transactions
```

### Production Configuration

```env
# .env (Production)
NODE_ENV=production
CONTROL_SERVER_PORT=3000
GATEWAY_PORT=9090
LOG_LEVEL=warn
LOG_FILE=/var/log/notification/app.log

SESSION_SECRET=<generate-strong-random>
GATEWAY_API_KEY=<generate-strong-random>

API_URL=https://api.example.com/transactions
API_TIMEOUT=15000

DATABASE_TYPE=postgresql
DATABASE_HOST=db.internal
DATABASE_POOL_MAX=20

SMS_ENABLED=true
EMAIL_ENABLED=true

TZ=Asia/Dhaka
```

### Testing Configuration

```env
# .env (Testing)
NODE_ENV=test
CONTROL_SERVER_PORT=3001
GATEWAY_PORT=9091
LOG_LEVEL=error

SESSION_SECRET=test-secret
GATEWAY_API_KEY=test-api-key

API_URL=http://mock-api:3000/transactions
API_POLLING_INTERVAL=1000

DATABASE_TYPE=sqlite
DATABASE_PATH=:memory:
```

### High-Load Configuration

```env
# .env (High Load)
NODE_ENV=production
CONTROL_SERVER_PORT=3000
GATEWAY_PORT=9090

# Database
DATABASE_TYPE=postgresql
DATABASE_HOST=db-primary
DATABASE_REPLICAS=db-replica-1,db-replica-2
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50

# Caching
CACHE_ENABLED=true
CACHE_TYPE=redis
CACHE_REDIS_URL=redis://cache:6379
CACHE_TTL=600000

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=1000

# Message Queue
QUEUE_ENABLED=true
QUEUE_TYPE=rabbitmq
QUEUE_URL=amqp://queue:5672

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/notification/app.log
LOG_MAX_SIZE=100m
LOG_MAX_FILES=30
```

---

## 🔄 Configuration Hot Reload

### Automatic Reload

```javascript
// Watch config file for changes
const fs = require('fs');

function watchConfig() {
  fs.watchFile('config-state.json', () => {
    console.log('Config changed, reloading...');
    reloadConfig();
  });
}

function reloadConfig() {
  const config = JSON.parse(fs.readFileSync('config-state.json'));
  // Update in-memory config
  global.config = config;
}
```

### Manual Reload

```bash
# Send SIGHUP signal to reload
kill -HUP <pid>

# Or restart service
pm2 restart notification-control
```

---

## 📊 Configuration Validation

### Validate on Startup

```javascript
function validateConfig() {
  const required = [
    'NODE_ENV',
    'CONTROL_SERVER_PORT',
    'GATEWAY_API_KEY',
    'API_URL'
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required config: ${key}`);
    }
  }
  
  console.log('✓ Configuration valid');
}

validateConfig();
```

### Schema Validation

```javascript
const schema = {
  NODE_ENV: 'string|enum:development,production',
  CONTROL_SERVER_PORT: 'integer|min:1024|max:65535',
  GATEWAY_API_KEY: 'string|minLength:32',
  SESSION_TIMEOUT: 'integer|min:3600000'
};
```

---

## 🆘 Common Configuration Issues

| Issue | Solution |
|-------|----------|
| "API key mismatch" | Ensure both .env files have identical GATEWAY_API_KEY |
| "Can't connect to database" | Check DATABASE_HOST, port, credentials |
| "Timeouts occur" | Increase API_TIMEOUT, DATABASE_TIMEOUT |
| "Out of memory" | Increase NODE_OPTIONS --max-old-space-size |
| "Logs missing" | Check LOG_FILE path exists and is writable |
| "High CPU usage" | Reduce API_POLLING_INTERVAL or batch sizes |

---

**Last Updated**: 2024
**Status**: ✓ Complete Configuration Reference
