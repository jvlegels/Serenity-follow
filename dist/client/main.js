import { toPercent } from '../core/confidence.js';
import { analyzePosts, createWidgetState, defaultSettings, latestNoteworthySignal } from '../core/signalService.js';
import { createMockSerenityPosts } from '../data/mockSerenityPosts.js';
const appRoot = document.querySelector('#app');
if (!appRoot) {
    throw new Error('Missing #app root element.');
}
const rootElement = appRoot;
const fallbackResponse = createStaticMockResponse('Static preview mode. The API is not available, so mock Serenity posts are shown.');
let state = { ...fallbackResponse, settings: loadSettings() };
let feedbackBySignal = loadFeedback();
let selectedNotificationPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
window.addEventListener('hashchange', render);
void bootstrap();
async function bootstrap() {
    await refreshSignals(false);
    render();
    window.setInterval(() => void refreshSignals(false), state.settings.pollIntervalMinutes * 60_000);
    void registerServiceWorker();
}
async function refreshSignals(userInitiated) {
    setLoading(userInitiated);
    try {
        const response = await fetch(userInitiated ? 'api/poll' : 'api/signals', {
            method: userInitiated ? 'POST' : 'GET',
            headers: { Accept: 'application/json' }
        });
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
            throw new Error('The local API did not return JSON. Run the app with npm run dev.');
        }
        state = { ...await response.json(), settings: loadSettings() };
        persistLatestWidget(state.widget);
        if (userInitiated) {
            await maybeNotify(state.latestSignal);
        }
    }
    catch (error) {
        state = {
            ...fallbackResponse,
            settings: loadSettings(),
            sourceStatus: {
                mode: 'error',
                checkedAt: new Date().toISOString(),
                message: `Static preview mode: ${error instanceof Error ? error.message : 'Unable to load signal data.'}`
            }
        };
    }
    finally {
        render();
    }
}
function render() {
    rootElement.innerHTML = shellTemplate(routeFromHash());
    bindNavigation();
}
function shellTemplate(route) {
    return `
    <header class="topbar">
      <a class="brand" href="#/">
        <span class="brand-mark">S</span>
        <span><strong>Serenity Follow</strong><small>Public X signal monitor</small></span>
      </a>
      <span class="status-pill status-${state.sourceStatus.mode}">${statusLabel(state.sourceStatus.mode)}</span>
    </header>
    <nav class="tabs" aria-label="Primary navigation">
      ${navLink('#/', 'Dashboard', route.name === 'dashboard')}
      ${navLink('#/history', 'History', route.name === 'history')}
      ${navLink('#/settings', 'Settings', route.name === 'settings')}
    </nav>
    ${pageTemplate(route)}
    <footer class="app-footer">Summarises public posts only. Not financial advice. No trades are executed.</footer>
  `;
}
function pageTemplate(route) {
    if (route.name === 'history')
        return historyTemplate();
    if (route.name === 'settings')
        return settingsTemplate();
    if (route.name === 'signal')
        return signalDetailTemplate(findRecord(route.id));
    return dashboardTemplate();
}
function dashboardTemplate() {
    const latest = state.latestSignal;
    return `
    <section class="hero ${widgetTone(state.widget)}">
      <div>
        <p class="eyebrow">${escapeHtml(state.widget.title)}</p>
        <h1>${escapeHtml(state.widget.summary)}</h1>
        <p>${latest ? escapeHtml(latest.analysis.summary) : 'No potential buying signal detected in the latest posts.'}</p>
        <div class="hero-actions">
          <button id="refresh" class="button primary" type="button">Refresh analysis</button>
          ${latest ? `<a class="button secondary" href="#/signals/${latest.analysis.id}">Review details</a>` : ''}
        </div>
      </div>
      ${confidencePanel(latest)}
    </section>

    <section class="grid two">
      <article class="card">
        <div class="section-title"><span>Latest interpretation</span><strong>${latest ? levelLabel(latest.analysis.level) : 'No signal'}</strong></div>
        ${latest ? compactSignalTemplate(latest) : emptyState('No signal yet', 'Refresh or configure the X API to monitor live public posts.')}
      </article>
      <article class="card">
        <div class="section-title"><span>Widget scaffold</span><strong>${widgetColorLabel(state.widget.color)}</strong></div>
        ${widgetPreview(state.widget)}
        <p class="muted small">MVP uses a PWA home-screen icon and notifications. This widget preview defines the future native Android widget state and deep-link behavior.</p>
      </article>
    </section>

    <section class="card">
      <div class="section-title"><span>Recent Serenity posts</span><strong>${state.records.length} analysed</strong></div>
      <div class="post-list">${state.records.map(postCardTemplate).join('')}</div>
    </section>
  `;
}
function historyTemplate() {
    return `
    <section class="page-heading"><h1>Signal history</h1><p>Every analysed mock or live Serenity post is stored in memory for this MVP session.</p></section>
    <section class="card"><div class="post-list">${state.records.map(postCardTemplate).join('')}</div></section>
  `;
}
function settingsTemplate() {
    const settings = state.settings;
    return `
    <section class="page-heading"><h1>Settings</h1><p>Configure how cautiously the app alerts you. Settings are saved on this device, so you can tune notification behavior while testing.</p></section>
    <section class="grid two">
      <article class="card settings-card">
        <div class="section-title"><span>Notifications</span><strong>${selectedNotificationPermission}</strong></div>
        <label class="setting-toggle"><input id="notify-high" type="checkbox" ${settings.notifyHighConfidence ? 'checked' : ''}> High-confidence alerts</label>
        <label class="setting-toggle"><input id="notify-possible" type="checkbox" ${settings.notifyPossibleSignals ? 'checked' : ''}> Possible-signal alerts</label>
        <label class="setting-label">High threshold <input id="high-threshold" type="number" min="1" max="100" value="${toPercent(settings.highConfidenceThreshold)}"></label>
        <label class="setting-label">Possible threshold <input id="possible-threshold" type="number" min="1" max="100" value="${toPercent(settings.possibleSignalThreshold)}"></label>
        <button id="save-settings" class="button secondary full" type="button">Save settings on this device</button>
        <button id="enable-notifications" class="button primary full" type="button">Enable browser notifications</button>
      </article>
      <article class="card settings-card">
        <div class="section-title"><span>Manual test post</span><strong>Client-only</strong></div>
        <label class="setting-label">Paste a Serenity-style post <textarea id="manual-post" rows="5" placeholder="Example: Added a starter position in $COIN here."></textarea></label>
        <button id="analyze-manual" class="button secondary full" type="button">Analyse pasted post</button>
      </article>
      <article class="card settings-card">
        <div class="section-title"><span>Data source</span><strong>${statusLabel(state.sourceStatus.mode)}</strong></div>
        ${settingRow('Monitored account', '@aleabitoreddit')}
        ${settingRow('Poll interval', `${settings.pollIntervalMinutes} minutes`)}
        ${settingRow('Last checked', formatDateTime(state.sourceStatus.checkedAt))}
        <p class="muted">${escapeHtml(state.sourceStatus.message)}</p>
      </article>
    </section>
  `;
}
function feedbackTemplate(record) {
    const current = feedbackBySignal[record.analysis.id];
    return `
    <div class="feedback-panel">
      <div><strong>Was this analysis useful?</strong><p class="muted small">Your feedback is saved locally and will guide future classifier tuning.</p></div>
      <div class="feedback-actions">
        ${feedbackButton(record.analysis.id, 'correct', 'Looks right', current)}
        ${feedbackButton(record.analysis.id, 'too_aggressive', 'Too aggressive', current)}
        ${feedbackButton(record.analysis.id, 'missed_signal', 'Missed signal', current)}
      </div>
    </div>
  `;
}
function feedbackButton(signalId, value, label, current) {
    return `<button class="button feedback-button ${current === value ? 'selected' : ''}" data-feedback-id="${signalId}" data-feedback-value="${value}" type="button">${label}</button>`;
}
function signalDetailTemplate(record) {
    if (!record) {
        return `<section class="card">${emptyState('Signal not found', 'Return to the dashboard and select a recent post.')}</section>`;
    }
    const asset = record.analysis.asset;
    return `
    <section class="detail-header ${record.analysis.level}">
      <a href="#/" class="back-link">← Dashboard</a>
      <p class="eyebrow">${levelLabel(record.analysis.level)} · ${toPercent(record.analysis.confidence)}% confidence</p>
      <h1>${escapeHtml(record.analysis.summary)}</h1>
    </section>
    <section class="grid two detail-grid">
      <article class="card">
        <div class="section-title"><span>Original post</span><strong>${formatDateTime(record.post.postedAt)}</strong></div>
        <blockquote>${escapeHtml(record.post.text)}</blockquote>
        <a class="button secondary full" href="${record.post.url}" target="_blank" rel="noreferrer">${externalPostLinkLabel(record.post.source)}</a>
      </article>
      <article class="card">
        <div class="section-title"><span>Asset</span><strong>${asset?.ticker ? `$${asset.ticker}` : 'Unknown'}</strong></div>
        ${asset ? `<p class="asset-name">${escapeHtml(asset.name)}</p>${asset.financeUrl ? `<a class="button primary full" href="${asset.financeUrl}" target="_blank" rel="noreferrer">Open Google Finance</a>` : ''}` : '<p class="muted">No asset was confidently extracted.</p>'}
      </article>
    </section>
    <section class="card">
      <div class="section-title"><span>Reasoning and uncertainty</span><strong>${record.analysis.modelVersion}</strong></div>
      <p>${escapeHtml(record.analysis.reasoning)}</p>
      <p class="muted">${escapeHtml(record.analysis.uncertainty)}</p>
      <div class="evidence-list">${record.analysis.evidence.map(evidenceChip).join('')}</div>
      ${feedbackTemplate(record)}
    </section>
  `;
}
function compactSignalTemplate(record) {
    return `
    <div class="compact-signal">
      <span class="level-dot ${record.analysis.level}"></span>
      <div><strong>${escapeHtml(record.analysis.summary)}</strong><p>${escapeHtml(record.analysis.reasoning)}</p></div>
    </div>
    <a class="button secondary full" href="#/signals/${record.analysis.id}">Open signal detail</a>
  `;
}
function postCardTemplate(record) {
    return `
    <a class="post-card" href="#/signals/${record.analysis.id}">
      <div class="post-meta"><span class="level-dot ${record.analysis.level}"></span><span>${levelLabel(record.analysis.level)}</span><span>${formatRelative(record.post.postedAt)}</span></div>
      <strong>${escapeHtml(record.analysis.asset?.ticker ? `$${record.analysis.asset.ticker}` : 'No ticker')}</strong>
      <p>${escapeHtml(record.post.text)}</p>
      <div class="post-footer"><span>${toPercent(record.analysis.confidence)}% confidence</span><span>${escapeHtml(record.analysis.asset?.name ?? 'No asset')}</span></div>
    </a>
  `;
}
function confidencePanel(record) {
    const confidence = record ? toPercent(record.analysis.confidence) : 0;
    return `
    <aside class="confidence-card" aria-label="Confidence score">
      <span>Confidence</span>
      <strong>${confidence}%</strong>
      <div class="meter"><span style="width:${confidence}%"></span></div>
      <small>${record ? formatRelative(record.post.postedAt) : 'Waiting for posts'}</small>
    </aside>
  `;
}
function externalPostLinkLabel(source) {
    return source === 'x' ? 'Open original post on X' : 'Open Serenity profile on X';
}
function widgetPreview(widget) {
    return `
    <div class="widget-preview ${widget.color}">
      <span>${widget.color === 'green' ? '●' : widget.color === 'amber' ? '◆' : '○'}</span>
      <div><strong>${escapeHtml(widget.title)}</strong><p>${escapeHtml(widget.summary)}</p></div>
    </div>
  `;
}
function bindNavigation() {
    document.querySelector('#refresh')?.addEventListener('click', () => void refreshSignals(true));
    document.querySelector('#enable-notifications')?.addEventListener('click', () => void enableNotifications());
    document.querySelector('#save-settings')?.addEventListener('click', saveSettingsFromForm);
    document.querySelector('#analyze-manual')?.addEventListener('click', analyzeManualPost);
    document.querySelectorAll('[data-feedback-id]').forEach((button) => {
        button.addEventListener('click', () => saveFeedback(button.dataset.feedbackId, button.dataset.feedbackValue));
    });
}
async function enableNotifications() {
    if (!('Notification' in window) || !window.isSecureContext) {
        alert('Notifications require HTTPS, localhost, or an installed PWA in a supported browser.');
        return;
    }
    selectedNotificationPermission = await Notification.requestPermission();
    render();
}
async function maybeNotify(record) {
    if (!record || !shouldNotify(record) || selectedNotificationPermission !== 'granted') {
        return;
    }
    const registration = await registerServiceWorker();
    const title = record.analysis.level === 'high' ? 'Potential buying signal detected' : 'Possible signal needs review';
    const options = { body: record.analysis.summary, icon: './icons/icon.svg', data: { url: `./#/signals/${record.analysis.id}` } };
    if (registration?.showNotification) {
        await registration.showNotification(title, options);
    }
    else {
        new Notification(title, options);
    }
}
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
        return null;
    }
    return navigator.serviceWorker.register('./sw.js');
}
function saveSettingsFromForm() {
    const highThreshold = Number(document.querySelector('#high-threshold')?.value ?? toPercent(defaultSettings.highConfidenceThreshold));
    const possibleThreshold = Number(document.querySelector('#possible-threshold')?.value ?? toPercent(defaultSettings.possibleSignalThreshold));
    const nextSettings = {
        ...state.settings,
        notifyHighConfidence: Boolean(document.querySelector('#notify-high')?.checked),
        notifyPossibleSignals: Boolean(document.querySelector('#notify-possible')?.checked),
        highConfidenceThreshold: Math.max(0.01, Math.min(1, highThreshold / 100)),
        possibleSignalThreshold: Math.max(0.01, Math.min(1, possibleThreshold / 100))
    };
    state = { ...state, settings: nextSettings };
    saveSettings(nextSettings);
    render();
}
function analyzeManualPost() {
    const input = document.querySelector('#manual-post');
    const text = input?.value.trim();
    if (!text) {
        alert('Paste a post first.');
        return;
    }
    const post = {
        id: `manual_${Date.now()}`,
        accountId: 'manual_serenity_test',
        source: 'manual',
        authorHandle: 'aleabitoreddit',
        text,
        url: 'https://x.com/aleabitoreddit',
        postedAt: new Date().toISOString()
    };
    const posts = [post, ...state.records.map((record) => record.post)];
    const records = analyzePosts(posts);
    state = {
        ...state,
        records,
        latestSignal: latestNoteworthySignal(records),
        widget: createWidgetState(records),
        sourceStatus: { mode: 'mock', message: 'Manual post analysed on this device.', checkedAt: new Date().toISOString() }
    };
    persistLatestWidget(state.widget);
    window.location.hash = `#/signals/sig_${post.id}`;
    render();
}
function saveFeedback(signalId, value) {
    if (!signalId)
        return;
    feedbackBySignal = { ...feedbackBySignal, [signalId]: value };
    saveFeedbackMap(feedbackBySignal);
    render();
}
function shouldNotify(record) {
    if (!record || record.analysis.level === 'none')
        return false;
    if (record.analysis.level === 'high')
        return state.settings.notifyHighConfidence && record.analysis.confidence >= state.settings.highConfidenceThreshold;
    return state.settings.notifyPossibleSignals && record.analysis.confidence >= state.settings.possibleSignalThreshold;
}
function routeFromHash() {
    const hash = window.location.hash.replace(/^#/, '') || '/';
    if (hash === '/history')
        return { name: 'history' };
    if (hash === '/settings')
        return { name: 'settings' };
    const signalMatch = hash.match(/^\/signals\/(.+)$/);
    if (signalMatch?.[1])
        return { name: 'signal', id: signalMatch[1] };
    return { name: 'dashboard' };
}
function findRecord(signalId) {
    return state.records.find((record) => record.analysis.id === signalId) ?? null;
}
function navLink(href, label, active) {
    return `<a class="tab ${active ? 'active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
}
function settingRow(label, value) {
    return `<div class="setting-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}
function evidenceChip(item) {
    return `<span class="evidence ${item.impact}">${escapeHtml(item.label)}</span>`;
}
function emptyState(title, text) {
    return `<div class="empty"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></div>`;
}
function setLoading(userInitiated) {
    if (!userInitiated)
        return;
    const button = document.querySelector('#refresh');
    if (button) {
        button.disabled = true;
        button.textContent = 'Refreshing…';
    }
}
function persistLatestWidget(widget) {
    try {
        localStorage.setItem('serenity-widget-preview', JSON.stringify(widget));
    }
    catch {
        // Ignore private-mode storage errors.
    }
}
function loadSettings() {
    try {
        const saved = localStorage.getItem('serenity-settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }
    catch {
        return defaultSettings;
    }
}
function saveSettings(settings) {
    try {
        localStorage.setItem('serenity-settings', JSON.stringify(settings));
    }
    catch {
        // Ignore private-mode storage errors.
    }
}
function loadFeedback() {
    try {
        const saved = localStorage.getItem('serenity-feedback');
        return saved ? JSON.parse(saved) : {};
    }
    catch {
        return {};
    }
}
function saveFeedbackMap(feedback) {
    try {
        localStorage.setItem('serenity-feedback', JSON.stringify(feedback));
    }
    catch {
        // Ignore private-mode storage errors.
    }
}
function createStaticMockResponse(message) {
    const records = analyzePosts(createMockSerenityPosts());
    return {
        records,
        latestSignal: latestNoteworthySignal(records),
        widget: createWidgetState(records),
        settings: defaultSettings,
        sourceStatus: { mode: 'mock', message, checkedAt: new Date().toISOString() }
    };
}
function statusLabel(mode) {
    return mode === 'live' ? 'Live X' : mode === 'mock' ? 'Mock data' : 'Needs attention';
}
function levelLabel(level) {
    return level === 'high' ? 'Potential signal' : level === 'possible' ? 'Possible signal' : 'No signal';
}
function widgetTone(widget) {
    return widget.color === 'green' ? 'hero-green' : widget.color === 'amber' ? 'hero-amber' : 'hero-grey';
}
function widgetColorLabel(color) {
    return color === 'green' ? 'Green' : color === 'amber' ? 'Amber' : 'Grey';
}
function formatRelative(dateValue) {
    const diff = Math.max(1, Math.round((Date.now() - Date.parse(dateValue)) / 60_000));
    if (diff < 60)
        return `${diff}m ago`;
    const hours = Math.round(diff / 60);
    return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}
function formatDateTime(dateValue) {
    return new Date(dateValue).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
