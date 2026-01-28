# 📋 Named Endpoints UI - Quick Start

## ✅ কী করা হয়েছে

### 1. **Config System Update**
- ✅ `config.js` - Named endpoints সাপোর্ট
- ✅ `config-state.json` - Runtime overrides সংরক্ষণ
- ✅ `endpoints-store.js` - Named endpoints helper functions

### 2. **Control Server Routes**
- ✅ `GET /api/endpoints` - সব endpoints দেখুন
- ✅ `GET /api/endpoints/:tag` - নির্দিষ্ট endpoint দেখুন
- ✅ `PUT /api/endpoints/:tag` - Endpoint আপডেট করুন
- ✅ `POST /api/endpoints/:tag/activate` - Active endpoint সেট করুন
- ✅ `POST /api/endpoints/:tag/reset` - Defaults এ ফিরিয়ে আনুন

### 3. **UI Pages**
- ✅ `GET /endpoints/ui` - **Named Endpoints Manager** (প্রধান UI)
- ✅ `GET /setup/ui` - **Setup Wizard** (বিস্তারিত কনফিগারেশন)
- ✅ `GET /config/ui` - **Config Settings** (সাধারণ সেটিংস)
- ✅ `GET /logs/ui` - **System Logs** (লগস দেখুন)

## 🚀 তাৎক্ষণিক শুরু করুন

### Option 1: Named Endpoints Manager (সবচেয়ে সহজ)
```
URL: http://localhost:3000/endpoints/ui
```

**এখানে করতে পারেন:**
- ✅ সব endpoints দেখুন একটি grid এ
- ✅ প্রতিটি endpoint এর SMS/Email/Interval সেটিংস দেখুন
- ✅ Edit বাটনে ক্লিক করে সেটিংস পরিবর্তন করুন
- ✅ Activate দিয়ে active endpoint পরিবর্তন করুন

### Option 2: Setup Wizard (সম্পূর্ণ কনফিগারেশন)
```
URL: http://localhost:3000/setup/ui
```

**এখানে করতে পারেন:**
- ✅ নতুন API endpoint তৈরি করুন
- ✅ API details (headers, auth, mapping paths) সেট করুন
- ✅ Test fetch এবং test map চালান
- ✅ একাধিক configs একসাথে পরিচালনা করুন

## 📊 Named Endpoints Structure

### Base Configuration (config.js)
```javascript
NAMED_ENDPOINTS = {
  payment: {
    tag: 'payment',
    apiEndpoint: 'http://...',
    smsEndpoint: 'http://...',
    emailEndpoint: 'http://...',
    checkInterval: 30000,          // 30 সেকেন্ড
    enableSms: true,
    enableEmail: true,
    enableManualMute: true,
    phoneNumbers: ['01...'],
    emailAddresses: ['...@example.com'],
    // ... আরও সেটিংস
  }
  // আরও endpoints যোগ করুন
}
```

### Runtime Overrides (config-state.json)
```json
{
  "activeEndpointTag": "payment",     // এই endpoint এখন active
  "endpointOverrides": {
    "payment": {
      "enableSms": false,             // Runtime এ পরিবর্তন করুন
      "phoneNumbers": ["01700000000"],
      "updatedAt": "2026-01-27T..."
    }
  }
}
```

## 🎯 ব্যবহার উদাহরণ

### Example 1: Payment API সেটআপ
```
1. /endpoints/ui তে যান
2. "payment" endpoint এ Edit ক্লিক করুন
3. settings পরিবর্তন করুন:
   - API: http://api.example.com/payments
   - SMS: ✓ On
   - Email: ✓ On
   - Interval: 30000ms (30 সেকেন্ড)
   - Phone: +8801700000000
   - Email: admin@example.com
4. Save Changes ক্লিক করুন
```

### Example 2: Multiple APIs চালান
```
Config তৈরি করুন:
- payment    -> http://api1.com/payments
- billing    -> http://api2.com/billing
- orders     -> http://api3.com/orders

প্রতিটির আলাদা SMS/Email সেটিংস থাকবে
যেকোনো সময় active endpoint পরিবর্তন করতে পারবেন
```

## 📁 নতুন ফাইল/আপডেট

```
controllerServer/
├── config.js (আপডেট)              <- Named endpoints সংজ্ঞায়িত
├── config-state.json (আপডেট)      <- Runtime overrides
├── config-endpoints.js (নতুন)      <- Helper functions
├── endpoints-store.js (নতুন)       <- State management
└── control-server.js (আপডেট)      <- UI pages এবং routes

Root/
├── NAMED_ENDPOINTS_GUIDE.md (নতুন)   <- বিস্তারিত ডকুমেন্টেশন
└── UI_SETUP_GUIDE.md (নতুন)         <- UI ব্যবহার গাইড
```

## 💻 API Examples

### সব endpoints দেখুন
```bash
curl http://localhost:3000/api/endpoints
```

### Response:
```json
{
  "ok": true,
  "activeTag": "payment",
  "tags": ["payment", "billing", "orders"],
  "endpoints": {
    "payment": { ... },
    "billing": { ... },
    "orders": { ... }
  }
}
```

### একটি endpoint আপডেট করুন
```bash
curl -X PUT http://localhost:3000/api/endpoints/payment \
  -H "Content-Type: application/json" \
  -d '{
    "enableSms": false,
    "checkInterval": 60000,
    "phoneNumbers": ["01700000000"]
  }'
```

### Active endpoint পরিবর্তন করুন
```bash
curl -X POST http://localhost:3000/api/endpoints/billing/activate
```

## 🎨 UI Features

### Named Endpoints Manager
- **Grid View** - সব endpoints card হিসেবে দেখুন
- **Status Indicator** - ⭐ active endpoint দেখান
- **Quick Edit** - প্রতিটি card এ Edit বাটন
- **One-click Activate** - Activate বাটন দিয়ে switch করুন
- **Responsive Design** - Desktop/Tablet/Mobile এ কাজ করে

### Setup Wizard
- **Config Selector** - dropdown থেকে config বেছে নিন
- **Detailed Form** - সব settings এক জায়গায়
- **JSON Support** - Complex headers/query params
- **Test Buttons** - Test fetch এবং test map
- **Multi-config** - একসাথে একাধিক config পরিচালনা

## ✨ পরবর্তী স্টেপ

1. **Server চালু করুন**
   ```bash
   cd controllerServer
   node server.js
   ```

2. **UI খুলুন**
   ```
   http://localhost:3000/endpoints/ui
   ```

3. **একটি endpoint এডিট করুন**
   - Edit বাটন ক্লিক করুন
   - সেটিংস পরিবর্তন করুন
   - Save Changes ক্লিক করুন

4. **Active endpoint পরিবর্তন করুন**
   - Activate বাটন ক্লিক করুন
   - সিস্টেম নতুন endpoint ব্যবহার করবে

## 🔧 Troubleshooting

| সমস্যা | সমাধান |
|--------|---------|
| UI লোড না হয় | `curl http://localhost:3000/config` চেক করুন |
| Changes save না হয় | Browser console এ error দেখুন |
| Endpoints দেখা না গেয় | `/api/endpoints` API call করুন |
| Active endpoint change না হয় | Browser cache clear করুন |

## 📞 সাপোর্ট

- ডকুমেন্টেশন: `NAMED_ENDPOINTS_GUIDE.md`
- UI গাইড: `UI_SETUP_GUIDE.md`
- API ডকুমেন্টেশন: `API.md`

---

**Ready to go!** 🎉  
এখন আপনার সিস্টেম সম্পূর্ণভাবে GUI-based endpoint management সাপোর্ট করে।
