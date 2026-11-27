import React, { useCallback, useEffect, useState } from 'react';
import { api, type WordleGame } from '../api';
import type { Strings } from '../i18n';
import { Btn, Card, Spinner, useToast } from '../components/ui';
import { Keyboard, WordleBoard, keyStatesFrom } from './Wordle';

export default function WordleSolo({ t, onBack }: { t: Strings; onBack: () => void }) {
  const toast = useToast();
  const [game, setGame] = useState<WordleGame | null>(null);
  const [current, setCurrent] = useState('');
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revealRow, setRevealRow] = useState<number | undefined>(undefined);

  const start = useCallback(async () => {
    setBusy(true);
    setCurrent('');
    setRevealRow(undefined);
    try {
      const result = await api.wordleStart();
      setGame(result.data);
    } catch (error: any) {
      toast(error?.message || t.error);
    } finally {
      setBusy(false);
    }
  }, [t.error, toast]);

  useEffect(() => { start(); }, [start]);

  const submit = useCallback(async () => {
    if (!game || game.done || busy) return;
    if (current.length !== 5) {
      setShake(true);
      window.setTimeout(() => setShake(false), 420);
      return;
    }
    setBusy(true);
    try {
      const result = await api.wordleGuess(game.id, current);
      setRevealRow(result.data.attempts.length - 1);
      setGame(result.data);
      setCurrent('');
    } catch (error: any) {
      setShake(true);
      window.setTimeout(() => setShake(false), 420);
      toast(error?.message || t.error);
    } finally {
      setBusy(false);
    }
  }, [busy, current, game, t.error, toast]);

  const onKey = useCallback((key: string) => {
    if (!game || game.done) return;
    if (key === 'enter') return submit();
    if (key === 'back') return setCurrent((value) => value.slice(0, -1));
    if (/^[a-z]$/.test(key)) setCurrent((value) => (value.length >= 5 ? value : value + key));
  }, [game, submit]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const key = event.key.toLowerCase();
      if (key === 'enter') { event.preventDefault(); onKey('enter'); }
      else if (key === 'backspace') { event.preventDefault(); onKey('back'); }
      else if (/^[a-z]$/.test(key)) onKey(key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onKey]);

  return (
    <div className="stack gap-20 fade-up" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="row between center wrap gap-10">
        <div className="stack gap-4">
          <p className="eyebrow">{t.games} · {t.solo}</p>
          <h1 className="h1">{t.wordle}</h1>
        </div>
        <div className="row gap-8">
          <Btn variant="ghost" size="sm" onClick={onBack}>← {t.back}</Btn>
          <Btn variant="soft" size="sm" onClick={start} disabled={busy}>{t.newWord}</Btn>
        </div>
      </div>

      <Card pad="lg" className="stack gap-18">
        {!game ? (
          <div className="row gap-10 center" style={{ justifyContent: 'center', padding: 40 }}>
            <Spinner /> {t.loading}
          </div>
        ) : (
          <div className="wordle">
            <WordleBoard attempts={game.attempts} current={current} max={game.max} length={game.length} revealRow={revealRow} shake={shake} />
            <div className="row gap-16 center">
              <span className="caption">{game.attempts.length}/{game.max}</span>
              {game.solved && <span className="caption" style={{ color: 'var(--hit)' }}>{t.solved}</span>}
              {game.done && !game.solved && <span className="caption">{t.outOfGuesses}</span>}
            </div>
            {game.done ? (
              <div className="result-banner" style={{ width: '100%' }}>
                <div className="stack">
                  <span className="caption">{game.solved ? t.solved : t.wordWas}</span>
                  <span className="h2 mono" style={{ letterSpacing: '.18em' }}>{game.word}</span>
                </div>
                <Btn size="sm" onClick={start}>{t.newWord}</Btn>
              </div>
            ) : (
              <Keyboard onKey={onKey} keyStates={keyStatesFrom(game.attempts)} />
            )}
          </div>
        )}
      </Card>

      <p className="caption" style={{ textAlign: 'center' }}>{t.wordleHint}</p>
    </div>
  );
}
