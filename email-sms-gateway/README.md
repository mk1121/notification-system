# Teletalk SMS & Email Gateway - Node.js Version

Node.js implementation of the Teletalk SMS Gateway API, with support for email notifications and advanced gateway controls.

---

## 📋 Index

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
- [Testing](#testing-with-specific-number)
- [Project Structure](#project-structure)
- [Response Format](#response-format)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Authentication Guide](#authentication-guide)
- [Kill Switch Guide](#kill-switch-guide)

---

## Features

- ✅ Send SMS to specific numbers
- ✅ Send Email notifications (see API docs)
- ✅ Check account balance
- ✅ REST API endpoints
- ✅ API Key authentication (see [Authentication Guide](docs/AUTHENTICATION.md))
- ✅ Emergency kill switch for SMS/Email (see [Kill Switch Guide](docs/KILL_SWITCH.md))
- ✅ Easy testing with test script
- ✅ Environment-based configuration

## Prerequisites

- Node.js 14+ installed
- npm or yarn package manager

## Installation

1. Navigate to the project folder:
```bash
cd nodejs-sms-gateway
```

2. Install dependencies:
```bash
npm install
```

3. Configure your credentials in `.env` file (already created with default values)

## Configuration

Edit the `.env` file to update your Teletalk credentials:

```env
PORT=9090
TELETALK_USER=CPAbankINT
TELETALK_USER_ID=11323
TELETALK_ENCR_KEY=@***
TELETALK_PASSWORD=CPA@bank$api!2025
TELETALK_BASE_URL=https://bulksms.teletalk.com.bd/jlinktbls.php
```

## Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on port 9090 (or the port specified in .env)

## API Endpoints

### 1. Health Check
```
GET http://localhost:9090/
```

### 2. Send SMS
```
GET http://localhost:9090/api/sms/send?to=01700000000&text=Hello%20World
```

Parameters:
- `to`: Recipient phone number (required)
- `text`: SMS message content (required)

### 3. Check Balance
```
GET http://localhost:9090/api/sms/balance
```

### 4. Send Email (see API docs)
```
POST http://localhost:9090/api/email/send
```

## Testing with Specific Number

...existing code...

## Project Structure

...existing code...

## Response Format

...existing code...

## Security Notes

...existing code...

## Troubleshooting

...existing code...

## Development

...existing code...

---

## Authentication Guide

See [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) for:
- How to enable and configure API Key authentication
- Required headers for all protected endpoints
- Security best practices and troubleshooting

**Summary:**
- All SMS and Email endpoints can be protected with an API key
- Add `API_KEY` to your `.env` file
- Use `X-API-Key` or `Authorization: Bearer` header in requests
- See the full guide for error handling and security tips

---

## Kill Switch Guide

See [docs/KILL_SWITCH.md](docs/KILL_SWITCH.md) for:
- How to instantly disable SMS and/or Email services
- API and environment variable controls
- Example cURL commands for toggling services
- Error responses and best practices

**Summary:**
- Use the kill switch to stop all notifications in emergencies
- Control via API or environment variables
- Check status and logs for current state
- See the full guide for advanced usage

---

## License

ISC

