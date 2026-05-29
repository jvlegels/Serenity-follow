const REFRESH_MS = 60_000;

const elements = {
  signalLight: document.querySelector('#signal-light'),
  signalLabel: document.querySelector('#signal-label'),
  signalTitle: document.querySelector('#signal-title'),
  heroSummary: document.querySelector('#hero-summary'),
  checkNow: document.querySelector('#check-now'),
  enableNotifications: document.querySelector('#enable-notifications'),
  status: document.querySelector('#status'),
  details: document.querySelector('#details'),
  feedList: document.querySelector('#feed-list')
};

let notificationsEnabled = 'Notification' in window && Notification.permission === 'granted';
let lastNotifiedId = localStorage.getItem('lastNotifiedAdviceId');
let selectedItem = null;

async function loadAdvice(mode = 'read', options = {}) {
  const endpoint = mode === 'poll' ? '/api/poll' : '/api/advice';
  const method = mode === 'poll' ? 'POST' : 'GET';
  const startedAt = new Date();

  if (options.userInitiated) {
    setButtonBusy(elements.checkNow, true, 'Checking...');
  }

  try {
    const response = await fetch(endpoint, { method });
    const data = await response.json();

    selectedItem = selectedItem ?? data.latestBuy ?? data.items?.[0] ?? null;
    renderHero(data.latestBuy);
    renderDetails(selectedItem);
    renderFeed(data.items ?? []);

    const checkedMessage = mode === 'poll' ? `Checked at ${startedAt.toLocaleTimeString()}` : `Updated ${startedAt.toLocaleTimeString()}`;
    const statusPrefix = response.ok ? '' : 'Could not refresh live X data. ';
    setStatus(`${statusPrefix}${data.message ?? checkedMessage}`);

    if (data.latestBuy && data.latestBuy.id !== lastNotifiedId && notificationsEnabled) {
      await showBuyNotification(data.latestBuy);
      lastNotifiedId = data.latestBuy.id;
      localStorage.setItem('lastNotifiedAdviceId', lastNotifiedId);
    }
  } catch (error) {
    setStatus(`Connection problem: ${error instanceof Error ? error.message : 'unable to reach the Serenity Follow API.'}`);
  } finally {
    if (options.userInitiated) {
      setButtonBusy(elements.checkNow, false, 'Check now');
    }
  }
}

function renderHero(latestBuy) {
  elements.signalLight.className = latestBuy ? 'signal signal-buy' : 'signal signal-quiet';
  elements.signalLabel.textContent = latestBuy ? 'New actionable advice' : 'No new buy signal';
  elements.signalTitle.textContent = latestBuy ? 'BUY SIGNAL' : 'Serenity Watch';
  elements.heroSummary.textContent = latestBuy?.summary ?? 'The latest Serenity posts are being monitored. A bright green alert appears here when the analyzer detects clear buying advice.';
}

function renderDetails(item) {
  if (!item) {
    elements.details.innerHTML = '<p>No posts loaded yet.</p>';
    return;
  }

  const assetLinks = item.assets.map((asset) => (
    `<a href="${asset.googleFinanceUrl}" target="_blank" rel="noreferrer">${asset.label} on Google Finance</a>`
  )).join('');

  elements.details.innerHTML = `
    <div class="pill pill-${item.signal}">${item.signal.toUpperCase()} · ${Math.round(item.confidence * 100)}%</div>
    <h3>${escapeHtml(item.headline)}</h3>
    <p>${escapeHtml(item.summary)}</p>
    <div class="asset-list">${assetLinks}</div>
    <a class="source-link" href="${item.sourceTweetUrl}" target="_blank" rel="noreferrer">Open original Serenity post on X</a>
  `;
}

function renderFeed(items) {
  elements.feedList.replaceChildren(...items.map((item) => {
    const button = document.createElement('button');
    button.className = 'feed-item';
    button.type = 'button';
    button.innerHTML = `
      <span class="dot dot-${item.signal}"></span>
      <span>${escapeHtml(item.headline)}</span>
      <time>${new Date(item.createdAt).toLocaleTimeString()}</time>
    `;
    button.addEventListener('click', () => {
      selectedItem = item;
      renderDetails(item);
      setStatus(`Showing ${item.signal} analysis from ${new Date(item.createdAt).toLocaleTimeString()}.`);
    });
    return button;
  }));
}

async function enableNotifications() {
  setButtonBusy(elements.enableNotifications, true, 'Checking...');

  try {
    if (!canUseNotifications()) {
      setStatus('Notifications need HTTPS, localhost, or an installed PWA with browser notification support. The dashboard buttons still work.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await ensureServiceWorker();
    }

    notificationsEnabled = permission === 'granted';
    elements.enableNotifications.textContent = notificationsEnabled ? 'Notifications on' : 'Enable notifications';
    setStatus(notificationsEnabled ? 'Notifications enabled. New buy signals will alert you.' : 'Notifications were not enabled by the browser.');
  } catch (error) {
    notificationsEnabled = false;
    setStatus(`Notification setup failed: ${error instanceof Error ? error.message : 'browser blocked notifications.'}`);
  } finally {
    elements.enableNotifications.disabled = false;
    if (!notificationsEnabled) {
      elements.enableNotifications.textContent = 'Enable notifications';
    }
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

function setButtonBusy(button, isBusy, label) {
  button.disabled = isBusy;
  button.textContent = label;
  button.setAttribute('aria-busy', String(isBusy));
}

function setStatus(message) {
  elements.status.textContent = message;
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

if (notificationsEnabled) {
  elements.enableNotifications.textContent = 'Notifications on';
}

void loadAdvice();
window.setInterval(() => void loadAdvice('poll'), REFRESH_MS);

void ensureServiceWorker().catch(() => undefined);
