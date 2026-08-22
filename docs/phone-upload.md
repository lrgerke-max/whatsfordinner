# Sending a kitchen video from your phone to the desktop web app

The **desktop web app** build (see the root README's "Desktop web app"
section) runs entirely in a browser on your computer. That's great for
trying the product without installing anything mobile, but it means the
computer's browser doesn't have access to your phone's camera or camera
roll. **Send from Phone** (on the Scan Kitchen screen, web build only)
closes that gap without any cloud service, account, or internet
dependency — everything stays on your local WiFi network.

## How it works

1. `server/index.js` — the same tiny local server that serves the app —
   also exposes a minimal upload relay: `POST /api/phone-upload/:token`,
   `GET /api/phone-upload/:token/status`, `GET /api/phone-upload/:token`.
2. Tapping **Send from Phone** (`app/scan/phone-upload.tsx`) generates a
   random token in the browser, asks the server for its LAN IP address
   (`GET /api/local-info` — needed because the computer's browser might be
   on `localhost`, which your phone can't reach), and renders a QR code for
   `http://<lan-ip>:<port>/phone-upload/<token>`.
3. Scanning that QR code opens a tiny, dependency-free HTML page served
   directly by `server/index.js` (`phoneUploadPageHtml`) — just a file
   input with `accept="video/*" capture="environment"`, which on a phone
   browser offers "record a new video" or "choose an existing one." On
   selection, it `fetch(...).POST`s the raw file bytes straight to
   `/api/phone-upload/<token>` — no multipart parsing needed since the
   whole request body *is* the video.
4. Meanwhile the computer's browser polls `.../status` every 2 seconds.
   Once it sees `ready: true`, it fetches the video, turns it into a blob
   URL, reads the duration via a hidden `<video>` element, and feeds it
   into the exact same `scanFlowStore.finishRecording(...)` call every
   other upload path uses — so from that point on it's indistinguishable
   from picking a file locally. It lands on `/scan/review` like normal.
5. Uploads are single-use and in-memory only (a `Map`, not a database or
   disk write) — fetched once and discarded, and anything unclaimed for
   10 minutes is swept. Nothing is written to disk or leaves the local
   network.

## Requirements

- Phone and computer must be on the **same WiFi network** (this is a LAN
  feature, not an internet one — there's no relay server anywhere else).
- The computer must be running the custom local server
  (`npm run serve:web`, or `node server/index.js` from the downloaded
  package's launcher scripts) — the plain static-file `npx serve .`
  approach doesn't have the `/api/phone-upload/*` routes and won't support
  this feature.
- If your phone can't reach the QR code's address, some networks isolate
  devices from each other (common on guest WiFi, some corporate networks).
  Try both devices on the same trusted home network.

## Why this doesn't exist on native iOS/Android

It's a no-op there — the phone *is* the app, with direct camera access
via `expo-camera`. This whole flow only exists to bridge the gap that's
specific to running the product in a desktop browser.
