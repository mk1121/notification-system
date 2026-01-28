# System Architecture

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Technology Stack](#technology-stack)
6. [Design Patterns](#design-patterns)
7. [Security Architecture](#security-architecture)
8. [Scalability Considerations](#scalability-considerations)

---

## System Overview

The Notification System is a **two-service distributed architecture** designed to handle reliable SMS and Email notifications with emergency controls.

### Key Characteristics

- **Asynchronous processing**: Notifications queued and processed separately
- **Decoupled services**: Control and Gateway can run independently
- **Emergency controls**: Kill switch to disable services instantly
- **Stateful architecture**: Configuration and state stored in JSON files
- **Session-based UI**: Secure web interface for management
- **API-driven**: RESTful API for programmatic access

### Design Philosophy

```
Simplicity > Complexity
Reliability > Speed
Control > Automation
```

---

## Architecture Diagram

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    User                              │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        v                     v
   ┌─────────┐          ┌──────────────┐
   │ Web UI  │          │ External API │
   │ Browser │          │  (Webhooks)  │
   └────┬────┘          └──────┬───────┘
        │                      │
        └──────────┬───────────┘
                   │
        ┌──────────v──────────┐
        │  Control Server     │
        │   (Port 3000)       │
        │                     │
        │ • Endpoint Manager  │
        │ • Scheduler         │
        │ • Web UI            │
        │ • API               │
        └────┬────────────┬───┘
             │            │
    ┌────────v─┐   ┌──────v────┐
    │ Config   │   │ State      │
    │ Files    │   │ Files      │
    └──────────┘   └────────────┘
             │            │
    ┌────────v────────────v──────────┐
    │    Gateway (Port 9090)          │
    │                                 │
    │  • SMS Processor                │
    │  • Email Processor              │
    │  • Kill Switch Control          │
    │  • Authentication               │
    └────┬─────────────────┬──────────┘
         │                 │
    ┌────v────┐       ┌────v────┐
    │  Teletalk        │ Email   │
    │  (SMS)           │ Provider│
    └─────────┘       └─────────┘
```

### Component Interaction Flow

```
User/API Request
        │
        v
    [Control Server]
        │
        ├─→ Check Endpoint Config
        ├─→ Check Mute Status
        ├─→ Log Request
        │
        v
    [Scheduler]
        │
        ├─→ Poll external API
        ├─→ Process transactions
        ├─→ Build notification
        │
        v
    [Gateway API Call]
        │
        ├─→ Authenticate
        ├─→ Check Kill Switch
        ├─→ Validate Input
        │
        v
    [SMS/Email Processor]
        │
        ├─→ Format message
        ├─→ Send via provider
        ├─→ Handle response
        │
        v
    [Provider Response]
        │
        └─→ Log result
```

---

## Core Components

### 1. Control Server (`controllerServer/`)

The main application handling orchestration and management.

#### Components:

**control-server.js** - Web UI and REST API
- Serves HTML/CSS/JS web interface
- Handles authentication (login/logout)
- Manages endpoints (CRUD operations)
- Handles mute operations
- Serves API endpoints for clients

**server.js** - Scheduler/Worker
- Polls external API for transactions
- Processes received data
- Queues notifications
- Updates state files
- Runs on configurable interval (default: 5 seconds)

**scheduler.js** - Core notification logic
- Parses transaction data
- Builds SMS/Email messages
- Calls gateway API
- Handles errors and retries
- Logs all operations

**logger.js** - Persistent file logging
- Writes logs to `notification.log`
- Includes timestamp and level
- Supports concurrent writes
- Implements log rotation (optional)

**config.js** - Configuration management
- Loads environment variables from `.env`
- Validates required config
- Provides config object to other modules
- Supports fallback defaults

**console-logger.js** - Intelligent console output
- Environment-aware logging (dev vs production)
- Formats output with colors (development)
- Timestamp in Dhaka timezone
- Suppresses debug in production

#### Configuration Files:

**config-state.json** - Endpoint definitions
```json
{
  "endpoints": {
    "endpoint_1": {
      "name": "Banking API",
      "url": "https://api.example.com/...",
      "recipients": ["01234567890"],
      "emails": ["admin@example.com"]
    }
  }
}
```

**notification-state.json** - Notification tracking
```json
{
  "processedItems": {
    "transaction_123": "2024-01-15T10:30:00Z"
  },
  "muteStatus": {
    "endpoint_1": {
      "muted": true,
      "expiresAt": "2024-01-15T11:30:00Z"
    }
  }
}
```

**users.json** - User credentials
```json
{
  "admin": {
    "username": "admin",
    "password": "admin123",
    "role": "admin"
  }
}
```

---

### 2. Gateway Service (`email-sms-gateway/`)

Dedicated service for SMS and Email transmission.

#### Components:

**server.js** - Gateway HTTP server
- Exposes REST API on port 9090
- Handles authentication via X-API-Key header
- Implements kill switch state machine
- Manages service availability
- Routes requests to providers

**emailClient.js** - Email service integration
- Connects to email provider
- Sends emails
- Handles delivery reports
- Error handling and retry logic
- Supports HTML/plain text

**teletalkClient.js** - SMS service integration
- Connects to Teletalk Bangladesh
- Sends SMS messages
- Handles delivery confirmations
- Rate limiting per provider
- Fallback mechanisms

#### Service Endpoints:

```
POST   /api/sms/send         - Send SMS
POST   /api/email/send       - Send email
GET    /api/health           - Health check
POST   /api/admin/kill-switch - Toggle services
GET    /api/admin/kill-switch - Get status
```

#### Kill Switch State Machine

```
                    ┌─────────────┐
                    │   INITIAL   │
                    └──────┬──────┘
                           │
                           v
                    ┌─────────────┐
        ┌──────────→│    ACTIVE   │←─────────┐
        │           └──────┬──────┘           │
        │                  │                  │
        │        ┌─────────v──────────┐       │
        │        │ Kill Switch: OFF   │       │
        │        │ (Services Active)  │       │
        │        └─────────┬──────────┘       │
        │                  │                  │
        │                  │ Toggle Any       │
        │                  v                  │
        │        ┌─────────────────────┐      │
        └────────│      PAUSED         │      │
                 │ Kill Switch: ON     │──────┘
                 │ (Services Disabled) │
                 └─────────────────────┘
```

---

### 3. Shared Modules

**package.json** - Dependencies
```json
{
  "dependencies": {
    "express": "4.18.2",
    "dotenv": "16.0.0",
    "axios": "1.0.0"
  }
}
```

**.env** - Environment configuration
```env
NODE_ENV=development
CONTROL_SERVER_PORT=3000
GATEWAY_API_KEY=...
DATABASE_HOST=localhost
EMAIL_PROVIDER=your-provider
SMS_PROVIDER=teletalk
```

---

## Data Flow

### Transaction Processing Flow

```
1. EXTERNAL API (Webhook)
   ↓
   Sends transaction data to Control Server
   
2. CONTROL SERVER (server.js)
   ↓
   Polls external API at regular intervals
   Retrieves: [ { id, amount, type, ... } ]
   
3. DUPLICATE CHECK (scheduler.js)
   ↓
   Query processedItems in notification-state.json
   Filter: [ transactions already sent ]
   Result: [ new transactions to process ]
   
4. MESSAGE BUILDING (scheduler.js)
   ↓
   Template: "Transaction {amount} {type}"
   Output: [ SMS text, Email HTML ]
   
5. ENDPOINT MATCHING (scheduler.js)
   ↓
   Load endpoints from config-state.json
   For each endpoint:
     - Check if muted (notification-state.json)
     - Collect recipients
     - Build notification list
   
6. GATEWAY API CALL (scheduler.js)
   ↓
   For each recipient:
     POST http://localhost:9090/api/sms/send
     POST http://localhost:9090/api/email/send
   
7. AUTHENTICATION (gateway/server.js)
   ↓
   Check: X-API-Key header matches API_KEY env
   Status: Valid → Process | Invalid → Reject
   
8. KILL SWITCH CHECK (gateway/server.js)
   ↓
   Check: kill-switch state (in-memory or file)
   Status: ON → Reject | OFF → Process
   
9. PROCESSING (emailClient.js / teletalkClient.js)
   ↓
   Format message
   Connect to provider
   Send message
   Get response/confirmation
   
10. RESPONSE (gateway/server.js)
    ↓
    Return status to Control Server
    Example: { success: true, id: "sms_123" }
    
11. STATE UPDATE (scheduler.js)
    ↓
    Mark transaction as processed in notification-state.json
    Update: processedItems[transaction_id] = timestamp
    
12. LOGGING (logger.js / console-logger.js)
    ↓
    Log at every step:
    - API call received
    - Endpoint matched
    - Message sent
    - Result received
    - Any errors
```

### Configuration Update Flow

```
User/API
   ↓
Create Endpoint Request
   ↓
Control Server (/api/endpoints/create)
   ↓
Validate Input
   ├─ Check: name unique
   ├─ Check: URL valid
   ├─ Check: phone format
   └─ Check: email format
   ↓
Write to File
   └─ Update config-state.json
   └─ Reload in memory
   ↓
Return Response
   ↓
Next Scheduler Cycle Uses New Endpoint
```

### Kill Switch Control Flow

```
Admin Request
   ↓
POST /api/admin/kill-switch
   ├─ X-API-Key validation
   └─ { gateway: false, sms: true, email: true }
   ↓
Gateway Server
   ├─ Update in-memory state
   └─ Optionally persist to file
   ↓
Subsequent Requests
   ├─ Check state before processing
   └─ Return 503 if service disabled
   ↓
Response
   └─ { success: true, status: { gateway: false, sms: true, email: true } }
```

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express.js | 4.18+ | Web framework |
| dotenv | 16.0+ | Configuration |
| Axios | 1.0+ | HTTP requests |
| Body-parser | Built-in | Request parsing |

### Frontend

| Technology | Purpose |
|------------|---------|
| HTML5 | Structure |
| CSS3 | Styling |
| Vanilla JavaScript | Interactivity |
| No frameworks | Simplicity |

### Integrations

| Service | Purpose |
|---------|---------|
| Teletalk | SMS delivery |
| Email Provider | Email delivery |
| External APIs | Transaction data |

### Storage

| Type | Format | Purpose |
|------|--------|---------|
| Configuration | JSON | Endpoint definitions |
| State | JSON | Processed items, mute status |
| Logs | Text | Event history |
| Credentials | JSON | User accounts |

### Infrastructure

| Component | Default | Configurable |
|-----------|---------|--------------|
| Control Port | 3000 | CONTROL_SERVER_PORT |
| Gateway Port | 9090 | PORT/GATEWAY_PORT |
| Schedule Interval | 5s | In code |
| Log Location | ./logs | Logger path |

---

## Design Patterns

### 1. Observer Pattern (Scheduler)

Control Server monitors external API and reacts to new transactions.

```javascript
// Pseudo-code
setInterval(() => {
  const transactions = poll_external_api();
  transactions.forEach(tx => {
    if (not_processed(tx)) {
      notify_endpoints(tx);
      mark_processed(tx);
    }
  });
}, 5000);
```

### 2. Factory Pattern (Message Building)

Create different message formats based on transaction type.

```javascript
// Pseudo-code
const messageFactory = {
  sms: (tx) => `Transaction ${tx.amount} ${tx.type}`,
  email: (tx) => ({ 
    subject: `${tx.type} Alert`,
    html: `<p>${tx.amount} ${tx.type}</p>`
  })
};
```

### 3. Middleware Pattern (Authentication)

Express middleware validates API keys before processing.

```javascript
// Pseudo-code
app.use(authenticateAPI, (req, res) => {
  // Only executed if API key valid
  res.json({ success: true });
});
```

### 4. State Machine (Kill Switch)

Discrete states define service availability.

```
ACTIVE (all enabled) ←→ PAUSED (all disabled)
```

### 5. Repository Pattern (State Files)

Abstracted access to JSON state files.

```javascript
// Pseudo-code
class StateRepository {
  load() { return JSON.parse(fs.readFileSync(path)); }
  save(data) { fs.writeFileSync(path, JSON.stringify(data)); }
}
```

### 6. Template Method Pattern (Logging)

Log operations follow consistent format.

```
[timestamp] [level] [category] message
```

---

## Security Architecture

### Authentication Layers

```
┌────────────────────────┐
│   Control Server       │
│                        │
│  ┌──────────────────┐  │
│  │  Session Auth    │  │
│  │  /login route    │  │
│  │  Cookie-based    │  │
│  └──────────────────┘  │
│                        │
│  Protected Routes:     │
│  • /setup/ui           │
│  • /api/endpoints/*    │
│  • /api/logs           │
└────────────────────────┘

┌────────────────────────┐
│   Gateway              │
│                        │
│  ┌──────────────────┐  │
│  │  API Key Auth    │  │
│  │  X-API-Key hdr   │  │
│  │  Bearer token    │  │
│  └──────────────────┘  │
│                        │
│  Protected Routes:     │
│  • /api/sms/send       │
│  • /api/email/send     │
│  • /api/admin/*        │
└────────────────────────┘
```

### Data Protection

```
Sensitive Data:
  - Users.json → File-level permissions (600)
  - API Keys → Environment variables (.env)
  - Session tokens → Secure cookies
  - Passwords → Stored in JSON (plaintext in demo)

Recommendations:
  - Use bcrypt for password hashing
  - Store secrets in vault/environment
  - Enable HTTPS in production
  - Implement rate limiting
  - Add request validation
```

### Network Security

```
Inbound:
  ✓ Port 3000: Control Server (user/webhook access)
  ✓ Port 9090: Gateway (internal/authorized access)
  ✗ Other ports: Blocked by firewall

Outbound:
  ✓ Port 25/465/587: Email (SMTP)
  ✓ Port 80/443: External APIs
  ✗ Other: Blocked

Deployment:
  - Use HTTPS (reverse proxy: Nginx/Apache)
  - Restrict Gateway to localhost only
  - Use VPN for remote access
  - Implement IP whitelisting
```

---

## Scalability Considerations

### Current Limitations

```
Component        | Limit | Reason
─────────────────┼───────┼─────────────────────
Endpoints        | ~100  | JSON file parsing
Concurrent Users | 10-20 | Single Node.js instance
Throughput       | 100   | SMS provider rate limit
State Files      | 10MB  | Memory usage
Logs             | 1GB   | Storage space
```

### Horizontal Scaling

To scale to multiple servers:

```
                    ┌──────────────┐
                    │  Load        │
                    │  Balancer    │
                    │  (Nginx)     │
                    └────┬─────┬───┘
                         │     │
            ┌────────────┘     └────────────┐
            │                               │
            v                               v
    ┌──────────────────┐          ┌──────────────────┐
    │ Control Server 1 │          │ Control Server 2 │
    │ (Port 3000)      │          │ (Port 3000)      │
    └────┬──────────┬──┘          └────┬──────────┬──┘
         │          │                  │          │
         v          │                  v          │
    ┌─────────┐     │             ┌─────────┐    │
    │Shared   │     │             │Shared   │    │
    │Database │←────┼─────────────→│Database │    │
    │(Redis)  │     │             │(Redis)  │    │
    └─────────┘     │             └─────────┘    │
                    │                             │
                    └─────────────┬───────────────┘
                                  │
                            ┌─────v────────────┐
                            │ Gateway Cluster  │
                            │ (Multiple nodes) │
                            └──────────────────┘
```

### Vertical Scaling

Optimize single instance:

1. **Increase Node.js heap size**
   ```bash
   NODE_OPTIONS=--max-old-space-size=4096 npm start
   ```

2. **Use database instead of JSON**
   ```javascript
   // Replace JSON file I/O with MongoDB/PostgreSQL
   ```

3. **Implement caching**
   ```javascript
   // Cache endpoints for 1 minute
   // Cache mute status for 1 minute
   ```

4. **Optimize polling**
   ```javascript
   // Reduce poll interval if providers allow
   // Use webhooks instead of polling
   ```

5. **Batch operations**
   ```javascript
   // Send 10 SMS in single API call
   // Process 100 items before state update
   ```

### Database Migration

Current: JSON files
```json
{
  "endpoints": { ... },
  "transactions": [ ... ]
}
```

Recommended: PostgreSQL
```sql
CREATE TABLE endpoints (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) UNIQUE,
  url TEXT,
  recipients JSON,
  emails JSON,
  created_at TIMESTAMP
);

CREATE TABLE notifications (
  id VARCHAR(50) PRIMARY KEY,
  transaction_id VARCHAR(50),
  status VARCHAR(20),
  created_at TIMESTAMP,
  INDEX (transaction_id)
);
```

### Caching Strategy

```
┌─────────────┐
│ Request     │
└────┬────────┘
     │
     v
┌─────────────┐
│ Redis Cache │──→ (Endpoints, Mute status, API responses)
│ (1 minute)  │
└────┬────────┘
     │ miss
     v
┌─────────────┐
│ Database    │
└────┬────────┘
     │
     └─→ Update cache
     └─→ Return response
```

---

## Monitoring & Observability

### Key Metrics

```
Application Metrics:
- Endpoints created: count
- Notifications sent: rate (per second)
- Success rate: percentage
- Failed messages: count
- API latency: milliseconds
- Error rate: percentage

System Metrics:
- CPU usage: percentage
- Memory usage: percentage
- Disk I/O: operations/second
- Network: bytes in/out
- Open connections: count
- Uptime: percentage

Business Metrics:
- SMS delivered: count
- Email delivered: count
- Unique endpoints: count
- Active mute endpoints: count
```

### Logging Strategy

```
Level     | When | Example
──────────┼──────┼────────────────────────────────────
ERROR     | Bad  | API connection failed
WARN      | Caution | Retry #3 of 5
INFO      | Important | Endpoint created
DEBUG     | Details | Processing transaction #123
TRACE     | All | Building SMS message

Environment-Aware:
Development → All levels logged
Production  → ERROR, WARN, INFO only
```

---

## Deployment Scenarios

### Single Server

```
One physical/virtual server
├─ Control Server (port 3000)
├─ Gateway (port 9090)
├─ State files
└─ Logs
```

### Docker Containers

```
Docker Compose
├─ Service: control-server
│  └─ Port: 3000
├─ Service: gateway
│  └─ Port: 9090
├─ Service: redis (optional)
│  └─ Port: 6379
└─ Volumes: state, logs
```

### Kubernetes

```
Kubernetes Cluster
├─ Deployment: control-server
│  ├─ Replicas: 2-3
│  └─ ConfigMap: environment
├─ Deployment: gateway
│  ├─ Replicas: 2-3
│  └─ Service: ClusterIP
├─ StatefulSet: database
└─ PersistentVolume: state/logs
```

---

## Summary Table

| Aspect | Details |
|--------|---------|
| **Architecture** | Two-service, event-driven, JSON-based |
| **Communication** | REST APIs, async processing |
| **Persistence** | JSON files, optional database |
| **Security** | Session + API Key authentication, HTTPS recommended |
| **Scalability** | Vertical to ~500+ messages/minute, horizontal with DB |
| **Monitoring** | Structured logging, metrics collection |
| **Deployment** | Single server, Docker, Kubernetes ready |

---

**Last Updated**: 2024
**Status**: ✓ Complete Architecture Documentation
