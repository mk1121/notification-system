# Implementation Summary: Multiple Active Endpoints

## Changes Made

### 1. **config-state.json** - Data Structure Update
- Changed `activeEndpointTag` (string) to `activeEndpointTags` (array)
- Allows multiple endpoints to be active simultaneously
- Example: `"activeEndpointTags": ["pro", "PROD"]`

### 2. **endpoints-store.js** - New Functions for Multiple Tags

Added these new functions:
```javascript
getActiveTags()              // Returns array of all active tags
setActiveTags(tags)          // Set multiple active tags at once
addActiveTag(tag)            // Add single tag to active list
removeActiveTag(tag)         // Remove single tag from active list
toggleActiveTag(tag)         // Toggle tag on/off based on current status
```

Maintained backward compatibility:
```javascript
getActiveTag()               // Returns first active tag (for compatibility)
setActiveTag(tag)            // Wrapper around setActiveTags([tag])
```

### 3. **control-server.js** - New API Routes

Added these new endpoint routes:

```javascript
GET  /api/endpoints/active                    // Get active endpoint tags
POST /api/endpoints/active                    // Set multiple active endpoints
POST /api/endpoints/:tag/toggle-active        // Toggle endpoint on/off
POST /api/endpoints/:tag/activate             // Activate single endpoint
POST /api/endpoints/:tag/deactivate           // Deactivate single endpoint
```

### 4. **control-server.js** - Updated Startup Logic

```javascript
// Auto-start schedulers for all ACTIVE endpoints
const activeTags = getActiveTags();
activeTags.forEach(tag => {
  try {
    startEndpointScheduler(tag);
    console.log(`✓ Scheduler started for: ${tag}`);
  } catch (error) {
    console.error(`✗ Failed to start scheduler for ${tag}:`, error.message);
  }
});
```

### 5. **control-server.js** - Updated /endpoints/ui Page

Changed from single active endpoint to multiple active endpoints:

#### Before (HTML)
```html
<h3>${tag}</h3>
${isActive ? '<span class="badge-active">⭐ Active</span>' : ''}
...
${!isActive ? `<button onclick="activateEndpoint('${tag}')">Activate</button>` : ''}
```

#### After (HTML)
```html
<input type="checkbox" id="cb-${tag}" ${isActive ? 'checked' : ''} onchange="toggleEndpoint('${tag}')">
<h3>${tag}</h3>
${isActive ? '<span class="badge-active">🟢 Running</span>' : '<span class="badge-inactive">⚫ Stopped</span>'}
```

#### Updated JavaScript Function
- Removed: `activateEndpoint()` function
- Added: `toggleEndpoint(tag)` function that calls `/api/endpoints/:tag/toggle-active`

### 6. **control-server.js** - Updated Imports

Added new imports from endpoints-store.js:
```javascript
getActiveTags, setActiveTags, addActiveTag, removeActiveTag, toggleActiveTag
```

### 7. **CSS Updates** - New Styling

Added new badge style for inactive endpoints:
```css
.badge-inactive {
  background: #f3f4f6;
  color: #6b7280;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}
```

## Behavior Changes

### Before
- Only ONE endpoint could be "active" at a time
- Setting a new endpoint as active deactivated the previous one
- `activeEndpointTag` was a single string

### After
- MULTIPLE endpoints can be "active" simultaneously
- Each active endpoint runs its own scheduler independently
- `activeEndpointTags` is an array of tags
- Checkboxes allow easy on/off toggling
- All active endpoints start automatically on server startup

## Data Flow

### Old Flow
```
User clicks "Activate" button
    ↓
setActiveTag("PROD")
    ↓
activeEndpointTag = "PROD"
    ↓
Only PROD runs
```

### New Flow
```
User checks "pro" checkbox
    ↓
toggleEndpoint("pro")
    ↓
toggleActiveTag("pro")
    ↓
activeEndpointTags = ["pro", "PROD"]
    ↓
Both pro AND PROD run simultaneously
```

## Scheduler Management

### Multiple Schedulers

Each endpoint gets its own scheduler:
```javascript
// In scheduler.js
const activeIntervals = new Map(); // Tracks all active schedulers
// {
//   "pro": intervalId_1,
//   "PROD": intervalId_2
// }
```

### Independent Operation

When both "pro" and "PROD" are active:
```
pro scheduler          PROD scheduler
├─ Interval: 30s      ├─ Interval: 5min
├─ API: /api1         ├─ API: /api2
└─ State: separate    └─ State: separate
```

## Configuration File Structure

### config-state.json Example

```json
{
  "activeEndpointTags": ["pro", "PROD"],
  "endpointOverrides": {
    "pro": {
      "apiEndpoint": "http://...",
      "checkInterval": 30000,
      "enableSms": true,
      "enableEmail": true,
      "phoneNumbers": ["01571306597"],
      "emailAddresses": ["maruf.3666@gmail.com"],
      "tag": "pro"
    },
    "PROD": {
      "apiEndpoint": "http://...",
      "checkInterval": 300000,
      "enableSms": true,
      "enableEmail": true,
      "phoneNumbers": ["01571306597"],
      "emailAddresses": ["MARUF.3666@GMAIL.COM"],
      "tag": "PROD"
    }
  },
  "globalSettings": {
    "controlServerPort": 3000,
    "controlServerUrl": "http://192.168.1.249:3000"
  },
  "endpoints": {}
}
```

## Testing Checklist

- [x] Updated config-state.json with activeEndpointTags array
- [x] Added new functions to endpoints-store.js
- [x] Added new API routes to control-server.js
- [x] Updated startup logic to start all active endpoints
- [x] Updated /endpoints/ui to show checkboxes
- [x] Updated JavaScript toggle function
- [x] Maintained backward compatibility

## Server Startup Output

When server starts with `activeEndpointTags: ["pro", "PROD"]`:

```
Control server running on http://0.0.0.0:3000
Access at: http://localhost:3000

Available endpoints:
  - Config UI: http://localhost:3000/config/ui
  - Setup Wizard: http://localhost:3000/setup/ui
  - Logs: http://localhost:3000/logs/ui
  - Named Endpoints: http://localhost:3000/endpoints/ui

🚀 Starting schedulers for 2 ACTIVE endpoint(s)...
  ✓ Scheduler started for: pro
  ✓ Scheduler started for: PROD
```

## Next Steps (Optional Enhancements)

1. Add visual scheduler status indicator in UI showing last check time
2. Add endpoint-specific mute controls (currently global)
3. Add real-time monitoring dashboard
4. Add scheduled activation/deactivation feature
5. Add endpoint performance metrics (avg response time, error rate)
