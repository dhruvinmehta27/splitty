// Runs api/sync.ts locally on http://localhost:3001 so sync can be tried before deploying.
// Reads SQLITECLOUD_URL from .env.local. Usage: npm run dev:api
import { createServer } from 'node:http';

process.loadEnvFile('.env.local');
const { default: handler } = await import('../api/sync.ts');

createServer(async (req, res) => {
  // The app's dev server runs on another port, so the browser needs CORS locally.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.end();
  if (req.url !== '/api/sync') return res.writeHead(404).end();

  let raw = '';
  for await (const chunk of req) raw += chunk;
  req.body = raw ? JSON.parse(raw) : undefined;
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return res;
  };
  await handler(req, res);
}).listen(3001, () => console.log('Sync API on http://localhost:3001/api/sync'));
