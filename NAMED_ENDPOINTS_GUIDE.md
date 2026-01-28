# Named API Endpoints Configuration Guide

## Overview
সিস্টেম এখন একাধিক **named endpoints** সাপোর্ট করে। প্রতিটি endpoint এর নিজস্ব স্বাধীন কনফিগারেশন আছে।

## প্রতিটি Endpoint-এর কনফিগারেশন

```javascript
{
  tag: 'unique-identifier',           // অনন্য নাম/ট্যাগ
  apiEndpoint: 'http://...',           // API URL
  method: 'GET',                       // GET, POST, PUT, DELETE
  headers: {},                         // কাস্টম headers
  authType: 'bearer',                  // '', 'bearer', 'basic'
  authToken: 'token_value',            // Bearer টোকেন
  authUsername: 'user',                // Basic auth ইউজারনেম
  authPassword: 'pass',                // Basic auth পাসওয়ার্ড
  query: {},                           // Query parameters
  body: {},                            // Request body
  smsEndpoint: 'http://...',          // SMS সার্ভিস URL
  emailEndpoint: 'http://...',        // Email সার্ভিস URL
  checkInterval: 30000,                // মিলিসেকেন্ডে চেক ইন্টারভাল
  enableSms: true,                     // SMS সক্ষম/নিষ্ক্রিয়
  enableEmail: true,                   // Email সক্ষম/নিষ্ক্রিয়
  enableManualMute: true,              // ম্যানুয়াল মিউট অনুমোদন
  enableRecoveryEmail: true,           // রিকভারি ইমেইল পাঠান
  phoneNumbers: ['01...'],             // ফোন নম্বর লিস্ট
  emailAddresses: ['email@...'],       // ইমেইল লিস্ট
  mapItemsPath: 'items',               // API রেসপন্স থেকে items path
  mapIdPath: 'id',                     // ID এর জন্য path
  mapTimestampPath: 'created_at',      // টাইমস্ট্যাম্প path
  mapTitlePath: 'title',               // শিরোনাম path
  mapDetailsPath: 'details'            // বিস্তারিত path
}
```

## ফাইল স্ট্রাকচার

### 1. **config.js** - মূল কনফিগারেশন
সকল named endpoints এর ডিফল্ট কনফিগারেশন ডিফাইন করে।

```javascript
const NAMED_ENDPOINTS = {
  payment: { ... },
  billing: { ... },
  // আরও endpoints যোগ করুন
};

const DEFAULT_ENDPOINT_TAG = 'payment';
```

### 2. **config-state.json** - রানটাইম কনফিগারেশন
ব্যবহারকারীর দ্বারা রানটাইম সেটিংস পরিবর্তন করা হয়।

```json
{
  "activeEndpointTag": "payment",
  "endpointOverrides": {
    "payment": { ... }
  },
  "globalSettings": { ... }
}
```

### 3. **config-endpoints.js** - Helper Functions
Endpoint কনফিগারেশন পেতে helper ফাংশন।

```javascript
getEndpointConfig('payment')     // নির্দিষ্ট endpoint config
getAvailableEndpoints()          // সব endpoint tags
endpointExists('payment')        // চেক করুন tag বিদ্যমান
getAllEndpoints()                // সব endpoints রিটার্ন করুন
```

## ব্যবহার উদাহরণ

### নতুন Endpoint যোগ করা
```javascript
// config.js তে যোগ করুন:
const NAMED_ENDPOINTS = {
  payment: { ... },
  
  // নতুন endpoint
  billing: {
    tag: 'billing',
    apiEndpoint: 'http://api.example.com/billing',
    method: 'GET',
    smsEndpoint: 'http://localhost:9090/api/sms/send',
    emailEndpoint: 'http://localhost:9090/api/email/send',
    checkInterval: 60000,
    enableSms: true,
    enableEmail: true,
    // ... অন্যান্য সেটিংস
  }
};
```

### কনফিগ আনা
```javascript
const { getEndpointConfig } = require('./config-endpoints');

// Active endpoint config পান
const config = getEndpointConfig(); // default ব্যবহার করে

// নির্দিষ্ট endpoint config
const billingConfig = getEndpointConfig('billing');

// SMS এন্ডপয়েন্ট অ্যাক্সেস করুন
console.log(config.smsEndpoint);     // 'http://localhost:9090/api/sms/send'

// Email সেটিংস অ্যাক্সেস করুন
console.log(config.enableEmail);     // true
```

## API Endpoints (REST)

### 1. সব endpoints দেখুন
```
GET /api/endpoints
Response:
[
  { tag: 'payment', apiEndpoint: '...', enableSms: true, ... },
  { tag: 'billing', apiEndpoint: '...', enableSms: false, ... }
]
```

### 2. নির্দিষ্ট endpoint এর কনফিগ
```
GET /api/endpoints/:tag
Response:
{
  tag: 'payment',
  apiEndpoint: '...',
  method: 'GET',
  // ... সব সেটিংস
}
```

### 3. Endpoint কনফিগ আপডেট
```
PUT /api/endpoints/:tag
Request Body:
{
  apiEndpoint: 'new-url',
  enableSms: false,
  checkInterval: 60000,
  phoneNumbers: ['01...'],
  // ... পরিবর্তন করতে চান এমন ফিল্ড
}
```

### 4. সক্রিয় endpoint পরিবর্তন
```
POST /api/endpoints/activate/:tag
Response:
{
  message: 'Endpoint activated',
  activeTag: 'billing'
}
```

### 5. নতুন endpoint যোগ করুন (রানটাইম)
```
POST /api/endpoints
Request Body:
{
  tag: 'newservice',
  apiEndpoint: 'http://...',
  enableSms: true,
  // ... অন্যান্য সেটিংস
}
```

## মাইগ্রেশন গাইড (পুরানো থেকে নতুন)

পুরানো সিস্টেম:
```javascript
const API_ENDPOINT = '...';
const ENABLE_SMS = true;
const PHONE_NUMBERS = ['01...'];
```

নতুন সিস্টেম:
```javascript
const config = getEndpointConfig('payment');
// config.apiEndpoint -> API_ENDPOINT এর বদলে
// config.enableSms -> ENABLE_SMS এর বদলে
// config.phoneNumbers -> PHONE_NUMBERS এর বদলে
```

## উপকারিতা

✅ **একাধিক API endpoint একই সময়ে চালান**  
✅ **প্রতিটি endpoint এর জন্য স্বাধীন SMS/Email সেটিংস**  
✅ **প্রতিটি endpoint এর জন্য আলাদা check interval**  
✅ **সহজে নতুন endpoint যোগ/সরান**  
✅ **রানটাইম এ কনফিগারেশন পরিবর্তন করুন**  
✅ **Namespace conflict নেই**
