import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { AdviceStore } from './adviceStore.js';
import { createSamplePosts } from './samplePosts.js';
import { fetchSerenityPosts, hasXCredentials } from './xClient.js';

const port = Number(process.env.PORT ?? 8787);
const root = process.cwd();
const store = new AdviceStore();
store.ingest(createSamplePosts());

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function json(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  response.end(JSON.stringify(payload));
}

function serveStatic(request, response) {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host}`);
  const safePath = normalize(requestUrl.pathname).replace(/^(\.\.[/\\])+/, '');
  const relativePath = safePath === '/' ? 'index.html' : safePath;
  const appPath = join(root, relativePath);
  const publicPath = join(root, 'public', relativePath);
  const finalPath = existsSync(appPath) && statSync(appPath).isFile()
    ? appPath
    : existsSync(publicPath) && statSync(publicPath).isFile()
      ? publicPath
      : join(root, 'index.html');
  response.writeHead(200, { 'Content-Type': contentTypes[extname(finalPath)] ?? 'application/octet-stream' });
  createReadStream(finalPath).pipe(response);
}

createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host}`);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    response.end();
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/advice') {
    json(response, 200, { latestBuy: store.latestBuy() ?? null, items: store.latest(), source: hasXCredentials() ? 'live-ready' : 'demo' });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/poll') {
    if (!hasXCredentials()) {
      const items = store.ingest(createSamplePosts());
      json(response, 200, {
        message: 'Demo mode: refresh worked. Add X_BEARER_TOKEN on the server for live public Serenity posts from X.',
        source: 'demo',
        latestBuy: store.latestBuy() ?? null,
        items
      });
      return;
    }

    try {
      const posts = await fetchSerenityPosts();
      const items = store.ingest(posts);
      json(response, 200, { latestBuy: store.latestBuy() ?? null, items, source: 'live', message: `Checked public X posts at ${new Date().toLocaleTimeString()}` });
    } catch (error) {
      json(response, 503, {
        message: error instanceof Error ? error.message : 'Unable to poll X.',
        source: 'stale',
        latestBuy: store.latestBuy() ?? null,
        items: store.latest()
      });
    }
    return;
  }

  if (request.method === 'GET') {
    serveStatic(request, response);
    return;
  }

  json(response, 404, { message: 'Not found' });
}).listen(port, () => {
  console.log(`Serenity Follow app listening at http://localhost:${port}`);
});
