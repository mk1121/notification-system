# Comprehensive Troubleshooting Guide

## 📋 Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Installation Issues](#installation-issues)
3. [Server Won't Start](#server-wont-start)
4. [Port Conflicts](#port-conflicts)
5. [Authentication Issues](#authentication-issues)
6. [Configuration Problems](#configuration-problems)
7. [Notification Failures](#notification-failures)
8. [API Key Issues](#api-key-issues)
9. [Kill Switch Problems](#kill-switch-problems)
10. [Database/State File Issues](#databasestate-file-issues)
11. [Logging Issues](#logging-issues)
12. [Performance Issues](#performance-issues)
13. [Network Issues](#network-issues)
14. [Test Failures](#test-failures)
15. [Log Analysis Guide](#log-analysis-guide)

---

## 🔍 Quick Diagnostics

### Run Diagnostic Script

```bash
#!/bin/bash

echo "🔍 System Diagnostics"
echo ""

# Node version
echo "✓ Node.js:"
node --version || echo "  ✗ Node.js not installed"

# npm version
echo "✓ NPM:"
npm --version || echo "  ✗ NPM not found"

# Check ports
echo ""
echo "✓ Ports:"
netstat -tuln 2>/dev/null | grep -E '3000|9090' || echo "  Ports 3000/9090 available"

# Check files
echo ""
echo "✓ Files:"
[ -f controllerServer/.env ] && echo "  ✓ .env found" || echo "  ✗ .env missing"
[ -f email-sms-gateway/.env ] && echo "  ✓ gateway .env found" || echo "  ✗ gateway .env missing"
[ -f controllerServer/config-state.json ] && echo "  ✓ config-state.json found" || echo "  ✗ config-state.json missing"
[ -f controllerServer/notification-state.json ] && echo "  ✓ notification-state.json found" || echo "  ✗ notification-state.json missing"
[ -f controllerServer/users.json ] && echo "  ✓ users.json found" || echo "  ✗ users.json missing"

# Check dependencies
echo ""
echo "✓ Dependencies:"
cd controllerServer && npm list 2>/dev/null | head -5 && cd ..
cd email-sms-gateway && npm list 2>/dev/null | head -5

# Test servers
echo ""
echo "✓ Server Status:"
echo -n "  Control: "
curl -s http://localhost:3000/ > /dev/null && echo "✓ Running" || echo "✗ Not running"

echo -n "  Gateway: "
curl -s http://localhost:9090/ > /dev/null && echo "✓ Running" || echo "✗ Not running"

echo ""
echo "Diagnostics complete!"
```

Save as `diagnose.sh` and run:
```bash
chmod +x diagnose.sh
bash diagnose.sh
```

---

## 🔧 Installation Issues

### Problem: `npm install` fails

**Symptoms:**
- Error messages during `npm install`
- Missing dependencies
- Compilation errors

**Solutions:**

1. **Clear npm cache:**
```bash
npm cache clean --force
npm ci  # Clean install instead of npm install
```

2. **Check Node version:**
```bash
node --version  # Should be v18+
npm --version   # Should be v9+

# Upgrade if needed
nvm install 18
nvm use 18
```

3. **Delete node_modules and try again:**
```bash
rm -rf node_modules package-lock.json
npm install --save-dev  # Fresh install
```

4. **Check disk space:**
```bash
df -h  # At least 1GB free

# Check permissions
ls -la | grep "^d" | awk '{print $1, $9}'
```

5. **Install specific versions:**
```bash
npm install express@4.18.2
npm install dotenv@16.0.0
npm install axios@1.0.0
```

### Problem: `Module not found` errors

**Symptoms:**
- `Cannot find module 'express'`
- `Cannot find module 'dotenv'`
- `Cannot find module 'axios'`

**Solutions:**

1. **Install all dependencies:**
```bash
cd controllerServer && npm install
cd ../email-sms-gateway && npm install
```

2. **Check package.json exists:**
```bash
ls controllerServer/package.json
ls email-sms-gateway/package.json

# If missing, create it
npm init -y
```

3. **Verify installed packages:**
```bash
npm list | grep express
npm list | grep dotenv
npm list | grep axios
```

4. **Global vs Local:**
```bash
# Make sure NOT using global node_modules
npm config set prefix ~/.npm-global

# Install locally
npm install --save express dotenv axios
```

---

## 🚀 Server Won't Start

### Problem: `EADDRINUSE` - Port already in use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Diagnosis:**
```bash
# Check what's using the port
lsof -i :3000
lsof -i :9090

# Or with netstat
netstat -tulpn | grep 3000
netstat -tulpn | grep 9090
```

**Solutions:**

1. **Kill existing process:**
```bash
# Kill by PID
kill -9 <PID>

# Or kill all npm processes
pkill -f "npm start"
pkill -f "node"
```

2. **Use different ports:**
```bash
# Start on different port
CONTROL_SERVER_PORT=3001 npm start

# For gateway
PORT=9091 npm start
```

3. **Check if process hung:**
```bash
# Force clean
ps aux | grep node
kill -9 <process_id>

# Wait a moment
sleep 2

# Start again
npm start
```

### Problem: Server starts but crashes immediately

**Symptoms:**
```
Server running on port 3000...
# Then immediately exits
```

**Solutions:**

1. **Check .env file:**
```bash
cat .env
# Look for syntax errors or missing values

# Verify required keys exist
grep "DB_HOST\|GATEWAY_API_KEY\|EMAIL" .env
```

2. **Check for syntax errors in config:**
```bash
# Test Node syntax
node -c controllerServer/control-server.js
node -c email-sms-gateway/server.js
```

3. **Check state files:**
```bash
# Make sure JSON is valid
cat controllerServer/config-state.json | node -e "require('fs').readFileSync(0, 'utf-8')" | json
```

4. **Run with debug:**
```bash
# Start with debugging
NODE_DEBUG=* npm start 2>&1 | head -100
```

### Problem: Server starts but won't accept connections

**Symptoms:**
- Server says "listening" but connection refused
- `curl: (7) Failed to connect to localhost port 3000`

**Solutions:**

1. **Check binding:**
```bash
# Make sure listening on 0.0.0.0
grep -r "listen" controllerServer/server.js
grep -r "listen" email-sms-gateway/server.js

# Should see: app.listen(port, '0.0.0.0')
```

2. **Check firewall:**
```bash
# Linux
sudo ufw status
sudo ufw allow 3000
sudo ufw allow 9090

# macOS
# Check System Preferences > Security & Privacy > Firewall
```

3. **Check if really running:**
```bash
# Better diagnostic
ps aux | grep "node\|npm" | grep -v grep

# Check stdout
npm start 2>&1 | tee /tmp/server.log
```

---

## 🔌 Port Conflicts

### Identify Port User

```bash
# Show all listening ports
netstat -tuln | grep LISTEN

# Show processes using specific port
lsof -i :3000
lsof -i :9090

# Check with alternative tools
ss -tulpn | grep 3000
```

### Solution: Free the Port

```bash
# Method 1: Kill process
kill -9 $(lsof -t -i :3000)
kill -9 $(lsof -t -i :9090)

# Method 2: Kill by name
pkill -f "node.*3000"
pkill -f "npm"

# Method 3: Check systemd
systemctl status notification 2>/dev/null

# Method 4: Wait and retry
sleep 30 && npm start
```

### Use Alternative Ports

```bash
# Temporary
CONTROL_SERVER_PORT=3001 npm start
PORT=9091 npm start

# Permanent (in .env)
CONTROL_SERVER_PORT=3001
GATEWAY_PORT=9091
```

---

## 🔐 Authentication Issues

### Problem: Can't Login to Web UI

**Symptoms:**
- "Invalid credentials" after entering username/password
- Login page keeps reloading
- Session errors

**Diagnosis:**
```bash
# Check users.json
cat controllerServer/users.json

# Should show something like:
# {"admin": {"username": "admin", "password": "admin123"}}
```

**Solutions:**

1. **Verify users.json exists and is valid:**
```bash
# Check file exists
[ -f controllerServer/users.json ] && echo "✓ File exists" || echo "✗ Missing"

# Check it's valid JSON
cat controllerServer/users.json | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf-8')))"
```

2. **Reset to default credentials:**
```bash
cd controllerServer
echo '{"admin": {"username": "admin", "password": "admin123", "role": "admin"}}' > users.json

# Verify
cat users.json
```

3. **Check password is correct:**
```bash
# Default password should be
Password: admin123
```

4. **Check session storage:**
```bash
# Sessions might be in memory or file
# Try clearing browser cookies
# Or clear session storage
rm -rf /tmp/express-session* 2>/dev/null
```

5. **Restart server:**
```bash
pkill -f "npm start"
sleep 2
npm start
```

### Problem: Session expires immediately

**Symptoms:**
- Login works, then immediately logged out
- Page redirects to login

**Solutions:**

1. **Check .env session settings:**
```bash
grep "SESSION\|SECRET" .env

# Should have SESSION_SECRET set
```

2. **Set session secret:**
```bash
# Add to .env
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "SESSION_SECRET=$SESSION_SECRET" >> .env
```

3. **Check session timeout:**
```bash
# In .env, look for
SESSION_TIMEOUT=3600000  # 1 hour in milliseconds

# Increase if needed
SESSION_TIMEOUT=86400000  # 24 hours
```

---

## ⚙️ Configuration Problems

### Problem: `.env` file not loading

**Symptoms:**
- App uses default values even though .env exists
- `process.env.SOMETHING` is undefined
- Configuration not being picked up

**Diagnosis:**
```bash
# Check .env exists
ls -la .env

# Check if readable
cat .env

# Test if loaded
node -e "require('dotenv').config(); console.log(process.env.GATEWAY_API_KEY)"
```

**Solutions:**

1. **Create proper .env file:**
```bash
# Use the template
cp .env.example .env

# Or create manually
cat > .env << 'EOF'
NODE_ENV=development
CONTROL_SERVER_PORT=3000
GATEWAY_API_KEY=your-secure-api-key-here
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASS=
DATABASE_NAME=notification
SESSION_SECRET=your-secret-key
LOG_LEVEL=debug
EOF
```

2. **Check dotenv is loaded first:**
```bash
# In main server file, ensure first line
require('dotenv').config();

# Before any environment access
const port = process.env.PORT || 3000;
```

3. **Check file permissions:**
```bash
# Make readable
chmod 644 .env
chmod 644 email-sms-gateway/.env

# Check ownership
ls -la .env
```

4. **Verify syntax:**
```bash
# No spaces around = in .env
# CORRECT: KEY=value
# WRONG:   KEY = value (spaces matter!)

# Check for quotes
# Usually no quotes needed for values
```

### Problem: Configuration changes not taking effect

**Symptoms:**
- Change .env but app uses old values
- After restart still wrong
- Configuration seems ignored

**Solutions:**

1. **Clear Node cache:**
```bash
# Restart fresh
pkill -f "npm start"
sleep 3
npm start
```

2. **Verify new value exists:**
```bash
# Check in file
grep "GATEWAY_API_KEY" .env

# Check in running process
curl http://localhost:3000/api/config 2>/dev/null | grep -i api
```

3. **Check both .env files:**
```bash
# Both files need updates
echo "Main .env:"
grep "API_KEY\|GATEWAY" .env

echo ""
echo "Gateway .env:"
grep "API_KEY" email-sms-gateway/.env

# They should match!
```

4. **Force reload:**
```bash
# Add to code
console.log("Config loaded:", {
  apiKey: process.env.GATEWAY_API_KEY,
  port: process.env.CONTROL_SERVER_PORT,
  env: process.env.NODE_ENV
});

# Then restart and check logs
```

---

## 📧 Notification Failures

### Problem: Notifications not being sent

**Symptoms:**
- SMS/Email not received
- No error in logs
- Endpoint configured but nothing happens

**Diagnosis:**
```bash
# Check if endpoints exist
cat controllerServer/config-state.json | grep -A5 "endpoints"

# Check notification state
cat controllerServer/notification-state.json

# Check scheduler running
curl -s http://localhost:3000/api/endpoints | grep -i "count\|total"

# Check gateway health
curl -s http://localhost:9090/ | head -20
```

**Solutions:**

1. **Verify endpoint is created:**
```bash
# Via API
curl -s http://localhost:3000/api/endpoints | jq '.'

# Should show your endpoints
```

2. **Check kill switch status:**
```bash
# Make API call
curl -s http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-api-key" | jq '.'

# Should show:
# "gateway": true (enabled)
# "sms": true (enabled)
# "email": true (enabled)
```

3. **Test gateway directly:**
```bash
# Test SMS
curl "http://localhost:9090/api/sms/send?to=01234567890&text=Test%20Message" \
  -H "X-API-Key: your-api-key"

# Test Email
curl -X POST http://localhost:9090/api/email/send \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test",
    "text": "Test email"
  }'

# Should get response, not error
```

4. **Check logs:**
```bash
# Main app logs
tail -f controllerServer/notification.log

# Gateway logs (in terminal)
npm start 2>&1 | grep -i "sms\|email\|notification"
```

5. **Verify phone numbers:**
```bash
# Phone must be valid Bangladeshi format
# ✓ 01234567890 (11 digits, starts with 01)
# ✓ 8801234567890 (country code)
# ✗ 1234567890 (too short)
# ✗ 001234567890 (wrong format)

# Check in endpoint
curl -s http://localhost:3000/api/endpoints | grep -i "phone\|sms"
```

### Problem: "API Key not provided" error

**Symptoms:**
```
Error: API Key not provided
Unauthorized access
401 Unauthorized
```

**Solutions:**

See [API Key Issues](#api-key-issues) section.

### Problem: "Gateway not responding"

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:9090
Gateway error
Connection timeout
```

**Solutions:**

1. **Check gateway is running:**
```bash
# Should be running on port 9090
curl http://localhost:9090/

# If fails, check
lsof -i :9090
ps aux | grep "npm\|node" | grep -v grep
```

2. **Start gateway:**
```bash
cd email-sms-gateway
npm start
```

3. **Check gateway logs:**
```bash
# Run in separate terminal
cd email-sms-gateway
npm start 2>&1 | tee /tmp/gateway.log

# Check output for errors
tail -f /tmp/gateway.log
```

4. **Verify port configuration:**
```bash
# In email-sms-gateway/.env or code
echo "Gateway config:"
grep "PORT\|9090" email-sms-gateway/.env
grep "listen" email-sms-gateway/server.js
```

5. **Check if firewall blocking:**
```bash
# Allow port
sudo ufw allow 9090

# Or disable temporarily
sudo ufw disable
```

---

## 🔑 API Key Issues

### Problem: "Invalid API Key" error

**Symptoms:**
```
Error: API Key invalid or expired
401 Unauthorized
Authentication failed
```

**Diagnosis:**
```bash
# Check main .env
echo "Main .env:"
grep "GATEWAY_API_KEY" .env

# Check gateway .env  
echo "Gateway .env:"
grep "API_KEY" email-sms-gateway/.env

# They should match exactly!
```

**Solutions:**

1. **Generate matching API keys:**
```bash
# Generate new key
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "New API Key: $NEW_KEY"

# Update main .env
sed -i "s/GATEWAY_API_KEY=.*/GATEWAY_API_KEY=$NEW_KEY/" .env

# Update gateway .env
sed -i "s/API_KEY=.*/API_KEY=$NEW_KEY/" email-sms-gateway/.env

# Verify
echo "Main: $(grep GATEWAY_API_KEY .env)"
echo "Gateway: $(grep API_KEY email-sms-gateway/.env)"
```

2. **Check API key format:**
```bash
# Should be hex string (letters a-f, numbers 0-9)
echo $API_KEY | grep -E '^[a-f0-9]+$' && echo "✓ Valid format"

# Should be at least 32 characters
echo $API_KEY | wc -c  # Should be > 32
```

3. **Check authentication header:**
```bash
# Correct format
curl "http://localhost:9090/api/sms/send?to=01234567890&text=Test" \
  -H "X-API-Key: $API_KEY"

# Wrong format won't work:
# -H "Authorization: Bearer $API_KEY"  # This won't work for API key
```

4. **Restart services:**
```bash
pkill -f "npm start"
sleep 2
cd email-sms-gateway && npm start &
cd ../controllerServer && npm start
```

### Problem: Can't find API key

**Symptoms:**
```
Error: GATEWAY_API_KEY is undefined
process.env is not set properly
```

**Solutions:**

1. **Create API key in .env:**
```bash
# Add to controllerServer/.env
GATEWAY_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Verify it's there
grep GATEWAY_API_KEY .env
```

2. **Both servers need it:**
```bash
# Control server: needs GATEWAY_API_KEY to send to gateway
echo "GATEWAY_API_KEY=$NEW_KEY" >> controllerServer/.env

# Gateway server: needs API_KEY to authenticate requests
echo "API_KEY=$NEW_KEY" >> email-sms-gateway/.env
```

3. **Format matters:**
```bash
# Correct in .env
GATEWAY_API_KEY=abc123def456...

# Access in code
process.env.GATEWAY_API_KEY

# Not this
process.env['gateway-api-key']  # Wrong
process.env.gateway_api_key     # Wrong case
```

---

## 🆘 Kill Switch Problems

### Problem: Kill switch endpoints not working

**Symptoms:**
```
404 Not Found on kill-switch endpoints
Kill switch not responding
Cannot enable/disable services
```

**Diagnosis:**
```bash
# Check if endpoint exists
curl -s http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-api-key"

# Should return status, not 404
```

**Solutions:**

1. **Check gateway is running:**
```bash
# Gateway must be running
curl http://localhost:9090/

# If fails, start it
cd email-sms-gateway && npm start
```

2. **Check API key:**
```bash
# API key must be correct
curl -s http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: $API_KEY" | jq '.'

# If 401, check key matches
```

3. **Check routes exist:**
```bash
# In email-sms-gateway/server.js, should have:
app.get('/api/admin/kill-switch', ...)
app.post('/api/admin/kill-switch', ...)

# Verify
grep -n "kill-switch" email-sms-gateway/server.js
```

4. **Check middleware:**
```bash
# Authentication middleware must be applied
# Should see: app.use(authenticateAPI, ...)

grep -n "authenticateAPI" email-sms-gateway/server.js
```

### Problem: Kill switch changes not persisting

**Symptoms:**
```
Can toggle kill switch but resets after restart
Changes don't save to file
```

**Solutions:**

1. **Check state file:**
```bash
# State should persist
ls -la email-sms-gateway/kill-switch-state.json

# Or in memory
ps aux | grep node | grep -i "state\|switch"
```

2. **Check write permissions:**
```bash
# File should be writable
ls -la email-sms-gateway/
touch email-sms-gateway/kill-switch-state.json

# Or use /tmp
touch /tmp/kill-switch-state.json
```

3. **Verify POST request:**
```bash
# Must be POST, not GET
curl -X POST http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"gateway": false}'

# Check response
# Should show updated state
```

---

## 💾 Database/State File Issues

### Problem: State files corrupted or invalid

**Symptoms:**
```
JSON parse error
Unexpected token
State file corrupted
```

**Diagnosis:**
```bash
# Check if valid JSON
cat controllerServer/config-state.json | jq '.' || echo "Invalid JSON"
cat controllerServer/notification-state.json | jq '.' || echo "Invalid JSON"

# Check file size (too small = empty/corrupted)
ls -la controllerServer/*state*.json
```

**Solutions:**

1. **Validate and fix:**
```bash
# Validate
node -e "try { JSON.parse(require('fs').readFileSync('./controllerServer/config-state.json')); console.log('Valid'); } catch(e) { console.log('Invalid:', e.message); }"

# If invalid, reset
echo '{"endpoints": {}}' > controllerServer/config-state.json
echo '{"processedItems": {}, "muteStatus": {}}' > controllerServer/notification-state.json
```

2. **Backup before fixing:**
```bash
# Always backup first
cp controllerServer/config-state.json controllerServer/config-state.json.bak
cp controllerServer/notification-state.json controllerServer/notification-state.json.bak

# Then reset
echo '{"endpoints": {}}' > controllerServer/config-state.json
```

3. **Check file permissions:**
```bash
# Should be readable and writable
ls -la controllerServer/*state*.json

# Fix if needed
chmod 644 controllerServer/*state*.json
```

### Problem: Lost endpoint configuration

**Symptoms:**
```
Endpoints disappeared
Config file is empty
Can't find endpoint
```

**Solutions:**

1. **Check backup:**
```bash
# Look for backups
ls -la controllerServer/config-state*.json*

# Restore from backup
cp controllerServer/config-state.json.bak controllerServer/config-state.json
```

2. **Check in logs:**
```bash
# Endpoints should be logged when created
grep -i "endpoint\|create\|add" controllerServer/notification.log

# See what endpoints were registered
```

3. **Recreate endpoints:**
```bash
# Via API
curl -X POST http://localhost:3000/api/endpoints/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Endpoint",
    "url": "http://api.example.com/notify",
    "recipients": ["01234567890"],
    "emails": ["test@example.com"]
  }'
```

4. **Use UI:**
```
Go to: http://localhost:3000
Login as: admin / admin123
Click: Setup Wizard
Add: Endpoints
```

---

## 📝 Logging Issues

### Problem: No logs being generated

**Symptoms:**
```
notification.log doesn't exist
No logging output
Logs not appearing
```

**Diagnosis:**
```bash
# Check if log file exists
ls -la controllerServer/notification.log

# Check if writable
touch controllerServer/notification.log

# Check logger is loaded
grep -r "notification.log" controllerServer/
grep -r "fs.createWriteStream" controllerServer/
```

**Solutions:**

1. **Create log directory:**
```bash
# Make sure directory exists and is writable
mkdir -p controllerServer/logs
chmod 777 controllerServer/logs

# Update logger.js to use correct path
# Check: fs.createWriteStream('./logs/notification.log')
```

2. **Initialize log file:**
```bash
# Create empty log file
touch controllerServer/notification.log
chmod 644 controllerServer/notification.log

# Or with content
echo "[START] Logging initialized" > controllerServer/notification.log
```

3. **Check logger module:**
```bash
# Verify logger.js exists and is correct
cat controllerServer/logger.js | head -20

# Should have:
const fs = require('fs');
const path = require('path');
const stream = fs.createWriteStream(...)
```

4. **Check logging calls:**
```bash
# Should use consoleLog or logger
grep -r "consoleLog\|logger.log" controllerServer/ | head -10

# Not just console.log (unless in production)
```

### Problem: Logs too verbose (production issue)

**Symptoms:**
```
Too much output in production
Performance slow due to logging
Logs filling up disk
```

**Solutions:**

1. **Set log level:**
```bash
# In .env
NODE_ENV=production
LOG_LEVEL=error

# Restart servers
pkill -f "npm start"
npm start
```

2. **Check console-logger.js:**
```bash
# Should respect NODE_ENV
grep -A5 "NODE_ENV" controllerServer/console-logger.js

# In production, should only log: error, warn, info
# Not: debug, trace, verbose
```

3. **Disable specific loggers:**
```bash
# In .env
DEBUG=""  # Disable debug output
LOG_DEBUG=false
```

4. **Manage log file size:**
```bash
# Check current size
du -h controllerServer/notification.log

# Archive old logs
mv controllerServer/notification.log controllerServer/notification.log.$(date +%Y%m%d)

# Or truncate
> controllerServer/notification.log

# Or use logrotate (Linux)
cat > /etc/logrotate.d/notification << 'EOF'
/path/to/controllerServer/notification.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
}
EOF
```

---

## ⚡ Performance Issues

### Problem: High CPU usage

**Symptoms:**
```
CPU constantly at 100%
System slow
Laptop fans loud
```

**Diagnosis:**
```bash
# Check process CPU
ps aux | grep -E "node|npm" | grep -v grep | awk '{print $3, $4, $11}'

# Monitor in real-time
top -p $(pidof node)

# Check if infinite loop
strace -p $(pidof node) 2>&1 | head -50
```

**Solutions:**

1. **Check for infinite loops:**
```bash
# Reduce loop frequency if needed
# In scheduler.js, check interval
grep -n "setInterval\|setTimeout" controllerServer/scheduler.js

# Should be reasonable (5000ms = 5 seconds minimum)
```

2. **Optimize database queries:**
```bash
# If using database, check for slow queries
# Or use caching where possible
```

3. **Reduce logging:**
```bash
# Disable debug logs
NODE_ENV=production npm start

# In .env
NODE_ENV=production
LOG_LEVEL=warn
```

### Problem: High memory usage

**Symptoms:**
```
Memory grows over time
Node process takes GB of RAM
Out of memory crash
```

**Diagnosis:**
```bash
# Check memory usage
ps aux | grep node | grep -v grep | awk '{print $4, $11}'

# Monitor over time
while true; do ps aux | grep node | grep -v grep | awk '{print $4}'; sleep 5; done

# Check heap
node --inspect=9229 server.js
# Then visit: chrome://inspect
```

**Solutions:**

1. **Check for memory leaks:**
```bash
# In code, look for:
# - Event listeners not removed
# - Closures holding references
# - Arrays growing infinitely
```

2. **Limit data in memory:**
```bash
# Don't keep all history in memory
# Use database for large datasets
```

3. **Restart periodically:**
```bash
# Add cron job
0 2 * * * pkill -f "npm start" && cd /path && npm start

# Or use process manager
npm install -g pm2
pm2 start server.js
pm2 save
```

### Problem: Slow API responses

**Symptoms:**
```
API takes 10+ seconds to respond
Endpoint queries are slow
UI feels sluggish
```

**Solutions:**

1. **Profile the code:**
```bash
# Add timing
const start = Date.now();
// ... code ...
console.log(`Duration: ${Date.now() - start}ms`);
```

2. **Check database:**
```bash
# If using database
# Add indexes
# Optimize queries
# Use EXPLAIN to analyze
```

3. **Cache results:**
```bash
// Cache endpoints list
let cachedEndpoints = null;
let cacheTime = 0;

if (Date.now() - cacheTime < 60000) { // 1 minute cache
  return cachedEndpoints;
}
```

4. **Parallelize:**
```bash
// Use Promise.all instead of sequential
const results = await Promise.all([
  getEndpoints(),
  getState(),
  getConfig()
]);
```

---

## 🌐 Network Issues

### Problem: Can't connect to external API

**Symptoms:**
```
ECONNREFUSED when calling external API
Timeout errors
curl fails but works from command line
```

**Diagnosis:**
```bash
# Test from command line
curl -v http://api.example.com/endpoint

# Check with node
node -e "require('http').get('http://api.example.com', (r) => console.log(r.statusCode))"

# Check DNS
nslookup api.example.com
```

**Solutions:**

1. **Check network:**
```bash
# Internet working?
ping 8.8.8.8

# DNS working?
nslookup google.com

# Proxy?
echo $http_proxy
echo $https_proxy
```

2. **Check if API is up:**
```bash
# Try from different network
curl -v http://api.example.com/

# Check status page
# https://api.example.com/status
```

3. **Update timeout:**
```bash
// In code
const response = await axios.get(url, {
  timeout: 30000  // 30 seconds
});
```

4. **Use different IP/DNS:**
```bash
# Check DNS resolution
getent hosts api.example.com

# Or use IP directly
curl http://123.45.67.89/
```

### Problem: CORS errors

**Symptoms:**
```
Cross-origin error
Browser console: "No 'Access-Control-Allow-Origin' header"
```

**Solutions:**

1. **Enable CORS:**
```javascript
// In server.js
const cors = require('cors');
app.use(cors());

// Or specific origins
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

2. **Add headers:**
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

---

## 🧪 Test Failures

### Problem: Tests fail with connection refused

**Symptoms:**
```
Error: connect ECONNREFUSED
Tests cannot connect to servers
```

**Solutions:**

1. **Ensure servers running:**
```bash
# Terminal 1
cd email-sms-gateway && npm start

# Terminal 2
cd controllerServer && npm start

# Terminal 3 (run tests)
bash tests/quick-test.sh
```

2. **Check test API key:**
```bash
# Tests need API key
export API_KEY=$(grep GATEWAY_API_KEY .env | cut -d= -f2)
echo "API_KEY: $API_KEY"

# Then run tests
bash tests/run-tests.sh
```

### Problem: Tests fail with authentication errors

**Solutions:**

1. **Verify API key matches:**
```bash
# In .env
echo "Main: $(grep GATEWAY_API_KEY .env)"

# In gateway .env
echo "Gateway: $(grep API_KEY email-sms-gateway/.env)"

# Must match exactly
```

2. **Reset test user:**
```bash
# Tests might use specific user
# Check test file
cat tests/run-tests.sh | grep -i "username\|password"

# Reset user
echo '{"admin":{"username":"admin","password":"admin123"}}' > controllerServer/users.json
```

### Problem: Test hangs or times out

**Solutions:**

1. **Check server response:**
```bash
# Manually test endpoint
curl -i http://localhost:3000/api/endpoints

# Should respond quickly
```

2. **Increase timeout:**
```bash
# In test file
const timeout = 10000;  // 10 seconds

// Use in test
test.timeoutInterval = timeout;
```

3. **Check for infinite loops:**
```bash
# Restart servers
pkill -f "npm start"
sleep 2
npm start
```

---

## 📊 Log Analysis Guide

### Understanding Log Messages

```
[2024-01-15T10:30:45.123Z] [INFO] [AUTH] User 'admin' logged in
             |              |      |     |
          Timestamp       Level  Category  Message
```

### Log Levels

- **ERROR** (🔴): Problem that needs attention
- **WARN** (🟡): Potential issue, might be fine
- **INFO** (🟢): Normal operation, important milestone
- **DEBUG** (🔵): Detailed info, for troubleshooting
- **TRACE** (⚪): Very detailed, for deep debugging

### Common Log Messages

| Message | Meaning | Action |
|---------|---------|--------|
| `Server running on port 3000` | Server started | None, normal |
| `User logged in` | Authentication success | Check for unauthorized attempts |
| `Invalid API key` | Auth failed | Verify API key is correct |
| `Endpoint created` | New endpoint added | Normal |
| `SMS sent to...` | Notification sent | Check if received |
| `Gateway error` | Connection failed | Check gateway is running |
| `State file written` | Configuration saved | Normal |
| `Unknown endpoint` | Request failed | Check endpoint exists |

### Find Errors in Logs

```bash
# Show only errors
grep ERROR controllerServer/notification.log

# Show errors and context (5 lines around)
grep -B5 -A5 ERROR controllerServer/notification.log

# Show last 20 errors
grep ERROR controllerServer/notification.log | tail -20

# Real-time error monitoring
tail -f controllerServer/notification.log | grep ERROR
```

### Find Specific Issues

```bash
# Connection refused
grep "ECONNREFUSED\|connection\|refused" controllerServer/notification.log

# Authentication issues
grep "Invalid\|401\|Unauthorized" controllerServer/notification.log

# API key issues
grep "API.*key\|X-API-Key" controllerServer/notification.log

# SMS/Email failures
grep "sms\|email\|Error sending" controllerServer/notification.log

# Endpoint issues
grep "endpoint" controllerServer/notification.log
```

### Analyze Log Patterns

```bash
# Count errors by type
grep ERROR controllerServer/notification.log | awk -F'] ' '{print $3}' | sort | uniq -c

# Show error frequency over time
grep ERROR controllerServer/notification.log | awk '{print $1}' | sort | uniq -c

# Find most common issue
grep -o '\[.*\]' controllerServer/notification.log | sort | uniq -c | sort -rn | head -10
```

---

## 🚨 Emergency Troubleshooting

If everything is broken:

```bash
#!/bin/bash

echo "🚨 Emergency Recovery"
echo ""

# 1. Stop everything
echo "1. Stopping services..."
pkill -f "npm start"
pkill -f "node"

sleep 3

# 2. Check what's running
echo "2. Checking processes..."
ps aux | grep -E "node|npm" | grep -v grep

# 3. Clean up
echo "3. Cleaning up..."
rm -rf /tmp/express-session*

# 4. Reset state
echo "4. Resetting state..."
cd controllerServer
echo '{"endpoints": {}}' > config-state.json
echo '{"processedItems": {}, "muteStatus": {}}' > notification-state.json
echo '{"admin": {"username": "admin", "password": "admin123"}}' > users.json

# 5. Verify files
echo "5. Verifying files..."
ls -la .env config-state.json notification-state.json users.json

# 6. Start fresh
echo "6. Starting services..."
npm install  # Fresh install
npm start &

echo ""
echo "✓ Recovery complete!"
```

Save as `recover.sh` and run:
```bash
bash recover.sh
```

---

## 📞 Need More Help?

Check these resources:

1. **[INSTALLATION.md](./INSTALLATION.md)** - Installation help
2. **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Configuration help
3. **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** - Feature help
4. **[TESTING.md](./TESTING.md)** - Test help
5. **Tests** - See `tests/` folder for examples

## বাংলা সাহায্য

### সাধারণ সমস্যা

**সার্ভার চলছে না:**
```bash
# চেক করুন চলছে কিনা
curl http://localhost:3000/
curl http://localhost:9090/

# ফোর্স রিস্টার্ট
pkill -f "npm start"
sleep 3
npm start
```

**লগইন করতে পারছি না:**
```bash
# ডিফল্ট রিসেট করুন
cd controllerServer
echo '{"admin":{"username":"admin","password":"admin123"}}' > users.json
```

**Endpoint কাজ করছে না:**
```bash
# চেক করুন
curl http://localhost:3000/api/endpoints

# এন্ডপয়েন্ট যোগ করুন
# UI এ গিয়ে: http://localhost:3000/setup/ui
```

**API Key ম্যাচ করছে না:**
```bash
# দুটো ফাইল একই রাখুন
grep GATEWAY_API_KEY .env
grep API_KEY email-sms-gateway/.env

# একই হওয়া উচিত
```

**SMS/Email যাচ্ছে না:**
```bash
# গেটওয়ে চেক করুন
curl http://localhost:9090/

# Kill switch চেক করুন
curl http://localhost:9090/api/admin/kill-switch \
  -H "X-API-Key: your-api-key"
```

---

**Last Updated**: 2024
**Status**: ✓ Comprehensive Troubleshooting Guide Complete
