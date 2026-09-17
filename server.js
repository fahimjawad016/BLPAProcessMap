/* BLPA process map: page host and shared comment store. No dependencies. Node 18 or later.
   Run: node server.js            (PORT, DATA_DIR and HOST can be set in the environment)
   Serves the files in this folder (index.html by default) and keeps every comment in DATA_DIR/feedback.json.
   Comments are appended and edited, never deleted. Every change is also appended to DATA_DIR/feedback.log.jsonl. */
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = +(process.env.PORT || 8080), HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname, DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const FILE = path.join(DATA_DIR, 'feedback.json'), LOG = path.join(DATA_DIR, 'feedback.log.jsonl');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.csv': 'text/csv; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };
fs.mkdirSync(DATA_DIR, { recursive: true });
let comments = [];
try { comments = JSON.parse(fs.readFileSync(FILE, 'utf8')).comments || []; } catch (e) { comments = []; }
function persist(change){
  const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify({ saved: new Date().toISOString(), comments }, null, 1)); fs.renameSync(tmp, FILE);
  if (change) fs.appendFileSync(LOG, JSON.stringify(change) + '\n');
}
function send(res, code, body, type){ res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); }
function readJson(req){ return new Promise((resolve, reject) => { let d = ''; req.on('data', c => { d += c; if (d.length > 200000) { reject(new Error('too large')); req.destroy(); } }); req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { reject(e); } }); }); }
const clean = v => String(v ?? '').slice(0, 4000);
function validComment(c){ return c && typeof c === 'object' && clean(c.text).trim() && c.target && typeof c.target === 'object'; }
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (url.pathname === '/api/feedback' && req.method === 'GET') return send(res, 200, { count: comments.length, comments });
  if (url.pathname === '/api/feedback' && req.method === 'POST') {
    let c; try { c = await readJson(req); } catch (e) { return send(res, 400, { error: 'bad json' }); }
    if (!validComment(c)) return send(res, 400, { error: 'a comment needs text and a target' });
    const id = clean(c.id) || 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    if (comments.some(x => x.id === id)) return send(res, 200, { ok: true, id, existing: true });
    const rec = { id, target: c.target, name: clean(c.name), org: clean(c.org), text: clean(c.text), time: clean(c.time) || new Date().toISOString(), author: clean(c.author), received: new Date().toISOString() };
    comments.push(rec); persist({ op: 'add', at: rec.received, comment: rec }); return send(res, 201, { ok: true, id });
  }
  const m = url.pathname.match(/^\/api\/feedback\/([^/]+)$/);
  if (m && req.method === 'PUT') {
    let c; try { c = await readJson(req); } catch (e) { return send(res, 400, { error: 'bad json' }); }
    const rec = comments.find(x => x.id === decodeURIComponent(m[1])); if (!rec) return send(res, 404, { error: 'no such comment' });
    if (rec.author && clean(c.author) !== rec.author) return send(res, 403, { error: 'only the author can edit a comment' });
    if (!clean(c.text).trim()) return send(res, 400, { error: 'empty text' });
    const before = { text: rec.text, name: rec.name, org: rec.org }; rec.text = clean(c.text); if (c.name != null) rec.name = clean(c.name); if (c.org != null) rec.org = clean(c.org); rec.edited = new Date().toISOString();
    persist({ op: 'edit', at: rec.edited, id: rec.id, before, after: { text: rec.text, name: rec.name, org: rec.org } }); return send(res, 200, { ok: true });
  }
  if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not found' });
  // static files from this folder; index.html by default; nothing outside the folder and never the data folder
  let rel = decodeURIComponent(url.pathname); if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT) || file.startsWith(DATA_DIR) || path.basename(file) === 'server.js') return send(res, 404, 'not found', 'text/plain');
  fs.readFile(file, (err, buf) => { if (err) return send(res, 404, 'not found', 'text/plain'); send(res, 200, buf, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'); });
});
server.listen(PORT, HOST, () => console.log(`BLPA process map on http://${HOST}:${PORT}  comments in ${FILE}  (${comments.length} loaded)`));
