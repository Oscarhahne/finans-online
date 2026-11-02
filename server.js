// Webbserver och spelrum. Starta med: npm install && npm start
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const G = require('./game.js');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const BOT_DELAY = Number(process.env.BOT_DELAY ?? 2700);
const DICE_TIME = 1600, POPUP_CARD = 6200, POPUP_DRAW = 5200, POPUP_EVENT = 2200; // Samma tider som i webbläsaren, plus lite marginal.
const TURN_LIMIT = Number(process.env.TURN_LIMIT ?? 120000); // Tid innan spelet agerar åt en spelare
const GONE_LIMIT = Number(process.env.GONE_LIMIT ?? 20000); // Kortare tid om spelaren tappat kontakten
const MAX_ROOMS = 300;
const LOBBY_GRACE = Number(process.env.LOBBY_GRACE ?? 300000); // Så länge väntar en plats i lobbyn på den som tappat kontakten
const freeShape = (r) => [0, 1, 2, 3, 4, 5].find((k) => !r.members.some((x) => x.shape === k));
const freeColor = (r) => [0, 1, 2, 3, 4, 5].find((k) => !r.members.some((x) => x.color === k));
const hostOf = (r) => r.members.find((x) => !x.bot && x.ws) || r.members.find((x) => !x.bot);

const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('Hittades inte'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, maxPayload: 4096 });
const rooms = new Map();
const code = () => { for (;;) { const c = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5); if (!rooms.has(c)) return c; } };
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);
const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };

function lobbyList() {
  return [...rooms.values()].filter((r) => !r.game && r.open && r.members.length < 6)
    .map((r) => ({ code: r.code, host: r.members[0]?.name || '', count: r.members.length })).slice(0, 30);
}
function broadcastList() { for (const c of wss.clients) if (!c.room) send(c, { t: 'list', rooms: lobbyList() }); }
function broadcast(r) {
  const base = {
    t: 'state', code: r.code, open: r.open, target: r.target,
    members: r.members.map((m) => ({ id: m.id, name: m.name, bot: !!m.bot, shape: m.shape, color: m.color, online: m.bot || !!m.ws })),
    host: hostOf(r)?.id,
    game: r.game ? G.publicView(r.game) : null,
  };
  for (const m of r.members) if (m.ws) send(m.ws, { ...base, you: m.id });
  r.touched = Date.now();
  schedule(r);
}
// Datorspelaren väntar tills tärningen har rullat, pjäsen har gått färdigt och popup-rutorna har stängts.
function botWait(r, g) {
  const now = Date.now(); const roll = g.lastRoll; r.hold = Math.max(r.hold || 0, now); r.anim = Math.max(r.anim || 0, now);
  if (roll && roll.id !== r.seenRoll) { r.seenRoll = roll.id; const walk = roll.path ? Math.min(1900, (roll.path.length - 1) * 220) : 0; r.anim = now + (BOT_DELAY >= 500 ? DICE_TIME : 0) + walk; r.hold = Math.max(r.hold, now + BOT_DELAY + walk); }
  if (BOT_DELAY >= 500) {
    if (g.cardNo !== r.seenCard) { if (r.seenCard !== undefined && g.lastCard) r.hold = Math.max(r.hold, r.anim + POPUP_CARD); r.seenCard = g.cardNo; }
    if (g.drawNo !== r.seenDraw) { if (r.seenDraw !== undefined) r.hold = Math.max(r.hold, r.anim + DICE_TIME + POPUP_DRAW); r.seenDraw = g.drawNo; }
    if (g.eventNo !== r.seenEvent) { if (r.seenEvent !== undefined) { const ev = g.events[g.events.length - 1]; r.hold = Math.max(r.hold, r.anim + (ev && ev.ms ? ev.ms + 200 : POPUP_EVENT)); } r.seenEvent = g.eventNo; }
  }
  return Math.max(BOT_DELAY >= 500 ? 300 : BOT_DELAY, r.hold - now);
}
function schedule(r) {
  clearTimeout(r.timer);
  const g = r.game; if (!g || g.phase !== 'play') return;
  const id = G.actor(g); const m = r.members.find((x) => x.id === id); if (!m) return;
  const delay = m.bot ? botWait(r, g) : (m.ws ? TURN_LIMIT : GONE_LIMIT);
  r.timer = setTimeout(() => {
    try {
      if (!r.game || r.game.phase !== 'play') return;
      const now = G.actor(r.game); if (now !== id) return;
      G.apply(r.game, id, G.botAction(r.game, id, !m.bot));
    } catch (e) { console.error('Automatisk handling misslyckades', e.message); }
    broadcast(r);
  }, delay);
}
function dropIfEmpty(r) {
  if (r.members.some((x) => !x.bot)) return false;
  clearTimeout(r.timer); rooms.delete(r.code); return true;
}
function leave(ws, explicit) {
  const r = ws.room; if (!r) return;
  const m = r.members.find((x) => x.ws === ws); ws.room = null;
  if (m) {
    m.ws = null;
    if (!r.game && explicit) r.members = r.members.filter((x) => x !== m);
    else if (!r.game) {
      // Mobiler tappar anslutningen när man byter app, till exempel för att dela länken.
      clearTimeout(m.graceTimer);
      m.graceTimer = setTimeout(() => {
        if (m.ws || r.game || !rooms.has(r.code)) return;
        r.members = r.members.filter((x) => x !== m);
        if (!dropIfEmpty(r)) broadcast(r);
        broadcastList();
      }, LOBBY_GRACE);
      m.graceTimer.unref();
    }
  }
  if (!dropIfEmpty(r)) broadcast(r);
  broadcastList();
}
function join(ws, r, name) {
  if (r.game) return send(ws, { t: 'error', msg: 'Spelet har redan börjat. Be värden starta ett nytt spel och skicka en ny länk.' });
  if (r.members.length >= 6) return send(ws, { t: 'error', msg: 'Spelet är fullt.' });
  const m = { id: crypto.randomUUID(), token: crypto.randomBytes(16).toString('hex'), name: clean(name, 16) || 'Spelare', ws };
  m.shape = freeShape(r); m.color = freeColor(r); r.members.push(m); ws.room = r;
  send(ws, { t: 'joined', code: r.code, token: m.token });
  broadcast(r); broadcastList();
}

