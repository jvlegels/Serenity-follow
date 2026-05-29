# Serenity Follow

Serenity Follow is a polished, mobile-first PWA and small API service for tracking posts from [Serenity on X](https://x.com/aleabitoreddit), showing recent tweets, detecting clear buying advice, and surfacing a simple buy/watch/ignore signal.

> This project summarizes public posts for review only. It is not financial advice and should not place trades automatically.

## What it does

- Polls public Serenity posts through the official X API when `X_BEARER_TOKEN` is configured; `X_USER_ID` is optional because the app can resolve `X_USERNAME` itself.
- Falls back to server demo posts, and then to a client-side preview, so the interface still loads while credentials or the API server are missing.
- Analyzes each post for direct buying language, conditional/watch language, and asset mentions.
- Shows a refined mobile dashboard with a large buy-signal hero, confidence meter, selected-post analysis, and recent tweet cards.
- Sends service-worker-backed browser notifications when a new buy signal appears and notification permission has been granted.
- Links detected assets to Google Finance search results for quick manual review.
- Can be installed to a phone home screen as a PWA via the browser's "Add to Home Screen" flow.

## Getting started

No third-party packages are required; the app runs on built-in Node.js APIs.

```bash
npm run dev
```

Open `http://localhost:8787` on your phone or desktop. For phone use, add the site to your home screen from the browser menu.

## Live X polling

Create an X developer app with read access and set a bearer token before running the app. Serenity posts may be public in the X web UI, but this app still needs API credentials for reliable server-side access; it does not ask for your personal X login.

```bash
export X_BEARER_TOKEN="<your X API bearer token>"
# Optional; defaults to aleabitoreddit and resolves the numeric user id automatically.
export X_USERNAME="aleabitoreddit"
npm run dev
```

The `/api/poll` endpoint fetches recent posts, analyzes them, and returns the latest signal. The web client calls that endpoint every minute and when you tap **Refresh analysis**.

## Button behavior

- **Refresh analysis** always gives visible feedback. Without X credentials it refreshes the demo feed and shows a demo-mode message instead of failing silently.
- **Enable notifications** needs browser notification support and a secure context, such as HTTPS, `localhost`, or an installed PWA on supported mobile browsers.

## Scripts

- `npm run dev` - start the PWA frontend and local advice API on port `8787`.
- `npm run build` - syntax-check the JavaScript entry points.
- `npm run test` - run analyzer tests with Node's built-in test runner.
