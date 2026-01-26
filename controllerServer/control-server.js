const express = require('express');
const fs = require('fs');
const path = require('path');
const { CONTROL_SERVER_PORT } = require('./config');
const { getConfig, setConfig } = require('./config-store');
const { logMuteAction, logUnmuteAction, getLogs, getLogsJSON, clearLogs } = require('./logger');

const app = express();
const stateFile = path.join(__dirname, 'notification-state.json');

app.use(express.json());

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading state file:', err.message);
  }
  return {
    mutePayment: false,
    muteApi: false,
    lastApiStatus: 'success',
    lastFailureMessage: '',
    processedPaymentIds: []
  };
}

function saveState(state) {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Error saving state file:', err.message);
  }
}

app.get('/config', (_req, res) => {
  res.json(getConfig());
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
      enableManualMute
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
      ENABLE_MANUAL_MUTE: enableManualMute
    });

    res.json({ ok: true, config: updated });
  } catch (err) {
    console.error('Error updating config:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/config/ui', (_req, res) => {
  const config = getConfig();
  const checkIntervalMinutes = (config.CHECK_INTERVAL || 0) / 60000;
  res.type('text/html').send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Notification Settings</title>
      <style>
        :root {
          --bg: #f4f6fb;
          --card: #ffffff;
          --primary: #0d6efd;
          --accent: #0bb37b;
          --muted: #6c757d;
          --border: #e5e7eb;
          --shadow: 0 10px 30px rgba(0,0,0,0.08);
        }
        body { font-family: "Segoe UI", Arial, sans-serif; background: radial-gradient(circle at 10% 20%, #f1f5ff 0, transparent 25%), radial-gradient(circle at 90% 10%, #e8fff3 0, transparent 20%), var(--bg); margin: 0; padding: 24px; color: #1f2937; }
        .container { max-width: 860px; margin: 0 auto; background: var(--card); padding: 28px; border-radius: 16px; box-shadow: var(--shadow); border: 1px solid var(--border); }
        header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
        h1 { margin: 0; color: var(--primary); font-size: 24px; letter-spacing: -0.3px; }
        .pill { padding: 6px 12px; border-radius: 999px; background: #e9f5ff; color: #0b5ed7; font-weight: 600; font-size: 13px; }
        .lead { margin: 10px 0 20px; color: var(--muted); }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .full { grid-column: span 2; }
        .section { border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; background: #fbfcff; margin-bottom: 14px; box-shadow: 0 6px 16px rgba(0,0,0,0.04); }
        .section h3 { margin: 0 0 6px 0; color: var(--primary); font-size: 16px; letter-spacing: -0.2px; }
        .toggle { display: flex; align-items: center; gap: 12px; font-weight: 700; color: #111827; cursor: pointer; user-select: none; }
        .toggle input[type=checkbox] { width: 20px; height: 20px; cursor: pointer; accent-color: var(--primary); margin: 0; }
        .toggle label { cursor: pointer; margin: 0; }
        label { font-weight: 700; color: #111827; display: block; margin-bottom: 6px; }
        input, textarea { width: 100%; padding: 12px; border: 1px solid #d8dce3; border-radius: 10px; font-size: 14px; box-sizing: border-box; background: #fff; transition: border-color 0.15s, box-shadow 0.15s; }
        input:focus, textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(13,110,253,0.12); }
        textarea { min-height: 90px; resize: vertical; }
        button { margin-top: 12px; width: 100%; padding: 14px; background: linear-gradient(135deg, #0d6efd, #0aa5ff); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 10px 20px rgba(13,110,253,0.25); transition: transform 0.08s ease, box-shadow 0.1s ease; }
        button:hover { transform: translateY(-1px); box-shadow: 0 12px 24px rgba(13,110,253,0.28); }
        button:active { transform: translateY(0); box-shadow: 0 10px 18px rgba(13,110,253,0.2); }
        .note { margin-top: 8px; color: var(--muted); font-size: 13px; }
        .status { margin-top: 14px; padding: 12px; border-radius: 10px; display: none; font-weight: 600; }
        .status.ok { background: #d1f2e5; color: #0f5132; border: 1px solid #b3e6cf; }
        .status.err { background: #fde2e1; color: #7f1d1d; border: 1px solid #f5c2c7; }
        .hidden { display: none; }
        .badge-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .badge { padding: 6px 10px; border-radius: 999px; background: #eef2f7; color: #374151; font-size: 12px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>Notification Settings</h1>
          <span class="pill">Live config</span>
        </header>
        <p class="lead">Control which channels send alerts, who receives them, and when manual mute is allowed. Changes apply immediately for new notifications.</p>

        <div class="badge-row" style="margin-bottom:14px;">
          <div class="badge">SMS: ${config.ENABLE_SMS ? 'On' : 'Off'}</div>
          <div class="badge">Email: ${config.ENABLE_EMAIL ? 'On' : 'Off'}</div>
          <div class="badge">Manual mute: ${config.ENABLE_MANUAL_MUTE ? 'Allowed' : 'Blocked'}</div>
        </div>

        <div class="section full">
          <label class="toggle">
            <input id="enableSms" type="checkbox" ${config.ENABLE_SMS ? 'checked' : ''} onchange="toggleSection('smsSection', this.checked)" />
            <span>Send SMS alerts</span>
          </label>
          <div id="smsSection" class="grid ${config.ENABLE_SMS ? '' : 'hidden'}" style="margin-top:12px;">
            <div class="full">
              <label for="phoneNumbers">Phone Numbers (comma separated)</label>
              <textarea id="phoneNumbers">${(config.PHONE_NUMBERS || []).join(', ')}</textarea>
            </div>
          </div>
        </div>

        <div class="section full">
          <label class="toggle">
            <input id="enableEmail" type="checkbox" ${config.ENABLE_EMAIL ? 'checked' : ''} onchange="toggleSection('emailSection', this.checked)" />
            <span>Send email alerts</span>
          </label>
          <div id="emailSection" class="grid ${config.ENABLE_EMAIL ? '' : 'hidden'}" style="margin-top:12px;">
            <div class="full">
              <label for="emailAddresses">Email Addresses (comma separated)</label>
              <textarea id="emailAddresses">${(config.EMAIL_ADDRESSES || []).join(', ')}</textarea>
            </div>
          </div>
        </div>

        <div class="section full">
          <label class="toggle">
            <input id="enableManualMute" type="checkbox" ${config.ENABLE_MANUAL_MUTE ? 'checked' : ''} />
            <span>Allow manual mute controls</span>
          </label>
          <div class="note">When on, mute buttons/links appear in emails and the mute UI stays accessible.</div>
        </div>

        <div class="section full">
          <div class="grid">
            <div>
              <label for="checkIntervalMinutes">Check Interval (minutes)</label>
              <input id="checkIntervalMinutes" type="number" min="0.1" step="0.1" value="${checkIntervalMinutes || ''}" />
              <div class="note">Takes effect after restarting the scheduler process.</div>
            </div>
          </div>
        </div>

        <button onclick="saveConfig()">Save Settings</button>
        <div id="status" class="status"></div>
        <div class="note">Phone and email lists use commas to separate entries. Endpoints must be reachable from this server.</div>
      </div>
      <script>
        function toggleSection(id, on) {
          const el = document.getElementById(id);
          if (!el) return;
          el.classList.toggle('hidden', !on);
        }

        async function saveConfig() {
          const payload = {
            phoneNumbers: document.getElementById('phoneNumbers').value,
            emailAddresses: document.getElementById('emailAddresses').value,
            checkIntervalMinutes: document.getElementById('checkIntervalMinutes').value,
            enableSms: document.getElementById('enableSms').checked,
            enableEmail: document.getElementById('enableEmail').checked,
            enableManualMute: document.getElementById('enableManualMute').checked
          };

          const statusEl = document.getElementById('status');
          statusEl.style.display = 'block';
          statusEl.className = 'status';
          statusEl.textContent = 'Saving...';

          try {
            const res = await fetch('/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.ok) {
              statusEl.classList.add('ok');
              statusEl.textContent = 'Saved! New settings will be used for upcoming notifications.';
            } else {
              statusEl.classList.add('err');
              statusEl.textContent = json.error || 'Failed to save settings.';
            }
          } catch (err) {
            statusEl.classList.add('err');
            statusEl.textContent = err.message || 'Failed to save settings.';
          }
        }
      </script>
    </body>
    </html>
  `);
});

app.get('/state', (_req, res) => {
  res.json(loadState());
});

app.get('/mute/payment/ui', (_req, res) => {
  const config = getConfig();
  if (!config.ENABLE_MANUAL_MUTE) {
    res.type('text/html').send(`
      <!DOCTYPE html>
      <html><body style="font-family:Arial,sans-serif;padding:24px;">
        <h2 style="color:#d9534f;">Manual mute is disabled</h2>
        <p style="color:#555;">Turn it on from the settings page to use payment mute controls.</p>
        <a href="/config/ui">Go to Settings</a>
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
      <title>Mute Payment Alerts</title>
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
        <h1>Mute Payment Alerts</h1>
        <p>Select how long you want to pause payment notifications.</p>
        <div class="field">
          <label for="minutes">Duration (minutes)</label>
          <input id="minutes" type="number" min="1" max="720" value="30" />
        </div>
        <button onclick="mute()">Mute Alerts</button>
        <div id="timer" class="timer"></div>
        <div class="info">Alerts will auto-resume when time expires or a new payment is detected.</div>
      </div>
      <script>
        async function mute() {
          const minutes = parseInt(document.getElementById('minutes').value) || 30;
          const res = await fetch('/mute/payment?minutes=' + minutes);
          const text = await res.text();
          document.body.innerHTML = text;
        }
      </script>
    </body>
    </html>
  `);
});

app.get('/mute/payment', (_req, res) => {
  const config = getConfig();
  if (!config.ENABLE_MANUAL_MUTE) {
    res.type('text/html').send(`
      <!DOCTYPE html>
      <html><body style="font-family:Arial,sans-serif;padding:24px;">
        <h2 style="color:#d9534f;">Manual mute is disabled</h2>
        <p style="color:#555;">Enable manual mute from settings to use this action.</p>
        <a href="/config/ui">Go to Settings</a>
      </body></html>
    `);
    return;
  }
  const minutes = parseInt(_req.query.minutes) || 30; // Default 30 minutes
  const state = loadState();
  const muteUntil = new Date(Date.now() + minutes * 60 * 1000);
  state.mutePayment = true;
  state.mutePaymentUntil = muteUntil.toISOString();
  saveState(state);
  logMuteAction(`payment (${minutes} minutes)`);
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
        <h1>✓ Payment Alerts Muted</h1>
        <p class="success">Payment notifications have been muted!</p>
        <div class="info">
          <strong>Mute Duration:</strong> ${minutes} minute${minutes > 1 ? 's' : ''}<br>
          <strong>Will resume:</strong> ${muteUntil.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}<br>
          <div class="timer" id="timer">Loading...</div>
        </div>
        <div class="controls">
          <a class="back-link" href="/mute/payment/ui">Set a different duration</a>
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
        <p style="color:#555;">Enable manual mute from settings to mute API alerts manually.</p>
        <a href="/config/ui">Go to Settings</a>
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

app.get('/logs/ui', (_req, res) => {
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
        body { font-family: "Segoe UI", Arial, sans-serif; background: var(--bg); margin: 0; padding: 24px; color: #1f2937; }
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
        .empty { text-align: center; padding: 40px; color: var(--muted); }
        .stats { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .stat { background: #f8f9fa; padding: 12px 16px; border-radius: 8px; border-left: 4px solid var(--primary); }
        .stat-label { font-size: 12px; color: var(--muted); }
        .stat-value { font-size: 20px; font-weight: 700; color: #111827; }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>Notification Logs</h1>
          <div class="controls">
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
        <div class="stats" id="stats"></div>
        <div id="logsContainer"></div>
      </div>
      <script>
        async function loadLogs() {
          const type = document.getElementById('typeFilter').value;
          const lines = document.getElementById('linesLimit').value;
          const url = '/api/logs?lines=' + lines + (type ? '&type=' + type : '');
          
          try {
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.ok) {
              displayStats(data.logs);
              displayLogs(data.logs);
            }
          } catch (err) {
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
            document.getElementById('logsContainer').innerHTML = '<div class="empty">No logs found</div>';
            return;
          }
          
          const rows = logs.reverse().map(log => 
            '<tr>' +
              '<td>' + log.timestamp + '</td>' +
              '<td><span class="badge badge-' + log.type.toLowerCase().replace(/-/g, '') + '">' + log.type + '</span></td>' +
              '<td>' + log.message + '</td>' +
            '</tr>'
          ).join('');
          
          const html = 
            '<table class="log-table">' +
              '<thead>' +
                '<tr>' +
                  '<th>Timestamp</th>' +
                  '<th>Type</th>' +
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

        window.onload = loadLogs;
      </script>
    </body>
    </html>
  `);
});

app.get('/logs', (_req, res) => {
  res.type('text/plain');
  res.send(getLogs(100));
});

app.listen(CONTROL_SERVER_PORT, '0.0.0.0', () => {
  console.log(`Control server running on http://0.0.0.0:${CONTROL_SERVER_PORT}`);
  console.log(`Access at: http://localhost:${CONTROL_SERVER_PORT}`);
});
