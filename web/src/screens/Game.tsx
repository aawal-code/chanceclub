import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Party, Round } from '../api';
import type { Locale, Strings } from '../i18n';
import { Glyph } from '../components/brand';
import { Btn, Card, Field, useToast, LagPill } from '../components/ui';
import { Wheel, angleFor } from '../games/Wheel';
import { BracketView } from '../games/Bracket';
const DrawGame = React.lazy(() => import('../games/DrawGame'));
const ImposterGame = React.lazy(() => import('../games/Imposter'));
const WordBombGame = React.lazy(() => import('../games/WordBomb'));
const TruthsGame = React.lazy(() => import('../games/Truths'));
import type { Act } from '../games/kit';
import { Keyboard, WordleBoard, keyStatesFrom } from '../games/Wordle';
import { Avatar } from '../components/Avatar';

const AWARD_GAMES = ['categories', 'whoami', 'charades'];
const ROLL_GAMES = ['dice', 'coin', 'wheel', 'number', 'yesno'];
const VOTE_GAMES = ['wyr', 'likely'];

export default function GameScreen({
  t, locale, party, onAct, onAdvance, onFinish, onLeave, onBack,
}: {
  t: Strings;
  locale: Locale;
  party: Party;
  onAct: Act;
  onAdvance: () => void;
  onFinish: () => void;
  onLeave: () => void;
  onBack: () => void;
}) {
  const round = party.round;
  const me = party.members.find((member) => member.id === party.self_player_id);
  const game = round?.game || party.game || 'dice';
  const isMyTurn = !!round && round.turn_player_id === party.self_player_id;
  const turnName = round ? party.members.find((member) => member.id === round.turn_player_id)?.name : undefined;

  if (game === 'imposter') {
    return (
      <React.Suspense fallback={<p className="caption">{t.loading}</p>}>
        <ImposterGame t={t} locale={locale} party={party} onAct={onAct} onAdvance={onAdvance} onFinish={onFinish} onLeave={onLeave} onBack={onBack} />
      </React.Suspense>
    );
  }

  if (game === 'wordbomb') {
    return (
      <React.Suspense fallback={<p className="caption">{t.loading}</p>}>
        <WordBombGame t={t} locale={locale} party={party} onAct={onAct} onAdvance={onAdvance} onFinish={onFinish} onLeave={onLeave} onBack={onBack} />
      </React.Suspense>
    );
  }

  if (game === 'truths') {
    return (
      <React.Suspense fallback={<p className="caption">{t.loading}</p>}>
        <TruthsGame t={t} locale={locale} party={party} onAct={onAct} onAdvance={onAdvance} onFinish={onFinish} onLeave={onLeave} onBack={onBack} />
      </React.Suspense>
    );
  }

  if (game === 'draw') {
    return (
      <React.Suspense fallback={<p className="caption">{t.loading}</p>}>
        <DrawGame t={t} locale={locale} party={party} onLeave={onLeave} onBack={party.is_host ? onFinish : onBack} />
      </React.Suspense>
    );
  }

  return (
    <div className="stage fade-up">
      <div className="row between center wrap gap-10">
        <div className="row gap-10 center">
          <Btn variant="ghost" size="sm" onClick={party.is_host ? onFinish : onBack}><Glyph name="back" size={16} /> {party.is_host ? t.endGame : t.lobby}</Btn>
          <span className="caption">{party.name} · {party.code}</span>
        </div>
        <div className="row gap-8 center">
          <span className="caption">{t.round} {round?.number ?? 1}</span>
          <Btn variant="ghost" size="sm" onClick={onLeave}>{t.leave}</Btn>
        </div>
      </div>

      {!round ? (
        <Card pad="lg" className="stack gap-12">
          <h2 className="h2">{t.waiting}</h2>
        </Card>
      ) : (
        <>
          <Card pad="lg" className="prompt-card">
            <div className="row between center wrap gap-10">
              <span className="row gap-8 center">
                <span className="glyph" style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--surface-3)', border: '1px solid var(--line)' }}>
                  <Glyph name={game} size={18} />
                </span>
                <span className="caption">{t.gameNames[game] || game}</span>
              </span>
              {round.turn_player_id && (
                <span className="turn-chip">
                  {isMyTurn ? <b>{t.yourTurn}</b> : <>{t.waitingTurn} · <b>{turnName}</b></>}
                </span>
              )}
            </div>
            <p className="prompt-text">{round.prompt}</p>
            {round.status === 'complete' && <ResultView t={t} round={round} game={game} members={party.members} />}
          </Card>

          <Card pad="lg" className="stack gap-16">
            {game === 'wordle' && <WordleParty t={t} party={party} round={round} onAct={onAct} />}
            {game === 'bracket' && party.bracket && (
              <BracketView t={t} bracket={party.bracket} onPick={party.is_host ? (r, m, side) => onAct({ type: 'pick', value: `${r}:${m}:${side}` }) : undefined} />
            )}
            {game === 'trivia' && <TriviaRound t={t} round={round} onAct={onAct} />}
            {VOTE_GAMES.includes(game) && <VoteRound t={t} round={round} game={game} onAct={onAct} />}
            {AWARD_GAMES.includes(game) && (
              <AwardRound t={t} round={round} party={party} onAct={onAct} />
            )}
            {ROLL_GAMES.includes(game) && (
              <RollRound t={t} round={round} game={game} wheel={party.wheel || null} isMyTurn={isMyTurn} onAct={onAct} />
            )}
          </Card>

          <Card className="stack gap-12">
            <div className="row between center">
              <h3 className="h3">{t.scores}</h3>
              <span className="caption">{party.members.length} {t.members.toLowerCase()}</span>
            </div>
            {[...party.members].sort((a, b) => b.score - a.score).map((member, index) => (
              <div key={member.id} className="row gap-10 center">
                <span className="caption mono" style={{ width: 18 }}>{index + 1}</span>
                <Avatar avatar={member.avatar} name={member.name} size={30} />
                <span className="grow" style={{ fontWeight: 700, fontSize: 14 }}>{member.name}{member.id === party.self_player_id ? ` · ${t.you}` : ''}</span>
                <LagPill rtt={member.rtt} online={member.online} labels={{ none: t.lagNone, slight: t.lagSlight, heavy: t.lagHeavy, checking: t.lagChecking, offline: t.offline }} />
                <span className="mono" style={{ fontWeight: 800 }}>{member.score}</span>
              </div>
            ))}
          </Card>

          {party.is_host && (
            <div className="row gap-10 wrap">
              <Btn onClick={onAdvance}>{t.nextRound}</Btn>
              <Btn variant="ghost" onClick={onFinish}>{t.endGame}</Btn>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- wordle (party) ---------------- */
function WordleParty({ t, party, round, onAct }: { t: Strings; party: Party; round: Round; onAct: (body: Record<string, unknown>) => void }) {
  const toast = useToast();
  const attempts = round.wordle?.attempts || [];
  const solved = round.wordle?.solved;
  const complete = round.status === 'complete';
  const [current, setCurrent] = useState('');
  const [shake, setShake] = useState(false);

  const submit = useCallback(() => {
    if (complete) return;
    if (current.length !== 5) {
      setShake(true);
      window.setTimeout(() => setShake(false), 400);
      return;
    }
    onAct({ type: 'guess', value: current });
    setCurrent('');
  }, [complete, current, onAct]);

  const onKey = useCallback((key: string) => {
    if (complete) return;
    if (key === 'enter') return submit();
    if (key === 'back') return setCurrent((value) => value.slice(0, -1));
    if (/^[a-z]$/.test(key)) setCurrent((value) => (value.length >= 5 ? value : value + key));
  }, [complete, submit]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'enter') { event.preventDefault(); onKey('enter'); }
      else if (key === 'backspace') { event.preventDefault(); onKey('back'); }
      else if (/^[a-z]$/.test(key)) onKey(key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onKey]);

  return (
    <div className="wordle">
      <WordleBoard attempts={attempts} current={current} revealRow={attempts.length - 1} shake={shake} />
      <div className="row gap-16 center wrap">
        <span className="caption">{attempts.length} / {round.wordle?.max || 6}</span>
        {solved && <span className="caption" style={{ color: 'var(--hit)' }}>{t.solved}</span>}
      </div>
      {!complete && <Keyboard onKey={onKey} keyStates={keyStatesFrom(attempts)} />}
      {complete && <p className="caption">{t.roundComplete}</p>}
    </div>
  );
}

/* ---------------- trivia ---------------- */
function TriviaRound({ t, round, onAct }: { t: Strings; round: Round; onAct: (body: Record<string, unknown>) => void }) {
  const [value, setValue] = useState('');
  const submitted = round.submitted;
  const complete = round.status === 'complete';
  if (complete) {
    return (
      <p className="caption">
        {t.answer}: <b style={{ color: 'var(--ink)' }}>{round.result?.answer}</b>
      </p>
    );
  }
  if (submitted) return <p className="caption">{t.submitted} · {round.submission_count}/{round.submission_status.length} — {t.waitingOthers}</p>;
  return (
    <div className="stack gap-12">
      <Field label={t.yourAnswer} value={value} onChange={setValue} placeholder="…" maxLength={120} onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onAct({ type: 'answer', value: value.trim() }); }} />
      <Btn disabled={!value.trim()} onClick={() => onAct({ type: 'answer', value: value.trim() })}>{t.submit}</Btn>
      <p className="caption">{round.submission_count}/{round.submission_status.length} {t.submitted.toLowerCase()}</p>
    </div>
  );
}

/* ---------------- votes ---------------- */
function VoteRound({ t, round, game, onAct }: { t: Strings; round: Round; game: string; onAct: (body: Record<string, unknown>) => void }) {
  const options = useMemo(() => {
    const parts = round.prompt.split(/\s+or\s+/i).map((part) => part.replace(/[?؟]$/, '').trim());
    return parts.length === 2 ? parts : [];
  }, [round.prompt]);
  const [value, setValue] = useState('');
  const complete = round.status === 'complete';

  if (complete && round.result?.tally) {
    const entries = Object.entries(round.result.tally as Record<string, number>).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map(([, count]) => count));
    return (
      <div className="tally">
        {entries.map(([label, count]) => (
          <div className="tally-row" key={label}>
            <span style={{ minWidth: 120, fontWeight: 700, fontSize: 14 }}>{label}</span>
            <div className="tally-bar" style={{ width: `${(count / max) * 100}%`, maxWidth: '60%' }} />
            <span className="caption mono">{count}</span>
          </div>
        ))}
      </div>
    );
  }
  if (round.submitted) return <p className="caption">{t.submitted} · {t.waitingOthers}</p>;
  if (options.length === 2) {
    return (
      <div className="stack gap-10">
        <p className="caption">{t.yourVote}</p>
        <div className="row gap-10 wrap">
          {options.map((option) => (
            <Btn key={option} variant="soft" onClick={() => onAct({ type: 'vote', value: option })}>{option}</Btn>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="stack gap-12">
      <Field label={t.yourVote} value={value} onChange={setValue} placeholder="…" maxLength={120} />
      <Btn disabled={!value.trim()} onClick={() => onAct({ type: 'vote', value: value.trim() })}>{t.submit}</Btn>
    </div>
  );
}

/* ---------------- host awards ---------------- */
function AwardRound({ t, round, party, onAct }: { t: Strings; round: Round; party: Party; onAct: (body: Record<string, unknown>) => void }) {
  const scored = new Set(round.scored_player_ids || []);
  if (round.status === 'complete') return <p className="caption">{t.roundComplete}</p>;
  return (
    <div className="stack gap-12">
      {round.private_clue && (
        <div className="card" data-flat="true" style={{ padding: 16 }}>
          <p className="caption">{t.answer}</p>
          <p className="h2" style={{ marginTop: 6 }}>{round.private_clue}</p>
        </div>
      )}
      {party.is_host ? (
        <>
          <p className="caption">{t.award}</p>
          <div className="row gap-8 wrap">
            {party.members.map((member) => (
              <Btn
                key={member.id}
                size="sm"
                variant={scored.has(member.id) ? 'ghost' : 'soft'}
                disabled={scored.has(member.id)}
                onClick={() => onAct({ type: 'point', target_player_id: Number(member.id) })}
              >
                {member.name} {scored.has(member.id) ? <Glyph name="check" size={14} /> : <Glyph name="plus" size={14} />}
              </Btn>
            ))}
          </div>
        </>
      ) : (
        <p className="caption">{t.waiting}</p>
      )}
    </div>
  );
}

/* ---------------- chance games ---------------- */
function RollRound({ t, round, game, wheel, isMyTurn, onAct }: { t: Strings; round: Round; game: string; wheel: Party['wheel'] | null; isMyTurn: boolean; onAct: (body: Record<string, unknown>) => void }) {
  const [rolling, setRolling] = useState(false);
  const result = round.result;
  const complete = round.status === 'complete';

  const roll = () => {
    if (game === 'wheel') { onAct({ type: 'roll' }); return; }
    setRolling(true);
    window.setTimeout(() => {
      setRolling(false);
      onAct({ type: 'roll' });
    }, 650);
  };
  const wEntries = wheel?.entries || [];
  const pickIdx = result?.result ? wEntries.indexOf(result.result) : -1;
  const spins = useRef(0);
  const lastKey = useRef<string>('');
  const key = `${round.number}:${result?.result ?? ''}`;
  if (game === 'wheel' && key !== lastKey.current) { lastKey.current = key; if (pickIdx >= 0) spins.current += 1; }
  const wAngle = pickIdx >= 0 ? angleFor(pickIdx, wEntries.length, spins.current) : 0;
  const wDim = wheel ? wEntries.filter((e) => !wheel.remaining.includes(e) && e !== result?.result) : [];

  const faces: number[] = result?.faces || [];

  return (
    <div className="stack gap-16 center" style={{ alignItems: 'center' }}>
      {game === 'dice' && (
        <div className="dice-tray">
          {(faces.length ? faces : [1, 2]).map((face, index) => (
            <div className="die" key={index} data-rolling={rolling ? 'true' : undefined}>
              {Array.from({ length: 9 }).map((_, pipIndex) => (
                <span key={pipIndex} className="pip" data-off={!pipOn(face, pipIndex) ? 'true' : undefined} />
              ))}
            </div>
          ))}
        </div>
      )}
      {game === 'coin' && (
        <div className="die" style={{ borderRadius: '50%', display: 'grid', placeItems: 'center', padding: 0 }} data-rolling={rolling ? 'true' : undefined}>
          <span style={{ fontWeight: 800, fontSize: 13 }}>{rolling ? '…' : (result?.result || '?')}</span>
        </div>
      )}
      {game === 'wheel' && wEntries.length > 0 && (
        <div className="stack gap-10" style={{ width: '100%', alignItems: 'center' }}>
          <Wheel entries={wEntries} angle={wAngle} dim={wDim} spinning />
          {result?.result && <div className="prompt-text" style={{ textAlign: 'center' }}>{result.result}</div>}
          {wheel && wheel.eliminate && <p className="caption">{wheel.remaining.length} {t.wheelRemaining}</p>}
        </div>
      )}
      {(game === 'number' || game === 'yesno' || (game === 'wheel' && wEntries.length === 0)) && (
        <div className="prompt-text" style={{ textAlign: 'center' }}>
          {rolling ? '…' : result?.result || '—'}
        </div>
      )}
      {!complete && (
        <Btn onClick={roll} disabled={!isMyTurn || rolling}>{rolling ? '…' : t.roll}</Btn>
      )}
      {complete && <p className="caption">{t.roundComplete}</p>}
    </div>
  );
}

function pipOn(face: number, index: number) {
  const layout: Record<number, number[]> = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };
  return (layout[face] || []).includes(index);
}

/* ---------------- result banner ---------------- */
function ResultView({ t, round, game, members }: { t: Strings; round: Round; game: string; members: Party['members'] }) {
  const result = round.result || {};
  if (game === 'wordle') {
    const winner = members.find((member) => member.id === result.winner_player_id);
    return (
      <div className="result-banner">
        <span className="glyph" style={{ width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--surface-3)' }}>
          <Glyph name="wordle" size={20} />
        </span>
        <div className="stack">
          <span className="caption">{t.wordWas}</span>
          <span className="h2 mono" style={{ letterSpacing: '.18em' }}>{result.word}</span>
        </div>
        {winner ? <span className="caption">{t.winner}: <b style={{ color: 'var(--ink)' }}>{winner.name}</b></span> : null}
      </div>
    );
  }
  if (game === 'trivia') {
    return (
      <div className="result-banner">
        <div className="stack">
          <span className="caption">{t.answer}</span>
          <span className="h2">{result.answer}</span>
        </div>
      </div>
    );
  }
  return null;
}
