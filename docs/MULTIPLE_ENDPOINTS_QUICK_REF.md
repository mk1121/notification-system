# Multiple Endpoints - Quick Reference

## System Architecture

```
config-state.json
└── activeEndpointTags: ["pro", "PROD"]
    └── Startup Script
        ├── Start Scheduler for "pro"
        │   ├── Check every 30s
        │   └── Send SMS/Email
        │
        └── Start Scheduler for "PROD"
            ├── Check every 5min
            └── Send SMS/Email
```

## UI - Endpoints Manager (/endpoints/ui)

```
┌─────────────────────────────────────────┐
│  Named Endpoints Manager                │
│  Multiple endpoints running separately  │
├─────────────────────────────────────────┤
│                                         │
│  ☑ pro               [🟢 Running]      │
│  ├─ API: ...                           │
│  ├─ SMS: ✓ Email: ✓ Interval: 30000ms │
│  └─ [Edit] [Delete]                    │
│                                         │
│  ☑ PROD              [🟢 Running]      │
│  ├─ API: ...                           │
│  ├─ SMS: ✓ Email: ✓ Interval: 300000ms│
│  └─ [Edit] [Delete]                    │
│                                         │
│  ☐ staging           [⚫ Stopped]      │
│  ├─ API: ...                           │
│  ├─ SMS: ✓ Email: ✓ Interval: 60000ms │
│  └─ [Edit] [Delete]                    │
│                                         │
└─────────────────────────────────────────┘
```

## Activation Flow

```
User checks/unchecks checkbox
        ↓
toggleEndpoint(tag) JavaScript function
        ↓
POST /api/endpoints/:tag/toggle-active
        ↓
toggleActiveTag(tag) in endpoints-store
        ↓
Update config-state.json activeEndpointTags
        ↓
If adding: startEndpointScheduler(tag)
If removing: stopEndpointScheduler(tag)
        ↓
Page reloads to show updated status
```

## Data Flow

```
User Interface (/endpoints/ui)
    ↓
JavaScript Event (checkbox change)
    ↓
API Call (POST /api/endpoints/:tag/toggle-active)
    ↓
control-server.js Route Handler
    ↓
endpoints-store.js Functions
    │  ├─ toggleActiveTag(tag)
    │  ├─ saveState() → config-state.json
    │  └─ Return updated activeTags array
    ↓
Scheduler Management
    │  ├─ startEndpointScheduler(tag)
    │  └─ stopEndpointScheduler(tag)
    ↓
Response to UI
    ↓
Page Reload (location.reload())
```

## Running Multiple Endpoints Simultaneously

### Scenario: "pro" and "PROD" both active

```
Server Startup
    ↓
Read config-state.json
    ↓
activeEndpointTags = ["pro", "PROD"]
    ↓
For each tag:
    ├─ Scheduler "pro"
    │  ├─ setInterval(30000)
    │  └─ checkAndNotifyEndpoint("pro")
    │
    └─ Scheduler "PROD"
       ├─ setInterval(300000)
       └─ checkAndNotifyEndpoint("PROD")
    ↓
Both run independently in parallel
```

### Independent Operation

Each endpoint scheduler:
- Has its own setInterval ID (stored in activeIntervals Map)
- Runs at its configured checkInterval
- Makes independent API calls
- Maintains own state (mutePayment, muteApi, etc.)
- Sends to own phone numbers / email addresses

```
Timeline:
T=0s    : pro checks ✓, PROD checks ✓
T=30s   : pro checks ✓
T=60s   : pro checks ✓
T=90s   : pro checks ✓
...
T=300s  : pro checks ✓, PROD checks ✓
T=330s  : pro checks ✓
...
```

## State Management

### config-state.json Structure

```json
{
  "activeEndpointTags": ["pro", "PROD"],
  
  "endpointOverrides": {
    "pro": {
      "apiEndpoint": "...",
      "checkInterval": 30000,
      "enableSms": true,
      "enableEmail": true,
      "phoneNumbers": ["01571306597"],
      "emailAddresses": ["..."],
      "tag": "pro",
      "updatedAt": "2026-01-28T04:23:36.646Z"
    },
    "PROD": {
      "apiEndpoint": "...",
      "checkInterval": 300000,
      "enableSms": true,
      "enableEmail": true,
      "phoneNumbers": ["01571306597"],
      "emailAddresses": ["..."],
      "tag": "PROD",
      "updatedAt": "2026-01-28T04:28:06.546Z"
    }
  },
  
  "globalSettings": {
    "controlServerPort": 3000,
    "controlServerUrl": "http://192.168.1.249:3000"
  },
  
  "endpoints": {}
}
```

## Server Startup Sequence

```
1. Express app initializes
   ├─ Load endpoints-store.js
   ├─ Load scheduler.js
   └─ Load config-state.json

2. app.listen(3000) called

3. Startup handler executes:
   ├─ Read activeEndpointTags = ["pro", "PROD"]
   ├─ For each tag:
   │  ├─ getEndpointConfig(tag)
   │  ├─ startEndpointScheduler(tag)
   │  └─ Log "✓ Scheduler started for: {tag}"
   └─ Log startup messages

4. Both schedulers running
   ├─ "pro" scheduler ready
   └─ "PROD" scheduler ready
```

## API Response Examples

### GET /api/endpoints/active
```json
{
  "ok": true,
  "activeTags": ["pro", "PROD"],
  "count": 2
}
```

### POST /api/endpoints/pro/toggle-active (when currently active)
```json
{
  "ok": true,
  "tag": "pro",
  "isActive": false,
  "activeTags": ["PROD"],
  "message": "pro is now INACTIVE"
}
```

### POST /api/endpoints/pro/toggle-active (when currently inactive)
```json
{
  "ok": true,
  "tag": "pro",
  "isActive": true,
  "activeTags": ["PROD", "pro"],
  "message": "pro is now ACTIVE"
}
```

## Troubleshooting

### Both endpoints not starting?
- Check config-state.json has `activeEndpointTags` array with endpoint tags
- Check server logs for "Starting schedulers for X ACTIVE endpoint(s)"

### Only one endpoint running?
- Check `/api/endpoints/active` to see which tags are in array
- Use UI to toggle endpoints on/off

### Endpoint not visible in UI?
- Create endpoint via Setup Wizard (/setup/ui)
- Verify it appears in `endpointOverrides` in config-state.json

### Scheduler not starting for new endpoint?
- Check that endpoint exists in config-state.json
- Verify tag is added to `activeEndpointTags` array
- Check server logs for error messages
