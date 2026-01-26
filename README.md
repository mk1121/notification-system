# Payment Notification System

A comprehensive notification system that monitors payment transactions via API and sends alerts through SMS and Email channels. Features include intelligent muting controls, logging, and a web-based configuration interface.

## Features

- 🔔 **Multi-Channel Notifications**: Send alerts via SMS and Email
- 🎛️ **Dynamic Configuration**: Web UI to enable/disable channels and manage recipients
- 🔇 **Smart Muting**: Time-based and auto-unmute controls for payment and API alerts
- 📊 **Logging Dashboard**: View, filter, and analyze all notification activities
- 🚨 **API Monitoring**: Automatic failure detection with recovery notifications
- ⚙️ **Live Configuration**: Change settings without restarting the application
- 🔄 **Auto-Recovery**: Unmutes automatically on timer expiry or new events

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Payment Notification System                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   Scheduler  │─────▶│  API Client  │─────▶│  Payment  │ │
│  │ (scheduler.js)│      │   (api.js)   │      │    API    │ │
│  └──────────────┘      └──────────────┘      └───────────┘ │
│         │                                                     │
│         ├──────────┬──────────┬──────────┐                  │
│         ▼          ▼          ▼          ▼                   │
│  ┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐             │
│  │  Logger  │ │  SMS   │ │ Email  │ │ State  │             │
│  │(logger.js)│ │(sms.js)│ │(email) │ │Manager │             │
│  └──────────┘ └────────┘ └────────┘ └────────┘             │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Control Server (control-server.js)         │    │
│  │  • Web UI for settings                               │    │
│  │  • Mute/unmute endpoints                             │    │
│  │  • Logging API & dashboard                           │    │
│  │  • Real-time configuration                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │      Email/SMS Gateway (email-sms-gateway/)          │    │
│  │  • Teletalk SMS integration                          │    │
│  │  • Email SMTP service                                │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Access to payment API endpoint
- SMS gateway credentials (Teletalk)
- SMTP email server credentials

### Setup

1. **Clone or download the repository**

2. **Install dependencies**
   ```bash
   cd /path/to/notification
   npm install
   ```

3. **Configure the system**
   
   Edit `controllerServer/config.js`:
   ```javascript
   const API_ENDPOINT = 'http://your-api-endpoint/payment/transactions';
   const SMS_ENDPOINT = 'http://localhost:9090/api/sms/send';
   const EMAIL_ENDPOINT = 'http://localhost:9090/api/email/send';
   const CONTROL_SERVER_PORT = 3000;
   const CONTROL_SERVER_URL = 'http://your-server-ip:3000';
   const CHECK_INTERVAL = 0.5 * 60 * 1000; // 30 seconds
   const PHONE_NUMBERS = ['01XXXXXXXXX'];
   const EMAIL_ADDRESSES = ['your@email.com'];
   ```

4. **Configure SMS/Email Gateway**
   
   Create `email-sms-gateway/.env`:
   ```env
   # Teletalk SMS Configuration
   TELETALK_BASE_URL=https://vas.teletalk.com.bd/cgi-bin/httpnorm
   TELETALK_USERNAME=your_username
   TELETALK_PASSWORD=your_password
   TELETALK_MASK=YourMask

   # Email SMTP Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password

   # Server Configuration
   PORT=9090
   ```

## Usage

### Starting the System

**Production mode:**
```bash
npm start
```

This runs both the notification scheduler and control server concurrently.

**Development mode with auto-reload:**
```bash
npm run dev
```

**Start SMS/Email Gateway:**
```bash
cd email-sms-gateway
npm start
```

### Web Interfaces

#### Configuration Dashboard
Access at: `http://your-server-ip:3000/config/ui`

Features:
- Toggle SMS/Email notifications on/off
- Add/remove phone numbers and email addresses
- Control manual mute availability
- Adjust check interval
- Real-time status indicators

