import React, { useEffect, useRef, useState } from 'react';
import type { Party } from '../api';
import type { Locale, Strings } from '../i18n';
import { Btn, Card, Field } from '../components/ui';
import { Avatar } from '../components/Avatar';
import { Act, Clock, Reveal, Shell, useServerOffset } from './kit';

export type WordBombState = {
  phase: 'play' | 'boom';
  endsAt: number;
  serverNow: number;
  order: string[];
  category: string;
  holderId: string;
  youHold: boolean;
  used: string[];
  passes: number;
  fuseMs: number;
  lastPass: null | { from: string; to: string; word: string; at: number };
  boom: null | { holderId: string; passes: number; words: string[]; points: Record<string, number> };
};

export default function WordBomb({ t, locale, party, onAct, onAdvance, onFinish, onLeave, onBack }: {
  t: Strings;
  locale: Locale;
  party: Party;
  onAct: Act;
  onAdvance: () => void;
  onFinish: () => void;
  onLeave: () => void;
  onBack: () => void;
}) {
  const gs = (party.game_state || {}) as WordBombState;
  const offset = useServerOffset(gs.serverNow);
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const names = new Map(party.members.map((member) => [member.id, member.name]));
  const phase = gs.phase || 'play';
  const holderName = names.get(gs.holderId || '') || '';
  const fuseSeconds = Math.max(1, Math.round((gs.fuseMs || 20000) / 1000));

  // The bomb is in your hands: put the cursor where the word goes, every time it comes back.
  useEffect(() => {
    if (gs.youHold && phase === 'play') {
      const id = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(id);
    }
  }, [gs.youHold, phase, gs.passes]);

  const pass = async () => {
    const value = word.trim();
    if (!value || busy) return;
    setBusy(true);
    setError('');
    const result = await onAct({ type: 'word', value });
    setBusy(false);
    if (result && !result.ok) {
      setError(result.raw === 'duplicate' ? t.wbDupe : result.raw === 'wrong' ? t.wbWrong : result.message || t.error);
      setWord('');
      inputRef.current?.focus();
      return;
    }
    setWord('');
  };

  const title = phase === 'boom' ? t.wbBoomTitle : t.wbTitle;

  return (
    <Shell
      t={t}
      party={party}
      title={title}
      subtitle={phase === 'play' ? t.wbWordsUsed.replace('{n}', String(gs.used?.length || 0)) : undefined}
      onBack={onBack}
      onLeave={onLeave}
      onFinish={onFinish}
      onAdvance={onAdvance}
    >
      {phase === 'play' && (
        <>
          <div className="gk-wordcard" data-imposter={gs.youHold ? 'true' : undefined}>
            <span className="caption">{t.wbCategory}</span>
            <span className="gk-word">{gs.category || '—'}</span>
            <span className="caption">{gs.youHold ? t.wbYouHold : t.wbHolding.replace('{name}', holderName)}</span>
          </div>

          <Clock endsAt={gs.endsAt} total={fuseSeconds} offset={offset} label={t.wbFuse} />

          {gs.youHold ? (
            <div className="stack gap-10">
              <Field
                label={t.wbYourWord}
                value={word}
                onChange={(value) => { setWord(value); setError(''); }}
                placeholder={t.wbWordPh}
                maxLength={40}
                onKeyDown={(event) => { if (event.key === 'Enter') void pass(); }}
              />
              <Btn disabled={!word.trim() || busy} onClick={() => void pass()}>{t.wbPass}</Btn>
              {error ? <p className="gk-error" role="alert">{error}</p> : null}
            </div>
          ) : (
            <div className="gk-answer">
              <span className="caption">{t.wbWait}</span>
              <div className="row gap-8 center">
                <Avatar avatar={party.members.find((m) => m.id === gs.holderId)?.avatar} name={holderName} size={24} />
                <span style={{ fontWeight: 800 }}>{holderName}</span>
              </div>
              {gs.lastPass ? <span className="caption">{t.wbLastPass.replace('{word}', gs.lastPass.word)}</span> : null}
            </div>
          )}

          <div className="stack gap-6">
            <span className="caption">{t.wbUsed}</span>
            <div className="gk-used">
              {(gs.used || []).length === 0 ? <span className="caption">{t.wbNoneYet}</span> : (gs.used || []).map((item, index) => (
                <span key={`${item}-${index}`} className="gk-used-word">{item}</span>
              ))}
            </div>
          </div>
        </>
      )}

      {phase === 'boom' && gs.boom && (
        <Reveal
          tone={gs.boom.holderId === party.self_player_id ? 'lose' : 'win'}
          headline={t.wbBoom}
          sub={(gs.boom.passes === 1 ? t.wbBoomSubOne : t.wbBoomSub).replace('{name}', names.get(gs.boom.holderId) || '').replace('{passes}', String(gs.boom.passes))}
        >
          <div className="stack gap-8" style={{ marginTop: 10 }}>
            {party.members.map((member) => {
              const points = gs.boom?.points?.[member.id] ?? 0;
              return (
                <div key={member.id} className="row gap-10 center">
                  <Avatar avatar={member.avatar} name={member.name} size={24} />
                  <span className="grow" style={{ fontWeight: 700, fontSize: 14 }}>{member.name}{member.id === party.self_player_id ? ` · ${t.you}` : ''}</span>
                  <span className="mono" style={{ fontWeight: 800, color: points > 0 ? 'var(--hit)' : 'var(--muted)' }}><bdi dir="ltr">+{points}</bdi></span>
                </div>
              );
            })}
          </div>
          <div className="gk-used" style={{ marginTop: 10 }}>
            {(gs.boom.words || []).map((item, index) => <span key={`${item}-${index}`} className="gk-used-word">{item}</span>)}
          </div>
        </Reveal>
      )}
    </Shell>
  );
}
