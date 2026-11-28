import React, { useCallback, useEffect, useState } from 'react';
import { api, type CustomPrompts, type JoinRequest, type Party, type Seat } from '../api';
import type { Strings } from '../i18n';
import { friendlyError } from '../friendly';
import { Btn, Card, Seg, useToast } from './ui';

/** Host only: people asking to join a running game or to take back an abandoned seat. */
export function RequestsBar({ t, party, onDecide }: { t: Strings; party: Party; onDecide: (id: string, action: 'approve' | 'deny') => void }) {
  const list: JoinRequest[] = party.is_host ? party.requests || [] : [];
  if (list.length === 0) return null;
  return (
    <div className="stack gap-8 flow-requests" role="status">
      {list.map((req) => (
        <div key={req.id} className="flow-bar">
          <span className="grow">
            <b>{req.name}</b> {req.claim_name ? `${t.reqSeat} ${req.claim_name}` : t.reqWants}
          </span>
          <Btn size="sm" onClick={() => onDecide(req.id, 'approve')}>{t.reqApprove}</Btn>
          <Btn size="sm" variant="ghost" onClick={() => onDecide(req.id, 'deny')}>{t.reqDeny}</Btn>
        </div>
      ))}
    </div>
  );
}

/** The countdown into the next round. Everyone sees it; the host can skip it. */
export function NextBar({ t, party, onSkip }: { t: Strings; party: Party; onSkip: () => void }) {
  const left = party.next_in_ms;
  const [deadline, setDeadline] = useState(0);
  const [, force] = useState(0);
  useEffect(() => {
    if (left === null || left === undefined) { setDeadline(0); return; }
    setDeadline(Date.now() + left);
  }, [left, party.round?.number]);
  useEffect(() => {
    if (!deadline) return;
    const id = window.setInterval(() => force((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [deadline]);
  if (!deadline) return null;
  const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  return (
    <div className="flow-bar flow-next" role="status" aria-live="polite">
      <span className="grow">{t.nextIn} <b className="mono">{seconds}</b></span>
      {party.is_host ? <Btn size="sm" onClick={onSkip}>{t.nextNow}</Btn> : null}
    </div>
  );
}

/** Shown to someone who is not in the party yet: waiting for the host, or picking their old seat. */
export function WaitingRoom({
  t, code, status, onClaim, onCancel,
}: {
  t: Strings;
  code: string;
  status: 'pending' | 'denied';
  onClaim: (playerId: string) => void;
  onCancel: () => void;
}) {
  const [seats, setSeats] = useState<Seat[]>([]);
  useEffect(() => {
    let off = false;
    const load = () => api.seats(code).then((r) => { if (!off) setSeats(r.seats || []); }).catch(() => { /* keep what we had */ });
    load();
    const id = window.setInterval(load, 4000);
    return () => { off = true; window.clearInterval(id); };
  }, [code]);
  return (
    <div className="fade-up stack gap-16" style={{ maxWidth: 620 }}>
      <Card pad="lg" className="stack gap-12">
        <p className="eyebrow">{code}</p>
        <h1 className="h1">{status === 'denied' ? t.pendDenied : t.pendTitle}</h1>
        {status === 'pending' ? <p className="body">{t.pendBody}</p> : null}
        <p className="caption">{t.pendSeats}</p>
        {seats.length === 0 ? <p className="caption">{t.pendNoSeats}</p> : (
          <div className="row gap-8 wrap">
            {seats.map((seat) => (
              <Btn key={seat.id} variant="soft" onClick={() => onClaim(seat.id)}>{seat.name} · {seat.score}</Btn>
            ))}
          </div>
        )}
        <div className="row gap-10 wrap"><Btn variant="ghost" onClick={onCancel}>{t.pendCancel}</Btn></div>
      </Card>
    </div>
  );
}

const OWN_GAMES = ['trivia', 'wyr', 'likely', 'categories', 'whoami', 'charades', 'imposter'];

/** Host only: add your own questions and choose whether the party plays them, mixed in, or alone. */
export function OwnPrompts({ t, party }: { t: Strings; party: Party }) {
  const toast = useToast();
  const code = party.code;
  const [open, setOpen] = useState(false);
  const [game, setGame] = useState('trivia');
  const [text, setText] = useState('');
  const [data, setData] = useState<CustomPrompts | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api.prompts(code).then((r) => setData(r.data)).catch(() => { /* ignore */ }); }, [code]);
  useEffect(() => { if (open && !data) load(); }, [open, data, load]);
  const total = Object.values(party.custom_counts || {}).reduce((a, b) => a + b, 0);
  const format = game === 'trivia' ? t.ownFmtTrivia : game === 'wyr' ? t.ownFmtPair : game === 'imposter' ? t.ownFmtWord : t.ownFmtOne;
  const add = async () => {
    const lines = text.split('\n').map((x) => x.trim()).filter(Boolean);
    if (!lines.length) return;
    setBusy(true);
    try {
      const r = await api.addPrompts(code, game, lines);
      setData(r.data);
      setText('');
      toast(`${t.ownAdded} ${r.added}${r.skipped ? ` · ${t.ownSkipped} ${r.skipped}` : ''}`);
    } catch (error: any) { toast(friendlyError(error, t)); }
    finally { setBusy(false); }
  };
  const mine = (data?.items || []).filter((i) => i.game === game);
  return (
    <Card pad="lg" className="stack gap-12">
      <button className="row between center own-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <h2 className="h2">{t.ownTitle}{total ? ` · ${total}` : ''}</h2>
        <span className="caption">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="stack gap-12">
          <p className="caption">{t.ownLead}</p>
          <label className="field">
            <span>{t.ownGame}</span>
            <select className="input" value={game} onChange={(e) => setGame(e.target.value)}>
              {OWN_GAMES.map((g) => <option key={g} value={g}>{t.gameNames[g]}{party.custom_counts?.[g] ? ` (${party.custom_counts[g]})` : ''}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{format}</span>
            <textarea className="input" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={format} />
          </label>
          <div className="row gap-10 wrap"><Btn disabled={busy || !text.trim()} onClick={add}>{t.ownAdd}</Btn></div>
          {mine.length === 0 ? <p className="caption">{t.ownEmpty}</p> : (
            <div className="stack gap-4">
              {mine.map((item) => (
                <div key={item.id} className="row gap-8 center own-item">
                  <span className="grow">{item.prompt}{item.answer ? ` → ${item.answer}` : ''}</span>
                  <Btn size="sm" variant="ghost" onClick={async () => { try { const r = await api.removePrompt(code, item.id); setData(r.data); } catch (e: any) { toast(friendlyError(e, t)); } }}>{t.ownDelete}</Btn>
                </div>
              ))}
            </div>
          )}
          <p className="caption">{t.ownMode}</p>
          <Seg value={(data?.mode || party.content_mode || 'builtin') as 'builtin' | 'mix' | 'only'} onChange={async (mode) => { try { const r = await api.promptMode(code, mode); setData(r.data); } catch (e: any) { toast(friendlyError(e, t)); } }}
            options={[{ value: 'builtin', label: t.ownBuiltin }, { value: 'mix', label: t.ownMix }, { value: 'only', label: t.ownOnly }]} />
        </div>
      )}
    </Card>
  );
}

/** Who is in the room, who is sitting out, and (for the host) a way to hand the host role over. */
export function PlayersStrip({ t, party, onHost }: { t: Strings; party: Party; onHost: (playerId: string) => void }) {
  const away = party.members.filter((m) => m.sitting_out).length;
  return (
    <details className="flow-players">
      <summary className="caption">{t.members} · {party.members.length}{away ? ` · ${t.sittingOut} ${away}` : ''}</summary>
      <div className="stack gap-4" style={{ marginTop: 8 }}>
        {party.members.map((m) => (
          <div key={m.id} className="row gap-8 center own-item">
            <span className="grow">
              {m.name}{m.is_host ? ` · ${t.host}` : ''}{m.id === party.self_player_id ? ` · ${t.you}` : ''}
              {m.sitting_out ? <span className="sit-out"> · {t.sittingOut}</span> : null}
            </span>
            {party.is_host && !m.is_host ? <Btn size="sm" variant="ghost" onClick={() => onHost(m.id)}>{t.makeHost}</Btn> : null}
          </div>
        ))}
      </div>
    </details>
  );
}