#### Logs Dashboard
Access at: `http://your-server-ip:3000/logs/ui`

Features:
- View all notification activities
- Filter by type (SMS, Email, Mute, API failure, etc.)
- Statistics overview
- Clear logs
- Export capabilities

#### Mute Controls
Access at: `http://your-server-ip:3000/mute/payment/ui`

Features:
- Time-based muting (custom duration in minutes)
- Countdown timer
- Auto-unmute on timer expiry or new payment detection

## API Reference

### Configuration Endpoints

#### GET `/config`
Returns current configuration in JSON format.

**Response:**
```json
{
  "API_ENDPOINT": "http://...",
  "PHONE_NUMBERS": ["01XXXXXXXXX"],
  "EMAIL_ADDRESSES": ["email@example.com"],
  "ENABLE_SMS": true,
  "ENABLE_EMAIL": true,
  "ENABLE_MANUAL_MUTE": true,
  "CHECK_INTERVAL": 30000
}
```

#### POST `/config`
Update configuration settings.

**Request Body:**
```json
{
  "phoneNumbers": "01XXXXXXXXX, 01YYYYYYYYY",
  "emailAddresses": "email1@example.com, email2@example.com",
  "checkIntervalMinutes": 1,
  "enableSms": true,
  "enableEmail": true,
  "enableManualMute": true
}
```

**Response:**
```json
{
  "ok": true,
  "config": { ... }
}
```

### Logging Endpoints

#### GET `/api/logs?lines=100&type=SMS`
Get logs in JSON format with optional filters.

**Query Parameters:**
- `lines` - Number of recent logs (default: 50)
- `type` - Filter by type: SMS, EMAIL, MUTE, UNMUTE, API-FAILURE, etc.

**Response:**
```json
{
  "ok": true,
  "count": 10,
  "logs": [
    {
      "timestamp": "2026-01-26 13:30:45",
      "type": "SMS",
      "message": "Sent to: 01XXXXXXXXX | Message: Payment notification..."
    }
  ]
}
```

#### DELETE `/api/logs`
Clear all logs.

**Response:**
```json
{
  "ok": true,
  "message": "Logs cleared successfully"
}
```

#### GET `/logs/ui`
Web interface for viewing logs.

#### GET `/logs`
Plain text format logs (last 100 entries).

### Mute Control Endpoints

#### GET `/mute/payment/ui`
Web interface for muting payment alerts with custom duration.

#### GET `/mute/payment?minutes=30`
Mute payment alerts for specified minutes.

**Query Parameters:**
- `minutes` - Duration in minutes (default: 30)

#### GET `/mute/api`
Mute API failure alerts (unmutes automatically on recovery).

#### GET `/unmute/api`
Manually unmute API failure alerts.

#### GET `/reset/payment`
Reset payment history and unmute alerts.

### State Endpoint

#### GET `/state`
Get current system state.

**Response:**
```json
{
  "mutePayment": false,
  "mutePaymentUntil": null,
  "muteApi": false,
  "lastApiStatus": "success",
  "lastFailureMessage": "",
  "processedPaymentIds": ["PAY123", "PAY124"]
}
```

## Configuration Guide

### Runtime vs Static Configuration

The system uses a two-layer configuration approach:

1. **Static Configuration** (`config.js`): Default values and system constants
2. **Runtime Configuration** (`config-state.json`): User-modified settings via web UI

Runtime settings override static configuration and persist across restarts.

### Toggles and Features

#### Enable/Disable SMS
When disabled:
- No SMS will be sent for any alerts
- Phone numbers still stored in configuration
- Logs show "SMS alerts disabled"

#### Enable/Disable Email
When disabled:
- No emails will be sent
- Email addresses still stored
- Logs show "Email alerts disabled"

#### Enable/Disable Manual Mute
When enabled:
- Mute buttons appear in email notifications
- Mute UI pages are accessible
- Users can pause alerts for custom duration

