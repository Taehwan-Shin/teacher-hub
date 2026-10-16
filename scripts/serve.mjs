import http from 'node:http';
import { readFile } from 'node:fs/promises';
const root = new URL('../site/', import.meta.url);
const files = new Map([['index.html','text/html; charset=utf-8'], ['styles.css','text/css; charset=utf-8'], ['app.mjs','text/javascript; charset=utf-8'], ['art.svg','image/svg+xml'], ['hubs.json','application/json; charset=utf-8'], ['feedback-config.json','application/json; charset=utf-8'], ['feedback-client.mjs','text/javascript; charset=utf-8'], ['feedback-view.mjs','text/javascript; charset=utf-8'], ['feedback-validation.mjs','text/javascript; charset=utf-8']]);
files.set('register-hub.mjs','text/javascript; charset=utf-8');
files.set('registration-validation.mjs','text/javascript; charset=utf-8');
const server = http.createServer(async (req, res) => {
  const name = req.url === '/' ? 'index.html' : req.url?.slice(1);
  if (req.method !== 'GET' || !files.has(name)) { res.writeHead(404); res.end(); return; }
  try { const data = await readFile(new URL(name, root)); res.writeHead(200, { 'Content-Type': files.get(name), 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-store' }); res.end(data); }
  catch { res.writeHead(404); res.end(); }
});
server.listen(4188, '127.0.0.1', () => console.log('http://127.0.0.1:4188'));
