const REFRESH_MS = 60_000;
const SERENITY_PROFILE_URL = 'https://x.com/aleabitoreddit';

const fallbackPosts = [
  {
    id: 'offline-demo-4',
    signal: 'buy',
    confidence: 0.86,
    headline: 'Clear buy signal: $COIN',
    summary: 'Serenity appears to be giving direct buying advice for $COIN. Review the original post before acting.',
    assets: [{ symbol: 'COIN', label: '$COIN', googleFinanceUrl: 'https://www.google.com/finance/search?q=COIN' }],
    sourceTweetUrl: SERENITY_PROFILE_URL,
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    originalText: 'Added a starter position in $COIN here. Clean setup, strong relative strength.'
  },
  {
    id: 'offline-demo-3',
    signal: 'watch',
    confidence: 0.48,
    headline: 'Needs review: $MSTR',
    summary: 'This is a watch item because the language is conditional and says there is no entry yet.',
    assets: [{ symbol: 'MSTR', label: '$MSTR', googleFinanceUrl: 'https://www.google.com/finance/search?q=MSTR' }],
    sourceTweetUrl: SERENITY_PROFILE_URL,
    createdAt: new Date(Date.now() - 1000 * 60 * 72).toISOString(),
    originalText: 'Watching $MSTR if it breaks the range. No entry yet.'
  },
  {
    id: 'offline-demo-2',
    signal: 'ignore',
    confidence: 0.12,
    headline: 'No actionable buying advice detected',
    summary: 'No clear buying instruction was found in this post.',
    assets: [],
    sourceTweetUrl: SERENITY_PROFILE_URL,
    createdAt: new Date(Date.now() - 1000 * 60 * 145).toISOString(),
    originalText: 'Market still messy today. Patience beats forcing trades.'
  }
];

const elements = {
  signalLight: document.querySelector('#signal-light'),
  signalLabel: document.querySelector('#signal-label'),
  signalTitle: document.querySelector('#signal-title'),
  heroSummary: document.querySelector('#hero-summary'),
  assetStrip: document.querySelector('#asset-strip'),
  confidenceValue: document.querySelector('#confidence-value'),
  confidenceMeter: document.querySelector('#confidence-meter'),
  heroTime: document.querySelector('#hero-time'),
  checkNow: document.querySelector('#check-now'),
  enableNotifications: document.querySelector('#enable-notifications'),
  connectionPill: document.querySelector('#connection-pill'),
  status: document.querySelector('#status'),
  details: document.querySelector('#details'),
  selectedSignal: document.querySelector('#selected-signal'),
  feedCount: document.querySelector('#feed-count'),
  feedList: document.querySelector('#feed-list')
};

let notificationsEnabled = 'Notification' in window && Notification.permission === 'granted';
let lastNotifiedId = safeStorageGet('lastNotifiedAdviceId');
let selectedItem = null;
let latestItems = [];

