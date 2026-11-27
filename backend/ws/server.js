'use strict';
const http = require('http');
const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');
const WORDS = require('./words');

const PORT = parseInt(process.env.PORT || '10000', 10);
const UP_PORT = parseInt(process.env.UPSTREAM_PORT || '8080', 10);
const UP_HOST = '127.0.0.1';
const S = 4000; // stroke coordinate scale

/* ---------------- reverse proxy: everything except /ws goes to Apache/Laravel ---------------- */
const server = http.createServer((req, res) => {
  if (req.url === '/ws-up') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ws: true, rooms: rooms.size })); return; }
  const upstream = http.request({ host: UP_HOST, port: UP_PORT, method: req.method, path: req.url, headers: req.headers }, (up) => {
    res.writeHead(up.statusCode || 502, up.headers);
    up.pipe(res);
  });
  upstream.on('error', () => { if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' }); res.end('{"message":"upstream starting"}'); });
  req.pipe(upstream);
});

/* ---------------- text normalisation for guesses ---------------- */
function norm(s) {
  return String(s || '').toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function lev1(a, b) { // true when edit distance <= 1
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/* ---------------- rooms ---------------- */
const rooms = new Map();
const rnd = (n) => Math.floor(Math.random() * n);
const now = () => Date.now();

function newRoom(code) {
  return {
    code, players: new Map(), order: [], phase: 'lobby',
    settings: { rounds: 3, time: 80, locale: 'en' },
    round: 0, turn: -1, drawer: null, choices: [], word: '', revealed: new Set(),
    strokes: [], guessed: new Map(), endsAt: 0, nextHintAt: 0, used: new Set(), turnPoints: [], last: now(), drawerGoneAt: 0, reveal: null,
  };
}
const send = (p, msg) => { if (p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify(msg)); };
const toAll = (room, msg, except) => { const raw = JSON.stringify(msg); for (const p of room.players.values()) if (p.id !== except && p.ws && p.ws.readyState === 1) p.ws.send(raw); };

function hintFor(room) {
  if (!room.word) return '';
  const chars = [...room.word];
  return chars.map((ch, i) => (ch === ' ' || ch === '-' ? ch : room.revealed.has(i) ? ch : '_')).join('');
}
function view(room, p, withStrokes) {
  const showWord = (p.id === room.drawer && room.phase === 'drawing') || room.phase === 'turnEnd' || room.phase === 'over';
  return {
    t: 'state', phase: room.phase, settings: room.settings, round: room.round, rounds: room.settings.rounds,
    drawer: room.drawer, host: room.hostId, me: p.id, endsAt: room.endsAt, serverNow: now(),
    players: [...room.players.values()].map((q) => ({ id: q.id, name: q.name, score: q.score, guessed: room.guessed.has(q.id), online: !!(q.ws && q.ws.readyState === 1) })),
    hint: showWord ? room.word : hintFor(room), wordLen: [...room.word].length,
    choices: p.id === room.drawer && room.phase === 'choosing' ? room.choices : null,
    turnPoints: room.phase === 'turnEnd' || room.phase === 'over' ? room.turnPoints : null,
    strokes: withStrokes ? room.strokes : undefined,
  };
}
function broadcastState(room) { for (const p of room.players.values()) send(p, view(room, p)); }
function sys(room, text, extra) { toAll(room, { t: 'chat', kind: 'sys', text, ...extra }); }

function startGame(room) {
  const ids = [...room.players.values()].filter((p) => p.ws && p.ws.readyState === 1).map((p) => p.id);
  if (ids.length < 2) return false;
  room.order = ids; room.round = 1; room.turn = -1; room.used = new Set();
  for (const p of room.players.values()) p.score = 0;
  nextTurn(room);
  return true;
}
function nextTurn(room) {
  room.turn += 1;
  if (room.turn >= room.order.length) { room.turn = 0; room.round += 1; room.order = [...room.players.values()].map((p) => p.id); }
  if (room.round > room.settings.rounds) { room.phase = 'over'; room.drawer = null; room.endsAt = 0; broadcastState(room); return; }
  let drawer = room.order[room.turn];
  const dp = room.players.get(drawer);
  if (!dp || !dp.ws || dp.ws.readyState !== 1) { // skip absent drawers
    if (room.order.some((id) => { const q = room.players.get(id); return q && q.ws && q.ws.readyState === 1; })) return nextTurn(room);
    room.phase = 'over'; broadcastState(room); return;
  }
  room.drawer = drawer; room.phase = 'choosing'; room.word = ''; room.revealed = new Set(); room.strokes = [];
  room.guessed = new Map(); room.turnPoints = []; room.drawerGoneAt = 0;
  const bank = WORDS[room.settings.locale] || WORDS.en;
  const pool = bank.filter((w) => !room.used.has(w));
  const src = pool.length >= 3 ? pool : bank;
  const picks = new Set();
  while (picks.size < 3) picks.add(src[rnd(src.length)]);
  room.choices = [...picks];
  room.endsAt = now() + 15000;
  toAll(room, { t: 'clear' });
  broadcastState(room);
}
function beginDrawing(room, word) {
  room.word = word; room.used.add(word); room.phase = 'drawing'; room.choices = [];
  room.endsAt = now() + room.settings.time * 1000;
  room.nextHintAt = now() + room.settings.time * 1000 * 0.45;
  broadcastState(room);
}
function endTurn(room, why) {
  if (room.phase !== 'drawing' && room.phase !== 'choosing') return;
  if (room.phase === 'drawing') {
    const gs = [...room.guessed.values()];
    const others = Math.max(1, [...room.players.values()].filter((p) => p.id !== room.drawer).length);
    const bonus = gs.length ? Math.round(gs.reduce((a, b) => a + b, 0) / others) : 0;
    const d = room.players.get(room.drawer);
    if (d) d.score += bonus;
    room.turnPoints = [...room.players.values()].map((p) => ({ id: p.id, pts: p.id === room.drawer ? bonus : room.guessed.get(p.id) || 0 }));
  }
  room.phase = 'turnEnd'; room.endsAt = now() + 6000; room.reveal = why;
  if (!room.word) room.word = '';
  broadcastState(room);
}
function tick(room) {
  const t = now();
  if (room.phase === 'choosing' && t >= room.endsAt) beginDrawing(room, room.choices[rnd(room.choices.length)]);
  else if (room.phase === 'drawing') {
    const d = room.players.get(room.drawer);
    const gone = !d || !d.ws || d.ws.readyState !== 1;
    if (gone) { if (!room.drawerGoneAt) room.drawerGoneAt = t; else if (t - room.drawerGoneAt > 8000) { sys(room, 'drawer-left'); endTurn(room, 'left'); return; } } else room.drawerGoneAt = 0;
    if (t >= room.endsAt) { endTurn(room, 'time'); return; }
    if (t >= room.nextHintAt) {
      const chars = [...room.word];
      const hidden = chars.map((c, i) => i).filter((i) => chars[i] !== ' ' && chars[i] !== '-' && !room.revealed.has(i));
      if (hidden.length > Math.ceil(chars.length / 2)) { room.revealed.add(hidden[rnd(hidden.length)]); toAll(room, { t: 'hint', hint: hintFor(room) }, room.drawer); }
      room.nextHintAt = t + (room.settings.time * 1000) * 0.2;
    }
  } else if (room.phase === 'turnEnd' && t >= room.endsAt) nextTurn(room);
  else if (room.phase === 'choosing') { const d = room.players.get(room.drawer); if (!d || !d.ws || d.ws.readyState !== 1) { room.drawerGoneAt = room.drawerGoneAt || t; if (t - room.drawerGoneAt > 5000) { endTurn(room, 'left'); } } }
}
setInterval(() => {
  for (const [code, room] of rooms) {
    try { tick(room); } catch (e) { console.error('tick', e); }
    const anyone = [...room.players.values()].some((p) => p.ws && p.ws.readyState === 1);
    if (anyone) room.last = now(); else if (now() - room.last > 30 * 60 * 1000) rooms.delete(code);
  }
}, 400);

/* ---------------- identity: ask Laravel (same container) who this token is ---------------- */
function fetchParty(code, token) {
  return new Promise((resolve) => {
    const req = http.request({ host: UP_HOST, port: UP_PORT, path: `/api/v1/parties/${encodeURIComponent(code)}`, method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', Host: 'localhost' }, timeout: 8000 }, (r) => {
      let body = ''; r.on('data', (c) => (body += c));
      r.on('end', () => { try { resolve(r.statusCode === 200 ? JSON.parse(body).data : null); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null)); req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

function handleGuess(room, p, text) {
  const raw = String(text || '').slice(0, 80).trim();
  if (!raw) return;
  if (room.phase !== 'drawing') { toAll(room, { t: 'chat', kind: 'msg', from: p.id, text: raw }); return; }
  const target = norm(room.word);
  const g = norm(raw);
  if (p.id === room.drawer) {
    if (g && (g === target || g.includes(target) || (target.length > 3 && target.includes(g) && g.length > 3))) { send(p, { t: 'chat', kind: 'sys', text: 'no-spoil' }); return; }
    toAll(room, { t: 'chat', kind: 'msg', from: p.id, text: raw }); return;
  }
  if (room.guessed.has(p.id)) { // already solved: only other solvers + drawer see it
    for (const q of room.players.values()) if (q.id === room.drawer || room.guessed.has(q.id)) send(q, { t: 'chat', kind: 'msg', from: p.id, text: raw, private: true });
    return;
  }
  if (g === target) {
    const total = room.settings.time * 1000;
    const left = Math.max(0, room.endsAt - now());
    const pts = 50 + Math.round(450 * (left / total));
    room.guessed.set(p.id, pts); p.score += pts;
    toAll(room, { t: 'chat', kind: 'correct', from: p.id, pts });
    broadcastState(room);
    const others = [...room.players.values()].filter((q) => q.id !== room.drawer && q.ws && q.ws.readyState === 1);
    if (others.length && others.every((q) => room.guessed.has(q.id))) endTurn(room, 'all');
    return;
  }
  toAll(room, { t: 'chat', kind: 'msg', from: p.id, text: raw });
  if (target.length >= 4 && lev1(g, target)) send(p, { t: 'chat', kind: 'close' });
}

function validStroke(m) {
  return typeof m.id === 'number' && typeof m.c === 'string' && /^#[0-9a-fA-F]{6}$/.test(m.c) && typeof m.w === 'number';
}
const clampInt = (v) => Math.max(0, Math.min(S, Math.round(Number(v) || 0)));

const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024, perMessageDeflate: false });
server.on('upgrade', (req, socket, head) => {
  if (!String(req.url).startsWith('/ws')) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws) => {
  let room = null, player = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  let bucket = 40, lastRefill = now();
  ws.on('message', async (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    const tn = now(); bucket = Math.min(120, bucket + (tn - lastRefill) / 8); lastRefill = tn; // ~125 msgs/s
    if (--bucket < 0) return;
    if (m.t === 'ping') { ws.send(JSON.stringify({ t: 'pong', n: m.n })); return; }
    if (m.t === 'hello') {
      if (room) return;
      const party = await fetchParty(String(m.code || '').toUpperCase(), String(m.token || ''));
      if (!party || party.game !== 'draw') { ws.send(JSON.stringify({ t: 'error', error: party ? 'wrong-game' : 'auth' })); ws.close(); return; }
      const code = party.code;
      let existing = rooms.get(code);
      if (existing && existing.phase === 'over' && ![...existing.players.values()].some((q) => q.ws && q.ws.readyState === 1)) existing = null; // stale finished game: start clean
      room = existing || newRoom(code); rooms.set(code, room);
      const host = party.members.find((x) => x.is_host);
      room.hostId = host ? host.id : room.hostId;
      for (const mem of party.members) {
        let q = room.players.get(mem.id);
        if (!q) { q = { id: mem.id, name: mem.name, score: 0, ws: null }; room.players.set(mem.id, q); }
        q.name = mem.name;
      }
      player = room.players.get(party.self_player_id);
      if (player.ws && player.ws !== ws) { try { player.ws.close(); } catch { /* */ } }
      player.ws = ws; room.last = now();
      send(player, view(room, player, true));
      for (const q of room.players.values()) if (q !== player) send(q, view(room, q));
      return;
    }
    if (!room || !player) return;
    const isDrawer = room.drawer === player.id && room.phase === 'drawing';
    switch (m.t) {
      case 'start': {
        if (player.id !== room.hostId || (room.phase !== 'lobby' && room.phase !== 'over')) return;
        const rounds = [1, 2, 3, 5].includes(m.rounds) ? m.rounds : 3;
        const time = [40, 60, 80, 100, 120].includes(m.time) ? m.time : 80;
        const locale = ['en', 'ar', 'de'].includes(m.locale) ? m.locale : 'en';
        room.settings = { rounds, time, locale };
        if (!startGame(room)) send(player, { t: 'chat', kind: 'sys', text: 'need-two' });
        return;
      }
      case 'lobby': if (player.id === room.hostId && room.phase === 'over') { room.phase = 'lobby'; room.strokes = []; room.word = ''; broadcastState(room); } return;
      case 'pick': {
        if (room.phase !== 'choosing' || room.drawer !== player.id) return;
        const w = room.choices[m.i | 0]; if (w) beginDrawing(room, w); return;
      }
      case 'sb': { // stroke begin
        if (!isDrawer || !validStroke(m) || room.strokes.length > 1500) return;
        const w = Math.max(1, Math.min(60, m.w));
        const st = { id: m.id, c: m.c, w, p: [clampInt(m.x), clampInt(m.y)] };
        room.strokes.push(st);
        toAll(room, { t: 'sb', id: st.id, c: st.c, w: st.w, x: st.p[0], y: st.p[1] }, player.id);
        return;
      }
      case 'sp': { // stroke points (flat int array)
        if (!isDrawer || !Array.isArray(m.p) || m.p.length > 400) return;
        const st = room.strokes.find((s) => s.id === m.id); if (!st || st.p.length > 12000) return;
        const pts = m.p.map(clampInt); st.p.push(...pts);
        toAll(room, { t: 'sp', id: m.id, p: pts }, player.id);
        return;
      }
      case 'undo': if (isDrawer && room.strokes.length) { const s = room.strokes.pop(); toAll(room, { t: 'undo', id: s.id }, player.id); } return;
      case 'clear': if (isDrawer) { room.strokes = []; toAll(room, { t: 'clear' }, player.id); } return;
      case 'chat': handleGuess(room, player, m.text); return;
      default:
    }
  });
  ws.on('close', () => { if (room && player && player.ws === ws) { player.ws = null; broadcastState(room); } });
  ws.on('error', () => {});
});
setInterval(() => { for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; try { ws.ping(); } catch { /* */ } } }, 25000);

server.listen(PORT, '0.0.0.0', () => console.log(`[chanceclub] gateway on :${PORT} -> laravel :${UP_PORT}`));

if (process.env.SPAWN_APACHE === '1') {
  const apache = spawn('apache2-foreground', [], { stdio: 'inherit' });
  apache.on('exit', (code) => { console.error('apache exited', code); process.exit(1); });
  for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { apache.kill(sig); process.exit(0); });
}
