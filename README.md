# Serenity Follow

Serenity Follow is a production-quality MVP for monitoring public posts from [Serenity / @aleabitoreddit on X](https://x.com/aleabitoreddit). It highlights **potential buying signals** for manual review, explains uncertainty, stores an in-memory signal history for the running session, and includes a widget scaffold for a future native Android home-screen widget.

The app **does not provide financial advice**, **does not execute trades**, and **does not recommend that you buy anything**. It summarises public posts and helps you notice, understand, and verify possible opportunities yourself.

## Project overview

### What the MVP includes

- Mobile-first PWA that works in Android Chrome and iPhone Safari.
- TypeScript frontend, backend, domain types, and signal engine.
- Clean architecture split into domain, core classifier, data, server, and client layers.
- Mock Serenity posts included by default, so the app works without X API access.
- Optional X API integration using a backend `X_BEARER_TOKEN`.
- Signal detection engine that extracts:
  - asset name
  - ticker symbol when available
  - reasoning
  - uncertainty
  - confidence score
  - original post URL
  - timestamp
- Signal history screen.
- Signal detail page.
- Settings page.
- Browser notification flow for supported secure contexts.
- Widget scaffold and dashboard preview using green / amber / grey states.

### Widget state meaning

| Color | Meaning | Example |
| --- | --- | --- |
| Green | New high-confidence potential signal detected | `Potential signal detected · $COIN · 68%+` |
| Amber | Possible signal but uncertain | `Possible signal — review · $MSTR` |
| Grey | No recent signal | `No recent signal` |

The MVP uses a PWA home-screen icon plus notification deep links. A true Android widget requires native Android code and is intentionally deferred. The widget contract is documented in `public/widget/widget-scaffold.json`.

## Local installation

### Prerequisites

Install these first:

1. **Git**
2. **Node.js 20 or newer**
3. **npm**
4. **TypeScript compiler** (`tsc`)
5. A browser such as Chrome, Edge, or Safari

Check your versions:

```bash
git --version
node --version
npm --version
tsc --version
```

Expected examples:

```text
git version 2.x.x
v20.x.x or newer
10.x.x or newer
Version 5.x.x
```

### Clone and install

```bash
git clone <YOUR_REPOSITORY_URL>
cd Serenity-follow
npm install
```

This project has no runtime npm dependencies. If `tsc --version` does not work, install TypeScript first:

```bash
npm install --global typescript
```

If you already cloned the repository, use:

```bash
cd Serenity-follow
npm install
```

## Running locally

Start the app:

```bash
npm run dev
```

Expected output:

```text
Serenity Follow listening at http://localhost:8787
Mock mode is active. Set X_BEARER_TOKEN for live public X monitoring.
```

Open this URL on your computer:

```text
http://localhost:8787
```

Run tests:

```bash
npm test
```

Run only the TypeScript build:

```bash
npm run build
```

## Running on Android

### Option A: same Wi-Fi network

1. Connect your computer and Android phone to the same Wi-Fi.
2. Find your computer's local IP address.

On macOS/Linux:

```bash
hostname -I
```

If that command does not work, try:

```bash
ipconfig getifaddr en0
```

3. Start the app:

```bash
npm run dev
```

4. On Android Chrome, open:

```text
http://YOUR_COMPUTER_IP:8787
```

Example:

```text
http://192.168.1.23:8787
```

5. Add it to your home screen:

```text
Chrome menu ⋮ → Add to Home screen → Install
```

### Option B: use a tunnel

If local Wi-Fi access is blocked, use a tunnel such as ngrok or Cloudflare Tunnel.

Example with ngrok:

```bash
ngrok http 8787
```

Then open the HTTPS forwarding URL on Android.

### Android testing checklist

- Dashboard loads quickly.
- The status pill says `Mock data` unless X API credentials are configured.
- `Refresh analysis` updates the mock feed.
- `History` opens the full signal list.
- Tapping a post opens the signal detail page.
- `Settings` opens notification/source settings.
- `Enable browser notifications` works only on supported secure contexts such as HTTPS or localhost.
- Add to Home Screen creates a PWA icon.

## Running on iPhone

1. Start the app on your computer:

```bash
npm run dev
```

2. Open the app on iPhone Safari using your computer IP address:

```text
http://YOUR_COMPUTER_IP:8787
```

3. Add it to your home screen:

```text
Share button → Add to Home Screen → Add
```

4. Test:

- Dashboard loads.
- History and Settings tabs work.
- Signal detail pages open.
- PWA launches from the home-screen icon.

Note: iOS notification support depends on iOS version, Safari/PWA installation, and browser permission settings. For the MVP, Android Chrome is the primary quick-test target.

## Mock testing

Mock posts live in:

```text
src/data/mockSerenityPosts.ts
```

Expected classifications:

| Mock post | Expected result | Why |
| --- | --- | --- |
| `Added a starter position in $COIN here...` | High-confidence potential signal | direct position language + ticker |
| `Watching $MSTR if it breaks... No entry yet.` | Possible signal | ticker + conditional/no-entry wording |
| `If $NVDA reclaims... I may add, but not chasing...` | Possible signal | add language, but conditional and uncertain |
| `Bought $TSLA calls...` | High-confidence potential signal | bought language + ticker |
| `Market still messy today...` | No signal | no asset and no buy wording |
| `Taking profit on part of $HOOD...` | No signal | profit-taking and not a fresh buy |

Run classifier tests:

```bash
npm test
```

## Optional live X API setup

Public X posts are visible in a browser, but reliable automated monitoring should use the official X API. The app does **not** ask for your personal X login. The backend uses an X API bearer token.

Set environment variables before starting:

```bash
cp .env.example .env
export X_BEARER_TOKEN="<your X API bearer token>"
# Optional. Defaults to aleabitoreddit.
export X_USERNAME="aleabitoreddit"
# Optional if you already know the numeric X user id.
export X_USER_ID="<numeric user id>"
npm run dev
```

If the token is missing, the app remains fully usable in mock mode.

## GitHub workflow

### Create a branch

```bash
git checkout main
git pull
git checkout -b feature/serenity-mvp
```

### Make changes and test

```bash
npm install
npm test
```

### Commit changes

```bash
git status
git add .
git commit -m "Build Serenity Follow MVP"
```

### Push branch

```bash
git push origin feature/serenity-mvp
```

### Create a pull request

1. Open GitHub.
2. Go to the repository.
3. Click **Compare & pull request**.
4. Add a clear title and summary.
5. Confirm tests passed.
6. Request review if needed.

### Merge process

1. Wait for checks to pass.
2. Review the changed files.
3. Click **Squash and merge** or **Merge pull request**.
4. Delete the feature branch when GitHub offers to do so.

## Deployment instructions

### Simple low-cost deployment

This MVP is a Node server that serves both the API and the PWA.

Recommended beginner-friendly hosts:

- Render
- Railway
- Fly.io

### Render-style setup

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
node dist/server/server.js
```

Environment variables can be copied from `.env.example` and configured in your host:

```text
PORT=8787
X_BEARER_TOKEN=<optional for live X API>
X_USERNAME=aleabitoreddit
```

After deployment, open the HTTPS URL on Android and install it to the home screen.

## Troubleshooting guide

### `npm install` fails

Try:

```bash
npm cache verify
npm install
```

Confirm Node is version 20 or newer:

```bash
node --version
```

### App opens but shows mock data

This is expected unless `X_BEARER_TOKEN` is configured. Mock mode is intentional for easy testing.

### Android phone cannot open the local URL

Check:

- Computer and phone are on the same Wi-Fi.
- Firewall allows port `8787`.
- You used your computer IP, not `localhost`.
- Try a tunnel such as `ngrok http 8787`.

### Notifications do not work

Browser notifications require:

- HTTPS, or
- localhost, or
- installed PWA support in the browser

For quick Android testing, use a tunnel HTTPS URL or install the PWA from Chrome.

### Live X polling fails

Check:

```bash
echo $X_BEARER_TOKEN
echo $X_USERNAME
```

Then restart:

```bash
npm run dev
```

If it still fails, use mock mode while you verify X developer access and rate limits.

## Project structure

```text
src/
  client/              Mobile-first PWA UI
  core/                Signal classifier, confidence scoring, widget state
  data/                Mock Serenity posts
  domain/              Shared TypeScript domain types
  server/              Node API, static server, X API adapter, in-memory store
public/
  icons/               PWA icon
  widget/              Native widget scaffold contract
  manifest.webmanifest PWA manifest
  sw.js                Service worker
 tests/                Node test runner tests
```

## Key design decisions

- **PWA first:** fastest way to test on Android within one hour of cloning.
- **TypeScript everywhere:** safer refactoring and clearer domain contracts.
- **Mock mode by default:** no X API token required for first run.
- **Rule-based classifier first:** transparent, testable, and easy to tune.
- **No trading actions:** app only summarises public posts and links to original sources.
- **Widget scaffold, not native widget yet:** native Android widgets are valuable but too complex for the first MVP.

## Testing checklist before merging

```bash
npm install
npm run build
npm test
npm run dev
```

Then manually verify:

- Dashboard loads on desktop.
- Dashboard loads on Android.
- Refresh analysis works.
- History tab works.
- Signal detail pages work.
- Settings page works.
- UI is readable at mobile widths.
- All copy avoids financial-advice language such as “buy now”.

## Next recommended enhancements

1. Add Supabase Postgres for persistent signal history.
2. Add a scheduled poller instead of only manual refresh.
3. Add Web Push subscription storage.
4. Add Telegram notifications as a simple reliable alert channel.
5. Add user-editable notification thresholds.
6. Add more monitored accounts through a `SourceAdapter` interface.
7. Add a feedback button: “Correct / too aggressive / missed signal”.
8. Build a native Android widget after the PWA behavior is validated.
