# Deployment Guide - Production Setup

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Production Environment Setup](#production-environment-setup)
3. [Single Server Deployment](#single-server-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Reverse Proxy Setup](#reverse-proxy-setup)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Performance Tuning](#performance-tuning)
9. [Monitoring Setup](#monitoring-setup)
10. [Backup & Recovery](#backup--recovery)
11. [Scaling Strategies](#scaling-strategies)

---

## ✅ Pre-Deployment Checklist

### Security
- [ ] All default passwords changed
- [ ] API keys are strong (32+ char hex)
- [ ] Environment variables secured
- [ ] HTTPS/SSL configured
- [ ] Firewall rules in place
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Logs don't contain secrets

### Infrastructure
- [ ] Server meets minimum requirements (2GB RAM, 2CPU)
- [ ] Node.js v18+ installed
- [ ] Disk space available (10GB minimum)
- [ ] Network connectivity verified
- [ ] DNS configured (if using domain)
- [ ] Load balancer configured (if needed)
- [ ] Monitoring tools installed
- [ ] Backup system in place

### Testing
- [ ] All tests passing
- [ ] Load testing completed
- [ ] Security testing done
- [ ] Failover testing complete
- [ ] Backup/restore tested
- [ ] Documentation reviewed
- [ ] Runbook prepared
- [ ] Team trained

### Configuration
- [ ] All environment variables set
- [ ] Configuration reviewed and approved
- [ ] Log levels appropriate for production
- [ ] Email/SMS providers configured
- [ ] External API endpoints verified
- [ ] Database connections tested
- [ ] Session management configured
- [ ] CORS/security headers set

---

## 🏭 Production Environment Setup

### System Requirements

**Minimum:**
```
CPU:     2 cores
RAM:     2GB
Disk:    10GB SSD
Network: 10Mbps
OS:      Ubuntu 20.04 LTS or similar
```

**Recommended:**
```
CPU:     4+ cores
RAM:     8GB
Disk:    50GB SSD
Network: 100Mbps
OS:      Ubuntu 22.04 LTS
```

### Operating System Setup

#### Ubuntu/Debian

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y \
  curl \
  wget \
  git \
  build-essential \
  htop \
  iotop \
  nethogs \
  unzip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v18+
npm --version   # Should be v9+

# Install PM2 (process manager)
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash notification
```

#### CentOS/RHEL

```bash
# Update system
sudo yum update -y

# Install dependencies
sudo yum groupinstall -y 'Development Tools'
sudo yum install -y wget curl git

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2
sudo npm install -g pm2
```

### Directory Structure

```bash
# Create application directory
sudo mkdir -p /opt/notification
sudo chown notification:notification /opt/notification

# Create log directory
sudo mkdir -p /var/log/notification
sudo chown notification:notification /var/log/notification

# Create data directory
sudo mkdir -p /var/lib/notification
sudo chown notification:notification /var/lib/notification
```

---

## 🖥️ Single Server Deployment

### Step 1: Clone/Copy Application

```bash
cd /opt/notification

# Copy application files
cp -r /path/to/source/* .

# Fix permissions
sudo chown -R notification:notification /opt/notification
```

### Step 2: Install Dependencies

```bash
# As notification user
sudo -u notification bash

cd /opt/notification/controllerServer
npm install --production

cd /opt/notification/email-sms-gateway
npm install --production
```

### Step 3: Configure Environment

```bash
# Create production environment files
cd /opt/notification

# Control Server
cat > controllerServer/.env << 'EOF'
NODE_ENV=production
CONTROL_SERVER_PORT=3000
GATEWAY_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

API_URL=https://api.example.com/transactions
API_POLLING_INTERVAL=5000
API_TIMEOUT=10000

DATABASE_HOST=localhost
DATABASE_USER=notification
DATABASE_PASS=secure_password_here
DATABASE_NAME=notification

EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=your_sendgrid_key

SMS_PROVIDER=teletalk
SMS_API_URL=https://api.teletalk.com.bd/sms/send
SMS_API_KEY=your_teletalk_key

SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_TIMEOUT=3600000

LOG_LEVEL=warn
LOG_FILE=/var/log/notification/control-server.log
EOF

# Gateway
cat > email-sms-gateway/.env << 'EOF'
NODE_ENV=production
PORT=9090
API_KEY=$(grep GATEWAY_API_KEY controllerServer/.env | cut -d= -f2)

EMAIL_ENABLED=true
SMS_ENABLED=true

LOG_LEVEL=warn
LOG_FILE=/var/log/notification/gateway.log
EOF

# Set permissions
chmod 600 controllerServer/.env email-sms-gateway/.env
```

### Step 4: Initialize State Files

```bash
sudo -u notification bash

cd /opt/notification/controllerServer

# Create state files
echo '{"endpoints": {}}' > config-state.json
echo '{"processedItems": {}, "muteStatus": {}}' > notification-state.json

# Create users file (change password!)
cat > users.json << 'EOF'
{
  "admin": {
    "username": "admin",
    "password": "CHANGE_THIS_PASSWORD",
    "role": "admin"
  }
}
EOF

chmod 600 users.json
```

### Step 5: Setup PM2 (Process Manager)

```bash
cd /opt/notification

# Create ecosystem configuration
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'notification-gateway',
      script: 'email-sms-gateway/server.js',
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/notification/gateway-error.log',
      out_file: '/var/log/notification/gateway-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'notification-control',
      script: 'controllerServer/server.js',
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/notification/control-error.log',
      out_file: '/var/log/notification/control-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# Install as service
sudo pm2 start ecosystem.config.js

# Make PM2 restart on boot
sudo pm2 startup
sudo pm2 save

# Verify
pm2 status
pm2 logs
```

### Step 6: Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo cat > /etc/nginx/sites-available/notification << 'EOF'
upstream notification_control {
    server localhost:3000;
}

upstream notification_gateway {
    server localhost:9090;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=web:10m rate=30r/s;

    # Control Server UI
    location / {
        limit_req zone=web burst=50 nodelay;
        proxy_pass http://notification_control;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    # Gateway API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://notification_gateway;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-API-Key $http_x_api_key;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    # Logging
    access_log /var/log/nginx/notification-access.log combined;
    error_log /var/log/nginx/notification-error.log warn;
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/notification /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 7: Setup SSL/TLS Certificate

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d example.com -d www.example.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

### Step 8: Verify Deployment

```bash
# Check services
pm2 status

# Check logs
pm2 logs

# Health check
curl https://example.com/                    # Web UI
curl https://example.com/api/status          # Control API
curl https://example.com/api/health \        # Gateway
  -H "X-API-Key: your-api-key"

# Check Nginx
sudo systemctl status nginx

# Monitor processes
htop
```

---

## 🐳 Docker Deployment

### Create Dockerfile

```dockerfile
# Dockerfile for Control Server
FROM node:18-alpine

WORKDIR /app

COPY controllerServer/package*.json ./
RUN npm install --only=production

COPY controllerServer/ ./

ENV NODE_ENV=production
ENV CONTROL_SERVER_PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
```

### Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  notification-gateway:
    build:
      context: .
      dockerfile: Dockerfile.gateway
    container_name: notification-gateway
    ports:
      - "9090:9090"
    environment:
      NODE_ENV: production
      PORT: 9090
      API_KEY: ${GATEWAY_API_KEY}
    volumes:
      - ./email-sms-gateway/.env:/app/.env:ro
      - gateway-logs:/var/log/notification
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9090/"]
      interval: 30s
      timeout: 10s
      retries: 3

  notification-control:
    build:
      context: .
      dockerfile: Dockerfile.control
    container_name: notification-control
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      CONTROL_SERVER_PORT: 3000
      GATEWAY_API_KEY: ${GATEWAY_API_KEY}
    volumes:
      - ./controllerServer/.env:/app/.env:ro
      - ./controllerServer/config-state.json:/app/config-state.json
      - ./controllerServer/notification-state.json:/app/notification-state.json
      - ./controllerServer/users.json:/app/users.json
      - control-logs:/var/log/notification
    restart: always
    depends_on:
      - notification-gateway
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:latest
    container_name: notification-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx-logs:/var/log/nginx
    depends_on:
      - notification-control
    restart: always

volumes:
  gateway-logs:
  control-logs:
  nginx-logs:
```

### Deploy with Docker Compose

```bash
# Set API key
export GATEWAY_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Start containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## ☸️ Kubernetes Deployment

### Create Namespace

```bash
kubectl create namespace notification
```

### ConfigMap for Environment

```yaml
# notification-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: notification-config
  namespace: notification
data:
  NODE_ENV: "production"
  LOG_LEVEL: "warn"
  API_URL: "https://api.example.com/transactions"
```

### Secrets for Sensitive Data

```bash
# Create secret for API keys
kubectl create secret generic notification-secrets \
  --from-literal=GATEWAY_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
  --from-literal=DATABASE_PASS=secure_password \
  -n notification
```

### Deployment Manifest

```yaml
# notification-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-gateway
  namespace: notification
spec:
  replicas: 2
  selector:
    matchLabels:
      app: notification-gateway
  template:
    metadata:
      labels:
        app: notification-gateway
    spec:
      containers:
      - name: gateway
        image: notification:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 9090
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: notification-config
              key: NODE_ENV
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: notification-secrets
              key: GATEWAY_API_KEY
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /
            port: 9090
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 9090
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Service Manifest

```yaml
apiVersion: v1
kind: Service
metadata:
  name: notification-gateway
  namespace: notification
spec:
  selector:
    app: notification-gateway
  ports:
  - protocol: TCP
    port: 9090
    targetPort: 9090
  type: ClusterIP
```

### Deploy to Kubernetes

```bash
# Apply configurations
kubectl apply -f notification-config.yaml
kubectl apply -f notification-deployment.yaml
kubectl apply -f notification-service.yaml

# Check status
kubectl get deployments -n notification
kubectl get pods -n notification
kubectl get services -n notification

# View logs
kubectl logs -f deployment/notification-gateway -n notification
```

---

## 🔄 Reverse Proxy Setup

### Nginx Configuration

```nginx
upstream notification_api {
    # Load balancing across multiple instances
    server localhost:3000 weight=5 max_fails=2 fail_timeout=30s;
    server localhost:3001 weight=5 max_fails=2 fail_timeout=30s;
    
    keepalive 32;
}

server {
    listen 80;
    server_name _;
    
    # Redirect to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    
    # SSL/TLS configuration (see next section)
    
    # Logging
    access_log /var/log/nginx/notification.log;
    error_log /var/log/nginx/notification-error.log;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # API proxy
    location /api/ {
        limit_req zone=api burst=200 nodelay;
        
        proxy_pass http://notification_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static content caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Apache Configuration

```apache
<VirtualHost *:443>
    ServerName example.com
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/cert.pem
    SSLCertificateKeyFile /etc/ssl/private/key.pem
    
    ProxyRequests Off
    ProxyPreserveHost On
    
    <Proxy *>
        Order allow,deny
        Allow from all
    </Proxy>
    
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/notification-error.log
    CustomLog ${APACHE_LOG_DIR}/notification-access.log combined
</VirtualHost>
```

---

## 🔒 SSL/TLS Configuration

### Using Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly \
  --nginx \
  -d example.com \
  -d www.example.com \
  --email admin@example.com \
  --agree-tos \
  --no-eff-email

# Auto-renewal
sudo certbot renew --dry-run
sudo systemctl enable certbot.timer
```

### Self-Signed Certificate (Development)

```bash
# Generate key and certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Configure in Nginx
ssl_certificate /path/to/cert.pem;
ssl_certificate_key /path/to/key.pem;
```

### SSL Best Practices

```nginx
# Modern SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

---

## ⚡ Performance Tuning

### Node.js Optimization

```bash
# Increase file descriptors
ulimit -n 65535

# Enable clustering
NODE_CLUSTER=true npm start

# Set heap size
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### Nginx Optimization

```nginx
# Worker processes
worker_processes auto;

# Connection optimization
worker_connections 2048;
keepalive_timeout 65;

# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/javascript application/json;

# Buffer optimization
client_body_buffer_size 128k;
client_max_body_size 10m;
```

### Database Optimization

```bash
# Connection pooling
database_pool_size=20
database_max_idle_time=30000

# Query optimization
Add indexes on frequently queried columns
```

### Caching Strategy

```javascript
// Cache endpoints (1 minute TTL)
const endpointCache = new Map();
const CACHE_TTL = 60000;

function getEndpoints() {
  if (endpointCache.has('endpoints')) {
    const cached = endpointCache.get('endpoints');
    if (Date.now() - cached.time < CACHE_TTL) {
      return cached.data;
    }
  }
  
  const endpoints = loadEndpoints();
  endpointCache.set('endpoints', {
    data: endpoints,
    time: Date.now()
  });
  
  return endpoints;
}
```

---

## 📊 Monitoring Setup

### With PM2 Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate
pm2 install pm2-auto-pull

# Monitor web interface
pm2 web                    # http://localhost:9615

# Save current processes
pm2 save
```

### Prometheus Monitoring

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'notification'
    static_configs:
      - targets: ['localhost:3000', 'localhost:9090']
```

### Log Aggregation

```bash
# Setup ELK Stack
docker run -d --name elasticsearch docker.elastic.co/elasticsearch/elasticsearch:8.0.0
docker run -d --name kibana docker.elastic.co/kibana/kibana:8.0.0
docker run -d --name filebeat docker.elastic.co/beats/filebeat:8.0.0
```

### Health Checks

```bash
#!/bin/bash

# Monitor script
while true; do
  # Check services
  curl -f http://localhost:3000/ > /dev/null || alert "Control server down"
  curl -f http://localhost:9090/ > /dev/null || alert "Gateway down"
  
  # Check disk space
  DISK=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
  [ $DISK -gt 90 ] && alert "Disk usage high: $DISK%"
  
  sleep 60
done
```

---

## 💾 Backup & Recovery

### Backup Strategy

```bash
#!/bin/bash

BACKUP_DIR="/backups/notification"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup state files
tar -czf $BACKUP_DIR/state-$DATE.tar.gz \
  /opt/notification/controllerServer/config-state.json \
  /opt/notification/controllerServer/notification-state.json \
  /opt/notification/controllerServer/users.json

# Backup environment files
tar -czf $BACKUP_DIR/config-$DATE.tar.gz \
  /opt/notification/controllerServer/.env \
  /opt/notification/email-sms-gateway/.env

# Backup logs
tar -czf $BACKUP_DIR/logs-$DATE.tar.gz \
  /var/log/notification/*

# Keep only last 30 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR"
```

### Restore Procedure

```bash
#!/bin/bash

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

# Stop services
pm2 stop all

# Restore files
cd /opt/notification
tar -xzf $BACKUP_FILE

# Restart services
pm2 restart all

echo "Restore completed"
```

### Automated Backups (Cron)

```bash
# Add to crontab
0 2 * * * /opt/notification/scripts/backup.sh
0 3 * * 0 /opt/notification/scripts/backup.sh  # Weekly full backup
```

---

## 🚀 Scaling Strategies

### Horizontal Scaling

1. **Database Migration**: Move from JSON to PostgreSQL/MongoDB
2. **Shared Cache**: Implement Redis for session/data caching
3. **Load Balancer**: Add Nginx/HAProxy in front
4. **Message Queue**: Use RabbitMQ/Kafka for async processing
5. **Microservices**: Separate into independent services

```
Load Balancer (Nginx)
├─ Control Server #1
├─ Control Server #2
├─ Control Server #3
│
├─ Gateway #1
├─ Gateway #2
│
├─ Redis Cache
├─ PostgreSQL DB
└─ RabbitMQ Queue
```

### Vertical Scaling

```bash
# Increase resources
# - More CPU cores
# - More RAM
# - Faster storage (SSD)
# - Better network

# Node.js optimization
NODE_OPTIONS="--max-old-space-size=8192 --enable-source-maps" npm start
```

### Database Scaling

```sql
-- Connection pooling
SHOW max_connections;
ALTER SYSTEM SET max_connections = 200;

-- Create indexes
CREATE INDEX idx_transaction_id ON notifications(transaction_id);
CREATE INDEX idx_endpoint_id ON notifications(endpoint_id);
CREATE INDEX idx_created_at ON notifications(created_at);

-- Partitioning
CREATE TABLE notifications_2024 PARTITION OF notifications
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

---

## 🔍 Health Check Dashboard

```bash
#!/bin/bash

# health-check.sh
echo "=== Notification System Health Check ==="
echo ""

echo "1. Services Status"
pm2 status

echo ""
echo "2. Resource Usage"
ps aux | grep -E "node|npm" | grep -v grep | awk '{print $2, $3, $4, $11}'

echo ""
echo "3. Disk Space"
df -h / | tail -1

echo ""
echo "4. Network Connections"
netstat -an | grep ESTABLISHED | wc -l

echo ""
echo "5. API Health"
curl -s http://localhost:3000/api/status | jq '.status'
curl -s http://localhost:9090/api/health -H "X-API-Key: $API_KEY" | jq '.status'

echo ""
echo "6. Recent Errors"
tail -20 /var/log/notification/*.log | grep -i error

echo ""
echo "Health check complete"
```

---

## 📋 Deployment Runbook

### Initial Deployment

```
1. Execute pre-deployment checklist
2. Setup operating system
3. Clone application code
4. Install dependencies
5. Configure environment variables
6. Initialize state files
7. Setup PM2/systemd
8. Setup reverse proxy
9. Configure SSL/TLS
10. Verify all services
11. Setup monitoring
12. Setup backups
13. Test backup/restore
14. Train operations team
```

### Post-Deployment

```
Daily:
- Monitor error logs
- Check disk space
- Verify backup completion
- Check API response times

Weekly:
- Review performance metrics
- Check security logs
- Test failover procedure
- Update documentation

Monthly:
- Full security audit
- Performance analysis
- Capacity planning
- Team training review
```

---

## 🆘 Emergency Procedures

### Service Restart

```bash
# Quick restart
pm2 restart all

# Full restart
pm2 stop all
sleep 5
pm2 start ecosystem.config.js

# Force restart
pkill -9 node
sleep 3
pm2 start ecosystem.config.js
```

### Emergency Rollback

```bash
# Previous version backup
git checkout previous-version

# Kill current services
pm2 stop all

# Reinstall and restart
npm install --production
pm2 start ecosystem.config.js
```

### Database Recovery

```bash
# Restore from backup
restore_backup.sh /backups/notification/state-20240115_120000.tar.gz

# Verify restoration
ls -la /opt/notification/controllerServer/*.json
```

---

## ✅ Post-Deployment Verification

```bash
#!/bin/bash

echo "Verifying Notification System Deployment"
echo ""

# Check services
echo "Services:"
pm2 status | grep -E "notification"

# Check ports
echo ""
echo "Listening Ports:"
netstat -tlpn | grep -E "3000|9090|80|443"

# Check certificates
echo ""
echo "SSL Certificate:"
openssl x509 -in /etc/letsencrypt/live/example.com/fullchain.pem -noout -text | grep -E "Subject:|Issuer:|Not Before|Not After"

# Test APIs
echo ""
echo "API Tests:"
echo -n "Control Server: "
curl -s http://localhost:3000/ > /dev/null && echo "✓" || echo "✗"

echo -n "Gateway: "
curl -s http://localhost:9090/ -H "X-API-Key: test" > /dev/null && echo "✓" || echo "✗"

# Check logs
echo ""
echo "Recent Errors:"
grep -i error /var/log/notification/*.log | tail -5

echo ""
echo "Deployment verification complete"
```

---

**Last Updated**: 2024
**Status**: ✓ Production Deployment Guide Complete