When disabled:
- Mute controls are blocked
- Emails show "Manual mute is disabled"
- Auto-unmute still works for system events

### Check Interval

Controls how often the system polls the payment API.

- Minimum: 0.1 minutes (6 seconds)
- Default: 0.5 minutes (30 seconds)
- Changes require scheduler restart

### Recipients Management

**Phone Numbers:**
- Comma-separated list
- Format: 01XXXXXXXXX (Bangladesh)
- No country code prefix needed for Teletalk

**Email Addresses:**
- Comma-separated list
- Standard email format
- Multiple recipients supported

## Notification Behavior

### Payment Alerts

**Trigger:** New payment transactions detected from API

**Behavior:**
- Notifies on ALL transactions found
- Tracks payment IDs to enable auto-unmute
- Time-based mute with countdown
- Auto-unmutes on timer expiry OR new payment ID

**Content:**
- Transaction details (Payment ID, Date)
- Total transaction count
- Mute control link (if enabled)
- Timestamp in Asia/Dhaka timezone

### API Failure Alerts

**Trigger:** Payment API becomes unreachable or returns error

**Behavior:**
- Sends failure notification with error details
- Tracks failure state
- Auto-unmutes on API recovery
- Sends recovery notification when API is back online

**Content:**
- HTTP status code
- Error message
- Mute button (if manual mute enabled)
- System timestamp

### Recovery Notifications

**Trigger:** API recovers after failure

**Behavior:**
- Automatically sent when API responds successfully after failure
- Clears failure state
- Auto-unmutes API alerts

**Content:**
- Recovery timestamp
- Previous error details
- Confirmation message

## Logging System

### Log Types

- **SMS**: SMS message sent
- **EMAIL**: Email notification sent
- **MUTE**: Manual mute action by user
- **UNMUTE**: Manual unmute action by user
- **AUTO-UNMUTE**: System automatic unmute (timer/new payment/API recovery)
- **API-FAILURE**: Payment API failure detected
- **API-RECOVERY**: Payment API recovered
- **SYSTEM**: General system messages

### Log Format

```
[YYYY-MM-DD HH:MM:SS] [TYPE] Message
```

Example:
```
[2026-01-26 13:30:45] [SMS] Sent to: 01XXXXXXXXX | Message: Payment notification...
[2026-01-26 13:31:00] [EMAIL] Sent to: user@example.com | Subject: Payment Notification
[2026-01-26 13:32:15] [MUTE] User muted payment (30 minutes)
[2026-01-26 14:02:15] [AUTO-UNMUTE] Payment alerts auto-unmuted: mute timer expired
```

### Log Storage

- Location: `controllerServer/notification.log`
- Timezone: Asia/Dhaka (UTC+6)
- Rotation: Manual (via UI or API)
- Format: Plain text with structured entries

## State Management

### State Persistence

State is stored in `controllerServer/notification-state.json`:

```json
{
  "mutePayment": false,
  "mutePaymentUntil": null,
  "muteApi": false,
  "lastApiStatus": "success",
  "lastFailureMessage": "",
  "processedPaymentIds": ["PAY123", "PAY124"]
}
```

### Auto-Unmute Logic

**Payment Alerts:**
1. Timer-based: Unmutes when `mutePaymentUntil` timestamp is reached
2. Event-based: Unmutes when new payment ID is detected
3. Whichever comes first triggers auto-unmute

**API Alerts:**
- Auto-unmutes only when API recovers (returns successful response)

## Troubleshooting

### Common Issues

**1. Notifications not sending**
- Check if SMS/Email toggle is enabled in `/config/ui`
- Verify recipients are configured
- Check SMS/Email gateway is running
- Review logs at `/logs/ui`

**2. Control server not accessible**
- Verify `CONTROL_SERVER_URL` matches your server IP
- Check firewall allows port 3000
- Ensure server is running: `netstat -tulpn | grep 3000`

