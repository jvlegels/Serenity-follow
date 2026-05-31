import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { createMockSerenityPosts } from '../data/mockSerenityPosts.js';
import { AdviceStore } from './adviceStore.js';
import { activeSourceAdapter } from './sourceAdapters.js';
import { hasXApiCredentials } from './xClient.js';
const port = Number(process.env.PORT ?? 8787);
const scheduledPollMinutes = Number(process.env.SCHEDULED_POLL_MINUTES ?? 0);
const root = process.cwd();
const store = new AdviceStore();
store.ingest(createMockSerenityPosts());
const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json; charset=utf-8'
};
createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    if (request.method === 'OPTIONS') {
        writeCors(response, 204);
        response.end();
        return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
        const adapter = activeSourceAdapter();
        json(response, 200, { ok: true, mode: hasXApiCredentials() ? 'live-ready' : 'mock', source: adapter.label, scheduledPollMinutes, checkedAt: new Date().toISOString() });
        return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/api/signals') {
        const mode = hasXApiCredentials() ? 'live' : 'mock';
        const message = hasXApiCredentials()
            ? 'Live X API credentials are configured. Use Refresh to poll for the latest public posts.'
            : 'Mock mode is active. Add X_BEARER_TOKEN to enable live public X monitoring.';
        json(response, 200, store.response(mode, message));
        return;
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/poll') {
        await pollSignals(response);
        return;
    }
    if (request.method === 'GET') {
        serveStatic(request, response);
        return;
    }
    json(response, 404, { message: 'Not found' });
}).listen(port, () => {
    console.log(`Serenity Follow listening at http://localhost:${port}`);
    console.log(hasXApiCredentials() ? 'Live X API mode is configured.' : 'Mock mode is active. Set X_BEARER_TOKEN for live public X monitoring.');
    startScheduledPolling();
});
async function pollSignals(response) {
    const result = await pollActiveSource();
    json(response, result.ok ? 200 : 503, result.payload);
}
async function pollActiveSource() {
    const adapter = activeSourceAdapter();
    try {
        const posts = await adapter.fetchLatest();
        store.ingest(posts);
        const mode = adapter.kind === 'x' ? 'live' : 'mock';
        const credentialHint = adapter.kind === 'mock' ? ' Add X_BEARER_TOKEN to poll public X posts.' : '';
        return { ok: true, payload: store.response(mode, `${adapter.label} refresh complete. ${posts.length} posts checked.${credentialHint}`) };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to poll the active source.';
        return { ok: false, payload: store.response('error', message) };
    }
}
function startScheduledPolling() {
    if (!Number.isFinite(scheduledPollMinutes) || scheduledPollMinutes <= 0) {
        return;
    }
    const intervalMs = scheduledPollMinutes * 60_000;
    console.log(`Scheduled polling enabled every ${scheduledPollMinutes} minute(s).`);
    setInterval(() => {
        void pollActiveSource();
    }, intervalMs);
}
function serveStatic(request, response) {
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const safePath = normalize(requestUrl.pathname).replace(/^(\.\.[/\\])+/, '');
    const relativePath = safePath === '/' ? 'index.html' : safePath;
    const candidates = [join(root, relativePath), join(root, 'public', relativePath)];
    const finalPath = candidates.find((path) => existsSync(path) && statSync(path).isFile()) ?? join(root, 'index.html');
    response.writeHead(200, {
        'Content-Type': contentTypes[extname(finalPath)] ?? 'application/octet-stream',
        'Cache-Control': cacheControlFor(finalPath)
    });
    createReadStream(finalPath).pipe(response);
}
function cacheControlFor(path) {
    const extension = extname(path);
    if (extension === '.html' || extension === '.js' || extension === '.css' || extension === '.webmanifest') {
        return 'no-cache, no-store, must-revalidate';
    }
    return 'public, max-age=3600';
}
function json(response, status, payload) {
    writeCors(response, status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(payload));
}
function writeCors(response, status, headers = {}) {
    response.writeHead(status, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        ...headers
    });
}
