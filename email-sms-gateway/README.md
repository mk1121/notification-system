# Teletalk SMS Gateway - Node.js Version

Node.js implementation of the Teletalk SMS Gateway API.

## Features

- ✅ Send SMS to specific numbers
- ✅ Check account balance
- ✅ REST API endpoints
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

## Testing with Specific Number

### Method 1: Using Test Script

1. Edit `test-send.js` and change the TEST_NUMBER:
```javascript
const TEST_NUMBER = '01700000000';  // Your test number
const TEST_MESSAGE = 'Test SMS from Node.js Gateway';
```

2. Run the test:
```bash
npm test
```

OR

```bash
node test-send.js
```

### Method 2: Using Browser

Start the server and open:
```
http://localhost:9090/api/sms/send?to=01700000000&text=Test%20Message
```

### Method 3: Using cURL

```bash
# Send SMS
curl "http://localhost:9090/api/sms/send?to=01700000000&text=Test%20Message"

# Check Balance
curl "http://localhost:9090/api/sms/balance"
```

### Method 4: Using Direct Client

Create your own test file:

```javascript
const TeletalkSmsClient = require('./teletalkClient');

const client = new TeletalkSmsClient({
    user: 'CPAbankINT',
    userId: 11323,
    encrKey: '@***',
    password: 'CPA@bank$api!2025',
    baseUrl: 'https://bulksms.teletalk.com.bd/jlinktbls.php'
});

async function sendTestSms() {
    try {
        const response = await client.sendSms('01700000000', 'Test Message');
        console.log('Success:', response);
    } catch (error) {
        console.error('Error:', error);
    }
}

sendTestSms();
```

## Project Structure

```
nodejs-sms-gateway/
├── package.json          # Dependencies and scripts
├── .env                  # Configuration (credentials)
├── server.js            # Express server with REST API
├── teletalkClient.js    # Teletalk SMS client implementation
├── test-send.js         # Test script for sending SMS
└── README.md            # This file
```

## Response Format

### Success Response:
```json
{
  "status": "OK",
  "providerResponse": "..." 
}
```

### Error Response:
```json
{
  "status": "ERROR",
  "providerResponse": "Error message"
}
```

## Security Notes

⚠️ **Important**: 
- Never commit the `.env` file to version control
- Keep your credentials secure
- Use environment variables in production
- Add `.env` to your `.gitignore` file

## Troubleshooting

### Port already in use:
Change the PORT in `.env` file:
```env
PORT=9091
```

### Connection timeout:
- Check your internet connection
- Verify the Teletalk base URL is correct
- Ensure firewall allows outgoing HTTPS connections

### Invalid credentials:
- Double-check your credentials in `.env`
- Ensure USER_ID is a number
- Verify password is correct

## Development

To add new features or modify the code:

1. `teletalkClient.js` - Core SMS client logic
2. `server.js` - REST API endpoints
3. `test-send.js` - Test scenarios

## License

ISC
