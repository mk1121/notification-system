const express = require('express');
const fs = require('fs');
const path = require('path');
const { CONTROL_SERVER_PORT } = require('./config');
const { fetchTransactions, mapItemsFromData } = require('./api');
const { getConfig, setConfig, createConfig, getConfigByTag, updateConfigByTag, deleteConfigByTag, listConfigs, getActiveConfigTag, setActiveConfigTag } = require('./config-store');
const { logMuteAction, logUnmuteAction, getLogs, getLogsJSON, clearLogs } = require('./logger');
const { getEndpointConfig, getAllEndpoints, getActiveTags, getActiveTag, setActiveTags, setActiveTag, addActiveTag, removeActiveTag, toggleActiveTag, getActiveEndpoint, updateEndpoint, resetEndpoint, getAvailableTags } = require('./endpoints-store');
const { startEndpointScheduler, stopEndpointScheduler, restartEndpointScheduler, getActiveSchedulers } = require('./scheduler');
const consoleLog = require('./console-logger');

const app = express();
const stateFile = path.join(__dirname, 'notification-state.json');
const usersFile = path.join(__dirname, 'users.json');

// In-memory sessions (simple session management)
const sessions = {};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use((req, res, next) => {
  const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0];
  if (sessionId && sessions[sessionId]) {
    req.session = sessions[sessionId];
  }
  next();
});

// Load users from file
function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  } catch (err) {
    console.error('Error reading users file:', err.message);
    return { users: [] };
  }
}

// Verify credentials
function verifyCredentials(username, password) {
  const data = loadUsers();
  return data.users.find(u => u.username === username && u.password === password);
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const content = fs.readFileSync(stateFile, 'utf8');
      // Handle empty file
      if (!content || content.trim() === '') {
        consoleLog.warn('State file is empty, returning default state', 'STATE');
        return {
          mutePayment: false,
          muteApi: false,
          lastApiStatus: 'success',
          lastFailureMessage: '',
          processedPaymentIds: [],
          endpoints: {}
        };
      }
      return JSON.parse(content);
    }
  } catch (err) {
    consoleLog.error('Error reading state file', 'STATE', err);
  }
  return {
    mutePayment: false,
    muteApi: false,
    lastApiStatus: 'success',
    lastFailureMessage: '',
    processedPaymentIds: [],
    endpoints: {}
  };
}

function saveState(state) {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch (err) {
    consoleLog.error('Error saving state file', 'STATE', err);
  }
}

function removeEndpointState(tag) {
  try {
    const state = loadState();
    if (state.endpoints && state.endpoints[tag]) {
      delete state.endpoints[tag];
      saveState(state);
      consoleLog.info(`Removed endpoint state for: ${tag}`, 'STATE');
      return true;
    }
    return false;
  } catch (err) {
    consoleLog.error(`Error removing endpoint state for ${tag}`, 'STATE', err);
    return false;
  }
}

// Authentication middleware
function requireLogin(req, res, next) {
  if (!req.session) {
    return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
  }
  next();
}

