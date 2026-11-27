import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WS_URL, getToken } from '../api';
import type { Party } from '../api';
import type { Locale, Strings } from '../i18n';
import { Btn, Card, Seg } from '../components/ui';

/* Logical canvas is 800x600. Strokes travel as ints on a 0..S grid so every screen size draws the same picture. */
const W = 800;
const H = 600;
const S = 4000;
const COLORS = ['#111111', '#7a7a7a', '#ffffff', '#e5322d', '#f28c28', '#f5d90a', '#34b34a', '#16b8b0', '#2f6df6', '#7b3ff2', '#e84fa0', '#8a5a2b'];
const SIZES = [4, 10, 22];

type DPlayer = { id: string; name: string; score: number; guessed: boolean; online: boolean };
type DState = {
  phase: 'lobby' | 'choosing' | 'drawing' | 'turnEnd' | 'over';
  settings: { rounds: number; time: number; locale: string };
  round: number; rounds: number; drawer: string | null; host: string; me: string;
  endsAt: number; serverNow: number; players: DPlayer[]; hint: string; wordLen: number;
  choices: string[] | null; turnPoints: { id: string; pts: number }[] | null;
};
type Stroke = { id: number; c: string; w: number; p: number[] };
type Msg = { k: number; kind: string; from?: string; text?: string; pts?: number; priv?: boolean };

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, fromPt: number) {
  ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const p = s.p; const n = p.length / 2;
  if (n === 1) { ctx.beginPath(); ctx.arc((p[0] * W) / S, (p[1] * H) / S, s.w / 2, 0, Math.PI * 2); ctx.fill(); return; }
  ctx.beginPath();
  const start = Math.max(0, fromPt);
  ctx.moveTo((p[start * 2] * W) / S, (p[start * 2 + 1] * H) / S);
  for (let i = start + 1; i < n; i++) ctx.lineTo((p[i * 2] * W) / S, (p[i * 2 + 1] * H) / S);
  ctx.stroke();
}

