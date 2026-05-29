# Serenity Follow

Serenity Follow is a phone-friendly PWA and small API service for tracking posts from [Serenity on X](https://x.com/aleabitoreddit), detecting clear buying advice, and surfacing a simple home-screen-style signal.

> This project summarizes public posts for review only. It is not financial advice and should not place trades automatically.

## What it does

- Polls Serenity posts through the official X API when `X_USER_ID` and `X_BEARER_TOKEN` are configured.
- Falls back to demo posts so the UI can be run locally without API credentials.
- Analyzes each post for direct buying language, conditional/watch language, and asset mentions.
- Shows a large green `BUY SIGNAL` card when the latest analyzed posts contain clear buying advice.
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

Create an X developer app with read access and set these environment variables before running the app:

```bash
export X_USER_ID="<numeric Serenity user id>"
export X_BEARER_TOKEN="<your X API bearer token>"
npm run dev
```

The `/api/poll` endpoint fetches recent posts, analyzes them, and returns the latest signal. The web client calls that endpoint every minute and when you tap **Check now**.

## Button behavior

- **Check now** always gives visible feedback. Without X credentials it refreshes the demo feed and shows a demo-mode message instead of failing silently.
- **Enable notifications** needs browser notification support and a secure context, such as HTTPS, `localhost`, or an installed PWA on supported mobile browsers.

## Scripts

- `npm run dev` - start the PWA frontend and local advice API on port `8787`.
- `npm run build` - syntax-check the JavaScript entry points.
- `npm run test` - run analyzer tests with Node's built-in test runner.
