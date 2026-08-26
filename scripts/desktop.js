#!/usr/bin/env node
/**
 * What's For Dinner — desktop launcher.
 *
 * One command that gets you from zero to the app in your browser:
 *   1. Builds the web bundle only if dist-web is missing (use --fresh to force).
 *   2. Starts the local server (which also powers Send-from-Phone over WiFi).
 *   3. Opens your default browser as soon as the server answers.
 *
 * Zero dependencies beyond Node itself.
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const DIST_INDEX = path.join(ROOT, 'dist-web', 'index.html');
const SERVER_ENTRY = path.join(ROOT, 'server', 'index.js');
const PORT = Number(process.env.PORT) || 3131;
const fresh = process.argv.includes('--fresh');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`))));
    child.on('error', reject);
  });
}

function waitForServer(timeoutMs, port = Number(process.env.PORT || PORT)) {
  const activeUrl = `http://localhost:${port}`;
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(`${activeUrl}/api/local-info`, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          try {
            const info = JSON.parse(body);
            // Make sure the port is owned by THIS app, not something else.
            if (info && info.app === 'kitchen-memory') return resolve();
          } catch (_) {}
          // A fast WRONG answer (not our app) retries like a socket error —
          // the port was free moments ago, so the real server may be next.
          if (Date.now() > deadline) return reject(new Error(`Port ${port} is used by a different app.`));
          setTimeout(attempt, 400);
        });
      });
      // A silent squatter accepts the connection but never answers — without
      // this timeout the launcher would hang forever past its own deadline.
      req.setTimeout(1500, () => req.destroy(new Error('timeout')));
      req.on('error', () => {
        if (Date.now() > deadline) return reject(new Error('Server did not start in time'));
        setTimeout(attempt, 400);
      });
    };
    attempt();
  });
}

function openBrowser(url) {
  switch (process.platform) {
    case 'win32':
      exec(`start "" "${url}"`);
      break;
    case 'darwin':
      exec(`open "${url}"`);
      break;
    default:
      exec(`xdg-open "${url}"`);
  }
}

async function main() {
  console.log('');
  console.log('  What\'s For Dinner — starting up…');
  console.log('');

  const nodeModules = path.join(ROOT, 'node_modules');
  // A partial install (interrupted first run) must re-install, not crash the
  // build with a confusing module-not-found.
  const installMarker = path.join(nodeModules, '.package-lock.json');
  if (!fs.existsSync(installMarker)) {
    console.log('  Installing dependencies (one time — this can take a few minutes)…');
    await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install']);
  }

  if (fresh || !fs.existsSync(DIST_INDEX)) {
    if (fresh) console.log('  Rebuilding the app bundle (--fresh)…');
    else console.log('  First run detected — building the app bundle once (about a minute)…');
    await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:web']);
  } else {
    // Stale-bundle guard: warn when source changed after the last build so a
    // presenter never demos yesterday's code by accident. String-form
    // readdirSync returns paths relative to the walk root on every supported
    // Node version (the Dirent.name form broke on Node >= 20).
    try {
      const newestSource = Math.max(
        ...['app', 'src'].flatMap((dir) =>
          fs
            .readdirSync(path.join(ROOT, dir), { recursive: true })
            .filter((f) => /\.(tsx?|jsx?)$/.test(f))
            .map((f) => fs.statSync(path.join(ROOT, dir, f)).mtimeMs)
        )
      );
      if (newestSource > fs.statSync(DIST_INDEX).mtimeMs) {
        console.log('  NOTE: source code changed since the last build — run "npm run desktop:fresh" to include those changes.');
      }
    } catch (err) {
      console.log(`  (Could not check bundle freshness: ${err.message})`);
    }
  }

  // If the default port is taken by something that is not this app, walk up.
  let server = null;
  for (let candidate = PORT; candidate < PORT + 10; candidate++) {
    const probe = await new Promise((resolve) => {
      const tester = http.createServer();
      tester.once('error', () => resolve(false));
      tester.once('listening', () => tester.close(() => resolve(true)));
      tester.listen(candidate);
    });
    if (probe) {
      process.env.PORT = String(candidate);
      server = spawn(process.execPath, [SERVER_ENTRY], {
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env, PORT: String(candidate) },
      });
      // TOCTOU: something can steal the port between our probe and the
      // server's listen. If the child dies with the busy-port exit before
      // answering healthy, walk to the next candidate instead of giving up.
      const exitedCleanly = await new Promise((resolve) => {
        const onExit = (code) => resolve(code !== 1);
        server.once('exit', onExit);
        waitForServer(8000, candidate)
          .then(() => resolve(true))
          .catch(() => resolve(true));
      });
      if (exitedCleanly) break;
      server = null;
      continue;
    }
    try {
      const info = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${candidate}/api/local-info`, (res) => {
          let body = '';
          res.on('data', (c) => { body += c; });
          res.on('end', () => { try { resolve(JSON.parse(body)); } catch (_) { resolve(null); } });
        });
        req.on('error', reject);
        req.setTimeout(1500, () => { req.destroy(); reject(new Error('slow')); });
      }).catch(() => null);
      if (info && info.app === 'kitchen-memory') {
        console.log(`  Kitchen Memory is already running on port ${candidate} — reusing it.`);
        openBrowser(`http://localhost:${candidate}`);
        return;
      }
    } catch (_) {}
  }
  if (!server) {
    console.error('  No free port found in the range ' + PORT + '–' + (PORT + 9) + '.');
    process.exit(1);
  }
  // Distinguishes deliberate shutdown (Ctrl+C, health-check failure) from a
  // real crash — the exit handler below must not cry wolf on normal exits.
  let intentionalKill = false;
  const killServer = () => {
    intentionalKill = true;
    try { server.kill(); } catch (_) {}
  };
  // If the server child dies (crash, forced kill, port stolen), say so
  // instead of leaving a launcher alive that points at a dead URL.
  server.on('exit', (code) => {
    if (intentionalKill) return;
    console.error('');
    console.error('  The app server stopped unexpectedly' + (code != null ? ` (code ${code})` : '') + '.');
    console.error('  Close this window and start the app again.');
    process.exit(1);
  });
  process.on('exit', () => {
    intentionalKill = true;
    try { server.kill(); } catch (_) {}
  });
  process.on('SIGINT', () => { killServer(); process.exit(0); });

  try {
    await waitForServer(30000, Number(process.env.PORT || PORT));
  } catch (err) {
    console.error('  Could not reach the server:', err.message);
    killServer();
    process.exit(1);
  }

  const finalUrl = `http://localhost:${process.env.PORT || PORT}`;
  openBrowser(finalUrl);
  console.log('');
  console.log(`  Ready: ${finalUrl}`);
  console.log('  Phone camera uploads work at the same address on your WiFi.');
  console.log('  Press Ctrl+C here to stop everything.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
