import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { createMockSerenityPosts } from '../data/mockSerenityPosts.js';
import { AdviceStore } from './adviceStore.js';
import { fetchSerenityPostsFromX, hasXApiCredentials } from './xClient.js';

const port = Number(process.env.PORT ?? 8787);
const root = process.cwd();
const store = new AdviceStore();
store.ingest(createMockSerenityPosts());

const contentTypes: Record<string, string> = {
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
    json(response, 200, { ok: true, mode: hasXApiCredentials() ? 'live-ready' : 'mock', checkedAt: new Date().toISOString() });
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
});

async function pollSignals(response: ServerResponse): Promise<void> {
  if (!hasXApiCredentials()) {
    store.ingest(createMockSerenityPosts());
    json(response, 200, store.response('mock', 'Mock refresh complete. Add X_BEARER_TOKEN to poll public X posts.'));
    return;
  }

  try {
    const posts = await fetchSerenityPostsFromX();
    store.ingest(posts);
    json(response, 200, store.response('live', `Live public X refresh complete. ${posts.length} recent posts checked.`));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to poll X.';
    json(response, 503, store.response('error', message));
  }
}

function serveStatic(request: IncomingMessage, response: ServerResponse): void {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const safePath = normalize(requestUrl.pathname).replace(/^(\.\.[/\\])+/, '');
  const relativePath = safePath === '/' ? 'index.html' : safePath;
  const candidates = [join(root, relativePath), join(root, 'public', relativePath)];
  const finalPath = candidates.find((path) => existsSync(path) && statSync(path).isFile()) ?? join(root, 'index.html');
  response.writeHead(200, { 'Content-Type': contentTypes[extname(finalPath)] ?? 'application/octet-stream' });
  createReadStream(finalPath).pipe(response);
}

function json(response: ServerResponse, status: number, payload: unknown): void {
  writeCors(response, status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function writeCors(response: ServerResponse, status: number, headers: Record<string, string> = {}): void {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers
  });
}
