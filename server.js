// X bookmark gallery — tiny private web app.
// - View is protected with HTTP Basic Auth (VIEW_USER / VIEW_PASSWORD).
// - Data is pushed in by the daily routine via POST /api/update?token=UPDATE_TOKEN.
// - The gallery page loads X (pbs.twimg.com) images directly in the browser — a normal
//   server has no CSP blocking them, so unlike a Claude Artifact the images show.

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const VIEW_USER = process.env.VIEW_USER || 'user';
const VIEW_PASSWORD = process.env.VIEW_PASSWORD || '';
const UPDATE_TOKEN = process.env.UPDATE_TOKEN || '';
// Mount a Railway Volume here (set DATA_DIR to the mount path) so data survives redeploys.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'gallery.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

// --- Basic auth for viewing ---
function auth(req, res, next) {
  if (!VIEW_PASSWORD) return next(); // no password configured -> open (set one!)
  const header = req.headers.authorization || '';
  const [type, creds] = header.split(' ');
  if (type === 'Basic' && creds) {
    const decoded = Buffer.from(creds, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    const u = decoded.slice(0, idx);
    const p = decoded.slice(idx + 1);
    if (u === VIEW_USER && p === VIEW_PASSWORD) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="bookmark-gallery"');
  return res.status(401).send('認証が必要です');
}

// --- Update endpoint (token-protected). Accepts a raw text body (JSON as text) so a
//     cross-origin POST from x.com is a "simple request" and skips CORS preflight. ---
app.options('/api/update', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'content-type');
  res.status(204).end();
});
app.post('/api/update', express.text({ limit: '25mb', type: '*/*' }), (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (!UPDATE_TOKEN || req.query.token !== UPDATE_TOKEN) {
    return res.status(403).json({ error: 'invalid or missing token' });
  }
  let data;
  try {
    data = JSON.parse(req.body);
  } catch (e) {
    return res.status(400).json({ error: 'body is not valid JSON: ' + e.message });
  }
  const payload = { updatedAt: new Date().toISOString(), data };
  fs.writeFileSync(DATA_FILE, JSON.stringify(payload));
  const total = Object.values(data).reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0);
  return res.json({ ok: true, folders: Object.keys(data).length, items: total });
});

// --- Data feed (behind auth) ---
app.get('/data.json', auth, (req, res) => {
  if (!fs.existsSync(DATA_FILE)) return res.json({ updatedAt: null, data: {} });
  res.type('application/json').send(fs.readFileSync(DATA_FILE, 'utf8'));
});

// --- Gallery page + static assets (behind auth) ---
app.use('/', auth, express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => console.log('bookmark gallery listening on ' + PORT));
