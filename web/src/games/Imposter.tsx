import React, { useState } from 'react';
import type { Party } from '../api';
import type { Locale, Strings } from '../i18n';
import { Btn, Card, Field } from '../components/ui';
import { Act, Clock, Reveal, Shell, TurnRail, useServerOffset } from './kit';

export type ImposterState = {
  phase: 'clues' | 'vote' | 'guess' | 'reveal';
  endsAt: number;
  serverNow: number;
  order: string[];
  youAreImposter: boolean;
  yourWord: string;
  clueIndex: number;
  clues: Record<string, string>;
  votedCount: number;
  voterCount: number;
  myVote: string;
  hasVoted: boolean;
  caught: boolean | null;
  guessed: boolean;
  reveal: null | {
    civilian: string;
    imposterWord: string;
    imposterId: string;
    caught: boolean;
    guessed: boolean;
    tally: Record<string, number>;
    points: Record<string, number>;
  };
};

const CLUE_SECONDS = 45;
const VOTE_SECONDS = 40;
const GUESS_SECONDS = 25;

export default function Imposter({ t, locale, party, onAct, onAdvance, onFinish, onLeave, onBack }: {
  t: Strings;
  locale: Locale;
  party: Party;
  onAct: Act;
  onAdvance: () => void;
  onFinish: () => void;
  onLeave: () => void;
  onBack: () => void;
}) {
  const gs = (party.game_state || {}) as ImposterState;
  const offset = useServerOffset(gs.serverNow);
  const [clue, setClue] = useState('');
  const [guess, setGuess] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const names = new Map(party.members.map((member) => [member.id, member.name]));
  const phase = gs.phase || 'clues';
  const clueTurn = phase === 'clues' ? gs.order?.[gs.clueIndex] : null;
  const myTurn = !!clueTurn && clueTurn === party.self_player_id;
  const done = new Set(Object.keys(gs.clues || {}));

  const send = async (body: Record<string, unknown>, clear?: () => void) => {
    setBusy(true);
    setError('');
    const result = await onAct(body);
    setBusy(false);
    if (result && !result.ok) { setError(result.message || t.error); return; }
    clear?.();
  };

  const title = phase === 'reveal' ? t.impRevealTitle : t.impTitle;

  return (
    <Shell
      t={t}
      party={party}
      title={title}
      subtitle={phase === 'clues' ? t.impClueRound : phase === 'vote' ? t.impVoteRound : phase === 'guess' ? t.impGuessRound : undefined}
      onBack={onBack}
      onLeave={onLeave}
      onFinish={onFinish}
      onAdvance={onAdvance}
    >
      {phase !== 'reveal' && (
        <div className="gk-wordcard" data-imposter={gs.youAreImposter ? 'true' : undefined}>
          <span className="caption">{gs.youAreImposter ? t.impYouAre : t.impYourWord}</span>
          <span className="gk-word">{gs.yourWord || '—'}</span>
          <span className="caption">{gs.youAreImposter ? t.impBlend : t.impKeepSecret}</span>
        </div>
      )}

      {(phase === 'clues' || phase === 'vote') && (
        <TurnRail
          party={party}
          order={gs.order || []}
          currentId={clueTurn}
          doneIds={phase === 'clues' ? done : new Set(gs.hasVoted ? [party.self_player_id || ''] : [])}
          youLabel={t.you}
          note={t.impOrder}
        />
      )}

      {phase === 'clues' && (
        <div className="stack gap-12">
          <Clock endsAt={gs.endsAt} total={CLUE_SECONDS} offset={offset} label={myTurn ? t.yourTurn : `${t.waitingTurn} · ${names.get(clueTurn || '') || ''}`} />
          <div className="stack gap-6">
            {gs.order?.map((id, index) => {
              const text = gs.clues?.[id];
              return (
                <div key={id} className="gk-clue" data-pending={!text ? 'true' : undefined}>
                  <span className="caption mono" style={{ width: 20 }}>{index + 1}</span>
                  <span style={{ fontWeight: 700, minWidth: 64 }}>{names.get(id) || '—'}</span>
                  <span className="grow" style={{ textAlign: 'start' }}>{text || (id === clueTurn ? t.impThinking : '—')}</span>
                </div>
              );
            })}
          </div>
          {myTurn ? (
            <div className="stack gap-10">
              <Field
                label={t.impYourClue}
                value={clue}
                onChange={setClue}
                placeholder={t.impCluePh}
                maxLength={60}
                autoFocus
                onKeyDown={(event) => { if (event.key === 'Enter' && clue.trim() && !busy) void send({ type: 'clue', value: clue.trim() }, () => setClue('')); }}
              />
              <Btn disabled={!clue.trim() || busy} onClick={() => void send({ type: 'clue', value: clue.trim() }, () => setClue(''))}>{t.impSendClue}</Btn>
            </div>
          ) : (
            <p className="caption">{t.impWaitClue.replace('{name}', names.get(clueTurn || '') || '')}</p>
          )}
        </div>
      )}

      {phase === 'vote' && (
        <div className="stack gap-12">
          <Clock endsAt={gs.endsAt} total={VOTE_SECONDS} offset={offset} label={`${gs.votedCount}/${gs.voterCount} ${t.impVoted}`} />
          {gs.hasVoted ? (
            <div className="gk-answer">
              <span className="caption">{t.impYouVoted}</span>
              <span style={{ fontWeight: 800 }}>{names.get(gs.myVote) || '—'}</span>
              <span className="caption">{t.impWaitVotes}</span>
            </div>
          ) : (
            <>
              <p className="caption">{t.impWhoIsIt}</p>
              <div className="gk-pick">
                {party.members.filter((member) => member.id !== party.self_player_id).map((member) => (
                  <button key={member.id} className="gk-pick-btn" disabled={busy} onClick={() => void send({ type: 'vote', target_player_id: Number(member.id) })}>
                    <span className="gk-dot">{member.name.charAt(0).toUpperCase()}</span>
                    <span>{member.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {phase === 'guess' && (
        <div className="stack gap-12">
          <Clock endsAt={gs.endsAt} total={GUESS_SECONDS} offset={offset} label={gs.youAreImposter ? t.impGuessNow : t.impGuessWaiting} />
          {gs.youAreImposter ? (
            <div className="stack gap-10">
              <p className="body">{t.impCaughtGuess}</p>
              <Field
                label={t.impRealWord}
                value={guess}
                onChange={setGuess}
                placeholder={t.impGuessPh}
                maxLength={60}
                autoFocus
                onKeyDown={(event) => { if (event.key === 'Enter' && guess.trim() && !busy) void send({ type: 'guess', value: guess.trim() }, () => setGuess('')); }}
              />
              <Btn disabled={!guess.trim() || busy} onClick={() => void send({ type: 'guess', value: guess.trim() }, () => setGuess(''))}>{t.impGuessBtn}</Btn>
            </div>
          ) : (
            <div className="gk-answer">
              <span className="caption">{t.impCaught}</span>
              <span style={{ fontWeight: 800 }}>{names.get(gs.order?.find((id) => id === (gs.reveal?.imposterId || '')) || '') || ''}</span>
              <span className="caption">{t.impGuessWaiting}</span>
            </div>
          )}
        </div>
      )}

      {phase === 'reveal' && gs.reveal && (
        <Reveal
          tone={(gs.reveal.caught && !gs.reveal.guessed) === gs.youAreImposter ? 'lose' : 'win'}
          headline={gs.reveal.caught && !gs.reveal.guessed ? t.impCrewWins : t.impImposterWins}
          sub={gs.reveal.caught ? (gs.reveal.guessed ? t.impGuessedRight : t.impCaughtRight) : t.impSurvivedVote}
        >
          <div className="gk-words">
            <div className="gk-wordtile">
              <span className="caption">{t.impRealWord}</span>
              <span className="gk-word">{gs.reveal.civilian}</span>
            </div>
            <div className="gk-wordtile" data-imposter="true">
              <span className="caption">{t.impImposterWord}</span>
              <span className="gk-word">{gs.reveal.imposterWord}</span>
            </div>
          </div>
          <p className="body" style={{ fontWeight: 700 }}>
            {t.impWasImposter.replace('{name}', names.get(gs.reveal.imposterId) || '—')}
          </p>
          <div className="stack gap-6">
            {party.members.map((member) => {
              const votes = gs.reveal!.tally?.[member.id] ?? 0;
              const points = gs.reveal!.points?.[member.id] ?? 0;
              return (
                <div key={member.id} className="gk-clue">
                  <span className="grow" style={{ fontWeight: 700 }}>{member.name}{member.id === gs.reveal!.imposterId ? ` · ${t.impImposterTag}` : ''}</span>
                  <span className="caption">{votes} {votes === 1 ? t.impVoteOne : t.impVotesWord}</span>
                  {points > 0 && <span className="gk-points">+{points}</span>}
                </div>
              );
            })}
          </div>
        </Reveal>
      )}

      {error && <p className="caption" style={{ color: '#e03131' }}>{error}</p>}
      {party.is_host && party.round?.status === 'complete' && <p className="caption">{t.gkNextHint}</p>}
    </Shell>
  );
}
