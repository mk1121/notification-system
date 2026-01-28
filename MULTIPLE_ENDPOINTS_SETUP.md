# Multiple Active Endpoints - Setup Guide

## Overview
The system now supports **multiple endpoints running simultaneously** with independent schedulers. Each endpoint can be toggled on/off with checkbox controls.

## Key Changes

### 1. Data Structure (config-state.json)
Changed from single `activeEndpointTag` to array `activeEndpointTags`:

```json
{
  "activeEndpointTags": ["pro", "PROD"],
  "endpointOverrides": {
    "pro": { ... },
    "PROD": { ... }
  }
}
```

### 2. New Functions in endpoints-store.js

```javascript
getActiveTags()           // Returns array of active tags
getActiveTag()            // Returns first active tag (backward compat)
setActiveTags(tags)       // Set multiple active tags at once
setActiveTag(tag)         // Set single tag (backward compat)
addActiveTag(tag)         // Add tag to active list
removeActiveTag(tag)      // Remove tag from active list
toggleActiveTag(tag)      // Add/remove tag based on current status
```

### 3. New API Endpoints

#### Get Active Endpoints
```
GET /api/endpoints/active
Response: { ok: true, activeTags: ["pro", "PROD"], count: 2 }
```

#### Set Multiple Active Endpoints
```
POST /api/endpoints/active
Body: { "tags": ["pro", "PROD"] }
Response: { ok: true, activeTags: [...], message: "..." }
```

#### Toggle Single Endpoint
```
POST /api/endpoints/:tag/toggle-active
Response: { ok: true, tag: "pro", isActive: true, activeTags: [...] }
```

#### Activate Single Endpoint
```
POST /api/endpoints/:tag/activate
Response: { ok: true, activeTags: [...] }
```

#### Deactivate Single Endpoint
```
POST /api/endpoints/:tag/deactivate
Response: { ok: true, activeTags: [...] }
```

### 4. UI Changes (/endpoints/ui)

#### Before
- Single "Active" badge per endpoint
- Only one endpoint could be marked as active

#### After
- Checkbox for each endpoint (toggle on/off)
- "🟢 Running" badge for active endpoints
- "⚫ Stopped" badge for inactive endpoints
- Multiple endpoints can be active simultaneously

### 5. Automatic Startup
When server starts, it:
1. Reads `activeEndpointTags` array from config-state.json
2. Starts schedulers for ALL endpoints in the array
3. Logs status for each endpoint

Example startup output:
```
🚀 Starting schedulers for 2 ACTIVE endpoint(s)...
  ✓ Scheduler started for: pro
  ✓ Scheduler started for: PROD
```

## Usage Examples

### Via API

```bash
# Get active endpoints
curl http://localhost:3000/api/endpoints/active

# Toggle endpoint on/off
curl -X POST http://localhost:3000/api/endpoints/pro/toggle-active

# Set multiple active at once
curl -X POST http://localhost:3000/api/endpoints/active \
  -H "Content-Type: application/json" \
  -d '{"tags": ["pro", "PROD"]}'

# Activate single endpoint
curl -X POST http://localhost:3000/api/endpoints/pro/activate

# Deactivate single endpoint
curl -X POST http://localhost:3000/api/endpoints/pro/deactivate
```

### Via Web UI

1. Navigate to `/endpoints/ui`
2. See all configured endpoints with checkboxes
3. Check/uncheck boxes to activate/deactivate
4. Multiple endpoints can be checked at once
5. All checked endpoints will run their schedulers simultaneously

## Example Configuration

With this setup, you can have:

**pro** endpoint:
- Checks every 30 seconds
- Sends SMS & Email on failures
- Fetches from one API endpoint

**PROD** endpoint:
- Checks every 5 minutes
- Sends SMS & Email on failures
- Fetches from another API endpoint

Both run **independently** in parallel with their own schedulers.

## State File Example

```json
{
  "activeEndpointTags": ["pro", "PROD"],
  "endpointOverrides": {
    "pro": {
      "apiEndpoint": "http://api1.example.com/...",
      "checkInterval": 30000,
      "enableSms": true,
      "enableEmail": true
    },
    "PROD": {
      "apiEndpoint": "http://api2.example.com/...",
      "checkInterval": 300000,
      "enableSms": true,
      "enableEmail": true
    }
  }
}
```

## Verification

To verify multiple endpoints are running:

1. Check server logs for scheduler startup messages
2. Visit `/endpoints/ui` to see which endpoints are checked
3. Use `/api/endpoints/active` API to programmatically check
4. Monitor logs - both endpoints should be making API calls at their respective intervals
