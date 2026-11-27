import { Glyph } from '../components/brand';
import React, { useEffect, useState } from 'react';
import { api, type Board, type HistoryRow } from '../api';
import type { Strings } from '../i18n';
import { Card, Seg } from '../components/ui';

type Tab = 'mine' | 'party' | 'global';
const GAMES = ['', 'trivia', 'wordle', 'draw', 'categories', 'whoami', 'charades', 'wyr', 'likely', 'bracket', 'dice', 'coin', 'wheel', 'number', 'yesno'];

export default function Stats({ t, partyCode, hasIdentity }: { t: Strings; partyCode: string | null; hasIdentity: boolean }) {
  const [tab, setTab] = useState<Tab>(partyCode ? 'party' : 'mine');
  const [days, setDays] = useState(30);
  const [game, setGame] = useState('');
  const [board, setBoard] = useState<Board | null>(null);
  const [hist, setHist] = useState<{ games: number; wins: number; recent: HistoryRow[] } | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!hasIdentity) { setState('ready'); return; }
    let live = true;
    setState('loading');
    const p = tab === 'mine' ? api.history().then((r) => { if (live) setHist(r.data); })
      : tab === 'party' ? (partyCode ? api.partyBoard(partyCode, game, days).then((r) => { if (live) setBoard(r.data); }) : Promise.resolve())
      : api.globalBoard(game, days).then((r) => { if (live) setBoard(r.data); });
    p.then(() => live && setState('ready')).catch(() => live && setState('error'));
    return () => { live = false; };
  }, [tab, days, game, partyCode, hasIdentity]);

  const gname = (id: string) => (t.gameNames as Record<string, string>)[id] || id;
  const medal = (rank: number) => (rank <= 3 ? <span className={`medal m${rank}`}><Glyph name="medal" size={20} /></span> : String(rank));

  return (
    <div className="stage fade-up">
      <Seg<Tab> value={tab} onChange={setTab} options={[{ value: 'mine', label: t.myHistory }, { value: 'party', label: t.partyRanks }, { value: 'global', label: t.globalRanks }]} />
      {tab !== 'mine' && (
        <div className="row gap-8 wrap">
          <Seg<string> value={String(days)} onChange={(v) => setDays(Number(v))} options={[{ value: '7', label: t.d7 }, { value: '30', label: t.d30 }, { value: '0', label: t.dAll }]} />
          <select className="input" value={game} onChange={(e) => setGame(e.target.value)} aria-label={t.games} style={{ minHeight: 40 }}>
            {GAMES.map((g) => <option key={g} value={g}>{g ? gname(g) : t.allGames}</option>)}
          </select>
        </div>
      )}
      {!hasIdentity ? (
        <Card pad="lg"><p className="body">{t.noHistory}</p></Card>
      ) : state === 'loading' ? (
        <p className="caption">{t.loading}</p>
      ) : state === 'error' ? (
        <Card pad="lg"><p className="body">{t.error}</p></Card>
      ) : tab === 'mine' ? (
        <>
          <Card pad="lg" className="row between center">
            <div><div className="caption">{t.gamesLabel}</div><div className="h1 mono">{hist?.games ?? 0}</div></div>
            <div style={{ textAlign: 'end' }}><div className="caption">{t.winsLabel}</div><div className="h1 mono">{hist?.wins ?? 0}</div></div>
          </Card>
          {!hist || hist.recent.length === 0 ? <Card pad="lg"><p className="body">{t.noHistory}</p></Card> : (
            <Card pad="lg" className="stack gap-12">
              {hist.recent.map((r) => (
                <div key={r.id + r.game} className="row gap-10 center">
                  <span className="mono" style={{ width: 28, fontSize: 18 }}>{r.winner ? <Glyph name="trophy" size={18} /> : r.place ? `#${r.place}` : '·'}</span>
                  <span className="grow">
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{gname(r.game)}</div>
                    <div className="caption">{r.mode === 'solo' ? t.soloLabel : r.party} · {new Date(r.finished_at.replace(' ', 'T') + (r.finished_at.includes('Z') ? '' : 'Z')).toLocaleDateString()}</div>
                  </span>
                  <span className="mono" style={{ fontWeight: 800 }}>{r.score}</span>
                </div>
              ))}
            </Card>
          )}
        </>
      ) : tab === 'party' && !partyCode ? (
        <Card pad="lg"><p className="body">{t.needParty}</p></Card>
      ) : !board || board.rows.length === 0 ? (
        <Card pad="lg"><p className="body">{t.noHistory}</p></Card>
      ) : (
        <>
          {board.most_winner && board.most_winner.wins > 0 && (
            <Card pad="lg" className="row gap-12 center">
              <span className="crown"><Glyph name="crown" size={34} /></span>
              <div className="grow"><div className="caption">{t.mostWinner}</div><div className="h2">{board.most_winner.name}</div></div>
              <div className="mono" style={{ fontWeight: 800, fontSize: 20 }}>{board.most_winner.wins}</div>
            </Card>
          )}
          <Card pad="lg" className="stack gap-12">
            {board.rows.map((r) => (
              <div key={r.player_key} className="row gap-10 center rank-row">
                <span className="rank-bar bar-grow" aria-hidden style={{ width: `${Math.max(4, Math.round((r.wins / Math.max(1, board.rows[0]?.wins || 1)) * 100))}%` }} />
                <span className="mono" style={{ width: 28, fontSize: 16 }}>{r.wins > 0 ? medal(r.rank) : '·'}</span>
                <span className="grow" style={{ fontWeight: 700, fontSize: 14 }}>{r.name}{r.player_key === board.me ? ` · ${t.youLabel}` : ''}</span>
                <span className="caption mono">{r.games}×</span>
                <span className="mono" style={{ fontWeight: 800, minWidth: 28, textAlign: 'end' }}>{r.wins}</span>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
