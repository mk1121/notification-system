# Gateway Security Documentation

## Table of Contents

1. [Authentication](#authentication)
2. [Kill Switch](#kill-switch)
3. [Security Best Practices](#security-best-practices)
4. [Quick Reference](#quick-reference)

---

## Authentication

### Overview

API Key-based authentication protects all SMS and Email endpoints from unauthorized access.

### Quick Setup

1. **Generate API Key**:
```bash
openssl rand -hex 32
```

2. **Configure Gateway** (`email-sms-gateway/.env`):
```bash
API_KEY=your-generated-key-here
```

3. **Configure Client** (`/.env`):
```bash
GATEWAY_API_KEY=your-generated-key-here
```

4. **Restart Both Servers**

### Usage

Include in all API requests:
```bash
-H "X-API-Key: your-key"
```

📖 **Full Documentation**: [AUTHENTICATION.md](./AUTHENTICATION.md)

---

## Kill Switch

### Overview

Emergency mechanism to instantly disable services without restart.

### Quick Commands

**Disable Everything (Emergency)**:
```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"gateway": false}'
```

**Disable Only SMS**:
```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"sms": false}'
```

**Enable Services**:
```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"gateway": true, "sms": true, "email": true}'
```

**Check Status**:
```bash
curl http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-key"
```

📖 **Full Documentation**: [KILL_SWITCH.md](./KILL_SWITCH.md)

---

## Security Best Practices

### 1. API Key Security

✅ **DO:**
- Use strong, random keys (32+ characters)
- Store in `.env` files, never in code
- Use different keys for dev/staging/production
- Rotate keys periodically (quarterly)
- Keep keys confidential

❌ **DON'T:**
- Use predictable keys
- Commit `.env` to git
- Share keys via email/chat
- Reuse keys across environments
- Hardcode keys in source code

### 2. Network Security

✅ **DO:**
- Use HTTPS in production
- Implement firewall rules
- Restrict gateway access to known IPs
- Use reverse proxy (nginx/Apache)
- Enable rate limiting

❌ **DON'T:**
- Expose gateway publicly without HTTPS
- Use HTTP for sensitive data
- Allow unrestricted access
- Skip network security

### 3. Access Control

✅ **DO:**
- Limit kill switch access to admins
- Log all kill switch operations
- Document who has access
- Review access logs regularly
- Set up alerts for suspicious activity

❌ **DON'T:**
- Share admin credentials
- Allow public access to admin endpoints
- Ignore failed authentication attempts
- Skip audit logs

### 4. Monitoring

✅ **DO:**
- Monitor gateway health regularly
- Set up alerts for service disruptions
- Log all authentication failures
- Track kill switch activations
- Review logs daily

❌ **DON'T:**
- Ignore error patterns
- Skip log reviews
- Disable monitoring in production
- Forget to set up alerts

### 5. Incident Response

✅ **DO:**
- Document kill switch procedures
- Test emergency procedures monthly
- Have rollback plans ready
- Communicate during incidents
- Conduct post-incident reviews

❌ **DON'T:**
- Panic during incidents
- Skip testing procedures
- Act without authorization
- Forget to communicate
- Skip post-mortems

---

## Quick Reference

### Authentication Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `GET /` | GET | No | Health check |
| `GET /api/sms/send` | GET | Yes | Send SMS |
| `POST /api/email/send` | POST | Yes | Send Email |
| `POST /api/email/send-batch` | POST | Yes | Bulk Email |
| `GET /api/admin/kill-switch` | GET | Yes | Get kill switch status |
| `POST /api/admin/kill-switch` | POST | Yes | Toggle kill switch |

### Authentication Headers

**Option 1 (Recommended)**:
```
X-API-Key: your-secret-key
```

**Option 2**:
```
Authorization: Bearer your-secret-key
```

### Kill Switch States

| Service | State | Behavior |
|---------|-------|----------|
| `gateway` | `true` | All services enabled |
| `gateway` | `false` | All services disabled |
| `sms` | `true` | SMS enabled |
| `sms` | `false` | SMS disabled, email works |
| `email` | `true` | Email enabled |
| `email` | `false` | Email disabled, SMS works |

### Error Codes

| Status | Error | Meaning |
|--------|-------|---------|
| `200` | - | Success |
| `400` | Bad Request | Missing parameters |
| `401` | Unauthorized | Invalid/missing API key |
| `503` | Service Unavailable | Kill switch active |

### Environment Variables

**Gateway** (`email-sms-gateway/.env`):
```bash
PORT=9090
API_KEY=your-secret-key
GATEWAY_ENABLED=true
SMS_ENABLED=true
EMAIL_ENABLED=true
```

**Client** (`/.env`):
```bash
GATEWAY_API_KEY=your-secret-key
```

---

## Emergency Procedures

### 🚨 Emergency Shutdown

**Situation**: Critical issue, need to stop all notifications NOW.

**Action**:
```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"gateway": false}'
```

**Verify**:
```bash
curl http://localhost:9090/
# Should show: "status": "DISABLED"
```

### 🔧 Gradual Recovery

After resolving the issue:

**Step 1**: Verify fix is in place

**Step 2**: Enable gateway first
```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"gateway": true}'
```

**Step 3**: Enable SMS (monitor for 5 minutes)
```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sms": true}'
```

**Step 4**: Enable Email (monitor for 5 minutes)
```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": true}'
```

**Step 5**: Monitor for 30 minutes to ensure stability

---

## Testing Checklist

### Authentication Testing

- [ ] Valid API key works
- [ ] Invalid API key returns 401
- [ ] Missing API key returns 401
- [ ] Empty API_KEY disables auth
- [ ] Both header formats work

### Kill Switch Testing

- [ ] Can disable gateway
- [ ] Can disable SMS only
- [ ] Can disable Email only
- [ ] Can re-enable services
- [ ] Status endpoint shows correct state
- [ ] Client receives 503 when disabled
- [ ] Health check reflects status

### Security Testing

- [ ] Cannot access admin without auth
- [ ] Environment variables load correctly
- [ ] `.env` not committed to git
- [ ] Keys are different per environment
- [ ] Logs capture failed auth attempts

---

## Support & Documentation

### Full Documentation

- **Authentication**: [AUTHENTICATION.md](./AUTHENTICATION.md)
- **Kill Switch**: [KILL_SWITCH.md](./KILL_SWITCH.md)
- **Main API Docs**: [EMAIL_API_DOCS.md](../EMAIL_API_DOCS.md)

### Getting Help

1. Check documentation in `/docs` folder
2. Review gateway logs for errors
3. Test with curl commands
4. Verify environment variables
5. Check server is running

### Common Issues

**401 Errors**: Check API key matches on client and server

**503 Errors**: Kill switch may be active, check status

**Connection Refused**: Gateway server may not be running

---

## English Brief Description

### Initial Setup

1. **Create API Key**:
```bash
openssl rand -hex 32
```

2. **Setup in Gateway**: `email-sms-gateway/.env`
```bash
API_KEY=your-key
```

3. **Setup in Client**: `/.env`
```bash
GATEWAY_API_KEY=your-key
```

### Emergency Shutdown

```bash
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"gateway": false}'
```

### Security Tips

- Use strong API keys
- Don't commit `.env` files to git
- Use HTTPS in production
- Check logs regularly
- Test emergency procedures

### Complete Documentation

- Authentication: [AUTHENTICATION.md](./AUTHENTICATION.md)
- Kill Switch: [KILL_SWITCH.md](./KILL_SWITCH.md)