async function loadAdvice(mode = 'read', options = {}) {
  const endpoint = mode === 'poll' ? '/api/poll' : '/api/advice';
  const method = mode === 'poll' ? 'POST' : 'GET';
  const startedAt = new Date();

  if (options.userInitiated) {
    setButtonBusy(elements.checkNow, true, 'Refreshing…', 'Checking latest posts');
  }

  try {
    const response = await fetch(endpoint, { method, headers: { Accept: 'application/json' } });
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error('The API did not return JSON. Start the Node server with `npm run dev`.');
    }

    const data = await response.json();
    applyAdviceData(data, {
      isFallback: false,
      statusPrefix: response.ok ? '' : 'Live refresh failed. ',
      checkedMessage: mode === 'poll' ? `Checked at ${formatTime(startedAt)}` : `Updated ${formatTime(startedAt)}`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reach the Serenity Follow API.';
    applyAdviceData({ latestBuy: fallbackPosts.find((item) => item.signal === 'buy'), items: fallbackPosts }, {
      isFallback: true,
      statusPrefix: 'Offline preview loaded. ',
      checkedMessage: message
    });
  } finally {
    if (options.userInitiated) {
      setButtonBusy(elements.checkNow, false, 'Refresh analysis', 'Check latest posts now');
    }
  }
}

function applyAdviceData(data, meta) {
  latestItems = Array.isArray(data.items) ? data.items : [];
  const latestBuy = data.latestBuy ?? latestItems.find((item) => item.signal === 'buy') ?? null;
  selectedItem = selectedItem ? latestItems.find((item) => item.id === selectedItem.id) ?? latestBuy ?? latestItems[0] ?? null : latestBuy ?? latestItems[0] ?? null;

  renderHero(latestBuy, latestItems);
  renderDetails(selectedItem);
  renderFeed(latestItems);
  setConnection(meta.isFallback ? 'Preview mode' : data.source === 'live' ? 'Live X API' : 'Demo mode', meta.isFallback ? 'preview' : data.source === 'live' ? 'live' : 'demo');
  setStatus(`${meta.statusPrefix}${data.message ?? meta.checkedMessage}`);

  if (latestBuy && latestBuy.id !== lastNotifiedId && notificationsEnabled) {
    void showBuyNotification(latestBuy).then(() => {
      lastNotifiedId = latestBuy.id;
      safeStorageSet('lastNotifiedAdviceId', lastNotifiedId);
    });
  }
}

function renderHero(latestBuy, items) {
  const strongest = latestBuy ?? items[0] ?? null;
  const confidence = strongest ? Math.round(strongest.confidence * 100) : 0;

  elements.signalLight.className = latestBuy ? 'signal signal-buy' : 'signal signal-quiet';
  elements.signalLabel.textContent = latestBuy ? 'Actionable buy language detected' : 'No clear buy signal';
  elements.signalTitle.textContent = latestBuy ? latestBuy.headline : 'No current buy alert';
  elements.heroSummary.textContent = latestBuy?.summary ?? 'Recent posts are available below. Anything conditional or unclear is marked as watch instead of buy.';
  elements.confidenceValue.textContent = `${confidence}%`;
  elements.confidenceMeter.style.width = `${confidence}%`;
  elements.heroTime.textContent = strongest ? `Latest analyzed ${formatRelative(strongest.createdAt)}` : 'Waiting for posts';
  elements.assetStrip.replaceChildren(...renderAssetButtons(latestBuy?.assets ?? []));
}

function renderDetails(item) {
  if (!item) {
    elements.selectedSignal.textContent = '--';
    elements.details.className = 'details-empty';
    elements.details.textContent = 'No post selected yet.';
    return;
  }

  elements.selectedSignal.textContent = item.signal.toUpperCase();
  elements.details.className = 'details-content';
  elements.details.innerHTML = `
    <div class="tweet-quote">${escapeHtml(item.originalText)}</div>
    <div class="analysis-block">
      <span class="pill pill-${item.signal}">${signalLabel(item.signal)} · ${Math.round(item.confidence * 100)}%</span>
      <h3>${escapeHtml(item.headline)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      <div class="reason-list">${renderReasons(item).map((reason) => `<span>${escapeHtml(reason)}</span>`).join('')}</div>
    </div>
    <div class="asset-list">${renderAssetLinks(item.assets)}</div>
    <a class="source-link" href="${item.sourceTweetUrl}" target="_blank" rel="noreferrer">Open original post on X</a>
  `;
}

function renderFeed(items) {
  elements.feedCount.textContent = `${items.length} analyzed`;
  elements.feedList.replaceChildren(...items.map((item) => {
    const card = document.createElement('article');
    card.className = `tweet-card tweet-card-${item.signal}${selectedItem?.id === item.id ? ' selected' : ''}`;
    card.innerHTML = `
      <button class="tweet-select" type="button" aria-label="Review ${escapeHtml(item.headline)}">
        <span class="tweet-meta"><span class="dot dot-${item.signal}"></span>${signalLabel(item.signal)} · ${formatRelative(item.createdAt)}</span>
        <strong>${escapeHtml(item.headline)}</strong>
        <span class="tweet-text">${escapeHtml(item.originalText)}</span>
        <span class="tweet-footer"><span>${Math.round(item.confidence * 100)}% confidence</span><span>${item.assets.length ? item.assets.map((asset) => asset.label).join(', ') : 'No asset detected'}</span></span>
      </button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      selectedItem = item;
      renderDetails(item);
      renderFeed(latestItems);
      setStatus(`Showing ${item.signal} analysis from ${formatTime(item.createdAt)}.`);
    });
    return card;
  }));
}

async function enableNotifications() {
  setButtonBusy(elements.enableNotifications, true, 'Checking…', 'Requesting permission');

  try {
    if (!canUseNotifications()) {
      setStatus('Notifications are blocked in this browser context. Use HTTPS, localhost, or install the PWA on a supported mobile browser.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await ensureServiceWorker();
    }

    notificationsEnabled = permission === 'granted';
    updateNotificationButton();
    setStatus(notificationsEnabled ? 'Alerts enabled. Clear buy signals will notify you.' : 'The browser did not grant notification permission.');
  } catch (error) {
    notificationsEnabled = false;
    updateNotificationButton();
    setStatus(`Notification setup failed: ${error instanceof Error ? error.message : 'browser blocked notifications.'}`);
  } finally {
    elements.enableNotifications.disabled = false;
    elements.enableNotifications.setAttribute('aria-busy', 'false');
    updateNotificationButton();
  }
}

async function showBuyNotification(advice) {
  const options = {
    body: advice.summary,
    icon: '/icons/icon.svg',
    data: { url: advice.sourceTweetUrl }
  };

  const registration = await ensureServiceWorker();
  if (registration?.showNotification) {
    await registration.showNotification(advice.headline, options);
    return;
  }

  new Notification(advice.headline, options);
}

async function ensureServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    return null;
  }

  return navigator.serviceWorker.register('/sw.js');
}

function canUseNotifications() {
  return 'Notification' in window && window.isSecureContext;
}

function renderReasons(item) {
  if (item.signal === 'buy') {
    return ['Direct buy/added/long wording', item.assets.length ? `Asset detected: ${item.assets.map((asset) => asset.label).join(', ')}` : 'Asset needs manual confirmation', 'Review original post before trading'];
  }

  if (item.signal === 'watch') {
    return ['Conditional or hedged wording', 'Treat as watchlist only', item.assets.length ? `Mentioned: ${item.assets.map((asset) => asset.label).join(', ')}` : 'No clear asset'];
  }

  return ['No explicit buy instruction', 'No alert sent', 'Market commentary only'];
}

function renderAssetButtons(assets) {
  if (!assets.length) {
    const empty = document.createElement('span');
    empty.className = 'empty-assets';
    empty.textContent = 'No asset link for this signal';
    return [empty];
  }

  return assets.map((asset) => {
    const link = document.createElement('a');
    link.href = asset.googleFinanceUrl;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = `${asset.label} Finance`;
    return link;
  });
}

function renderAssetLinks(assets) {
  if (!assets.length) {
    return '<span class="muted">No Google Finance asset link detected.</span>';
  }

  return assets.map((asset) => `<a href="${asset.googleFinanceUrl}" target="_blank" rel="noreferrer">${asset.label} on Google Finance</a>`).join('');
}

function setButtonBusy(button, isBusy, label, sublabel) {
  button.disabled = isBusy;
  button.innerHTML = `<span>${escapeHtml(label)}</span><small>${escapeHtml(sublabel)}</small>`;
  button.setAttribute('aria-busy', String(isBusy));
}

function updateNotificationButton() {
  const label = notificationsEnabled ? 'Alerts enabled' : 'Enable alerts';
  const sublabel = notificationsEnabled ? 'Listening for buy signals' : 'Notify on clear buy signals';
  setButtonBusy(elements.enableNotifications, false, label, sublabel);
}

function setConnection(label, mode) {
  elements.connectionPill.textContent = label;
  elements.connectionPill.className = `connection-pill ${mode}`;
}

function setStatus(message) {
  elements.status.textContent = message;
}

function signalLabel(signal) {
  return signal === 'buy' ? 'Buy signal' : signal === 'watch' ? 'Watch only' : 'No action';
}

function formatRelative(dateValue) {
  const diffMs = Date.now() - Date.parse(dateValue);
  const minutes = Math.max(1, Math.round(diffMs / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatTime(dateValue) {
  return new Date(dateValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in private browsing modes.
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

elements.checkNow.addEventListener('click', () => void loadAdvice('poll', { userInitiated: true }));
elements.enableNotifications.addEventListener('click', () => void enableNotifications());

updateNotificationButton();
void loadAdvice();
window.setInterval(() => void loadAdvice('poll'), REFRESH_MS);
void ensureServiceWorker().catch(() => undefined);