wss.on('connection', (ws) => {
  let burst = 0; const reset = setInterval(() => { burst = 0; }, 1000);
  send(ws, { t: 'list', rooms: lobbyList() });
  ws.on('close', () => { clearInterval(reset); leave(ws); });
  ws.on('error', () => {});
  ws.on('message', (raw) => {
    if (++burst > 30) return;
    let a; try { a = JSON.parse(raw); } catch { return; }
    if (!a || typeof a !== 'object') return;
    const r = ws.room;
    try {
      if (a.t === 'create') {
        if (r) return; if (rooms.size >= MAX_ROOMS) return send(ws, { t: 'error', msg: 'Servern är full just nu.' });
        const nr = { code: code(), members: [], game: null, open: a.open !== false, target: 1000000, touched: Date.now() };
        rooms.set(nr.code, nr); join(ws, nr, a.name);
      } else if (a.t === 'join') {
        if (r) return; const nr = rooms.get(clean(a.code, 5).toUpperCase());
        if (!nr) return send(ws, { t: 'error', msg: 'Hittade inget spel med den koden.' });
        join(ws, nr, a.name);
      } else if (a.t === 'resume') {
        if (r) return; const nr = rooms.get(clean(a.code, 5).toUpperCase()); const m = nr && nr.members.find((x) => x.token === a.token);
        if (!m) return send(ws, { t: 'resumeFailed' });
        if (m.ws && m.ws !== ws) { m.ws.room = null; m.ws.close(); }
        clearTimeout(m.graceTimer); m.ws = ws; ws.room = nr; send(ws, { t: 'joined', code: nr.code, token: m.token }); broadcast(nr);
      } else if (a.t === 'list') {
        send(ws, { t: 'list', rooms: lobbyList() });
      } else if (a.t === 'leave') {
        const m = r && r.members.find((x) => x.ws === ws);
        if (m) m.token = null;
        leave(ws, true); send(ws, { t: 'left' }); send(ws, { t: 'list', rooms: lobbyList() });
      } else if (r) {
        const me = r.members.find((x) => x.ws === ws); if (!me) return;
        const host = hostOf(r) === me;
        if (a.t === 'color') {
          const k = Number(a.color); if (r.game || !Number.isInteger(k) || k < 0 || k > 5 || r.members.some((x) => x !== me && x.color === k)) return;
          me.color = k; broadcast(r);
        } else if (a.t === 'shape') {
          const k = Number(a.shape); if (r.game || !Number.isInteger(k) || k < 0 || k > 5 || r.members.some((x) => x !== me && x.shape === k)) return;
          me.shape = k; broadcast(r);
        } else if (a.t === 'addBot') {
          if (!host || r.game || r.members.length >= 6) return;
          const n = r.members.filter((x) => x.bot).length + 1;
          r.members.push({ id: crypto.randomUUID(), name: 'Dator ' + n, bot: true, ws: null, shape: freeShape(r), color: freeColor(r) }); broadcast(r); broadcastList();
        } else if (a.t === 'removeBot') {
          if (!host || r.game) return; const b = [...r.members].reverse().find((x) => x.bot);
          if (b) r.members = r.members.filter((x) => x !== b); broadcast(r); broadcastList();
        } else if (a.t === 'config') {
          if (!host || r.game) return; if ([500000, 1000000].includes(a.target)) r.target = a.target;
          if (typeof a.open === 'boolean') r.open = a.open; broadcast(r); broadcastList();
        } else if (a.t === 'start') {
          if (!host || r.game) return; if (r.members.length < 2) return send(ws, { t: 'error', msg: 'Det behövs minst två spelare.' });
          r.game = G.newGame(r.members, { target: r.target }); broadcast(r); broadcastList();
        } else if (a.t === 'action' && r.game) {
          G.apply(r.game, me.id, a.action || {}); broadcast(r);
        }
      }
    } catch (e) {
      if (e.userError) send(ws, { t: 'error', msg: e.message }); else { console.error(e); send(ws, { t: 'error', msg: 'Något gick fel på servern.' }); }
    }
  });
});
// Rensa gamla rum.
setInterval(() => { const old = Date.now() - 6 * 3600 * 1000; for (const [c, r] of rooms) if (r.touched < old) { clearTimeout(r.timer); rooms.delete(c); } }, 600000).unref();
const hb = setInterval(() => { for (const c of wss.clients) { if (c.readyState === 1) c.ping(); } }, 30000); hb.unref();

server.listen(PORT, () => console.log(`Spelet körs på http://localhost:${PORT}`));
