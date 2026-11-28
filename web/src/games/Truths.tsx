import React, { useState } from 'react';
import type { Party } from '../api';
import type { Locale, Strings } from '../i18n';
import { Btn, Card, Field } from '../components/ui';
import { Avatar } from '../components/Avatar';
import { Act, Clock, Reveal, Shell, TurnRail, useServerOffset } from './kit';

export type TruthsState = {
  phase: 'write' | 'vote' | 'reveal' | 'done';
  endsAt: number;
  serverNow: number;
  order: string[];
  topic?: string;
  myStatements: string[];
  myLie: number | null;
  hasSubmitted: boolean;
  submittedIds: string[];
  submittedCount: number;
  playerCount: number;
  subject: string;
  subjectIndex: number;
  subjectCount: number;
  statements: string[];
  votedCount: number;
  voterCount: number;
  hasVoted: boolean;
  myChoice: number | null;
  reveal: null | { subject: string; lie: number; correct: string[]; fooled: string[]; points: Record<string, number> };
  allResults: Record<string, { lie: number; correct: string[]; fooled: string[]; points: Record<string, number> }>;
};

const WRITE_SECONDS = 180;
const VOTE_SECONDS = 35;
const REVEAL_SECONDS = 11;

export default function Truths({ t, locale, party, onAct, onAdvance, onFinish, onLeave, onBack }: {
  t: Strings;
  locale: Locale;
  party: Party;
  onAct: Act;
  onAdvance: () => void;
  onFinish: () => void;
  onLeave: () => void;
  onBack: () => void;
}) {
  const gs = (party.game_state || {}) as TruthsState;
  const offset = useServerOffset(gs.serverNow);
  const [lines, setLines] = useState<string[]>(['', '', '']);
  const [lie, setLie] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const names = new Map(party.members.map((member) => [member.id, member.name]));
  const phase = gs.phase || 'write';
  const subjectName = names.get(gs.subject || '') || '';

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError('');
    const result = await onAct(body);
    setBusy(false);
    if (result && !result.ok) setError(result.message || t.error);
  };

  const setLine = (index: number, value: string) => {
    setLines((current) => current.map((line, i) => (i === index ? value : line)));
    setError('');
  };

  const ready = lines.every((line) => line.trim().length >= 2);
  const title = phase === 'vote' ? t.trVoteTitle : phase === 'reveal' ? t.trRevealTitle : t.trTitle;

  return (
    <Shell
      t={t}
      party={party}
      title={title}
      subtitle={phase === 'vote' ? `${gs.subjectIndex + 1}/${gs.subjectCount} · ${subjectName}` : undefined}
      onBack={onBack}
      onLeave={onLeave}
      onFinish={onFinish}
      onAdvance={onAdvance}
    >
      {phase === 'write' && (
        <div className="stack gap-12">
          <Clock endsAt={gs.endsAt} total={WRITE_SECONDS} offset={offset} label={`${gs.submittedCount}/${gs.playerCount} ${t.trSent}`} />
          <TurnRail
            party={party}
            order={gs.order || []}
            currentId={null}
            doneIds={new Set(gs.submittedIds || [])}
            youLabel={t.you}
            note={t.trSentSoFar}
          />
          {gs.hasSubmitted ? (
            <div className="gk-answer">
              <span className="caption">{t.trSentWaiting}</span>
              <div className="gk-used">
                {(gs.myStatements || []).map((line, index) => (
                  <span key={index} className="gk-used-word" data-lie={index === gs.myLie ? 'true' : undefined}>
                    {index + 1}. {line}{index === gs.myLie ? ` · ${t.trLieOn}` : ''}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <>
              {gs.topic ? (
                <div className="tr-topic">
                  <span className="caption">{t.trTopic}</span>
                  <strong>{gs.topic}</strong>
                </div>
              ) : null}
              <p className="caption">{t.trPrompt}</p>
              <div className="stack gap-10">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="tr-line">
                    <Field
                      label={`${index + 1}`}
                      value={lines[index]}
                      onChange={(value) => setLine(index, value)}
                      placeholder={index === 0 ? t.trPh1 : index === 1 ? t.trPh2 : t.trPh3}
                      maxLength={120}
                    />
                    <button
                      type="button"
                      className="tr-lie"
                      data-active={lie === index}
                      onClick={() => setLie(index)}
                      aria-pressed={lie === index}
                    >
                      {lie === index ? t.trLieOn : t.trLieOff}
                    </button>
                  </div>
                ))}
              </div>
              {error ? <p className="gk-error" role="alert">{error}</p> : null}
              <Btn disabled={!ready || busy} onClick={() => void send({ type: 'submit', lines: lines.map((line) => line.trim()), choice: lie })}>
                {t.trSend}
              </Btn>
            </>
          )}
        </div>
      )}

      {phase === 'vote' && (
        <div className="stack gap-12">
          <Clock endsAt={gs.endsAt} total={VOTE_SECONDS} offset={offset} label={`${gs.votedCount}/${gs.voterCount} ${t.trVoted}`} />
          <div className="row gap-10 center">
            <Avatar avatar={party.members.find((m) => m.id === gs.subject)?.avatar} name={subjectName} size={32} />
            <div className="stack">
              <span style={{ fontWeight: 800 }}>{subjectName}</span>
              <span className="caption">{t.trWhichLie}</span>
            </div>
          </div>
          {gs.subject === party.self_player_id ? (
            <div className="gk-answer">
              <span className="caption">{t.trYourTurnWait}</span>
              <span className="caption">{gs.votedCount}/{gs.voterCount}</span>
            </div>
          ) : gs.hasVoted ? (
            <div className="gk-answer">
              <span className="caption">{t.trYouPicked.replace('{n}', String((gs.myChoice ?? 0) + 1))}</span>
              <span className="caption">{gs.votedCount}/{gs.voterCount}</span>
            </div>
          ) : (
            <div className="stack gap-10">
              {(gs.statements || []).map((line, index) => (
                <button key={index} className="gk-pick-btn" disabled={busy} onClick={() => void send({ type: 'vote', choice: index })}>
                  <span className="gk-dot">{index + 1}</span>
                  <span style={{ textAlign: 'start' }}>{line}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === 'reveal' && gs.reveal && (
        <Reveal
          tone={gs.reveal.subject === party.self_player_id ? 'neutral' : gs.reveal.correct.includes(party.self_player_id || '') ? 'win' : 'lose'}
          headline={t.trTheLieWas.replace('{n}', String(gs.reveal.lie + 1))}
          sub={t.trSubjectWas.replace('{name}', names.get(gs.reveal.subject) || '')}
        >
          <div className="stack gap-8" style={{ marginTop: 10 }}>
            {(gs.statements || []).map((line, index) => (
              <div key={index} className="gk-clue" data-pending={index === gs.reveal?.lie ? undefined : 'true'}>
                <span className="caption mono" style={{ width: 20 }}>{index + 1}</span>
                <span className="grow" style={{ textAlign: 'start', fontWeight: index === gs.reveal?.lie ? 800 : 600 }}>{line}</span>
                {index === gs.reveal?.lie ? <span className="caption">{t.trLie}</span> : null}
              </div>
            ))}
          </div>
          <div className="row gap-8 wrap" style={{ marginTop: 10 }}>
            {gs.reveal.correct.map((id) => <span key={id} className="gk-used-word">{names.get(id) || '—'} +1</span>)}
            {gs.reveal.fooled.map((id) => <span key={id} className="gk-used-word" data-fooled="true">{names.get(id) || '—'}</span>)}
            {gs.reveal.points[gs.reveal.subject] ? <span className="gk-used-word">{subjectNameOf(gs.reveal.subject, names)} +{gs.reveal.points[gs.reveal.subject]}</span> : null}
          </div>
        </Reveal>
      )}

      {phase === 'done' && (
        <Card className="stack gap-10">
          <h3 className="h3">{t.trAllDone}</h3>
          {Object.entries(gs.allResults || {}).map(([id, result]) => (
            <div key={id} className="row gap-10 center">
              <Avatar avatar={party.members.find((m) => m.id === id)?.avatar} name={names.get(id) || ''} size={24} />
              <span className="grow" style={{ fontWeight: 700, fontSize: 14 }}>{names.get(id) || '—'}</span>
              <span className="caption">{result.correct.length} {t.trSpotted} · {result.fooled.length} {t.trFooled}</span>
            </div>
          ))}
        </Card>
      )}
    </Shell>
  );
}

function subjectNameOf(id: string, names: Map<string, string>) {
  return names.get(id) || '';
}
