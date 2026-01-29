# 📋 Named Endpoints UI - Quick Start

## ✅ What Has Been Implemented

### 1. **Config System Update**
- ✅ `config.js` - Named endpoints support
- ✅ `config-state.json` - Runtime overrides storage
- ✅ `endpoints-store.js` - Named endpoints helper functions

### 2. **Control Server Routes**
- ✅ `GET /api/endpoints` - View all endpoints
- ✅ `GET /api/endpoints/:tag` - View specific endpoint
- ✅ `PUT /api/endpoints/:tag` - Update endpoint
- ✅ `POST /api/endpoints/:tag/activate` - Set active endpoint
- ✅ `POST /api/endpoints/:tag/reset` - Reset to defaults

### 3. **UI Pages**
- ✅ `GET /endpoints/ui` - **Named Endpoints Manager** (Main UI)
- ✅ `GET /setup/ui` - **Setup Wizard** (Detailed configuration)
- ✅ `GET /config/ui` - **Config Settings** (General settings)
- ✅ `GET /logs/ui` - **System Logs** (View logs)

## 🚀 Quick Start

### Option 1: Named Endpoints Manager (Easiest)
```
URL: http://localhost:3000/endpoints/ui
```

**What you can do here:**
- ✅ View all endpoints in a grid layout
- ✅ See SMS/Email/Interval settings for each endpoint
- ✅ Click Edit button to change settings
- ✅ Use Activate button to change active endpoint

### Option 2: Setup Wizard (Complete Configuration)
```
URL: http://localhost:3000/setup/ui
```

**What you can do here:**
- ✅ Create new API endpoints
- ✅ Set API details (headers, auth, mapping paths)
- ✅ Run test fetch and test map
- ✅ Manage multiple configs simultaneously

## 📊 Named Endpoints Structure

### Base Configuration (config.js)
```javascript
NAMED_ENDPOINTS = {
  'user-service': {
    tag: 'user-service',
    apiEndpoint: 'http://...',
    smsEndpoint: 'http://...',
    emailEndpoint: 'http://...',
    checkInterval: 30000,          // 30 seconds
    enableSms: true,
    enableEmail: true,
    enableManualMute: true,
    phoneNumbers: ['01...'],
    emailAddresses: ['...@example.com'],
    // ... more settings
  }
  // Add more endpoints
}
```

### Runtime Overrides (config-state.json)
```json
{
  "activeEndpointTag": "user-service",     // This endpoint is now active
  "endpointOverrides": {
    "user-service": {
      "enableSms": false,             // Change at runtime
      "phoneNumbers": ["01700000000"],
      "updatedAt": "2026-01-27T..."
    }
  }
}
```

## 🎯 Usage Examples

### Example 1: User Service API Setup
```
1. Go to /endpoints/ui
2. Click Edit on "user-service" endpoint
3. Change settings:
   - API: http://api.example.com/users
   - SMS: ✓ On
   - Email: ✓ On
   - Interval: 30000ms (30 seconds)
   - Phone: +8801700000000
   - Email: admin@example.com
4. Click Save Changes
```

### Example 2: Running Multiple APIs
```
Create configs:
- user-service    -> http://api1.com/users
- order-service   -> http://api2.com/orders
- inventory-api   -> http://api3.com/inventory

Each will have separate SMS/Email settings
You can change active endpoint anytime
```

## 📁 New Files/Updates

```
controllerServer/
├── config.js (updated)              <- Define named endpoints
├── config-state.json (updated)      <- Runtime overrides
├── config-endpoints.js (new)        <- Helper functions
├── endpoints-store.js (new)         <- State management
└── control-server.js (updated)      <- UI pages and routes

Root/
├── NAMED_ENDPOINTS_GUIDE.md (new)   <- Detailed documentation
└── UI_SETUP_GUIDE.md (new)         <- UI usage guide
```

## 💻 API Examples

### View All Endpoints
```bash
curl http://localhost:3000/api/endpoints
```

### Response:
```json
{
  "ok": true,
  "activeTag": "user-service",
  "tags": ["user-service", "order-service", "inventory-api"],
  "endpoints": {
    "user-service": { ... },
    "order-service": { ... },
    "inventory-api": { ... }
  }
}
```

### Update an Endpoint
```bash
curl -X PUT http://localhost:3000/api/endpoints/user-service \
  -H "Content-Type: application/json" \
  -d '{
    "enableSms": false,
    "checkInterval": 60000,
    "phoneNumbers": ["01700000000"]
  }'
```

### Change Active Endpoint
```bash
curl -X POST http://localhost:3000/api/endpoints/order-service/activate
```

## 🎨 UI Features

### Named Endpoints Manager
- **Grid View** - View all endpoints as cards
- **Status Indicator** - ⭐ Shows active endpoint
- **Quick Edit** - Edit button on each card
- **One-click Activate** - Switch with Activate button
- **Responsive Design** - Works on Desktop/Tablet/Mobile

### Setup Wizard
- **Config Selector** - Choose config from dropdown
- **Detailed Form** - All settings in one place
- **JSON Support** - Complex headers/query params
- **Test Buttons** - Test fetch and test map
- **Multi-config** - Manage multiple configs together

## ✨ Next Steps

1. **Start Server**
   ```bash
   cd controllerServer
   node server.js
   ```

2. **Open UI**
   ```
   http://localhost:3000/endpoints/ui
   ```

3. **Edit an Endpoint**
   - Click Edit button
   - Change settings
   - Click Save Changes

4. **Change Active Endpoint**
   - Click Activate button
   - System will use new endpoint

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| UI not loading | Check `curl http://localhost:3000/config` |
| Changes not saving | Check browser console for errors |
| Endpoints not showing | Call `/api/endpoints` API |
| Active endpoint not changing | Clear browser cache |

## 📞 Support

- Documentation: `NAMED_ENDPOINTS_GUIDE.md`
- UI Guide: `UI_SETUP_GUIDE.md`
- API Documentation: `API.md`

---

**Ready to go!** 🎉  
Your system now fully supports GUI-based endpoint management.
