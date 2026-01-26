# Email API Documentation

## Setup

### 1. Environment Variables
আপনার `.env` ফাইলে নিম্নলিখিত কনফিগারেশন যুক্ত করুন:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com          # Your SMTP host
EMAIL_PORT=587                     # SMTP port (587 for TLS, 465 for SSL)
EMAIL_SECURE=false                 # true for port 465, false for other ports
EMAIL_USER=your-email@gmail.com    # Your email address
EMAIL_PASSWORD=your-app-password   # Your email password or app password
EMAIL_FROM=your-email@gmail.com    # From email address
EMAIL_FROM_NAME=SMS Gateway        # From name
```

### 2. Gmail Setup (যদি Gmail ব্যবহার করেন)
- Gmail এর জন্য, আপনাকে App Password তৈরি করতে হবে
- যান: https://myaccount.google.com/apppasswords
- একটি নতুন App Password তৈরি করুন
- সেই পাসওয়ার্ডটি `EMAIL_PASSWORD` তে ব্যবহার করুন

### 3. Other Email Providers
- **Outlook/Hotmail:**
  - HOST: smtp-mail.outlook.com
  - PORT: 587
  - SECURE: false

- **Yahoo:**
  - HOST: smtp.mail.yahoo.com
  - PORT: 587
  - SECURE: false

- **Custom SMTP:**
  - আপনার SMTP provider এর তথ্য ব্যবহার করুন

## API Endpoints

### 1. Send Email (Single or Multiple)
**Endpoint:** `POST /api/email/send`

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "text": "Plain text email content",
  "html": "<h1>HTML Email</h1><p>This is HTML content (optional)</p>"
}
```

**Multiple Recipients (Comma-separated):**
```json
{
  "to": "email1@example.com,email2@example.com,email3@example.com",
  "subject": "Email Subject",
  "text": "Plain text email content"
}
```

**Multiple Recipients (Array):**
```json
{
  "to": ["email1@example.com", "email2@example.com"],
  "subject": "Email Subject",
  "text": "Plain text email content"
}
```

**Response:**
```json
{
  "status": "OK",
  "summary": {
    "totalEmails": 2,
    "successful": 2,
    "failed": 0
  },
  "results": [
    {
      "email": "email1@example.com",
      "status": "SUCCESS",
      "messageId": "<message-id>"
    },
    {
      "email": "email2@example.com",
      "status": "SUCCESS",
      "messageId": "<message-id>"
    }
  ]
}
```

### 2. Send Batch Emails
**Endpoint:** `POST /api/email/send-batch`

**Request Body:**
```json
{
  "emails": [
    "email1@example.com",
    "email2@example.com",
    "email3@example.com"
  ],
  "subject": "Batch Email Subject",
  "text": "Plain text content for all recipients",
  "html": "<h1>HTML Content</h1><p>This is optional HTML content</p>"
}
```

**Response:**
```json
{
  "status": "OK",
  "summary": {
    "totalEmails": 3,
    "successful": 3,
    "failed": 0
  },
  "results": [
    {
      "email": "email1@example.com",
      "status": "SUCCESS",
      "messageId": "<message-id>"
    },
    {
      "email": "email2@example.com",
      "status": "SUCCESS",
      "messageId": "<message-id>"
    },
    {
      "email": "email3@example.com",
      "status": "SUCCESS",
      "messageId": "<message-id>"
    }
  ]
}
```

### 3. Verify Email Connection
**Endpoint:** `GET /api/email/verify`

**Response (Success):**
```json
{
  "status": "OK",
  "success": true,
  "message": "Email server connection verified"
}
```

**Response (Error):**
```json
{
  "status": "ERROR",
  "success": false,
  "error": "Connection error message"
}
```

## Testing

### Using cURL

**1. Send Single Email:**
```bash
curl -X POST http://localhost:9090/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Test Email",
    "text": "This is a test email",
    "html": "<h1>Test</h1><p>This is a test email</p>"
  }'
```

**2. Send to Multiple Recipients:**
```bash
curl -X POST http://localhost:9090/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "email1@example.com,email2@example.com",
    "subject": "Test Email",
    "text": "This is a test email"
  }'
```

**3. Send Batch Emails:**
```bash
curl -X POST http://localhost:9090/api/email/send-batch \
  -H "Content-Type: application/json" \
  -d '{
    "emails": ["email1@example.com", "email2@example.com"],
    "subject": "Batch Test",
    "text": "This is a batch email"
  }'
```

**4. Verify Email Connection:**
```bash
curl http://localhost:9090/api/email/verify
```

### Using Test Script

একটি test script তৈরি করা হয়েছে যা আপনি চালাতে পারেন:

```bash
node test-send-email.js
```

## Error Handling

সমস্ত API endpoint যথাযথভাবে error handling করে এবং নিম্নলিখিত status codes return করে:

- **200 OK:** সফল request
- **400 Bad Request:** অনুপস্থিত বা invalid parameters
- **500 Internal Server Error:** Server-side error

## Notes

1. **HTML Content:** `html` parameter optional, শুধুমাত্র plain text পাঠাতে চাইলে এটি বাদ দিন
2. **Rate Limiting:** আপনার email provider এর rate limits সম্পর্কে সচেতন থাকুন
3. **App Passwords:** Gmail এর জন্য regular password এর পরিবর্তে App Password ব্যবহার করুন
4. **Security:** `.env` ফাইল কখনো git repository তে commit করবেন না

## Support

কোন সমস্যা হলে নিম্নলিখিত বিষয়গুলি চেক করুন:

1. `.env` ফাইলে সব configuration সঠিকভাবে set করা আছে কিনা
2. Email credentials valid কিনা
3. SMTP server accessible কিনা (firewall/network issues)
4. Email provider এর security settings (2FA, app passwords)
