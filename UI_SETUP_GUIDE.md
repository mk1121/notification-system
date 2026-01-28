# UI Setup Guide - Named Endpoints

## ওভারভিউ

এখন আপনার সিস্টেমে **Named Endpoints Manager UI** আছে যেখানে আপনি গ্রাফিক্যালি সকল endpoints ম্যানেজ করতে পারেন।

## ইউজার ইন্টারফেস অ্যাক্সেস

### 1. **Named Endpoints Manager** (প্রধান UI)
```
URL: http://localhost:3000/endpoints/ui
```

এখানে আপনি পাবেন:
- ✅ সকল endpoints এর overview
- ✅ প্রতিটি endpoint এর SMS, Email, Interval সেটিংস
- ✅ Active endpoint indicator (⭐)
- ✅ Edit, Activate, Reset buttons

### 2. **Setup Wizard** (বিস্তারিত কনফিগারেশন)
```
URL: http://localhost:3000/setup/ui
```

এখানে আপনি:
- Create, Edit করতে পারেন সকল configs
- API endpoint, headers, auth সেটিংস
- Mapping paths কনফিগার করতে পারেন
- Test fetch এবং test map চালাতে পারেন

### 3. **Config UI** (সাধারণ কনফিগারেশন)
```
URL: http://localhost:3000/config/ui
```

### 4. **Logs** (সিস্টেম logs দেখুন)
```
URL: http://localhost:3000/logs/ui
```

## Named Endpoints UI - ফিচার

### Endpoints Grid View
প্রতিটি endpoint একটি **card** এ দেখা যায়:

```
┌─────────────────────────────────┐
│ payment                    ⭐    │  <- ট্যাগ ও active badge
├─────────────────────────────────┤
│ API: http://api.example.com/... │
│ SMS: ✓ On | Email: ✓ On        │  <- সেটিংস স্ট্যাটাস
│ Interval: 30000ms | Mute: ✓    │
├─────────────────────────────────┤
│ [Edit] [Activate] [Reset]       │  <- অ্যাকশন বাটন
└─────────────────────────────────┘
```

### Edit Modal (সম্পাদনা করুন)
বাটনে ক্লিক করলে একটি modal খুলবে যেখানে:

- API Endpoint URL পরিবর্তন
- HTTP Method (GET/POST/PUT/etc)
- Check Interval সময় সেট
- SMS/Email endpoint URLs
- SMS/Email অন/অফ করুন
- ফোন নম্বর ও email addresses যোগ করুন
- Manual mute অনুমোদন সেটিংস

### Buttons এর কাজ

| Button | কাজ |
|--------|-----|
| **Edit** | এই endpoint এর সেটিংস এডিট করুন |
| **Activate** | এই endpoint কে active করুন (সিস্টেম এটি ব্যবহার করবে) |
| **Reset** | Default কনফিগে ফিরিয়ে আনুন |

## এক্সাম্পল ব্যবহার

### 1. নতুন Endpoint তৈরি করুন

1. **Setup Wizard এ যান:** `http://localhost:3000/setup/ui`
2. **Config dropdown** এ "New Config" নির্বাচন করুন
3. **Config Name লিখুন:** e.g., `billing`, `orders`, `users`
4. **API endpoint সেট করুন:** e.g., `http://api.example.com/billing/transactions`
5. **SMS/Email settings করুন**
6. **Save Config** ক্লিক করুন

### 2. Endpoint Edit করুন

1. **Named Endpoints UI এ যান:** `http://localhost:3000/endpoints/ui`
2. **যে endpoint edit করতে চান তার Edit button ক্লিক করুন**
3. **সেটিংস পরিবর্তন করুন**
4. **Save Changes ক্লিক করুন**

### 3. Active Endpoint পরিবর্তন করুন

1. **Named Endpoints UI এ যান**
2. **যে endpoint ব্যবহার করতে চান তার Activate button ক্লিক করুন**
3. **Confirmation দিন**
4. সিস্টেম এখন সেই endpoint ব্যবহার করবে

### 4. Endpoint Reset করুন (Default এ ফিরিয়ে আনুন)

1. **Named Endpoints UI এ যান**
2. **যে endpoint reset করতে চান তার Reset button ক্লিক করুন**
3. **Confirmation দিন**
4. সেটিংস default config এ ফিরে যাবে

## API Endpoints (Programmatic)

যদি আপনি API দিয়ে manage করতে চান:

### সব endpoints দেখুন
```bash
curl http://localhost:3000/api/endpoints
```

### নির্দিষ্ট endpoint দেখুন
```bash
curl http://localhost:3000/api/endpoints/payment
```

### Endpoint আপডেট করুন
```bash
curl -X PUT http://localhost:3000/api/endpoints/payment \
  -H "Content-Type: application/json" \
  -d '{
    "enableSms": true,
    "checkInterval": 60000,
    "phoneNumbers": ["01700000000"]
  }'
```

### Active endpoint সেট করুন
```bash
curl -X POST http://localhost:3000/api/endpoints/billing/activate
```

### Reset করুন
```bash
curl -X POST http://localhost:3000/api/endpoints/payment/reset
```

## কনফিগ ফাইল স্ট্রাকচার

### config.js - Base Configuration
```javascript
const NAMED_ENDPOINTS = {
  payment: {
    tag: 'payment',
    apiEndpoint: '...',
    enableSms: true,
    // ...
  },
  billing: {
    tag: 'billing',
    apiEndpoint: '...',
    // ...
  }
};
```

### config-state.json - Runtime Overrides
```json
{
  "activeEndpointTag": "payment",
  "endpointOverrides": {
    "payment": {
      "enableSms": false,
      "phoneNumbers": ["..."],
      "updatedAt": "2026-01-27T..."
    }
  }
}
```

## UI ফিচার

### 1. Responsive Design
- Desktop এ ভালো লাগে
- Mobile এ adaptive grid
- সব ডিভাইসে কাজ করে

### 2. Real-time Updates
- Save করলে সাথে সাথে change হয়
- Page reload স্বয়ংক্রিয়
- No page refresh needed

### 3. Status Indicators
- **⭐ Active** - এই endpoint এখন active
- **✓ Enabled** - SMS/Email চালু
- **✗ Disabled** - SMS/Email বন্ধ

### 4. Form Validation
- Required fields মার্ক করা
- Invalid data reject হয়
- Error messages স্পষ্ট

## ট্রাবলশুটিং

### UI লোড না হলে
```bash
# Control server চেক করুন
curl http://localhost:3000/config
```

### Changes save না হলে
- Browser console এ error দেখুন
- Network tab চেক করুন
- config-state.json permissions চেক করুন

### Endpoints দেখা না গেলে
```bash
# Direct API call চেক করুন
curl http://localhost:3000/api/endpoints
```

## উপকারিতা

✅ **সহজ ম্যানেজমেন্ট** - GUI এর মাধ্যমে endpoints ম্যানেজ করুন  
✅ **একাধিক APIs** - একসাথে একাধিক API সেবা চালান  
✅ **স্বাধীন সেটিংস** - প্রতিটির আলাদা SMS/Email সেটিংস  
✅ **রানটাইম কনফিগ** - কোড বদলাতে হয় না, UI থেকে সব করুন  
✅ **সম্পূর্ণ ভিজুয়াল** - সব সেটিংস এক জায়গায় দেখুন  
✅ **কোন ডাউনটাইম নেই** - live configure করতে পারেন
