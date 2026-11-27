import { Glyph } from '../components/brand';
import CountUp from '../components/CountUp';
import { motionOn } from '../motion';
import { friendlyError } from '../friendly';
import React, { useState } from 'react';
import { api, type Party } from '../api';
import type { Locale, Strings } from '../i18n';
import { Btn, Card, useToast } from '../components/ui';

const POOL = ['trivia', 'wordle', 'draw', 'categories', 'whoami', 'charades'];

export default function TournamentCard({ t, locale, party, onParty }: { t: Strings; locale: Locale; party: Party; onParty: (p: Party, started?: boolean) => void }) {
  const toast = useToast();
  const [pool, setPool] = useState<string[]>(['trivia', 'wordle', 'categories']);
  const [count, setCount] = useState(4);
  const [busy, setBusy] = useState(false);
  const tour = party.tournament;
  const gname = (id: string) => (t.gameNames as Record<string, string>)[id] || id;

  const run = async (fn: () => Promise<{ data: Party }>, started = false) => {
    setBusy(true);
    try { const r = await fn(); onParty(r.data, started); } catch (e: any) { toast(friendlyError(e, t)); } finally { setBusy(false); }
  };
  const move = (i: number, d: number) => {
    if (!tour) return;
    const rest = tour.lineup.slice(tour.index);
    const j = i + d;
    if (j < 0 || j >= rest.length) return;
    [rest[i], rest[j]] = [rest[j], rest[i]];
    run(() => api.tournamentAct(party.code, 'reorder', { lineup: rest }));
  };

  const standings = tour && tour.standings.length > 0 && (
    <div className="stack gap-8">
      <p className="caption">{t.tStandings}</p>
      {tour.standings.map((s, i) => (
        <div key={s.player_key} className="row gap-10 center">
          <span className="mono" style={{ width: 24 }}>{s.points > 0 ? (i < 3 ? <span className={`medal m${i + 1}`}><Glyph name="medal" size={20} /></span> : i + 1) : '·'}</span>
          <span className="grow" style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</span>
          <span className="mono" style={{ fontWeight: 800 }}><CountUp to={s.points} /> {t.tPoints}</span>
        </div>
      ))}
    </div>
  );

  if (tour && tour.status === 'done') {
    return (
      <Card pad="lg" className="stack gap-12" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="row gap-12 center"><span className="trophy-drop" ><Glyph name="trophy" size={38} /></span>{motionOn() && <span className="confetti" aria-hidden>{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.08}s`, background: ["var(--accent)","var(--ink)","var(--muted)","var(--accent)","var(--faint)"][i % 5] }} />)}</span>}
          <div className="grow"><div className="caption">{t.tChampion}</div><div className="h2">{tour.standings[0]?.name ?? ''}</div></div></div>
        {standings}
        {party.is_host && <Btn variant="ghost" onClick={() => run(() => api.tournamentCreate(party.code, pool, count))} disabled={busy}>{t.tNewOne}</Btn>}
      </Card>
    );
  }

  if (tour && tour.status === 'active') {
    const rest = tour.lineup.slice(tour.index);
    return (
      <Card pad="lg" className="stack gap-12">
        <div className="row between center"><h2 className="h2">{t.tournament}</h2><span className="caption">{t.tGameOf} {Math.min(tour.index + 1, tour.total)}/{tour.total}</span></div>
        <div className="stack gap-6">
          {rest.map((g, i) => (
            <div key={g + i} className="row gap-8 center" style={{ opacity: i === 0 ? 1 : 0.8 }}>
              <span className="mono caption" style={{ width: 22 }}>{tour.index + i + 1}</span>
              <span className="grow" style={{ fontWeight: i === 0 ? 800 : 600 }}>{gname(g)}</span>
              {party.is_host && <>
                <Btn variant="ghost" size="sm" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="up"><Glyph name="up" size={16} /></Btn>
                <Btn variant="ghost" size="sm" disabled={busy || i === rest.length - 1} onClick={() => move(i, 1)} aria-label="down"><Glyph name="down" size={16} /></Btn>
              </>}
            </div>
          ))}
        </div>
        {standings}
        {party.is_host ? (
          <div className="row gap-10 wrap">
            <Btn disabled={busy} onClick={() => run(() => api.tournamentAct(party.code, 'next', { locale }), true)}>{t.tStartNext}</Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => run(() => api.tournamentAct(party.code, 'shuffle'))}>{t.tShuffle}</Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => run(() => api.tournamentAct(party.code, 'cancel'))}>{t.tCancel}</Btn>
          </div>
        ) : <p className="caption">{t.waiting}</p>}
        <p className="caption">{t.tRunning}</p>
      </Card>
    );
  }

  if (!party.is_host) return null;
  return (
    <Card pad="lg" className="stack gap-12">
      <h2 className="h2">{t.tournament}</h2>
      <p className="caption">{t.tHint}</p>
      <p className="caption">{t.tGames}</p>
      <div className="row gap-8 wrap">
        {POOL.map((g) => (
          <Btn key={g} size="sm" variant={pool.includes(g) ? 'solid' : 'ghost'} onClick={() => setPool((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]))}>{gname(g)}</Btn>
        ))}
      </div>
      <div className="row gap-10 center">
        <span className="caption grow">{t.tCount}</span>
        <Btn variant="ghost" size="sm" onClick={() => setCount((c) => Math.max(2, c - 1))}>−</Btn>
        <span className="mono" style={{ fontWeight: 800, minWidth: 24, textAlign: 'center' }}>{count}</span>
        <Btn variant="ghost" size="sm" onClick={() => setCount((c) => Math.min(10, c + 1))}>+</Btn>
      </div>
      <Btn disabled={busy || pool.length === 0} onClick={() => run(() => api.tournamentCreate(party.code, pool, count))}>{t.tCreate}</Btn>
    </Card>
  );
}
