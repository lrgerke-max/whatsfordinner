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

// Only real video types are accepted and replayed — never HTML, which would
// let a crafted upload execute in the app's origin when fetched back.
const ALLOWED_UPLOAD_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const SECURITY_HEADERS = { 'X-Content-Type-Options': 'nosniff' };

function safeContentType(raw) {
  const base = String(raw || '').split(';')[0].trim().toLowerCase();
  return ALLOWED_UPLOAD_TYPES.has(base) ? base : null;
}

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
/** token -> { text, receivedAt } — shopping lists shared to a phone */
const sharedLists = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of pendingUploads) {
    if (now - entry.receivedAt > UPLOAD_TTL_MS) pendingUploads.delete(token);
  }
  for (const [token, entry] of sharedLists) {
    if (now - entry.receivedAt > UPLOAD_TTL_MS) sharedLists.delete(token);
  }
}, 60 * 1000).unref();

function shoppingListPageHtml(token) {
  // Self-contained mobile page showing the shared list; no build step.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Shopping list — Kitchen Memory</title>
<style>
  body { margin: 0; background: #FBF7F2; color: #211D19; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #5C5147; font-size: 14px; margin: 0 0 16px; white-space: pre-line; }
  ul { list-style: none; padding: 0; margin: 0; max-width: 480px; }
  li { padding: 12px 4px; border-bottom: 1px solid #E8DECE; font-size: 17px; line-height: 1.35; display: flex; justify-content: space-between; gap: 12px; }
  li .qty { color: #5C5147; flex-shrink: 0; }
  li.done { opacity: 0.45; text-decoration: line-through; }
  footer { margin-top: 24px; color: #9A8E80; font-size: 13px; }
</style>
</head>
<body>
  <h1>🛒 Shopping list</h1>
  <div class="meta" id="meta"></div>
  <ul id="list"></ul>
  <footer>Sent from Kitchen Memory on your computer.</footer>
  <script>
    fetch('/api/shopping-list/${token}')
      .then(function (r) {
        if (!r.ok) throw new Error('expired');
        return r.json();
      })
      .then(function (data) {
        var list = document.getElementById('list');
        document.getElementById('meta').textContent = data.meta || '';
        data.items.forEach(function (item) {
          var li = document.createElement('li');
          if (item.checked) li.className = 'done';
          var name = document.createElement('span');
          name.textContent = item.name;
          var qty = document.createElement('span');
          qty.className = 'qty';
          qty.textContent = item.quantity;
          li.appendChild(name);
          li.appendChild(qty);
          list.appendChild(li);
        });
      })
      .catch(function () {
        document.getElementById('meta').textContent = 'This list link has expired. Send it again from your computer.';
      });
  </script>
</body>
</html>`;
}

// Global byte budget for unclaimed uploads. The relay buffers in RAM, so
// without this cap a few concurrent uploads (or an attacker) can OOM the
// machine mid-demo. Counted WHILE streaming — checking only after a body
// finished would still have buffered 500MB per request before rejecting.
const UPLOAD_GLOBAL_BUDGET_BYTES = 600 * 1024 * 1024;
let inFlightUploadBytes = 0;

// Unclaimed shopping lists are tiny but unbounded counts still grow RSS
// between TTL sweeps — cap the map like the upload budget caps bytes.
const SHARED_LIST_MAX_ENTRIES = 100;

function pendingUploadBytes() {
  let total = inFlightUploadBytes;
  for (const entry of pendingUploads.values()) total += entry.buffer.length;
  return total;
}

function getLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  // VPN/Hyper-V/WSL adapters usually present as 172.x; prefer classic home
  // ranges so the printed phone URL points at the WiFi adapter.
  const rank = (addr) => (addr.startsWith('192.168.') ? 0 : addr.startsWith('10.') ? 1 : addr.startsWith('172.') ? 2 : 3);
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) candidates.push(iface.address);
    }
  }
  candidates.sort((a, b) => rank(a) - rank(b));
  return candidates[0] || '127.0.0.1';
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
    let settled = false;
    const settle = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(stallTimer);
      // Give back exactly what this request added to the global in-flight
      // counter, on every exit path.
      inFlightUploadBytes -= total;
      resolve(result);
    };
    // Stall protection: destroy requests that stop sending mid-body instead
    // of pinning their partial buffers indefinitely. Must be `let` — bump()
    // reassigns it on every chunk.
    let stallTimer = setTimeout(() => {
      req.destroy();
      settle({ tooLarge: false, stalled: true, buffer: null });
    }, 15000);
    const bump = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        req.destroy();
        settle({ tooLarge: false, stalled: true, buffer: null });
      }, 15000);
    };
    req.on('data', (chunk) => {
      if (settled) return;
      total += chunk.length;
      inFlightUploadBytes += chunk.length;
      // Budget is enforced WHILE streaming: by the time an oversized body
      // "finished", we'd already have buffered it — too late to matter.
      if (total > maxBytes || inFlightUploadBytes > UPLOAD_GLOBAL_BUDGET_BYTES) {
        req.destroy();
        settle({ tooLarge: true, stalled: false, buffer: null });
        return;
      }
      chunks.push(chunk);
      bump();
    });
    req.on('end', () => {
      settle({ tooLarge: false, stalled: false, buffer: Buffer.concat(chunks) });
    });
    req.on('error', () => {
      settle({ tooLarge: false, stalled: true, buffer: null });
    });
  });
}

function phoneUploadPageHtml(token) {
  // Deliberately dependency-free, inline-styled to loosely match the app's
  // warm/cream design language, and self-contained (no build step).
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Send video — Kitchen Memory</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: #FBF7F2; color: #211D19; font-family: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 24px; text-align: center;
  }
  h1 { font-size: 24px; margin: 0 0 8px; }
  p { font-size: 16px; color: #5C5147; margin: 0 0 28px; max-width: 320px; }
  label.picker {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    background: #12A057; color: #FFFDFA; font-weight: 700; font-size: 17px;
    padding: 16px 28px; border-radius: 999px; cursor: pointer; width: 100%; max-width: 320px;
  }
  input[type=file] { display: none; }
  #status { margin-top: 24px; font-size: 15px; color: #0E7A45; font-weight: 600; min-height: 20px; }
  #status.error { color: #C24339; }
  .spinner {
    width: 20px; height: 20px; border: 3px solid #E8DECE; border-top-color: #12A057; border-radius: 50%;
    display: inline-block; vertical-align: middle; margin-right: 8px; animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
  <h1>🧠🍲 Send your kitchen video</h1>
  <p>Record a new video or pick one from your camera roll. It'll appear on your computer automatically.</p>
  <label class="picker" id="pickerLabel">
    Choose Video
    <!-- No "capture" attribute: phones then offer the photo library AND the
         camera instead of forcing the camera open immediately. -->
    <input type="file" id="fileInput" accept="video/*" />
  </label>
  <p id="hint" style="font-size: 14px; color: #9A8E80; margin: -16px 0 0;">Pick from your library or record a new one.</p>
  <div id="status"></div>

  <script>
    var token = ${JSON.stringify(token)};
    var input = document.getElementById('fileInput');
    var status = document.getElementById('status');
    var pickerLabel = document.getElementById('pickerLabel');
    var MAX_BYTES = 500 * 1024 * 1024;

    function fail(message) {
      status.className = 'error';
      status.textContent = message;
      pickerLabel.style.opacity = '1';
      pickerLabel.style.pointerEvents = 'auto';
    }

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (file.size > MAX_BYTES) {
        fail('That video is larger than 500MB — please pick a shorter one.');
        return;
      }
      pickerLabel.style.opacity = '0.5';
      pickerLabel.style.pointerEvents = 'none';
      status.className = '';

      // XHR (not fetch) so we can show real upload progress on slow WiFi.
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/phone-upload/' + encodeURIComponent(token));
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
          var pct = Math.round((e.loaded / e.total) * 100);
          status.innerHTML = '<span class="spinner"></span>Sending to your computer… ' + pct + '%';
        }
      };
      xhr.onload = function () {
        if (xhr.status === 415) {
          fail('That video format isn\\'t supported — please record or pick an MP4, WebM, or MOV video.');
          return;
        }
        if (xhr.status === 413) {
          fail('That video is too large — please record a shorter kitchen tour.');
          return;
        }
        if (xhr.status === 409) {
          status.className = '';
          status.textContent = '✓ Already sent! You can close this tab.';
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          status.className = '';
          status.textContent = '✓ Sent! You can close this tab.';
          return;
        }
        fail('Something went wrong — try again. (' + xhr.status + ')');
      };
      xhr.onerror = function () {
        fail('Connection lost — check you\\'re on the same WiFi and try again.');
      };
      status.innerHTML = '<span class="spinner"></span>Sending to your computer…';
      xhr.send(file);
    });
  </script>
</body>
</html>`;
}

function serveStatic(req, res, pathname, headOnly = false) {
  let filePath;
  try {
    filePath = path.join(DIST_DIR, decodeURIComponent(pathname));
  } catch (_) {
    // Malformed percent-encoding (/%FF…) is a bad request, not a server error.
    res.writeHead(400);
    res.end();
    return;
  }

  // Containment check: never serve anything outside dist-web, even via
  // encoded traversal like /..%2f..%2fpackage.json.
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(DIST_DIR) + path.sep) && resolved !== path.resolve(DIST_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }

  // SPA fallback: any extensionless route (client-side page) gets index.html.
  // Extensioned paths that miss (stale hashed chunk, wrong URL) are real 404s —
  // serving HTML for them masks broken builds and breaks asset parsing.
  const hasExtension = path.extname(filePath) !== '';
  if (!hasExtension) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (hasExtension) {
        res.writeHead(404, { ...SECURITY_HEADERS });
        res.end(headOnly ? undefined : 'Not found');
        return;
      }
      // Fall back to index.html for anything unresolved (e.g. deep client routes).
      fs.readFile(path.join(DIST_DIR, 'index.html'), (fallbackErr, fallbackData) => {
        if (fallbackErr) {
          res.writeHead(404, { ...SECURITY_HEADERS });
          res.end('Not found. Did you run "npm run build:web" first?');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'], 'Cache-Control': 'no-cache', ...SECURITY_HEADERS });
        res.end(headOnly ? undefined : fallbackData);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    // Hashed build assets are immutable; the shell must always revalidate.
    const immutable = pathname.startsWith('/_expo/') || pathname.startsWith('/assets/');
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Content-Length': data.length,
      ...SECURITY_HEADERS,
    });
    res.end(headOnly ? undefined : data);
  });
}

const server = http.createServer(async (req, res) => {
  // A hostile request-target (e.g. "//..%2f..") can throw synchronously here;
  // parse defensively so one bad request can never kill the process.
  let pathname;
  try {
    pathname = new URL(req.url, 'http://localhost').pathname;
  } catch (_) {
    res.writeHead(400);
    res.end();
    return;
  }

  try {
    if (pathname === '/api/local-info' && req.method === 'GET') {
      sendJson(res, 200, { app: 'kitchen-memory', ip: getLanIp(), port: PORT });
      return;
    }

    const uploadMatch = pathname.match(/^\/api\/phone-upload\/([a-zA-Z0-9_-]{16,})(\/status)?$/);
    if (uploadMatch) {
      const token = uploadMatch[1];
      const isStatus = Boolean(uploadMatch[2]);

      if (isStatus && req.method === 'GET') {
        sendJson(res, 200, { ready: pendingUploads.has(token) });
        return;
      }

      if (!isStatus && req.method === 'POST') {
        const contentType = safeContentType(req.headers['content-type']);
        if (!contentType) {
          sendJson(res, 415, { error: 'Only video uploads are accepted' });
          return;
        }
        // First writer wins: a second POST for a pending token would let
        // anyone on the network silently replace the real kitchen video.
        if (pendingUploads.has(token)) {
          sendJson(res, 409, { error: 'An upload for this code is already in progress' });
          return;
        }
        const result = await readRawBody(req, UPLOAD_MAX_BYTES);
        if (result.tooLarge) {
          sendJson(res, 413, { error: 'That video is too large (500MB max)' });
          return;
        }
        if (result.stalled || !result.buffer) {
          res.writeHead(408);
          res.end();
          return;
        }
        if (pendingUploadBytes() + result.buffer.length > UPLOAD_GLOBAL_BUDGET_BYTES) {
          sendJson(res, 503, { error: 'Server is busy with other uploads — try again shortly' });
          return;
        }
        pendingUploads.set(token, {
          buffer: result.buffer,
          contentType,
          receivedAt: Date.now(),
        });
        sendJson(res, 200, { ok: true });
        return;
      }

      if (!isStatus && req.method === 'GET') {
        const entry = pendingUploads.get(token);
        if (!entry) {
          res.writeHead(404, SECURITY_HEADERS);
          res.end();
          return;
        }
        pendingUploads.delete(token); // single-use
        res.writeHead(200, {
          'Content-Type': entry.contentType,
          'Content-Length': entry.buffer.length,
          // Never let a browser render an upload as a document.
          'Content-Disposition': 'attachment',
          ...SECURITY_HEADERS,
        });
        res.end(entry.buffer);
        return;
      }
    }

    const listMatch = pathname.match(/^\/api\/shopping-list\/([a-zA-Z0-9_-]{16,})$/);
    if (listMatch) {
      const token = listMatch[1];
      if (req.method === 'POST') {
        const result = await readRawBody(req, 1024 * 1024); // lists are tiny
        if (result.tooLarge || result.stalled || !result.buffer) {
          res.writeHead(400);
          res.end();
          return;
        }
        try {
          const parsed = JSON.parse(result.buffer.toString('utf8'));
          if (!Array.isArray(parsed.items)) throw new Error('bad shape');
          if (sharedLists.size >= SHARED_LIST_MAX_ENTRIES) {
            // Evict the oldest entry — same TTL-swept semantics, bounded map.
            const oldest = sharedLists.keys().next().value;
            if (oldest !== undefined) sharedLists.delete(oldest);
          }
          sharedLists.set(token, { text: parsed, receivedAt: Date.now() });
          sendJson(res, 200, { ok: true });
        } catch (_) {
          sendJson(res, 400, { error: 'Invalid list payload' });
        }
        return;
      }
      if (req.method === 'GET') {
        const entry = sharedLists.get(token);
        if (!entry) {
          sendJson(res, 404, { error: 'List not found or expired' });
          return;
        }
        sendJson(res, 200, entry.text);
        return;
      }
    }

    const listPageMatch = pathname.match(/^\/shopping-list\/([a-zA-Z0-9_-]{16,})$/);
    if (listPageMatch && req.method === 'GET') {
      const html = shoppingListPageHtml(listPageMatch[1]);
      res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
      res.end(html);
      return;
    }

    const phonePageMatch = pathname.match(/^\/phone-upload\/([a-zA-Z0-9_-]{16,})$/);
    if (phonePageMatch && req.method === 'GET') {
      const html = phoneUploadPageHtml(phonePageMatch[1]);
      res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
      res.end(html);
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(req, res, pathname, req.method === 'HEAD');
      return;
    }

    res.writeHead(405);
    res.end();
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: 'Server error' });
  }
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error('');
    console.error(`  Port ${PORT} is already in use — is Kitchen Memory already running?`);
    console.error(`  Try:   set PORT=3132 && node server/index.js`);
    console.error('');
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLanIp();
  console.log('');
  console.log('  Kitchen Memory is running:');
  console.log('  On this computer:  http://localhost:' + PORT);
  console.log('  On your phone (same WiFi): http://' + ip + ':' + PORT);
  console.log('  Note: everything on this WiFi network can reach this app — use trusted networks.');
  console.log('  If your phone cannot connect: allow Node.js through Windows Firewall (the popup is easy to miss).');
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