export default function DrawGame({ t, locale, party, onLeave, onBack }: {
  t: Strings; locale: Locale; party: Party; onLeave: () => void; onBack: () => void;
}) {
  const [st, setSt] = useState<DState | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [conn, setConn] = useState<'connecting' | 'open' | 'down' | 'error'>('connecting');
  const [ping, setPing] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [eraser, setEraser] = useState(false);
  const [guess, setGuess] = useState('');
  const [setup, setSetup] = useState<{ rounds: string; time: string; lang: Locale }>({ rounds: '3', time: '80', lang: locale });

  const wsRef = useRef<WebSocket | null>(null);
  const offset = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const mine = useRef<{ id: number; buf: number[]; timer: number | null } | null>(null);
  const counter = useRef(1 + Math.floor(Math.random() * 1_000_000));
  const msgKey = useRef(0);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const redraw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    for (const s of strokesRef.current) drawStroke(ctx, s, 0);
  }, []);
  const paint = useCallback((s: Stroke, fromPt: number) => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
    drawStroke(ctx, s, fromPt);
  }, []);
  const setCanvas = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    if (el) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.round(W * dpr); el.height = Math.round(H * dpr);
      redraw();
    }
  }, [redraw]);

  const send = useCallback((obj: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  }, []);

  /* ---------- socket ---------- */
  useEffect(() => {
    let closed = false; let ws: WebSocket | null = null; let retry = 0; let rt: number | undefined;
    const open = () => {
      setConn((c) => (c === 'open' ? 'down' : 'connecting'));
      ws = new WebSocket(WS_URL); wsRef.current = ws;
      ws.onopen = () => { retry = 0; ws?.send(JSON.stringify({ t: 'hello', token: getToken(), code: party.code })); };
      ws.onmessage = (ev) => {
        let m: any; try { m = JSON.parse(ev.data); } catch { return; }
        switch (m.t) {
          case 'state':
            offset.current = m.serverNow - Date.now();
            if (m.strokes) { strokesRef.current = m.strokes; redraw(); }
            setSt(m); setConn('open'); break;
          case 'sb': { const s = { id: m.id, c: m.c, w: m.w, p: [m.x, m.y] }; strokesRef.current.push(s); paint(s, 0); break; }
          case 'sp': {
            const list = strokesRef.current; let s: Stroke | undefined;
            for (let i = list.length - 1; i >= 0; i--) if (list[i].id === m.id) { s = list[i]; break; }
            if (!s) break;
            const before = s.p.length / 2; s.p.push(...m.p); paint(s, before - 1); break;
          }
          case 'undo': strokesRef.current = strokesRef.current.filter((s) => s.id !== m.id); redraw(); break;
          case 'clear': strokesRef.current = []; redraw(); break;
          case 'hint': setSt((s) => (s ? { ...s, hint: m.hint } : s)); break;
          case 'chat': setMsgs((l) => [...l.slice(-80), { k: ++msgKey.current, kind: m.kind, from: m.from, text: m.text, pts: m.pts, priv: m.private }]); break;
          case 'pong': setPing(Date.now() - m.n); break;
          case 'error': closed = true; setConn('error'); ws?.close(); break;
          default:
        }
      };
      ws.onclose = () => {
        wsRef.current = null;
        if (closed) return;
        setConn('down');
        rt = window.setTimeout(open, Math.min(4000, 400 * 2 ** retry++));
      };
    };
    open();
    const pingT = window.setInterval(() => { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'ping', n: Date.now() })); }, 3000);
    const tickT = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => { closed = true; window.clearInterval(pingT); window.clearInterval(tickT); if (rt) window.clearTimeout(rt); ws?.close(); wsRef.current = null; };
  }, [party.code, redraw, paint]);

  useEffect(() => { const f = feedRef.current; if (f) f.scrollTop = f.scrollHeight; }, [msgs]);

  const names = useMemo(() => new Map((st?.players || []).map((p) => [p.id, p.name])), [st?.players]);
  const phase = st?.phase;
  const isDrawer = !!st && st.me === st.drawer && phase === 'drawing';
  const isHost = !!st && st.me === st.host;
  const drawerName = st?.drawer ? names.get(st.drawer) || '' : '';
  const left = st && st.endsAt ? Math.max(0, Math.ceil((st.endsAt - (Date.now() + offset.current)) / 1000)) : 0;
  const rtl = (st?.settings.locale || locale) === 'ar';

  /* ---------- drawer input ---------- */
  const flush = useCallback(() => {
    const m = mine.current; if (!m) return;
    m.timer = null;
    while (m.buf.length) send({ t: 'sp', id: m.id, p: m.buf.splice(0, 300) });
  }, [send]);
  const toPt = (e: { clientX: number; clientY: number }) => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    const cl = (v: number) => Math.max(0, Math.min(1, v));
    return [Math.round(cl((e.clientX - r.left) / r.width) * S), Math.round(cl((e.clientY - r.top) / r.height) * S)];
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || e.button > 0) return;
    e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const [x, y] = toPt(e);
    const id = ++counter.current;
    const s: Stroke = { id, c: eraser ? '#ffffff' : color, w: eraser ? size * 1.8 : size, p: [x, y] };
    strokesRef.current.push(s); paint(s, 0);
    send({ t: 'sb', id, c: s.c, w: s.w, x, y });
    mine.current = { id, buf: [], timer: null };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const m = mine.current; if (!m) return;
    const s = strokesRef.current[strokesRef.current.length - 1]; if (!s || s.id !== m.id) return;
    const native = e.nativeEvent as PointerEvent;
    const evs = native.getCoalescedEvents ? native.getCoalescedEvents() : [];
    const list = evs.length ? evs : [native];
    const before = s.p.length / 2;
    for (const ev of list) {
      const [x, y] = toPt(ev);
      const lx = s.p[s.p.length - 2]; const ly = s.p[s.p.length - 1];
      if (Math.abs(x - lx) + Math.abs(y - ly) < 6) continue;
      s.p.push(x, y); m.buf.push(x, y);
    }
    if (s.p.length / 2 > before) { paint(s, before - 1); if (!m.timer) m.timer = window.setTimeout(flush, 25); }
  };
  const onUp = () => { const m = mine.current; if (!m) return; if (m.timer) window.clearTimeout(m.timer); flush(); mine.current = null; };

  const undo = () => { if (!isDrawer) return; strokesRef.current.pop(); redraw(); send({ t: 'undo' }); };
  const clear = () => { if (!isDrawer) return; strokesRef.current = []; redraw(); send({ t: 'clear' }); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = guess.trim(); if (!v) return;
    send({ t: 'chat', text: v }); setGuess('');
  };

  /* ---------- render helpers ---------- */
  const sysText = (code?: string) => {
    if (code === 'no-spoil') return t.drNoSpoil;
    if (code === 'need-two') return t.drNeedTwo;
    if (code === 'drawer-left') return t.drLeft;
    return code || '';
  };
  const hintChars = st ? [...st.hint] : [];
  const sorted = [...(st?.players || [])].sort((a, b) => b.score - a.score);

  const header = (
    <div className="row between center wrap gap-10">
      <div className="row gap-10 center">
        <Btn variant="ghost" size="sm" onClick={onBack}>← {t.lobby}</Btn>
        <span className="caption">{party.name} · {party.code}</span>
      </div>
      <div className="row gap-8 center">
        <span className="dr-pill" data-state={conn}>
          <i />{conn === 'open' ? `${t.drLive}${ping !== null ? ` · ${ping} ms` : ''}` : conn === 'error' ? t.error : '…'}
        </span>
        <Btn variant="ghost" size="sm" onClick={onLeave}>{t.leave}</Btn>
      </div>
    </div>
  );

  if (conn === 'error') {
    return (
      <div className="stage fade-up">{header}<Card pad="lg"><p className="body">{t.drError}</p></Card></div>
    );
  }
  if (!st) {
    return (
      <div className="stage fade-up">{header}<Card pad="lg"><p className="body">{conn === 'down' ? t.drDown : t.drConnecting}</p></Card></div>
    );
  }

  /* ---------- lobby / game over ---------- */
  if (phase === 'lobby' || phase === 'over') {
    const over = phase === 'over';
    return (
      <div className="stage fade-up dr-narrow">
        {header}
        <Card pad="lg" className="stack gap-16">
          <div className="stack gap-4">
            <p className="eyebrow">{t.drSetup}</p>
            <h1 className="h1">{over ? `${sorted[0]?.name || ''} ${t.drWinner}` : t.gameNames.draw}</h1>
            {!over && <p className="body">{t.drSetupHint}</p>}
          </div>
          <div className="stack gap-6">
            <p className="caption">{over ? t.drFinal : t.drPlayers}</p>
            {sorted.map((p, i) => (
              <div key={p.id} className="row gap-10 center">
                <span className="caption mono" style={{ width: 18 }}>{over ? i + 1 : ''}</span>
                <span className="avatar-chip" style={{ width: 30, height: 30, borderRadius: 9, fontSize: 12 }}>{p.name.charAt(0).toUpperCase()}</span>
                <span className="grow" style={{ fontWeight: 700 }}>{p.name}{p.id === st.me ? ` · ${t.you}` : ''}</span>
                <span className="dot" data-on={p.online} />
                {over && <span className="mono" style={{ fontWeight: 800 }}>{p.score}</span>}
              </div>
            ))}
          </div>
          {isHost ? (
            <div className="stack gap-12">
              <div className="stack gap-6"><p className="caption">{t.drRounds}</p>
                <Seg value={setup.rounds} onChange={(v) => setSetup({ ...setup, rounds: v })} options={['1', '2', '3', '5'].map((v) => ({ value: v, label: v }))} /></div>
              <div className="stack gap-6"><p className="caption">{t.drTime}</p>
                <Seg value={setup.time} onChange={(v) => setSetup({ ...setup, time: v })} options={['40', '60', '80', '100', '120'].map((v) => ({ value: v, label: v }))} /></div>
              <div className="stack gap-6"><p className="caption">{t.drWordLang}</p>
                <Seg value={setup.lang} onChange={(v) => setSetup({ ...setup, lang: v })} options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }, { value: 'de', label: 'Deutsch' }]} /></div>
              <div className="row gap-10 wrap">
                <Btn onClick={() => send({ t: 'start', rounds: Number(setup.rounds), time: Number(setup.time), locale: setup.lang })}>{over ? t.drPlayAgain : t.drStart}</Btn>
              </div>
            </div>
          ) : (
            <p className="caption">{over ? '' : t.drWaitHost}</p>
          )}
          {msgs.length > 0 && msgs[msgs.length - 1].kind === 'sys' && <p className="caption">{sysText(msgs[msgs.length - 1].text)}</p>}
        </Card>
      </div>
    );
  }

  /* ---------- the game ---------- */
  const timerClass = phase === 'drawing' && left <= 10 ? 'dr-timer low' : 'dr-timer';
  const shownWord = phase === 'drawing' && !isDrawer ? hintChars : [];
  const meP = st.players.find((p) => p.id === st.me);

  return (
    <div className="stage fade-up">
      {header}
      <div className="dr-layout">
        <div className="dr-top">
          <span className="dr-round">{t.round} {st.round}/{st.rounds}</span>
          <div className="dr-hint" dir={rtl ? 'rtl' : 'ltr'}>
            {phase === 'drawing' && isDrawer && <><small>{t.drDrawThis}</small><b className="dr-word">{st.hint}</b></>}
            {phase === 'drawing' && !isDrawer && (
              <><small>{drawerName} {t.drIsDrawing}</small>
                <span className="dr-letters">{shownWord.map((ch, i) => <span key={i} data-blank={ch === '_'} data-gap={ch === ' ' || ch === '-'}>{ch === '_' ? '' : ch === ' ' ? '' : ch}</span>)}<em>{st.wordLen}</em></span></>
            )}
            {phase === 'choosing' && <small>{st.me === st.drawer ? t.drChoose : `${drawerName} ${t.drChoosing}`}</small>}
            {phase === 'turnEnd' && <><small>{t.drWordWas}</small><b className="dr-word">{st.hint || '…'}</b></>}
          </div>
          <span className={timerClass}>{left}</span>
        </div>

        <div className="dr-canvas-card">
          <div className="dr-canvas" dir="ltr">
            <canvas
              ref={setCanvas}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              style={{ cursor: isDrawer ? 'crosshair' : 'default', touchAction: isDrawer ? 'none' : 'auto' }}
            />
            {phase === 'choosing' && (
              <div className="dr-overlay">
                {st.me === st.drawer ? (
                  <>
                    <p className="h3">{t.drChoose}</p>
                    <div className="dr-choices">
                      {(st.choices || []).map((w, i) => <button key={w} className="btn" dir={rtl ? 'rtl' : 'ltr'} onClick={() => send({ t: 'pick', i })}>{w}</button>)}
                    </div>
                  </>
                ) : <p className="h3">{drawerName} {t.drChoosing}</p>}
              </div>
            )}
            {phase === 'turnEnd' && (
              <div className="dr-overlay">
                <p className="caption">{t.drWordWas}</p>
                <p className="dr-word big" dir={rtl ? 'rtl' : 'ltr'}>{st.hint}</p>
                {st.turnPoints && st.turnPoints.every((x) => x.pts === 0) ? <p className="caption">{t.drNoOne}</p> : (
                  <div className="dr-pts">
                    {(st.turnPoints || []).filter((x) => x.pts > 0).sort((a, b) => b.pts - a.pts).slice(0, 6).map((x) => (
                      <span key={x.id}>{names.get(x.id)} <b>+{x.pts}</b></span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isDrawer ? (
          <div className="dr-tools card">
            <div className="dr-swatches" role="group" aria-label={t.drColor}>
              {COLORS.map((c) => (
                <button key={c} aria-label={c} className="dr-sw" data-on={!eraser && color === c} style={{ background: c }} onClick={() => { setColor(c); setEraser(false); }} />
              ))}
            </div>
            <div className="dr-sizes" role="group" aria-label={t.drBrush}>
              {SIZES.map((s) => (
                <button key={s} className="dr-size" aria-label={`${s}`} data-on={size === s} onClick={() => setSize(s)}><i style={{ width: 6 + s * 0.6, height: 6 + s * 0.6 }} /></button>
              ))}
              <button className="btn dr-mini" data-variant={eraser ? undefined : 'ghost'} onClick={() => setEraser((v) => !v)}>{t.drEraser}</button>
              <button className="btn dr-mini" data-variant="ghost" onClick={undo}>{t.drUndo}</button>
              <button className="btn dr-mini" data-variant="ghost" onClick={clear}>{t.drClear}</button>
            </div>
          </div>
        ) : phase === 'drawing' ? <p className="caption dr-watch">{t.drWatch}</p> : null}

        <div className="dr-chat card">
          <div className="dr-feed" ref={feedRef}>
            {msgs.map((m) => {
              const who = m.from ? names.get(m.from) || '' : '';
              if (m.kind === 'correct') return <p key={m.k} className="dr-m good">{m.from === st.me ? t.drYouGuessed : `${who} ${t.drGuessed}`} <b>+{m.pts}</b></p>;
              if (m.kind === 'close') return <p key={m.k} className="dr-m warn">{t.drClose}</p>;
              if (m.kind === 'sys') return <p key={m.k} className="dr-m sys">{sysText(m.text)}</p>;
              return <p key={m.k} className="dr-m" data-priv={m.priv ? 'true' : undefined} dir="auto"><b>{who}</b> {m.text}</p>;
            })}
          </div>
          <form className="dr-form" onSubmit={submit}>
            <input
              className="input" value={guess} maxLength={80} dir="auto" autoComplete="off" autoCapitalize="off" enterKeyHint="send"
              placeholder={isDrawer || meP?.guessed ? t.drChatPh : t.drGuessPh}
              onChange={(e) => setGuess(e.target.value)}
            />
            <Btn type="submit" disabled={!guess.trim()}>{t.drSend}</Btn>
          </form>
        </div>

        <div className="dr-players card">
          <p className="caption">{t.drPlayers}</p>
          {sorted.map((p) => (
            <div key={p.id} className="dr-player" data-guessed={p.guessed} data-drawer={p.id === st.drawer}>
              <span className="avatar-chip" style={{ width: 28, height: 28, borderRadius: 8, fontSize: 12 }}>{p.name.charAt(0).toUpperCase()}</span>
              <span className="grow dr-pname">{p.name}{p.id === st.me ? ` · ${t.you}` : ''}</span>
              {p.id === st.drawer && <span className="dr-tag">✎</span>}
              {p.guessed && <span className="dr-tag ok">✓</span>}
              <span className="mono" style={{ fontWeight: 800 }}>{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
