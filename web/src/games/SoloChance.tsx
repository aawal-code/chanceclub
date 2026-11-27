import React, { useCallback, useEffect, useState } from 'react';
import type { Strings } from '../i18n';
import { Btn, Card, Field } from '../components/ui';
import { Glyph } from '../components/brand';

export default function SoloChance({ t, gameId, onBack }: { t: Strings; gameId: string; onBack: () => void }) {
  const [rolling, setRolling] = useState(false);
  const [faces, setFaces] = useState<number[]>([1, 1]);
  const [coin, setCoin] = useState<string | null>(null);
  const [number, setNumber] = useState<number | null>(null);
  const [max, setMax] = useState('100');
  const [answer, setAnswer] = useState<string | null>(null);
  const [wheelPick, setWheelPick] = useState<number | null>(null);

  useEffect(() => {
    setRolling(false);
    setFaces([1, 1]);
    setCoin(null);
    setNumber(null);
    setAnswer(null);
    setWheelPick(null);
  }, [gameId]);

  const roll = useCallback(() => {
    setRolling(true);
    window.setTimeout(() => {
      setRolling(false);
      if (gameId === 'dice') setFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
      if (gameId === 'coin') setCoin(Math.random() < 0.5 ? 'heads' : 'tails');
      if (gameId === 'number') {
        const top = Math.max(2, Math.min(10000, Number(max) || 100));
        setNumber(1 + Math.floor(Math.random() * top));
      }
      if (gameId === 'wheel') setWheelPick(1 + Math.floor(Math.random() * 10));
      if (gameId === 'yesno') setAnswer(t.yesNo[Math.floor(Math.random() * t.yesNo.length)]);
    }, 780);
  }, [gameId, max, t]);

  return (
    <div className="stack gap-20 fade-up" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="row between center wrap gap-10">
        <div className="row gap-10 center">
          <Btn variant="ghost" size="sm" onClick={onBack}>← {t.back}</Btn>
          <span className="row gap-8 center">
            <Glyph name={gameId} size={18} />
            <span className="caption">{t.gameNames[gameId]}</span>
          </span>
        </div>
        <span className="caption">{t.solo}</span>
      </div>

      <Card pad="lg" className="stack gap-20 center-stack">
        {gameId === 'dice' && (
          <div className="dice-tray">
            {faces.map((face, index) => (
              <div className="die" key={index} data-rolling={rolling ? 'true' : undefined}>
                {Array.from({ length: 9 }).map((_, pipIndex) => (
                  <span key={pipIndex} className="pip" data-off={!pipOn(face, pipIndex) ? 'true' : undefined} />
                ))}
              </div>
            ))}
          </div>
        )}

        {gameId === 'coin' && (
          <div className="coin" data-spin={rolling ? 'true' : undefined}>
            <span className={coin && !rolling ? 'reveal-pop' : ''}>
              {rolling ? '…' : coin ? (coin === 'heads' ? t.heads : t.tails) : '—'}
            </span>
          </div>
        )}

        {gameId === 'wheel' && (
          <>
            <div className="wheel-pointer" />
            <div className="wheel-disc" data-spin={rolling ? 'true' : undefined}>
              <span className="h1" style={{ opacity: rolling ? 0.2 : 1 }}>{wheelPick ?? '—'}</span>
            </div>
          </>
        )}

        {gameId === 'number' && (
          <>
            <div className="number-display">{rolling ? '…' : number ?? '—'}</div>
            <div style={{ width: 180 }}>
              <Field label={t.maxLabel} value={max} onChange={setMax} inputMode="numeric" />
            </div>
          </>
        )}

        {gameId === 'yesno' && (
          <div className="prompt-text center-text" style={{ minHeight: 80 }}>
            {rolling ? '…' : answer ?? '—'}
          </div>
        )}

        <Btn size="lg" onClick={roll} disabled={rolling}>{rolling ? t.loading : t.roll}</Btn>

        {gameId === 'dice' && !rolling && (
          <p className="caption">{faces[0]} + {faces[1]} = <b style={{ color: 'var(--ink)' }}>{faces[0] + faces[1]}</b></p>
        )}
      </Card>

      <p className="caption center-text">{t.gameBlurbs[gameId]}</p>
    </div>
  );
}

function pipOn(face: number, index: number) {
  const layout: Record<number, number[]> = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };
  return (layout[face] || []).includes(index);
}