// Login page
app.get('/login', (_req, res) => {
  res.type('text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login - Notification System</title>
      <style>
        * { box-sizing: border-box; }
        body { 
          font-family: "Segoe UI", Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          width: 100%;
          max-width: 400px;
        }
        .logo {
          text-align: center;
          font-size: 40px;
          margin-bottom: 20px;
        }
        h1 {
          text-align: center;
          color: #333;
          margin: 0 0 10px 0;
          font-size: 24px;
        }
        .subtitle {
          text-align: center;
          color: #666;
          margin-bottom: 30px;
          font-size: 14px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        label {
          display: block;
          margin-bottom: 6px;
          color: #333;
          font-weight: 600;
          font-size: 14px;
        }
        input[type="text"],
        input[type="password"] {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        input[type="text"]:focus,
        input[type="password"]:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        button {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.1s;
          margin-top: 8px;
        }
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        button:active {
          transform: translateY(0);
        }
        .error {
          color: #dc3545;
          background: #f8d7da;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 16px;
          font-size: 13px;
          display: none;
        }
        .error.show {
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <div class="logo">📬</div>
        <h1>Notification System</h1>
        <p class="subtitle">Sign in to your account</p>
        
        <div id="error" class="error"></div>
        
        <form onsubmit="handleLogin(event)">
          <div class="form-group">
            <label for="username">Username</label>
            <input type="text" id="username" placeholder="Enter username" required autofocus />
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" placeholder="Enter password" required />
          </div>
          
          <button type="submit">Sign In</button>
        </form>
      </div>
      
      <script>
        async function handleLogin(e) {
          e.preventDefault();
          const username = document.getElementById('username').value;
          const password = document.getElementById('password').value;
          const errorEl = document.getElementById('error');
          
          try {
            const res = await fetch('/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password })
            });
            
            const data = await res.json();
            
            if (data.ok) {
              const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
              window.location.href = redirect;
            } else {
              errorEl.textContent = data.error || 'Invalid username or password';
              errorEl.classList.add('show');
            }
          } catch (err) {
            errorEl.textContent = 'Login failed: ' + err.message;
            errorEl.classList.add('show');
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Login endpoint
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  const user = verifyCredentials(username, password);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  }

  // Create session
  const sessionId = Math.random().toString(36).substr(2, 9);
  sessions[sessionId] = { username, loginTime: new Date() };

  // Set cookie
  res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; HttpOnly`);
  res.json({ ok: true, message: 'Login successful' });
});

// Home page - redirect to login or logs based on session
app.get('/', (req, res) => {
  if (req.session) {
    res.redirect('/logs/ui');
  } else {
    res.redirect('/login');
  }
});

// Logout endpoint
app.get('/auth/logout', (req, res) => {
  const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0];
  if (sessionId) {
    delete sessions[sessionId];
  }
  res.setHeader('Set-Cookie', 'sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC');
  res.redirect('/login');
});

app.get('/config', (_req, res) => {
  res.json(getConfig());
});

app.get('/api/tags', (_req, res) => {
  try {
    const tags = getAvailableTags();
    consoleLog.debug(`Available tags: ${JSON.stringify(tags)}`, 'API');
    res.json({ ok: true, tags: tags || [] });
  } catch (err) {
    consoleLog.error('Failed to get tags', 'API', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/config', (req, res) => {
  try {
    const {
      apiEndpoint,
      smsEndpoint,
      emailEndpoint,
      phoneNumbers,
      emailAddresses,
      checkIntervalMinutes,
      controlServerUrl,
      enableSms,
      enableEmail,
      enableManualMute,
      apiMethod,
      apiHeaders,
      apiAuthType,
      apiAuthToken,
      apiAuthUsername,
      apiAuthPassword,
      apiQuery,
      apiBody,
      mapItemsPath,
      mapIdPath,
      mapTimestampPath,
      mapTitlePath,
      mapDetailsPath
    } = req.body || {};

    const updated = setConfig({
      API_ENDPOINT: apiEndpoint,
      SMS_ENDPOINT: smsEndpoint,
      EMAIL_ENDPOINT: emailEndpoint,
      PHONE_NUMBERS: phoneNumbers,
      EMAIL_ADDRESSES: emailAddresses,
      CHECK_INTERVAL_MINUTES: checkIntervalMinutes,
      CONTROL_SERVER_URL: controlServerUrl,
      ENABLE_SMS: enableSms,
      ENABLE_EMAIL: enableEmail,
      ENABLE_MANUAL_MUTE: enableManualMute,
      API_METHOD: apiMethod,
      API_HEADERS: apiHeaders,
      API_AUTH_TYPE: apiAuthType,
      API_AUTH_TOKEN: apiAuthToken,
      API_AUTH_USERNAME: apiAuthUsername,
      API_AUTH_PASSWORD: apiAuthPassword,
      API_QUERY: apiQuery,
      API_BODY: apiBody,
      MAP_ITEMS_PATH: mapItemsPath,
      MAP_ID_PATH: mapIdPath,
      MAP_TIMESTAMP_PATH: mapTimestampPath,
      MAP_TITLE_PATH: mapTitlePath,
      MAP_DETAILS_PATH: mapDetailsPath
    });

    res.json({ ok: true, config: updated });
  } catch (err) {
    console.error('Error updating config:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/state', (_req, res) => {
  res.json(loadState());
});

app.get('/mute/payment/ui', (_req, res) => {
  const endpointTag = _req.query.endpoint || null;
  
  // Get endpoint config to check if manual mute is enabled
  let enableManualMute = false;
  if (endpointTag) {
    try {
      const endpointConfig = getEndpointConfig(endpointTag);
      enableManualMute = endpointConfig.enableManualMute;
    } catch (err) {
      enableManualMute = false;
    }
  } else {
    const config = getConfig();
    enableManualMute = config.ENABLE_MANUAL_MUTE;
  }
  
  if (!enableManualMute) {
    res.type('text/html').send(`
      <!DOCTYPE html>
      <html><body style="font-family:Arial,sans-serif;padding:24px;">
        <h2 style="color:#d9534f;">Manual mute is disabled</h2>
        <p style="color:#555;">Enable it in endpoint configuration to use item mute controls.</p>
      </body></html>
    `);
    return;
  }
  res.type('text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mute Item Alerts</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }
        .container { max-width: 520px; margin: 40px auto; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        h1 { color: #0275d8; margin-top: 0; }
        p { color: #555; }
        .field { margin: 16px 0; }
        label { display: block; margin-bottom: 6px; color: #333; font-weight: bold; }
        input[type=number] { width: 100%; padding: 12px; border: 1px solid #ccd6e0; border-radius: 6px; font-size: 16px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #0275d8; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; }
        button:hover { background: #025aa5; }
        .timer { margin-top: 20px; background: #e8f4f8; padding: 12px; border-radius: 6px; color: #0275d8; font-weight: bold; text-align: center; display: none; }
        .info { font-size: 13px; color: #777; margin-top: 12px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Mute Item Alerts</h1>
        <p>Select how long you want to pause item notifications.</p>
        <div class="field">
          <label for="minutes">Duration (minutes)</label>
          <input id="minutes" type="number" min="1" max="720" value="30" />
        </div>
        <button onclick="mute()">Mute Alerts</button>
        <div id="timer" class="timer"></div>
        <div class="info">Alerts will auto-resume when time expires or a new item is detected.</div>
      </div>
      <script>
        async function mute() {
          const urlParams = new URLSearchParams(window.location.search);
          const endpoint = urlParams.get('endpoint');
          const minutes = parseInt(document.getElementById('minutes').value) || 30;
          let url = '/mute/payment?minutes=' + minutes;
          if (endpoint) {
            url += '&endpoint=' + encodeURIComponent(endpoint);
          }
          const res = await fetch(url);
          const text = await res.text();
          document.body.innerHTML = text;
        }
      </script>
    </body>
    </html>
  `);
});

app.get('/mute/payment', async (_req, res) => {
  const endpointTag = _req.query.endpoint || null;
  const state = loadState();

  // Get endpoint config to check if manual mute is enabled
  let enableManualMute = false;
  if (endpointTag) {
    try {
      const endpointConfig = getEndpointConfig(endpointTag);
      enableManualMute = endpointConfig.enableManualMute;
    } catch (err) {
      enableManualMute = false;
    }
  } else {
    const config = getConfig();
    enableManualMute = config.ENABLE_MANUAL_MUTE;
  }

  if (!enableManualMute) {
    res.type('text/html').send(`
      <!DOCTYPE html>
      <html><body style="font-family:Arial,sans-serif;padding:24px;">
        <h2 style="color:#d9534f;">Manual mute is disabled</h2>
        <p style="color:#555;">Enable manual mute in endpoint configuration to use this action.</p>
      </body></html>
    `);
    return;
  }

  const minutes = parseInt(_req.query.minutes) || 30;
  const muteUntil = new Date(Date.now() + minutes * 60 * 1000);

  if (endpointTag) {
    // Endpoint-specific mute
    // Initialize endpoint state if it doesn't exist
    if (!state.endpoints) {
      state.endpoints = {};
    }
    if (!state.endpoints[endpointTag]) {
      state.endpoints[endpointTag] = {
        mutePayment: false,
        muteApi: false,
        lastApiStatus: 'success',
        lastFailureMessage: '',
        processedPaymentIds: [],
        mutedPaymentIds: []
      };
    }
    const endpointState = state.endpoints[endpointTag];
    endpointState.mutePayment = true;
    endpointState.mutePaymentUntil = muteUntil.toISOString();

    // Get current payment IDs from latest check and add to mutedPaymentIds
    if (!endpointState.mutedPaymentIds) {
      endpointState.mutedPaymentIds = [];
    }

    // Fetch current payments to mute
    const { fetchTransactions, mapItemsFromData } = require('./api');
    const endpointConfig = getEndpointConfig(endpointTag);

    try {
      const result = await fetchTransactions(endpointConfig);
      if (result.ok) {
        const items = mapItemsFromData(result.data, endpointConfig);
        const currentPaymentIds = items.map(item => item.id);

        // Add current payment IDs to muted list
        currentPaymentIds.forEach(id => {
          if (!endpointState.mutedPaymentIds.includes(id)) {
            endpointState.mutedPaymentIds.push(id);
          }
        });

        console.log(`[${endpointTag}] Muted ${currentPaymentIds.length} payment IDs: ${currentPaymentIds.join(', ')}`);
      }
    } catch (err) {
      console.error(`Failed to fetch payments for mute: ${err.message}`);
    }

    saveState(state);
    logMuteAction(`[${endpointTag}] payment (${minutes} minutes)`);
  } else {
    // Global mute (legacy)
    state.mutePayment = true;
    state.mutePaymentUntil = muteUntil.toISOString();
    saveState(state);
    logMuteAction(`payment (${minutes} minutes)`);
  }

  res.type('text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Alerts Muted</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 50px auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        h1 { color: #0275d8; margin: 0; }
        p { color: #555; font-size: 16px; line-height: 1.6; }
        .info { background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0275d8; }
        .success { color: #28a745; font-weight: bold; }
        .timer { font-size: 28px; font-weight: bold; color: #0275d8; margin: 20px 0; }
        .controls { margin-top: 16px; }
        .back-link { color: #0275d8; text-decoration: none; font-weight: bold; }
        .badge { display: inline-block; background: #0275d8; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; margin: 10px 0; }
      </style>
      <script>
        let remainingTime = ${minutes * 60};
        function updateTimer() {
          const hours = Math.floor(remainingTime / 3600);
          const mins = Math.floor((remainingTime % 3600) / 60);
          const secs = remainingTime % 60;
          let timeStr = '';
          if (hours > 0) {
            timeStr = hours + 'h ' + mins + 'm ' + secs + 's';
          } else if (mins > 0) {
            timeStr = mins + 'm ' + secs + 's';
          } else {
            timeStr = secs + 's';
          }
          document.getElementById('timer').textContent = timeStr;
          if (remainingTime > 0) {
            remainingTime--;
            setTimeout(updateTimer, 1000);
          } else {
            document.getElementById('timer').textContent = 'Expired - Alerts will resume';
            document.getElementById('timer').style.color = '#d9534f';
          }
        }
        window.onload = updateTimer;
      </script>
    </head>
    <body>
        <div class="container">
        ${endpointTag ? `<div class="badge">Endpoint: ${endpointTag}</div>` : ''}
        <h1>✓ Payment Alerts Muted</h1>
        <p class="success">Current payment notifications have been muted!</p>
        <div class="info">
          <strong>Mute Duration:</strong> ${minutes} minute${minutes > 1 ? 's' : ''}<br>
          <strong>Will resume:</strong> ${muteUntil.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}<br>
          <div class="timer" id="timer">Loading...</div>
        </div>
        <div class="controls">
          <a class="back-link" href="/mute/payment/ui${endpointTag ? '?endpoint=' + endpointTag : ''}">Set a different duration</a>
        </div>
        <p style="color: #999; font-size: 14px;">Alerts will automatically resume when time expires or a new payment is detected.</p>
      </div>
    </body>
    </html>
  `);
});

app.get('/mute/api', (_req, res) => {
  const config = getConfig();
  if (!config.ENABLE_MANUAL_MUTE) {
    res.type('text/html').send(`
      <!DOCTYPE html>
      <html><body style="font-family:Arial,sans-serif;padding:24px;">
        <h2 style="color:#d9534f;">Manual mute is disabled</h2>
        <p style="color:#555;">Enable manual mute in endpoint configuration to mute API alerts manually.</p>
      </body></html>
    `);
    return;
  }
  const state = loadState();
  state.muteApi = true;
  saveState(state);
  logMuteAction('api');
  res.type('text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>API Alerts Muted</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 50px auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        h1 { color: #d9534f; margin: 0; }
        p { color: #555; font-size: 16px; line-height: 1.6; }
        .info { background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d9534f; }
        .success { color: #d9534f; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✓ API Alerts Muted</h1>
        <p class="success">API failure notifications have been muted successfully!</p>
        <div class="info">
          <strong>Status:</strong> API alerts paused<br>
          <strong>Will resume:</strong> When the API recovers<br>
          <strong>Muted at:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}
        </div>
        <p style="color: #999; font-size: 14px;">You can close this window.</p>
      </div>
    </body>
    </html>
  `);
});

app.get('/unmute/api', (_req, res) => {
  const state = loadState();
  state.muteApi = false;
  state.lastApiStatus = 'success';
  saveState(state);
  logUnmuteAction('api');
  res.type('text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>API Alerts Unmuted</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 50px auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        h1 { color: #28a745; margin: 0; }
        p { color: #555; font-size: 16px; line-height: 1.6; }
        .info { background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745; }
        .success { color: #28a745; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✓ API Alerts Unmuted</h1>
        <p class="success">API notifications are now active!</p>
        <div class="info">
          <strong>Status:</strong> API alerts resumed<br>
          <strong>Unmuted at:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}
        </div>
        <p style="color: #999; font-size: 14px;">You can close this window.</p>
      </div>
    </body>
    </html>
  `);
});

app.get('/reset/payment', (_req, res) => {
  const state = loadState();
  state.mutePayment = false;
  state.processedPaymentIds = [];
  saveState(state);
  logUnmuteAction('payment');
  res.type('text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment History Reset</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 50px auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        h1 { color: #28a745; margin: 0; }
        p { color: #555; font-size: 16px; line-height: 1.6; }
        .info { background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745; }
        .success { color: #28a745; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✓ Payment History Reset</h1>
        <p class="success">Payment alerts have been reset and are now active!</p>
        <div class="info">
          <strong>Status:</strong> Payment history cleared<br>
          <strong>Alerts:</strong> Enabled<br>
          <strong>Reset at:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}
        </div>
        <p style="color: #999; font-size: 14px;">You can close this window.</p>
      </div>
    </body>
    </html>
  `);
});

app.get('/api/logs', (_req, res) => {
  const lines = parseInt(_req.query.lines) || 50;
  const type = _req.query.type || null;
  const logs = getLogsJSON(lines, type);
  res.json({ ok: true, count: logs.length, logs });
});

app.delete('/api/logs', (_req, res) => {
  const success = clearLogs();
  if (success) {
    res.json({ ok: true, message: 'Logs cleared successfully' });
  } else {
    res.status(500).json({ ok: false, error: 'Failed to clear logs' });
  }
});

app.get('/logs/ui', requireLogin, (_req, res) => {
  res.type('text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Notification Logs</title>
      <style>
        :root {
          --bg: #f4f6fb;
          --card: #ffffff;
          --primary: #0d6efd;
          --danger: #dc3545;
          --success: #28a745;
          --warning: #ffc107;
          --muted: #6c757d;
          --border: #e5e7eb;
          --shadow: 0 10px 30px rgba(0,0,0,0.08);
        }
        body { font-family: "Segoe UI", Arial, sans-serif; background: var(--bg); margin: 0; padding: 0; color: #1f2937; }
        .navbar { background: linear-gradient(135deg, #0d6efd, #0aa5ff); padding: 16px 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .navbar-content { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .navbar-brand { color: white; font-size: 20px; font-weight: 700; text-decoration: none; }
        .navbar-links { display: flex; gap: 8px; flex-wrap: wrap; }
        .navbar-link { color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; transition: background 0.2s; }
        .navbar-link:hover { background: rgba(255,255,255,0.2); }
        .navbar-link.active { background: rgba(255,255,255,0.3); }
        .main-content { padding: 24px; }
        .container { max-width: 1200px; margin: 0 auto; background: var(--card); padding: 28px; border-radius: 16px; box-shadow: var(--shadow); border: 1px solid var(--border); }
        header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
        h1 { margin: 0; color: var(--primary); font-size: 24px; }
        .controls { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        select, input { padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; }
        button { padding: 8px 16px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.08s; }
        button:hover { transform: translateY(-1px); }
        .btn-primary { background: var(--primary); color: white; }
        .btn-danger { background: var(--danger); color: white; }
        .btn-success { background: var(--success); color: white; }
        .log-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .log-table th { background: #f8f9fa; padding: 12px; text-align: left; font-weight: 700; color: #374151; border-bottom: 2px solid var(--border); }
        .log-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); font-size: 14px; }
        .log-table tr:hover { background: #f8f9fa; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; }
        .badge-sms { background: #cfe2ff; color: #084298; }
        .badge-email { background: #d1e7dd; color: #0f5132; }
        .badge-mute { background: #fff3cd; color: #664d03; }
        .badge-unmute { background: #d1ecf1; color: #055160; }
        .badge-api { background: #f8d7da; color: #842029; }
        .badge-system { background: #e2e3e5; color: #383d41; }
        .tag-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: 700; font-size: 12px; margin-right: 4px; }
        .tag-pro { background: #e7f3ff; color: #0066cc; border-left: 3px solid #0066cc; }
        .tag-payment { background: #fff4e6; color: #cc7700; border-left: 3px solid #cc7700; }
        .tag-billing { background: #e6f7ff; color: #0099ff; border-left: 3px solid #0099ff; }
        .tag-orders { background: #f0e6ff; color: #9900ff; border-left: 3px solid #9900ff; }
        .tag-default { background: #f0f0f0; color: #333333; border-left: 3px solid #999999; }
        .empty { text-align: center; padding: 40px; color: var(--muted); }
        .stats { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .stat { background: #f8f9fa; padding: 12px 16px; border-radius: 8px; border-left: 4px solid var(--primary); }
        .stat-label { font-size: 12px; color: var(--muted); }
        .stat-value { font-size: 20px; font-weight: 700; color: #111827; }
      </style>
    </head>
    <body>
      <nav class="navbar">
        <div class="navbar-content">
          <a href="/" class="navbar-brand">📬 Notification System</a>
          <div class="navbar-links">
            <a href="/setup/ui" class="navbar-link">🛠️ Setup Wizard</a>
            <a href="/endpoints/ui" class="navbar-link">🔗 Endpoints</a>
            <a href="/logs/ui" class="navbar-link active">📋 Logs</a>
            <a href="/auth/logout" class="navbar-link" style="background: rgba(255,255,255,0.1);">🚪 Logout</a>
          </div>
        </div>
      </nav>
      <div class="main-content">
        <div class="container">
          <header>
            <h1>Notification Logs</h1>
          <div class="controls">
            <select id="tagFilter" onchange="loadLogs()">
              <option value="">All tags</option>
            </select>
            <select id="typeFilter" onchange="loadLogs()">
              <option value="">All types</option>
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
              <option value="MUTE">Mute</option>
              <option value="UNMUTE">Unmute</option>
              <option value="AUTO-UNMUTE">Auto-unmute</option>
              <option value="API-FAILURE">API Failure</option>
              <option value="API-RECOVERY">API Recovery</option>
              <option value="SYSTEM">System</option>
            </select>
            <select id="linesLimit" onchange="loadLogs()">
              <option value="50">Last 50</option>
              <option value="100" selected>Last 100</option>
              <option value="200">Last 200</option>
              <option value="500">Last 500</option>
            </select>
            <button class="btn-primary" onclick="loadLogs()">Refresh</button>
            <button class="btn-danger" onclick="clearLogs()">Clear All Logs</button>
          </div>
        </header>
        <div class="stats" id="stats">Loading...</div>
        <div id="logsContainer"><div class="empty">⏳ Loading logs...</div></div>
      </div>
      <script>
        console.log('[INIT] Logs UI script loaded');
        
        function getTagColor(tag) {
          const colors = {
            'pro': 'tag-pro',
            'payment': 'tag-payment',
            'billing': 'tag-billing',
            'orders': 'tag-orders'
          };
          return colors[tag] || 'tag-default';
        }

        function extractTagFromMessage(message) {
          // Extract tag from messages like "[pro] 5 item(s) detected"
          const start = message.indexOf('[');
          const end = message.indexOf(']');
          if (start === 0 && end > 1) {
            return message.substring(1, end);
          }
          return null;
        }

        async function loadAvailableTags() {
          console.log('[loadAvailableTags] Starting...');
          const tagFilter = document.getElementById('tagFilter');
          if (!tagFilter) {
            console.error('[ERROR] tagFilter element not found!');
            return;
          }
          
          try {
            console.log('[loadAvailableTags] Fetching from /api/tags');
            const res = await fetch('/api/tags');
            const data = await res.json();
            console.log('[DEBUG] Tags response:', data);
            
            if (data.ok && data.tags && data.tags.length > 0) {
              const currentValue = tagFilter.value;
              
              // Clear existing options except "All tags"
              tagFilter.innerHTML = '<option value="">All tags</option>';
              
              // Add available tags
              data.tags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = tag;
                tagFilter.appendChild(option);
              });
              console.log('[DEBUG] Loaded tags:', data.tags);
              
              // Restore previous selection if it still exists
              if (currentValue && data.tags.includes(currentValue)) {
                tagFilter.value = currentValue;
              }
            } else {
              console.warn('[WARN] No tags available or empty response:', data);
            }
          } catch (err) {
            console.error('[ERROR] Error loading tags:', err);
          }
        }

        async function loadLogs() {
          console.log('[loadLogs] Starting...');
          
          const typeFilter = document.getElementById('typeFilter');
          const tagFilter = document.getElementById('tagFilter');
          const linesLimit = document.getElementById('linesLimit');
          const logsContainer = document.getElementById('logsContainer');
          
          if (!typeFilter || !tagFilter || !linesLimit || !logsContainer) {
            console.error('[ERROR] One or more required elements not found!', { typeFilter, tagFilter, linesLimit, logsContainer });
            return;
          }
          
          const type = typeFilter.value;
          const tag = tagFilter.value;
          const lines = linesLimit.value;
          let url = '/api/logs?lines=' + lines;
          if (type) url += '&type=' + type;
          
          console.log('[DEBUG] Loading logs with url:', url);
          
          try {
            console.log('[loadLogs] Fetching logs from API');
            const res = await fetch(url);
            const data = await res.json();
            console.log('[DEBUG] Logs response:', data);
            
            if (data.ok) {
              // Filter by tag if selected
              let filteredLogs = data.logs;
              if (tag) {
                filteredLogs = data.logs.filter(log => log.tag === tag);
              }
              console.log('[DEBUG] Filtered logs count:', filteredLogs.length);
              
              displayStats(filteredLogs);
              displayLogs(filteredLogs);
            } else {
              console.error('[ERROR] Logs API returned error:', data.error);
            }
          } catch (err) {
            console.error('[ERROR] Error loading logs:', err);
            document.getElementById('logsContainer').innerHTML = '<div class="empty">Error loading logs: ' + err.message + '</div>';
          }
        }

        function displayStats(logs) {
          const stats = {};
          logs.forEach(log => {
            stats[log.type] = (stats[log.type] || 0) + 1;
          });
          
          const statsHtml = Object.entries(stats).map(([type, count]) => 
            '<div class="stat">' +
              '<div class="stat-label">' + type + '</div>' +
              '<div class="stat-value">' + count + '</div>' +
            '</div>'
          ).join('');
          
          document.getElementById('stats').innerHTML = statsHtml || '<div class="stat"><div class="stat-label">No logs</div></div>';
        }

        function displayLogs(logs) {
          if (!logs.length) {
            const tag = document.getElementById('tagFilter').value;
            if (tag) {
              document.getElementById('logsContainer').innerHTML = '<div class="empty">No logs found for tag "<strong>' + tag + '</strong>". Try a different tag or "All tags".</div>';
            } else {
              document.getElementById('logsContainer').innerHTML = '<div class="empty">📊 No logs yet. The system is running and waiting for notifications to be triggered.<br/><small>Logs will appear here when items are detected and notifications are sent.</small></div>';
            }
            return;
          }
          
          const rows = logs.reverse().map(log => {
            // Use tag from parsed log data if available, otherwise try to extract from message
            const tag = log.tag || extractTagFromMessage(log.message);
            const tagHtml = tag ? '<span class="tag-badge ' + getTagColor(tag) + '">' + tag + '</span>' : '';
            return '<tr>' +
              '<td>' + log.timestamp + '</td>' +
              '<td>' + tagHtml + '<span class="badge badge-' + log.type.toLowerCase().replace(/-/g, '') + '">' + log.type + '</span></td>' +
              '<td>' + log.message + '</td>' +
            '</tr>';
          }).join('');
          
          const html = 
            '<table class="log-table">' +
              '<thead>' +
                '<tr>' +
                  '<th>Timestamp</th>' +
                  '<th>Tag & Type</th>' +
                  '<th>Message</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' + rows + '</tbody>' +
            '</table>';
          
          document.getElementById('logsContainer').innerHTML = html;
        }

        async function clearLogs() {
          if (!confirm('Are you sure you want to clear all logs? This cannot be undone.')) return;
          
          try {
            const res = await fetch('/api/logs', { method: 'DELETE' });
            const data = await res.json();
            
            if (data.ok) {
              alert('Logs cleared successfully');
              loadLogs();
            } else {
              alert('Failed to clear logs: ' + (data.error || 'Unknown error'));
            }
          } catch (err) {
            alert('Error clearing logs: ' + err.message);
          }
        }

        window.onload = function() {
          console.log('[INIT] Page loaded, calling loadAvailableTags and loadLogs');
          loadAvailableTags();
          loadLogs();
        };
        
        // Also try DOMContentLoaded as backup
        document.addEventListener('DOMContentLoaded', function() {
          console.log('[INIT] DOMContentLoaded event fired');
        });
      </script>
      </div>
    </div>
    </body>
    </html>
  `);
});

app.get('/logs', (_req, res) => {
  res.type('text/plain');
  res.send(getLogs(100));
});

// Test endpoints for universalization
app.get('/api/test-fetch', async (_req, res) => {
  try {
    const result = await fetchTransactions();
    res.json({ ok: result.ok, status: result.status, error: result.error || null, raw: result.data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/test-map', async (_req, res) => {
  try {
    const result = await fetchTransactions();
    if (!result.ok) {
      res.status(502).json({ ok: false, status: result.status, error: result.error || 'Fetch failed' });
      return;
    }
    const items = mapItemsFromData(result.data);
    res.json({ ok: true, count: items.length, items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Custom test endpoints (for setup wizard with custom config)
app.post('/api/test-fetch-custom', async (req, res) => {
  try {
    const {
      apiEndpoint,
      apiMethod = 'GET',
      apiHeaders = {},
      apiAuthType = '',
      apiAuthToken = '',
      apiAuthUsername = '',
      apiAuthPassword = '',
      apiQuery = {},
      apiBody = {}
    } = req.body || {};

    if (!apiEndpoint) {
      return res.status(400).json({ ok: false, error: 'apiEndpoint is required' });
    }

    const axios = require('axios');

    const config = {
      url: apiEndpoint,
      method: apiMethod.toUpperCase(),
      headers: { ...apiHeaders },
      params: apiQuery,
      timeout: 10000
    };

    if (apiMethod.toUpperCase() !== 'GET') {
      config.data = apiBody;
    }

    // Auth handling
    if (apiAuthType && apiAuthType.toLowerCase() === 'bearer' && apiAuthToken) {
      config.headers.Authorization = `Bearer ${apiAuthToken}`;
    } else if (apiAuthType && apiAuthType.toLowerCase() === 'basic' && apiAuthUsername) {
      const credentials = Buffer.from(`${apiAuthUsername}:${apiAuthPassword || ''}`).toString('base64');
      config.headers.Authorization = `Basic ${credentials}`;
    }

    const response = await axios(config);

    res.json({
      ok: true,
      status: response.status,
      data: response.data,
      raw: response.data
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err.message || 'Request failed',
      status: err.response?.status || null,
      details: err.response?.data || null
    });
  }
});

app.post('/api/test-map-custom', async (req, res) => {
  try {
    const {
      apiEndpoint,
      apiMethod = 'GET',
      apiHeaders = {},
      apiAuthType = '',
      apiAuthToken = '',
      apiAuthUsername = '',
      apiAuthPassword = '',
      apiQuery = {},
      apiBody = {},
      mapItemsPath = 'items',
      mapIdPath = 'id',
      mapTimestampPath = 'createdAt',
      mapTitlePath = '',
      mapDetailsPath = ''
    } = req.body || {};

    if (!apiEndpoint) {
      return res.status(400).json({ ok: false, error: 'apiEndpoint is required' });
    }

    const axios = require('axios');

    const config = {
      url: apiEndpoint,
      method: apiMethod.toUpperCase(),
      headers: { ...apiHeaders },
      params: apiQuery,
      timeout: 10000
    };

    if (apiMethod.toUpperCase() !== 'GET') {
      config.data = apiBody;
    }

    // Auth handling
    if (apiAuthType && apiAuthType.toLowerCase() === 'bearer' && apiAuthToken) {
      config.headers.Authorization = `Bearer ${apiAuthToken}`;
    } else if (apiAuthType && apiAuthType.toLowerCase() === 'basic' && apiAuthUsername) {
      const credentials = Buffer.from(`${apiAuthUsername}:${apiAuthPassword || ''}`).toString('base64');
      config.headers.Authorization = `Basic ${credentials}`;
    }

    const response = await axios(config);
    const data = response.data;

    // Map items using provided paths
    const getNestedValue = (obj, path) => {
      if (!path) return undefined;
      return path.split('.').reduce((current, prop) => current?.[prop], obj);
    };

    let items = [];
    const itemsArray = getNestedValue(data, mapItemsPath) || data;

    if (Array.isArray(itemsArray)) {
      items = itemsArray.map(item => {
        const mapped = {
          id: getNestedValue(item, mapIdPath),
          timestamp: getNestedValue(item, mapTimestampPath)
        };
        if (mapTitlePath) {
          mapped.title = getNestedValue(item, mapTitlePath);
        }
        if (mapDetailsPath) {
          mapped.details = getNestedValue(item, mapDetailsPath);
        }
        return mapped;
      });
    }

    res.json({
      ok: true,
      count: items.length,
      items,
      mappingPaths: {
        itemsPath: mapItemsPath,
        idPath: mapIdPath,
        timestampPath: mapTimestampPath,
        titlePath: mapTitlePath,
        detailsPath: mapDetailsPath
      }
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err.message || 'Request failed',
      status: err.response?.status || null,
      details: err.response?.data || null
    });
  }
});

// Multi-config endpoints
app.get('/api/configs', (_req, res) => {
  const list = listConfigs();
  const active = getActiveConfigTag();
  res.json({ ok: true, configs: list, activeTag: active });
});

app.post('/api/configs', (req, res) => {
  const { tag, data } = req.body || {};
  if (!tag) return res.status(400).json({ ok: false, error: 'Tag required' });

  try {
    // Save to both old and new stores for compatibility
    const result = createConfig(tag, data || {});

    // Also save to endpoints-store
    updateEndpoint(tag, data || {});

    // Start scheduler for new endpoint
    try {
      startEndpointScheduler(tag);
    } catch (err) {
      console.warn(`Could not start scheduler for ${tag}: ${err.message}`);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/configs/:tag', (req, res) => {
  const cfg = getConfigByTag(req.params.tag);
  if (!cfg) return res.status(404).json({ ok: false, error: 'Config not found' });
  res.json({ ok: true, config: cfg });
});

app.put('/api/configs/:tag', (req, res) => {
  try {
    const result = updateConfigByTag(req.params.tag, req.body || {});

    // Also update endpoints-store
    updateEndpoint(req.params.tag, req.body || {});

    // Restart scheduler for updated endpoint
    try {
      restartEndpointScheduler(req.params.tag);
    } catch (err) {
      console.warn(`Could not restart scheduler for ${req.params.tag}: ${err.message}`);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/configs/:tag', (req, res) => {
  try {
    const result = deleteConfigByTag(req.params.tag);

    // Also delete from endpoints-store
    try {
      resetEndpoint(req.params.tag);
    } catch (err) {
      // Endpoint might not exist in endpoints-store
    }

    // Stop scheduler
    try {
      stopEndpointScheduler(req.params.tag);
    } catch (err) {
      console.warn(`Could not stop scheduler for ${req.params.tag}: ${err.message}`);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/configs/:tag/activate', (req, res) => {
  try {
    const result = setActiveConfigTag(req.params.tag);

    // Also set in endpoints-store
    try {
      setActiveTag(req.params.tag);
    } catch (err) {
      console.warn(`Could not set active tag in endpoints-store: ${err.message}`);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Get all active endpoint tags
 */
app.get('/api/endpoints/active', (req, res) => {
  try {
    const activeTags = getActiveTags();
    res.json({
      ok: true,
      activeTags,
      count: activeTags.length
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Set multiple active endpoint tags at once
 */
app.post('/api/endpoints/active', (req, res) => {
  try {
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ ok: false, error: 'tags must be an array' });
    }

    const activeTags = setActiveTags(tags);

    // Stop old schedulers and start new ones
    const allEndpoints = getAllEndpoints();
    const allTags = Object.keys(allEndpoints);

    allTags.forEach(tag => {
      if (activeTags.includes(tag) && !getActiveSchedulers().map(s => s.tag).includes(tag)) {
        // Start scheduler for newly activated tag
        startEndpointScheduler(tag);
      } else if (!activeTags.includes(tag) && getActiveSchedulers().map(s => s.tag).includes(tag)) {
        // Stop scheduler for deactivated tag
        stopEndpointScheduler(tag);
      }
    });

    res.json({
      ok: true,
      activeTags,
      message: `${activeTags.length} endpoint(s) activated`
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Toggle endpoint tag active status (add/remove from active list)
 */
app.post('/api/endpoints/:tag/toggle-active', (req, res) => {
  try {
    const tag = req.params.tag;
    const newActiveTags = toggleActiveTag(tag);
    const isNowActive = newActiveTags.includes(tag);

    // Start or stop scheduler accordingly
    if (isNowActive) {
      startEndpointScheduler(tag);
    } else {
      stopEndpointScheduler(tag);
    }

    res.json({
      ok: true,
      tag,
      isActive: isNowActive,
      activeTags: newActiveTags,
      message: `${tag} is now ${isNowActive ? 'ACTIVE' : 'INACTIVE'}`
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Add endpoint tag to active list
 */
app.post('/api/endpoints/:tag/activate', (req, res) => {
  try {
    const tag = req.params.tag;
    const activeTags = addActiveTag(tag);

    // Start scheduler for this endpoint
    startEndpointScheduler(tag);

    res.json({
      ok: true,
      tag,
      activeTags,
      message: `${tag} activated`
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Remove endpoint tag from active list
 */
app.post('/api/endpoints/:tag/deactivate', (req, res) => {
  try {
    const tag = req.params.tag;
    const activeTags = removeActiveTag(tag);

    // Stop scheduler for this endpoint
    stopEndpointScheduler(tag);

    res.json({
      ok: true,
      tag,
      activeTags,
      message: `${tag} deactivated`
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Setup UI for multi-config with tag selection
app.get('/setup/ui', requireLogin, (_req, res) => {
  res.type('text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Setup Wizard</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
        .navbar { background: linear-gradient(135deg, #0d6efd, #0aa5ff); padding: 16px 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .navbar-content { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .navbar-brand { color: white; font-size: 20px; font-weight: 700; text-decoration: none; }
        .navbar-links { display: flex; gap: 8px; flex-wrap: wrap; }
        .navbar-link { color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; transition: background 0.2s; }
        .navbar-link:hover { background: rgba(255,255,255,0.2); }
        .navbar-link.active { background: rgba(255,255,255,0.3); }
        .main-content { padding: 24px; }
        .container { max-width: 1200px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
        h1 { margin-top: 0; color: #0d6efd; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .full { grid-column: span 2; }
        label { font-weight: 700; display: block; margin-bottom: 6px; }
        input, textarea, select { width: 100%; padding: 10px; border: 1px solid #d8dce3; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
        textarea { min-height: 100px; }
        .section { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 14px; background: #fbfcff; }
        .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
        button { padding: 10px 16px; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; }
        .btn-primary { background: #0d6efd; color: #fff; }
        .btn-success { background: #28a745; color: #fff; }
        .btn-danger { background: #dc3545; color: #fff; }
        .btn-secondary { background: #6c757d; color: #fff; }
        pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; overflow: auto; max-height: 300px; }
        .note { font-size: 12px; color: #666; margin-top: 6px; }
      </style>
    </head>
    <body>
      <nav class="navbar">
        <div class="navbar-content">
          <a href="/" class="navbar-brand">📬 Notification System</a>
          <div class="navbar-links">
            <a href="/setup/ui" class="navbar-link active">🛠️ Setup Wizard</a>
            <a href="/endpoints/ui" class="navbar-link">🔗 Endpoints</a>
            <a href="/logs/ui" class="navbar-link">📋 Logs</a>
            <a href="/auth/logout" class="navbar-link" style="background: rgba(255,255,255,0.1);">🚪 Logout</a>
          </div>
        </div>
      </nav>
      <div class="main-content">
        <div class="container">
          <h1>Setup Wizard - Create New Endpoint</h1>
          
          <div class="section">
            <h3>1. API Configuration</h3>
          <div class="grid">
            <div class="full">
              <label>Config Name/Tag</label>
              <input id="configLabel" placeholder="e.g., prod, staging, test-api" />
            </div>
            <div class="full">
              <label>Endpoint</label>
              <input id="apiEndpoint" />
            </div>
            <div>
              <label>Method</label>
              <select id="apiMethod">
                ${['GET','POST','PUT','PATCH','DELETE'].map(m => `<option>${m}</option>`).join('')}
              </select>
            </div>
            <div>
              <label>Auth Type</label>
              <select id="apiAuthType">
                ${['','bearer','basic'].map(t => `<option value="${t}">${t||'none'}</option>`).join('')}
              </select>
            </div>
            <div>
              <label>Bearer Token</label>
              <input id="apiAuthToken" />
            </div>
            <div>
              <label>Basic Username</label>
              <input id="apiAuthUsername" />
            </div>
            <div>
              <label>Basic Password</label>
              <input id="apiAuthPassword" type="password" />
            </div>
            <div class="full">
              <label>Headers (JSON)</label>
              <textarea id="apiHeaders">{}</textarea>
            </div>
            <div>
              <label>Query Params (JSON)</label>
              <textarea id="apiQuery">{}</textarea>
            </div>
            <div>
              <label>Body (JSON)</label>
              <textarea id="apiBody">{}</textarea>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>2. Mapping Paths</h3>
          <div class="grid">
            <div>
              <label>Items Path</label>
              <input id="mapItemsPath" placeholder="e.g., items or data.results" />
            </div>
            <div>
              <label>ID Path</label>
              <input id="mapIdPath" placeholder="e.g., id or payment_id" />
            </div>
            <div>
              <label>Timestamp Path</label>
              <input id="mapTimestampPath" placeholder="e.g., createdAt" />
            </div>
            <div>
              <label>Title Path (optional)</label>
              <input id="mapTitlePath" />
            </div>
            <div>
              <label>Details Path (optional)</label>
              <input id="mapDetailsPath" />
            </div>
          </div>
        </div>

        <div class="section">
          <h3>3. Notification Settings</h3>
          <div class="grid">
            <div>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" id="enableSms" style="width:auto;" />
                <span>Enable SMS Notifications</span>
              </label>
            </div>
            <div>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" id="enableEmail" style="width:auto;" />
                <span>Enable Email Notifications</span>
              </label>
            </div>
            <div>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" id="enableManualMute" style="width:auto;" />
                <span>Allow Manual Mute Controls</span>
              </label>
            </div>
            <div>
              <label>Check Interval (minutes)</label>
              <input type="number" id="checkIntervalMinutes" min="0.1" step="0.1" placeholder="e.g., 5" />
            </div>
            <div class="full">
              <label>Phone Numbers (comma separated)</label>
              <textarea id="phoneNumbers" placeholder="e.g., +8801711111111, +8801811111111" style="min-height:60px;"></textarea>
            </div>
            <div class="full">
              <label>Email Addresses (comma separated)</label>
              <textarea id="emailAddresses" placeholder="e.g., admin@example.com, alerts@example.com" style="min-height:60px;"></textarea>
            </div>
          </div>
        </div>

        <div class="actions">
          <button class="btn-primary" onclick="saveConfig()">💾 Save Config</button>
          <button class="btn-success" onclick="testFetch()">🧪 Test Fetch</button>
          <button class="btn-success" onclick="testMap()">🗺️ Test Map</button>
          <button class="btn-secondary" onclick="activateConfig()" id="activateBtn" style="display:none;">⭐ Activate</button>
          <button class="btn-danger" onclick="deleteConfig()" id="deleteBtn" style="display:none;">🗑️ Delete</button>
        </div>

        <div class="section">
          <h3>Result</h3>
          <pre id="result">Ready...</pre>
        </div>
        </div>
      </div>

      <script>
        let currentTag = null;
        
        function clearForm() {
          document.getElementById('configLabel').value = '';
          document.getElementById('apiEndpoint').value = '';
          document.getElementById('apiMethod').value = 'GET';
          document.getElementById('apiAuthType').value = '';
          document.getElementById('apiAuthToken').value = '';
          document.getElementById('apiAuthUsername').value = '';
          document.getElementById('apiAuthPassword').value = '';
          document.getElementById('apiHeaders').value = '{}';
          document.getElementById('apiQuery').value = '{}';
          document.getElementById('apiBody').value = '{}';
          document.getElementById('mapItemsPath').value = 'items';
          document.getElementById('mapIdPath').value = 'id';
          document.getElementById('mapTimestampPath').value = 'createdAt';
          document.getElementById('mapTitlePath').value = '';
          document.getElementById('mapDetailsPath').value = '';
          document.getElementById('enableSms').checked = true;
          document.getElementById('enableEmail').checked = true;
          document.getElementById('enableManualMute').checked = true;
          document.getElementById('checkIntervalMinutes').value = '5';
          document.getElementById('phoneNumbers').value = '';
          document.getElementById('emailAddresses').value = '';
        }

        // Auto-clear form on page load
        window.onload = function() {
          clearForm();
        };

        async function saveConfig() {
          const tag = document.getElementById('configLabel').value.trim();
          if (!tag) {
            document.getElementById('result').textContent = 'Error: Config name is required';
            return;
          }

          const parseJSON = (str, fallback = {}) => {
            try {
              return JSON.parse(str || '{}');
            } catch (_e) {
              return fallback;
            }
          };

          const payload = {
            apiEndpoint: document.getElementById('apiEndpoint').value,
            method: document.getElementById('apiMethod').value,
            authType: document.getElementById('apiAuthType').value,
            authToken: document.getElementById('apiAuthToken').value,
            authUsername: document.getElementById('apiAuthUsername').value,
            authPassword: document.getElementById('apiAuthPassword').value,
            headers: parseJSON(document.getElementById('apiHeaders').value),
            query: parseJSON(document.getElementById('apiQuery').value),
            body: parseJSON(document.getElementById('apiBody').value),
            mapItemsPath: document.getElementById('mapItemsPath').value,
            mapIdPath: document.getElementById('mapIdPath').value,
            mapTimestampPath: document.getElementById('mapTimestampPath').value,
            mapTitlePath: document.getElementById('mapTitlePath').value,
            mapDetailsPath: document.getElementById('mapDetailsPath').value,
            enableSms: document.getElementById('enableSms').checked,
            enableEmail: document.getElementById('enableEmail').checked,
            enableManualMute: document.getElementById('enableManualMute').checked,
            checkInterval: parseFloat(document.getElementById('checkIntervalMinutes').value) * 60 * 1000 || 300000,
            phoneNumbers: document.getElementById('phoneNumbers').value.split(',').map(p => p.trim()).filter(Boolean),
            emailAddresses: document.getElementById('emailAddresses').value.split(',').map(e => e.trim()).filter(Boolean)
          };

          try {
            // Use new endpoints API instead of old configs API
            let url = '/api/endpoints' + (currentTag ? '/' + currentTag : '');
            let method = currentTag ? 'PUT' : 'POST';
            
            if (!currentTag) {
              // For new endpoints, we need to send tag in the URL
              url = '/api/endpoints/' + tag;
              method = 'PUT';
            }

            const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.ok) {
              document.getElementById('result').textContent = '✓ Config saved!\\n\\n' + JSON.stringify(json.config || json, null, 2);
              currentTag = tag;
              setTimeout(() => location.reload(), 1500);
            } else {
              document.getElementById('result').textContent = 'Error: ' + json.error;
            }
          } catch (err) {
            document.getElementById('result').textContent = 'Error: ' + err.message;
          }
        }

        async function testFetch() {
          const apiEndpoint = document.getElementById('apiEndpoint').value;
          if (!apiEndpoint) {
            document.getElementById('result').textContent = 'Error: API Endpoint is required';
            return;
          }

          const apiMethod = document.getElementById('apiMethod').value;
          const apiAuthType = document.getElementById('apiAuthType').value;
          const apiAuthToken = document.getElementById('apiAuthToken').value;
          const apiAuthUsername = document.getElementById('apiAuthUsername').value;
          const apiAuthPassword = document.getElementById('apiAuthPassword').value;
          
          const parseJSON = (str) => {
            try { return JSON.parse(str || '{}'); } catch (_) { return {}; }
          };
          
          const apiHeaders = parseJSON(document.getElementById('apiHeaders').value);
          const apiQuery = parseJSON(document.getElementById('apiQuery').value);
          const apiBody = parseJSON(document.getElementById('apiBody').value);

          document.getElementById('result').textContent = 'Testing fetch from ' + apiEndpoint + '...';

          try {
            const payload = {
              apiEndpoint,
              apiMethod,
              apiAuthType,
              apiAuthToken,
              apiAuthUsername,
              apiAuthPassword,
              apiHeaders,
              apiQuery,
              apiBody
            };

            const res = await fetch('/api/test-fetch-custom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            
            const json = await res.json();
            if (json.ok) {
              document.getElementById('result').textContent = 'Response Data:\\n' + JSON.stringify(json.raw || json.data, null, 2);
            } else {
              document.getElementById('result').textContent = 'Fetch Error:\\n' + JSON.stringify(json, null, 2);
            }
          } catch (err) {
            document.getElementById('result').textContent = 'Error: ' + err.message;
          }
        }

        async function testMap() {
          const apiEndpoint = document.getElementById('apiEndpoint').value;
          if (!apiEndpoint) {
            document.getElementById('result').textContent = 'Error: API Endpoint is required';
            return;
          }

          const apiMethod = document.getElementById('apiMethod').value;
          const apiAuthType = document.getElementById('apiAuthType').value;
          const apiAuthToken = document.getElementById('apiAuthToken').value;
          const apiAuthUsername = document.getElementById('apiAuthUsername').value;
          const apiAuthPassword = document.getElementById('apiAuthPassword').value;
          
          const parseJSON = (str) => {
            try { return JSON.parse(str || '{}'); } catch (_) { return {}; }
          };
          
          const apiHeaders = parseJSON(document.getElementById('apiHeaders').value);
          const apiQuery = parseJSON(document.getElementById('apiQuery').value);
          const apiBody = parseJSON(document.getElementById('apiBody').value);
          const mapItemsPath = document.getElementById('mapItemsPath').value;
          const mapIdPath = document.getElementById('mapIdPath').value;
          const mapTimestampPath = document.getElementById('mapTimestampPath').value;
          const mapTitlePath = document.getElementById('mapTitlePath').value;
          const mapDetailsPath = document.getElementById('mapDetailsPath').value;

          document.getElementById('result').textContent = 'Testing map from ' + apiEndpoint + '...';

          try {
            const payload = {
              apiEndpoint,
              apiMethod,
              apiAuthType,
              apiAuthToken,
              apiAuthUsername,
              apiAuthPassword,
              apiHeaders,
              apiQuery,
              apiBody,
              mapItemsPath,
              mapIdPath,
              mapTimestampPath,
              mapTitlePath,
              mapDetailsPath
            };

            const res = await fetch('/api/test-map-custom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            
            const json = await res.json();
            if (json.ok) {
              document.getElementById('result').textContent = 'Mapped Items (' + json.count + '):\\n' + JSON.stringify(json.items, null, 2);
            } else {
              document.getElementById('result').textContent = 'Map Error:\\n' + JSON.stringify(json, null, 2);
            }
          } catch (err) {
            document.getElementById('result').textContent = 'Error: ' + err.message;
          }
        }

        async function activateConfig() {
          if (!currentTag) return;
          try {
            const res = await fetch('/api/configs/' + currentTag + '/activate', { method: 'POST' });
            const json = await res.json();
            if (json.ok) {
              document.getElementById('result').textContent = '✓ Config activated: ' + currentTag;
              document.getElementById('activateBtn').style.display = 'none';
              document.getElementById('activeInfo').textContent = '⭐ This is the active config';
            }
          } catch (err) {
            document.getElementById('result').textContent = 'Error: ' + err.message;
          }
        }

        async function deleteConfig() {
          if (!currentTag || !confirm('Delete config "' + currentTag + '"?')) return;
          try {
            const res = await fetch('/api/configs/' + currentTag, { method: 'DELETE' });
            const json = await res.json();
            if (json.ok) {
              document.getElementById('result').textContent = '✓ Config deleted';
              setTimeout(() => location.reload(), 1000);
            }
          } catch (err) {
            document.getElementById('result').textContent = 'Error: ' + err.message;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// ============================================
// NAMED ENDPOINTS ROUTES
// ============================================

// Get all endpoints
app.get('/api/endpoints', (_req, res) => {
  try {
    const endpoints = getAllEndpoints();
    const activeTag = getActiveTag();
    const tags = getAvailableTags();
    res.json({
      ok: true,
      activeTag,
      tags,
      endpoints,
      count: tags.length
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get specific endpoint config
app.get('/api/endpoints/:tag', (req, res) => {
  try {
    const config = getEndpointConfig(req.params.tag);
    res.json({ ok: true, tag: req.params.tag, config });
  } catch (err) {
    res.status(404).json({ ok: false, error: err.message });
  }
});

// Update endpoint config
app.put('/api/endpoints/:tag', (req, res) => {
  try {
    const updated = updateEndpoint(req.params.tag, req.body || {});
    res.json({ ok: true, tag: req.params.tag, config: updated });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Reset endpoint to defaults
app.post('/api/endpoints/:tag/reset', (req, res) => {
  try {
    const result = resetEndpoint(req.params.tag);

    // Stop scheduler if endpoint was deleted
    if (result.deleted) {
      try {
        stopEndpointScheduler(req.params.tag);
      } catch (err) {
        console.warn(`Could not stop scheduler for ${req.params.tag}: ${err.message}`);
      }

      // Clean up endpoint state from notification-state.json
      removeEndpointState(req.params.tag);

      return res.json({ ok: true, deleted: true, message: result.message });
    }

    res.json({ ok: true, tag: req.params.tag, config: result, message: 'Endpoint reset to defaults' });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Activate an endpoint
app.post('/api/endpoints/:tag/activate', (req, res) => {
  try {
    const tag = setActiveTag(req.params.tag);
    res.json({ ok: true, activeTag: tag, message: 'Endpoint activated' });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Get active endpoint
app.get('/api/endpoints/active/config', (_req, res) => {
  try {
    const config = getActiveEndpoint();
    const tag = getActiveTag();
    res.json({ ok: true, tag, config });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================
// SCHEDULER MANAGEMENT ROUTES
// ============================================

// Get active schedulers
app.get('/api/schedulers', (_req, res) => {
  try {
    const schedulers = getActiveSchedulers();
    const activeTags = getActiveTags();

    // Compare active tags with running schedulers
    const comparison = {
      activeTagsInConfig: activeTags,
      runningSchedulers: schedulers.map(s => s.tag),
      mismatch: {
        shouldRunButNot: activeTags.filter(tag => !schedulers.map(s => s.tag).includes(tag)),
        runningButShouldNot: schedulers.map(s => s.tag).filter(tag => !activeTags.includes(tag))
      }
    };

    res.json({
      ok: true,
      schedulers,
      count: schedulers.length,
      comparison
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Start scheduler for an endpoint
app.post('/api/schedulers/:tag/start', (req, res) => {
  try {
    startEndpointScheduler(req.params.tag);
    res.json({ ok: true, message: `Scheduler started for ${req.params.tag}` });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Stop scheduler for an endpoint
app.post('/api/schedulers/:tag/stop', (req, res) => {
  try {
    const stopped = stopEndpointScheduler(req.params.tag);
    res.json({
      ok: true,
      stopped,
      message: stopped
        ? `Scheduler stopped for ${req.params.tag}`
        : `No active scheduler found for ${req.params.tag}`
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Restart scheduler for an endpoint
app.post('/api/schedulers/:tag/restart', (req, res) => {
  try {
    restartEndpointScheduler(req.params.tag);
    res.json({ ok: true, message: `Scheduler restarted for ${req.params.tag}` });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Cleanup - Stop schedulers that shouldn't be running
app.post('/api/schedulers/cleanup', (req, res) => {
  try {
    const schedulers = getActiveSchedulers();
    const activeTags = getActiveTags();
    const runningTags = schedulers.map(s => s.tag);

    // Find schedulers that are running but not in active tags
    const shouldStop = runningTags.filter(tag => !activeTags.includes(tag));

    if (shouldStop.length === 0) {
      return res.json({
        ok: true,
        message: 'No cleanup needed - all schedulers match active configuration',
        stopped: []
      });
    }

    // Stop each scheduler that shouldn't be running
    const stopped = [];
    shouldStop.forEach(tag => {
      const result = stopEndpointScheduler(tag);
      if (result) {
        stopped.push(tag);
      }
    });

    res.json({
      ok: true,
      message: `Stopped ${stopped.length} scheduler(s)`,
      stopped
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Named Endpoints UI Page
app.get('/endpoints/ui', requireLogin, (_req, res) => {
  try {
    const endpoints = getAllEndpoints();
    const activeTags = getActiveTags();
    const tags = getAvailableTags();

    let endpointsHtml = '';

    if (tags.length === 0) {
      endpointsHtml = `
        <div style="text-align:center; padding:60px 20px; background:white; border-radius:12px; border:2px dashed #e5e7eb;">
          <h2 style="color:#6c757d; margin-bottom:12px;">📝 No Endpoints Configured</h2>
          <p style="color:#9ca3af; margin-bottom:20px;">Create your first API endpoint configuration using the Setup Wizard</p>
          <a href="/setup/ui" style="display:inline-block; padding:12px 24px; background:#0d6efd; color:white; text-decoration:none; border-radius:8px; font-weight:700;">
            ➕ Create First Endpoint
          </a>
        </div>
      `;
    } else {
      endpointsHtml = tags.map(tag => {
        const cfg = endpoints[tag];
        const isActive = activeTags.includes(tag);
        return `
          <div class="endpoint-card ${isActive ? 'active' : ''}">
            <div class="endpoint-header">
              <div style="display:flex; align-items:center; gap:12px; flex:1;">
                <input type="checkbox" id="cb-${tag}" ${isActive ? 'checked' : ''} onchange="toggleEndpoint('${tag}')" style="width:20px; height:20px; cursor:pointer;">
                <h3>${tag}</h3>
              </div>
              ${isActive ? '<span class="badge-active">🟢 Running</span>' : '<span class="badge-inactive">⚫ Stopped</span>'}
            </div>
            <div class="endpoint-info">
              <p><strong>API:</strong> ${cfg.apiEndpoint || 'Not set'}</p>
              <p><strong>SMS:</strong> ${cfg.enableSms ? '✓ On' : '✗ Off'} | <strong>Email:</strong> ${cfg.enableEmail ? '✓ On' : '✗ Off'}</p>
              <p><strong>Interval:</strong> ${((cfg.checkInterval || 0) / (60 * 1000)).toFixed(1)} min | <strong>Mute:</strong> ${cfg.enableManualMute ? '✓ Allowed' : '✗ Blocked'}</p>
            </div>
            <div class="endpoint-actions">
              <button class="btn-edit" onclick="editEndpoint('${tag}')">Edit</button>
              <button class="btn-reset" onclick="resetEndpoint('${tag}')">Delete</button>
            </div>
          </div>
        `;
      }).join('');
    }

    res.type('text/html').send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Named Endpoints Manager</title>
        <style>
          :root {
            --bg: #f4f6fb;
            --card: #ffffff;
            --primary: #0d6efd;
            --accent: #0bb37b;
            --danger: #dc3545;
            --muted: #6c757d;
            --border: #e5e7eb;
            --shadow: 0 10px 30px rgba(0,0,0,0.08);
          }
          
          * { box-sizing: border-box; }
          body {
            font-family: "Segoe UI", Arial, sans-serif;
            background: var(--bg);
            margin: 0;
            padding: 0;
            color: #1f2937;
          }
          
          .navbar { background: linear-gradient(135deg, #0d6efd, #0aa5ff); padding: 16px 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
          .navbar-content { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
          .navbar-brand { color: white; font-size: 20px; font-weight: 700; text-decoration: none; }
          .navbar-links { display: flex; gap: 8px; flex-wrap: wrap; }
          .navbar-link { color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; transition: background 0.2s; }
          .navbar-link:hover { background: rgba(255,255,255,0.2); }
          .navbar-link.active { background: rgba(255,255,255,0.3); }
          .main-content { padding: 24px; }
          
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          
          .header {
            background: var(--card);
            padding: 28px;
            border-radius: 16px;
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
          }
          
          .header h1 {
            margin: 0;
            color: var(--primary);
            font-size: 28px;
          }
          
          .header p {
            color: var(--muted);
            margin: 8px 0 0 0;
          }
          
          .endpoints-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }
          
          .endpoint-card {
            background: var(--card);
            border: 2px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
            transition: all 0.2s ease;
          }
          
          .endpoint-card:hover {
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
            transform: translateY(-2px);
          }
          
          .endpoint-card.active {
            border-color: var(--primary);
            background: linear-gradient(135deg, rgba(13,110,253,0.02), rgba(11,179,123,0.02));
          }
          
          .endpoint-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          
          .endpoint-header h3 {
            margin: 0;
            color: var(--primary);
            font-size: 18px;
          }
          
          .badge-active {
            background: #d1f2e5;
            color: #0f5132;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
          }
          
          .badge-inactive {
            background: #f3f4f6;
            color: #6b7280;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
          }
          
          .endpoint-info {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 12px;
          }
          
          .endpoint-info p {
            margin: 6px 0;
            font-size: 13px;
            color: #555;
          }
          
          .endpoint-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          
          button {
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s;
          }
          
          .btn-edit {
            background: var(--primary);
            color: white;
            flex: 1;
          }
          
          .btn-edit:hover { background: #0aa5ff; }
          
          .btn-activate {
            background: var(--accent);
            color: white;
            flex: 1;
          }
          
          .btn-activate:hover { background: #09a75a; }
          
          .btn-reset {
            background: #e5e7eb;
            color: #374151;
          }
          
          .btn-reset:hover { background: #d1d5db; }
          
          .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
          }
          
          .modal.active {
            display: flex;
          }
          
          .modal-content {
            background: var(--card);
            padding: 28px;
            border-radius: 12px;
            width: 90%;
            max-width: 700px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          
          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }
          
          .modal-header h2 {
            margin: 0;
            color: var(--primary);
          }
          
          .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--muted);
          }
          
          .form-group {
            margin-bottom: 14px;
          }
          
          .form-group label {
            display: block;
            font-weight: 700;
            margin-bottom: 6px;
            color: #111827;
          }
          
          .form-group input,
          .form-group textarea,
          .form-group select {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
          }
          
          .form-group textarea {
            min-height: 80px;
            resize: vertical;
          }
          
          .form-group input:focus,
          .form-group textarea:focus,
          .form-group select:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(13,110,253,0.12);
          }
          
          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          
          .modal-actions {
            display: flex;
            gap: 12px;
            margin-top: 20px;
          }
          
          .btn-save {
            flex: 1;
            padding: 12px;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
          }
          
          .btn-save:hover { background: #0aa5ff; }
          
          .btn-cancel {
            flex: 1;
            padding: 12px;
            background: #e5e7eb;
            color: #374151;
            border: none;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
          }
          
          .btn-cancel:hover { background: #d1d5db; }
          
          .status {
            margin-top: 12px;
            padding: 12px;
            border-radius: 8px;
            display: none;
          }
          
          .status.ok {
            background: #d1f2e5;
            color: #0f5132;
            border: 1px solid #b3e6cf;
          }
          
          .status.err {
            background: #fde2e1;
            color: #7f1d1d;
            border: 1px solid #f5c2c7;
          }
        </style>
      </head>
      <body>
        <nav class="navbar">
          <div class="navbar-content">
            <a href="/" class="navbar-brand">📬 Notification System</a>
            <div class="navbar-links">
              <a href="/setup/ui" class="navbar-link">🛠️ Setup Wizard</a>
              <a href="/endpoints/ui" class="navbar-link active">🔗 Endpoints</a>
              <a href="/logs/ui" class="navbar-link">📋 Logs</a>
              <a href="/auth/logout" class="navbar-link" style="background: rgba(255,255,255,0.1);">🚪 Logout</a>
            </div>
          </div>
        </nav>
        <div class="main-content">
          <div class="container">
          <div class="header">
            <div>
              <h1>Named Endpoints Manager</h1>
              <p>Manage multiple API endpoints with separate SMS, Email, and Interval settings</p>
            </div>
            <div>
              <a href="/setup/ui" style="display:inline-block; padding:10px 20px; background:#0d6efd; color:white; text-decoration:none; border-radius:8px; font-weight:700; transition: all 0.2s;">
                ➕ Create New Endpoint
              </a>
            </div>
          </div>
          
          <div class="endpoints-grid" id="endpointsGrid">
            ${endpointsHtml}
          </div>
          </div>
        </div>
        
        <!-- Edit Modal -->
        <div id="editModal" class="modal">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Edit Endpoint: <span id="modalTag"></span></h2>
              <button class="close-btn" onclick="closeModal()">×</button>
            </div>
            
            <form onsubmit="saveEndpoint(event)">
              <div class="form-group">
                <label>API Endpoint</label>
                <input type="text" id="editApiEndpoint" readonly style="background-color: #f0f0f0; cursor: not-allowed;" />
                <small style="color: #999; font-size: 12px; margin-top: 4px; display: block;">⚠️ Read-only: Cannot be changed after endpoint creation</small>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label>Method</label>
                  <select id="editMethod" disabled style="background-color: #f0f0f0; cursor: not-allowed;">
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>PATCH</option>
                    <option>DELETE</option>
                  </select>
                  <small style="color: #999; font-size: 12px; margin-top: 4px; display: block;">⚠️ Read-only: Cannot be changed after endpoint creation</small>
                </div>
                <div class="form-group">
                  <label>Check Interval (minutes)</label>
                  <input type="number" id="editCheckInterval" min="0.1" step="0.1" />
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                    <input type="checkbox" id="editEnableSms" style="width:auto;" />
                    <span>Enable SMS</span>
                  </label>
                </div>
                <div class="form-group">
                  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                    <input type="checkbox" id="editEnableEmail" style="width:auto;" />
                    <span>Enable Email</span>
                  </label>
                </div>
              </div>
              
              <div class="form-group">
                <label>Phone Numbers (comma separated)</label>
                <textarea id="editPhoneNumbers" placeholder="e.g., +8801711111111, +8801811111111"></textarea>
              </div>
              
              <div class="form-group">
                <label>Email Addresses (comma separated)</label>
                <textarea id="editEmailAddresses" placeholder="e.g., admin@example.com, alerts@example.com"></textarea>
              </div>
              
              <div class="form-group">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input type="checkbox" id="editEnableManualMute" style="width:auto;" />
                  <span>Allow Manual Mute</span>
                </label>
              </div>
              
              <div id="modalStatus" class="status"></div>
              
              <div class="modal-actions">
                <button type="submit" class="btn-save">💾 Save Changes</button>
                <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
              </div>
            </form>
          </div>
        </div>
        
        <script>
          let currentEditTag = null;
          
          async function editEndpoint(tag) {
            currentEditTag = tag;
            document.getElementById('modalTag').textContent = tag;
            
            try {
              const res = await fetch('/api/endpoints/' + tag);
              const json = await res.json();
              if (json.ok) {
                const cfg = json.config;
                document.getElementById('editApiEndpoint').value = cfg.apiEndpoint || '';
                document.getElementById('editMethod').value = cfg.method || 'GET';
                document.getElementById('editCheckInterval').value = (cfg.checkInterval || 0) / (60 * 1000) || '';
                document.getElementById('editEnableSms').checked = cfg.enableSms !== false;
                document.getElementById('editEnableEmail').checked = cfg.enableEmail !== false;
                document.getElementById('editEnableManualMute').checked = cfg.enableManualMute !== false;
                document.getElementById('editPhoneNumbers').value = Array.isArray(cfg.phoneNumbers) ? cfg.phoneNumbers.join(', ') : (cfg.phoneNumbers || '');
                document.getElementById('editEmailAddresses').value = Array.isArray(cfg.emailAddresses) ? cfg.emailAddresses.join(', ') : (cfg.emailAddresses || '');
                
                document.getElementById('editModal').classList.add('active');
              }
            } catch (err) {
              alert('Error loading endpoint: ' + err.message);
            }
          }
          
          function closeModal() {
            document.getElementById('editModal').classList.remove('active');
            document.getElementById('modalStatus').style.display = 'none';
            currentEditTag = null;
          }
          
          async function saveEndpoint(event) {
            event.preventDefault();
            
            const updates = {
              apiEndpoint: document.getElementById('editApiEndpoint').value,
              method: document.getElementById('editMethod').value,
              checkInterval: parseFloat(document.getElementById('editCheckInterval').value) * 60 * 1000 || 300000,
              enableSms: document.getElementById('editEnableSms').checked,
              enableEmail: document.getElementById('editEnableEmail').checked,
              enableManualMute: document.getElementById('editEnableManualMute').checked,
              phoneNumbers: document.getElementById('editPhoneNumbers').value.split(',').map(p => p.trim()).filter(Boolean),
              emailAddresses: document.getElementById('editEmailAddresses').value.split(',').map(e => e.trim()).filter(Boolean)
            };
            
            const statusEl = document.getElementById('modalStatus');
            statusEl.style.display = 'block';
            statusEl.className = 'status';
            statusEl.textContent = 'Saving...';
            
            try {
              const res = await fetch('/api/endpoints/' + currentEditTag, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
              });
              const json = await res.json();
              
              if (json.ok) {
                statusEl.classList.add('ok');
                statusEl.textContent = '✓ Endpoint updated successfully!';
                setTimeout(() => location.reload(), 1500);
              } else {
                statusEl.classList.add('err');
                statusEl.textContent = '✗ Error: ' + json.error;
              }
            } catch (err) {
              statusEl.classList.add('err');
              statusEl.textContent = '✗ Error: ' + err.message;
            }
          }
          
          async function toggleEndpoint(tag) {
            try {
              const res = await fetch('/api/endpoints/' + tag + '/toggle-active', { method: 'POST' });
              const json = await res.json();
              
              if (json.ok) {
                console.log('✓ Toggled endpoint: ' + json.message);
                location.reload();
              } else {
                alert('✗ Error: ' + json.error);
              }
            } catch (err) {
              alert('✗ Error: ' + err.message);
            }
          }
          
          async function resetEndpoint(tag) {
            if (!confirm('Reset endpoint to defaults: ' + tag + '?')) return;
            
            try {
              const res = await fetch('/api/endpoints/' + tag + '/reset', { method: 'POST' });
              const json = await res.json();
              
              if (json.ok) {
                alert('✓ Endpoint reset to defaults');
                location.reload();
              } else {
                alert('✗ Error: ' + json.error);
              }
            } catch (err) {
              alert('✗ Error: ' + err.message);
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

app.listen(CONTROL_SERVER_PORT, '0.0.0.0', () => {
  const env = consoleLog.getEnvironment();
  consoleLog.startup(`Control Server [${env.mode} Mode]`);
  consoleLog.info(`Server: http://0.0.0.0:${CONTROL_SERVER_PORT}`, 'SERVER', true);
  consoleLog.info(`Access: http://localhost:${CONTROL_SERVER_PORT}`, 'SERVER', true);
  consoleLog.section('Available Endpoints');
  consoleLog.info(`Setup Wizard: http://localhost:${CONTROL_SERVER_PORT}/setup/ui`, 'SERVER', true);
  consoleLog.info(`Logs: http://localhost:${CONTROL_SERVER_PORT}/logs/ui`, 'SERVER', true);
  consoleLog.info(`Endpoints: http://localhost:${CONTROL_SERVER_PORT}/endpoints/ui`, 'SERVER', true);
});
