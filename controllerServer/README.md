# Payment Notification System

A Node.js application that monitors payment transactions from a remote API and sends SMS notifications.

## Features

- **Periodic Monitoring**: Checks the payment API every 10 minutes
- **Status Code Validation**: Only processes responses with status code 200
- **SMS Notifications**: Sends SMS alerts to configured phone numbers when transactions are detected
- **Error Handling**: Robust error handling and logging
- **Graceful Shutdown**: Handles SIGINT and SIGTERM signals

## Installation

1. Install dependencies:
```bash
npm install
```

## Configuration

Edit `config.js` to customize:
- `API_ENDPOINT`: The payment transaction API URL
- `SMS_ENDPOINT`: The SMS gateway URL
- `CHECK_INTERVAL`: Interval between API checks (default: 10 minutes)
- `PHONE_NUMBERS`: Array of phone numbers to receive notifications

## Running

Start the application:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Project Structure

- `server.js` - Main entry point
- `config.js` - Configuration settings
- `api.js` - API communication module
- `sms.js` - SMS notification module
- `scheduler.js` - Scheduling and notification logic

## API Response Format

Expected JSON response from the API:
```json
{
  "items": [
    {
      "payment_id": 250700002,
      "approval_date": "2025-07-09T09:36:39Z"
    }
  ],
  "count": 25,
  "hasMore": true,
  "offset": 0
}
```

## SMS API Format

SMS notifications are sent via GET request:
```
http://localhost:9090/api/sms/send?to=01571306597&text=Your%20message
```

## Logging

All operations are logged with timestamps:
- Successful API fetches
- SMS delivery status
- Errors and exceptions
- System startup and shutdown

## Error Handling

The system handles:
- Network timeouts
- Invalid API responses
- SMS delivery failures
- Process termination signals

The application will continue running and retry on errors without stopping.
