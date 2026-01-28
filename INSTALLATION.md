# Notification System - Complete Installation Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Installation Steps](#installation-steps)
4. [Post-Installation Verification](#post-installation-verification)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Software Requirements
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (or yarn/pnpm)
- **Git**: For cloning repository
- **Bash**: For running shell scripts

### Hardware Requirements
- **RAM**: Minimum 512MB
- **Disk Space**: 500MB
- **Network**: Internet connection for npm packages

### Operating System
- Linux (Ubuntu, CentOS, Debian)
- macOS (Intel or Apple Silicon)
- Windows (with WSL2 or Git Bash)

---

## System Requirements

### Check Your System

**Check Node.js Version:**
```bash
node --version
# Should output: v18.0.0 or higher
```

**Check npm Version:**
```bash
npm --version
# Should output: v9.0.0 or higher
```

**Check Bash:**
```bash
bash --version
# Should show bash version
```

### Install Node.js

#### Linux (Ubuntu/Debian)
```bash
# Update package manager
sudo apt-get update

# Install Node.js and npm
sudo apt-get install nodejs npm

# Verify installation
node --version
npm --version
```

#### Linux (CentOS/RHEL)
```bash
# Using NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

# Install Node.js
sudo yum install nodejs

# Verify installation
node --version
npm --version
```

#### macOS
```bash
# Using Homebrew (install from https://brew.sh if needed)
brew install node

# Or using MacPorts
sudo port install nodejs18

# Verify installation
node --version
npm --version
```

#### Windows
1. Download Node.js from https://nodejs.org/
2. Choose LTS version (v18 or higher)
3. Run installer and follow prompts
4. Verify in Command Prompt:
```cmd
node --version
npm --version
```

---

## Installation Steps

### Step 1: Clone or Download Repository

**Option A: Clone from Git**
```bash
git clone https://github.com/your-org/notification.git
cd notification
```

**Option B: Extract from Archive**
```bash
unzip notification.zip
cd notification
```

### Step 2: Install Main Application Dependencies

```bash
# Navigate to controller server
cd controllerServer

# Install dependencies
npm install

# Verify installation
npm list

# Output should show:
# notification-system@1.0.0
# ├── axios@1.6.0
# ├── concurrently@9.2.1
# ├── dotenv@16.3.1
# └── express@4.18.2
```

### Step 3: Install Gateway Dependencies

```bash
# Navigate to gateway
cd ../email-sms-gateway

# Install dependencies
npm install

# Verify installation
npm list

# Output should show:
# payment-notification-gateway@1.0.0
# ├── axios@1.6.0
# ├── dotenv@16.3.1
# ├── express@4.18.2
# └── nodemailer@6.x.x (if email support)
```

### Step 4: Verify File Structure

Check that all necessary files exist:

```bash
cd /path/to/notification

# Check main app files
ls -la controllerServer/
# Should include: server.js, control-server.js, scheduler.js, email.js, sms.js, etc.

# Check gateway files
ls -la email-sms-gateway/
# Should include: server.js, emailClient.js, teletalkClient.js, etc.

# Check tests
ls -la tests/
# Should include: run-tests.sh, gateway-tests.js, control-server-tests.js, etc.

# Check docs
ls -la email-sms-gateway/docs/
# Should include: AUTHENTICATION.md, KILL_SWITCH.md, README.md
```

### Step 5: Create Environment Files

**Main Application** (`.env`):
```bash
cd /path/to/notification

# Create .env from template
cp .env.example .env

# Edit .env
nano .env
```

Edit and set:
```bash
# Environment
NODE_ENV=development

# Server Configuration
CONTROL_SERVER_PORT=3000
CONTROL_SERVER_URL=http://localhost:3000

# Gateway Authentication
GATEWAY_API_KEY=your-secret-key-here
```

**Gateway** (`email-sms-gateway/.env`):
```bash
cd email-sms-gateway

# Create .env from template
cp .env.example .env

# Edit .env
nano .env
```

Edit and set:
```bash
# Server
PORT=9090

# Emergency Kill Switch
GATEWAY_ENABLED=true
SMS_ENABLED=true
EMAIL_ENABLED=true

# API Authentication
API_KEY=your-secret-key-here

# Teletalk SMS Configuration
TELETALK_USER=your_username
TELETALK_USER_ID=your_user_id
TELETALK_ENCR_KEY=your_encryption_key
TELETALK_PASSWORD=your_password
TELETALK_BASE_URL=https://bulksms.teletalk.com.bd/jlinktbls.php

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com
EMAIL_FROM_NAME=Notification System
```

**Generate Strong API Key:**
```bash
# Linux/Mac
openssl rand -hex 32

# Node.js (any platform)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Then copy output and use in both .env files
```

### Step 6: Create State Files

Create necessary JSON state files:

```bash
cd controllerServer

# Create endpoint configuration
cat > config-state.json << 'EOF'
{
  "endpoints": {}
}
EOF

# Create notification state
cat > notification-state.json << 'EOF'
{
  "processedItems": {},
  "muteStatus": {}
}
EOF

# Create user credentials (secure this!)
cat > users.json << 'EOF'
{
  "admin": {
    "username": "admin",
    "password": "change-this-password",
    "role": "admin"
  }
}
EOF

# Secure users.json
chmod 600 users.json
```

**Important**: Change default password in `users.json`!

### Step 7: Verify Installation

```bash
# Go to main directory
cd /path/to/notification

# Check all files exist
echo "=== Main App Files ==="
ls controllerServer/*.js | wc -l
echo "files found"

echo "=== Gateway Files ==="
ls email-sms-gateway/*.js | wc -l
echo "files found"

echo "=== Test Files ==="
ls tests/*.js tests/*.sh | wc -l
echo "files found"

echo "=== Documentation ==="
find . -name "*.md" | wc -l
echo "documentation files found"
```

### Step 8: Test Installation

```bash
# Test gateway dependencies
cd email-sms-gateway
npm list express axios dotenv
cd ..

# Test main app dependencies
cd controllerServer
npm list express axios dotenv concurrently
cd ..

echo "✓ Installation verification complete"
```

---

## Post-Installation Verification

### Verify File Permissions

```bash
# Gateway files should be readable/executable
ls -la email-sms-gateway/server.js

# Test scripts should be executable
ls -la tests/*.sh
chmod +x tests/*.sh

# State files should exist
ls -la controllerServer/*.json
```

### Verify Network Ports

Ensure required ports are available:

```bash
# Check if ports are in use
lsof -i :3000    # Control Server
lsof -i :9090    # Gateway

# If ports are in use, either:
# 1. Kill process: kill <PID>
# 2. Change ports in .env files
```

### Verify Environment Setup

```bash
# Check .env files
echo "=== Main App Config ==="
cat .env

echo ""
echo "=== Gateway Config ==="
cat email-sms-gateway/.env

# Verify API_KEY matches
echo ""
echo "Main App API Key: $(grep GATEWAY_API_KEY .env | cut -d= -f2)"
echo "Gateway API Key: $(grep API_KEY email-sms-gateway/.env | cut -d= -f2)"
# These should match!
```

### Quick Health Check

```bash
# Terminal 1: Start gateway
cd email-sms-gateway
npm start &
sleep 3

# Terminal 2: Start control server
cd controllerServer
npm start &
sleep 3

# Terminal 3: Test endpoints
curl http://localhost:9090/
# Should show: {"status":"OK",...}

curl http://localhost:3000/
# Should show: HTML or redirect to login

# Stop servers
pkill -f "npm start"
```

---

## Troubleshooting

### npm install Fails

**Error**: `npm ERR! code ERESOLVE`

**Solution**:
```bash
# Use legacy dependency resolution
npm install --legacy-peer-deps

# Or use npm 8+
npm install --no-audit
```

**Error**: `npm ERR! 404 Not Found`

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Try install again
npm install

# If still fails, check internet connection
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env
CONTROL_SERVER_PORT=3001
```

### Node Version Mismatch

**Error**: `Node version too old`

**Solution**:
```bash
# Update Node.js to v18+
node --version

# Using nvm (Node Version Manager)
nvm install 18
nvm use 18
node --version

# Using Homebrew
brew upgrade node

# Using apt
sudo apt-get upgrade nodejs
```

### Missing .env File

**Error**: `Configuration not found`

**Solution**:
```bash
# Copy template
cp .env.example .env

# Copy gateway template
cp email-sms-gateway/.env.example email-sms-gateway/.env

# Edit both files with your values
nano .env
nano email-sms-gateway/.env
```

### Permission Denied

**Error**: `Permission denied: ./tests/run-tests.sh`

**Solution**:
```bash
# Make scripts executable
chmod +x tests/*.sh

# Verify
ls -la tests/run-tests.sh
# Should show: -rwxr-xr-x
```

### Module Not Found

**Error**: `Cannot find module 'express'`

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Verify installation
npm list express
```

---

## Next Steps

After successful installation:

1. **Review Setup Guide**: Read [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. **Configure Endpoints**: See [CONFIGURATION.md](./CONFIGURATION.md)
3. **Run Tests**: Execute `bash tests/quick-test.sh`
4. **Start System**: Run `npm start` in controllerServer
5. **Access UI**: Open http://localhost:3000

---

## Verification Checklist

- [ ] Node.js v18+ installed
- [ ] npm v9+ installed
- [ ] All dependencies installed
- [ ] `.env` files created
- [ ] State files created
- [ ] All files verified
- [ ] Ports available (3000, 9090)
- [ ] Permissions set correctly
- [ ] Health check passed
- [ ] Ready for setup

---

## Getting Help

If you encounter issues:

1. Check [Troubleshooting](#troubleshooting) section above
2. Review error messages carefully
3. Check server logs: `/tmp/gateway.log`, `/tmp/control.log`
4. Verify all prerequisites are met
5. Ensure network connectivity
6. Check file permissions

---

## বাংলা নির্দেশনা

### প্রয়োজনীয় জিনিস

1. **Node.js v18+** - ডাউনলোড করুন https://nodejs.org/
2. **npm** - Node.js এর সাথে আসে
3. **Git** (অপশনাল) - repository clone করতে

### ইনস্টলেশন

```bash
# 1. Repository clone করুন
git clone <URL>
cd notification

# 2. Dependencies install করুন
cd controllerServer && npm install
cd ../email-sms-gateway && npm install

# 3. .env ফাইল তৈরি করুন
cp .env.example .env
cp email-sms-gateway/.env.example email-sms-gateway/.env

# 4. API Key generate করুন
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 5. .env ফাইল edit করুন এবং API Key set করুন
nano .env
nano email-sms-gateway/.env

# 6. State files তৈরি করুন
cd controllerServer
cat > config-state.json << 'EOF'
{"endpoints": {}}
EOF

cat > notification-state.json << 'EOF'
{"processedItems": {}, "muteStatus": {}}
EOF

cat > users.json << 'EOF'
{"admin": {"username": "admin", "password": "change-this"}}
EOF

# 7. পরীক্ষা করুন
npm list
```

### পরবর্তী ধাপ

- সেটআপ গাইড পড়ুন: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- সিস্টেম শুরু করুন: `npm start`
- ব্রাউজারে যান: http://localhost:3000
