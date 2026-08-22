#!/usr/bin/env node
/**
 * Kitchen Memory — local desktop web server.
 *
 * Zero npm dependencies on purpose (only Node's built-in modules) so the
 * downloadable web-app package works with nothing but Node installed.
 *
 * Responsibilities:
 *   1. Serve the static web build (../dist-web) with SPA fallback so
 *      client-side routes (e.g. /scan, /(tabs)/home) work on a full
 *      page load, not just client-side navigation.
 *   2. Provide a tiny "phone upload" relay so a kitchen-tour video
 *      recorded on a phone can be sent to the computer's browser session
 *      over the local WiFi network — see docs/phone-upload.md.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT) || 3131;
const DIST_DIR = path.join(__dirname, '..', 'dist-web');
const UPLOAD_MAX_BYTES = 500 * 1024 * 1024; // 500MB safety cap
const UPLOAD_TTL_MS = 10 * 60 * 1000; // purge unclaimed uploads after 10 min

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/** token -> { buffer, contentType, receivedAt } */
const pendingUploads = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of pendingUploads) {
    if (now - entry.receivedAt > UPLOAD_TTL_MS) pendingUploads.delete(token);
  }
}, 60 * 1000).unref();

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readRawBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Upload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function phoneUploadPageHtml(token) {
  // Deliberately dependency-free, inline-styled to loosely match the app's
  // warm/cream design language, and self-contained (no build step).
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title>Send video — Kitchen Memory</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: #FBF7F2; color: #211D19; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 24px; text-align: center;
  }
  h1 { font-size: 24px; margin: 0 0 8px; }
  p { font-size: 16px; color: #5C5147; margin: 0 0 28px; max-width: 320px; }
  label.picker {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    background: #D66B3E; color: #FFFDFA; font-weight: 700; font-size: 17px;
    padding: 16px 28px; border-radius: 999px; cursor: pointer; width: 100%; max-width: 320px;
  }
  input[type=file] { display: none; }
  #status { margin-top: 24px; font-size: 15px; color: #5C7A5E; font-weight: 600; min-height: 20px; }
  #status.error { color: #C24339; }
  .spinner {
    width: 20px; height: 20px; border: 3px solid #E8DECE; border-top-color: #D66B3E; border-radius: 50%;
    display: inline-block; vertical-align: middle; margin-right: 8px; animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
  <h1>🧠🍲 Send your kitchen video</h1>
  <p>Record a new video or pick one from your camera roll. It'll appear on your computer automatically.</p>
  <label class="picker" id="pickerLabel">
    Choose or Record Video
    <input type="file" id="fileInput" accept="video/*" capture="environment" />
  </label>
  <div id="status"></div>

  <script>
    var token = ${JSON.stringify(token)};
    var input = document.getElementById('fileInput');
    var status = document.getElementById('status');
    var pickerLabel = document.getElementById('pickerLabel');

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      pickerLabel.style.opacity = '0.5';
      pickerLabel.style.pointerEvents = 'none';
      status.className = '';
      status.innerHTML = '<span class="spinner"></span>Sending to your computer…';

      fetch('/api/phone-upload/' + encodeURIComponent(token), {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'video/mp4' },
        body: file,
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Upload failed (' + res.status + ')');
          status.textContent = '✓ Sent! You can close this tab.';
        })
        .catch(function (err) {
          status.className = 'error';
          status.textContent = 'Something went wrong — try again. (' + err.message + ')';
          pickerLabel.style.opacity = '1';
          pickerLabel.style.pointerEvents = 'auto';
        });
    });
  </script>
</body>
</html>`;
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(DIST_DIR, decodeURIComponent(pathname));

  // SPA fallback: any extensionless route (client-side page) gets index.html.
  const hasExtension = path.extname(filePath) !== '';
  if (!hasExtension) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fall back to index.html for anything unresolved (e.g. deep client routes).
      fs.readFile(path.join(DIST_DIR, 'index.html'), (fallbackErr, fallbackData) => {
        if (fallbackErr) {
          res.writeHead(404);
          res.end('Not found. Did you run "npm run build:web" first?');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
        res.end(fallbackData);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  try {
    if (pathname === '/api/local-info' && req.method === 'GET') {
      sendJson(res, 200, { ip: getLanIp(), port: PORT });
      return;
    }

    const uploadMatch = pathname.match(/^\/api\/phone-upload\/([a-zA-Z0-9_-]+)(\/status)?$/);
    if (uploadMatch) {
      const token = uploadMatch[1];
      const isStatus = Boolean(uploadMatch[2]);

      if (isStatus && req.method === 'GET') {
        sendJson(res, 200, { ready: pendingUploads.has(token) });
        return;
      }

      if (!isStatus && req.method === 'POST') {
        const buffer = await readRawBody(req, UPLOAD_MAX_BYTES);
        pendingUploads.set(token, {
          buffer,
          contentType: req.headers['content-type'] || 'video/mp4',
          receivedAt: Date.now(),
        });
        sendJson(res, 200, { ok: true });
        return;
      }

      if (!isStatus && req.method === 'GET') {
        const entry = pendingUploads.get(token);
        if (!entry) {
          res.writeHead(404);
          res.end();
          return;
        }
        pendingUploads.delete(token); // single-use
        res.writeHead(200, { 'Content-Type': entry.contentType, 'Content-Length': entry.buffer.length });
        res.end(entry.buffer);
        return;
      }
    }

    const phonePageMatch = pathname.match(/^\/phone-upload\/([a-zA-Z0-9_-]+)$/);
    if (phonePageMatch && req.method === 'GET') {
      const html = phoneUploadPageHtml(phonePageMatch[1]);
      res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
      res.end(html);
      return;
    }

    if (req.method === 'GET') {
      serveStatic(req, res, pathname);
      return;
    }

    res.writeHead(405);
    res.end();
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLanIp();
  console.log('');
  console.log('  Kitchen Memory is running:');
  console.log('  On this computer:  http://localhost:' + PORT);
  console.log('  On your phone (same WiFi): http://' + ip + ':' + PORT);
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