**3. SMS gateway errors**
- Verify Teletalk credentials in `.env`
- Check balance and mask validity
- Review gateway logs: `cd email-sms-gateway && npm start`

**4. Email not delivering**
- Verify SMTP credentials
- Check SMTP port (587 for TLS, 465 for SSL)
- Enable "Less secure apps" or use app password for Gmail

**5. Scheduler not checking API**
- Check `CHECK_INTERVAL` in config
- Restart scheduler: `npm start`
- Verify API endpoint is reachable: `curl API_ENDPOINT`

### Debug Mode

Enable detailed logging:

```bash
DEBUG=* npm start
```

Check individual components:

```bash
# Test API connectivity
node -e "require('./controllerServer/api').fetchTransactions().then(console.log)"

# Test SMS sending
cd email-sms-gateway && node test-send.js

# Test Email sending
cd email-sms-gateway && node test-send-email.js
```

## Production Deployment

### Using PM2 (Recommended)

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Create ecosystem file (`ecosystem.config.js`):**
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'notification-scheduler',
         script: 'controllerServer/server.js',
         cwd: '/path/to/notification',
         instances: 1,
         autorestart: true,
         watch: false,
         max_memory_restart: '500M',
         env: {
           NODE_ENV: 'production'
         }
       },
       {
         name: 'control-server',
         script: 'controllerServer/control-server.js',
         cwd: '/path/to/notification',
         instances: 1,
         autorestart: true,
         watch: false,
         max_memory_restart: '500M',
         env: {
           NODE_ENV: 'production'
         }
       },
       {
         name: 'sms-email-gateway',
         script: 'server.js',
         cwd: '/path/to/notification/email-sms-gateway',
         instances: 1,
         autorestart: true,
         watch: false,
         max_memory_restart: '500M',
         env: {
           NODE_ENV: 'production'
         }
       }
     ]
   };
   ```

3. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Monitor:**
   ```bash
   pm2 monit
   pm2 logs
   ```

### Using systemd

Create service files in `/etc/systemd/system/`:

**notification-scheduler.service:**
```ini
[Unit]
Description=Payment Notification Scheduler
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/notification
ExecStart=/usr/bin/node controllerServer/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable notification-scheduler
sudo systemctl start notification-scheduler
```

## Security Considerations

1. **Restrict Control Server Access:**
   - Use firewall to limit IP access to port 3000
   - Implement authentication (not included in base version)
   - Use HTTPS with reverse proxy (nginx/Apache)

2. **Protect Credentials:**
   - Never commit `.env` files to version control
   - Use environment variables in production
   - Rotate API keys and passwords regularly

3. **Log Sensitivity:**
   - Logs may contain phone numbers and email addresses
   - Implement log rotation with retention policy
   - Restrict log file access permissions

4. **Network Security:**
   - Use VPN for remote access to control panel
   - Implement rate limiting on endpoints
   - Validate all user inputs

## Contributing

To extend or modify the system:

1. **Add new notification channels:**
   - Create new module in `controllerServer/` (e.g., `push.js`)
   - Add to scheduler notification flow
   - Update config with enable/disable toggle

2. **Add new endpoints:**
   - Extend `control-server.js`
   - Follow existing patterns for HTML responses
   - Update documentation

3. **Modify notification content:**
   - Edit email/SMS templates in `scheduler.js`
   - Update HTML styling in control server responses

## License

ISC

## Support

For issues and questions:
- Check logs at `/logs/ui`
- Review this documentation
- Test individual components using debug scripts
- Check gateway logs in `email-sms-gateway/`

## Version History

### 1.0.0 (Current)
- Initial release
- Multi-channel notifications (SMS, Email)
- Web-based configuration
- Mute controls with timer
- Logging dashboard
- API failure monitoring
- Auto-unmute logic
- Dynamic configuration persistence
