import React, { useCallback, useEffect, useState } from 'react';
import type { Strings } from '../i18n';
import { Btn, Card, Field, Seg } from '../components/ui';
import { Wheel, angleFor } from './Wheel';
import { Glyph } from '../components/brand';

export default function SoloChance({ t, gameId, onBack }: { t: Strings; gameId: string; onBack: () => void }) {
  const [rolling, setRolling] = useState(false);
  const [faces, setFaces] = useState<number[]>([1, 1]);
  const [coin, setCoin] = useState<string | null>(null);
  const [number, setNumber] = useState<number | null>(null);
  const [max, setMax] = useState('100');
  const [answer, setAnswer] = useState<string | null>(null);
  const [wheelPick, setWheelPick] = useState<string | null>(null);
  const [wText, setWText] = useState('Pizza\nTacos\nSushi\nBurgers');
  const [wMode, setWMode] = useState<'keep' | 'remove'>('keep');
  const [wRemoved, setWRemoved] = useState<string[]>([]);
  const [wAngle, setWAngle] = useState(0);
  const [wSpins, setWSpins] = useState(0);
  const wEntries = wText.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 24);
  const wLeft = wEntries.filter((e) => !wRemoved.includes(e));

  useEffect(() => {
    setRolling(false);
    setFaces([1, 1]);
    setCoin(null);
    setNumber(null);
    setAnswer(null);
    setWheelPick(null);
    setWRemoved([]);
  }, [gameId]);

  const spinWheel = () => {
    if (wEntries.length < 2) return;
    let pool = wLeft;
    let removed = wRemoved;
    if (pool.length === 0) { pool = wEntries; removed = []; }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const idx = wEntries.indexOf(pick);
    setRolling(true);
    setWheelPick(null);
    setWSpins((n) => n + 1);
    setWAngle(angleFor(idx, wEntries.length, wSpins + 1));
    window.setTimeout(() => {
      setRolling(false);
      setWheelPick(pick);
      setWRemoved(wMode === 'remove' ? [...removed, pick] : []);
    }, 3300);
  };

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
      if (gameId === 'yesno') setAnswer(t.yesNo[Math.floor(Math.random() * t.yesNo.length)]);
    }, 780);
  }, [gameId, max, t]);

  return (
    <div className="stack gap-20 fade-up" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="row between center wrap gap-10">
        <div className="row gap-10 center">
          <Btn variant="ghost" size="sm" onClick={onBack}><Glyph name="back" size={16} /> {t.back}</Btn>
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
            <Wheel entries={wEntries} angle={wAngle} dim={wRemoved} spinning={wSpins > 0} />
            <div className="prompt-text center-text" style={{ minHeight: 40 }}>{rolling ? '…' : wheelPick ?? '—'}</div>
            {wMode === 'remove' && <p className="caption">{wLeft.length} {t.wheelRemaining}</p>}
            <label className="field" style={{ width: '100%' }}>
              <span>{t.wheelEntries}</span>
              <textarea className="input" rows={5} value={wText} placeholder={t.wheelPlaceholder} onChange={(e) => { setWText(e.target.value); setWRemoved([]); }} />
            </label>
            <Seg value={wMode} onChange={(v) => { setWMode(v); setWRemoved([]); }} options={[{ value: 'keep', label: t.wheelKeep }, { value: 'remove', label: t.wheelRemove }]} />
            {wRemoved.length > 0 && <Btn variant="ghost" size="sm" onClick={() => setWRemoved([])}>{t.wheelReset}</Btn>}
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

        <Btn size="lg" onClick={gameId === 'wheel' ? spinWheel : roll} disabled={rolling || (gameId === 'wheel' && wEntries.length < 2)}>{rolling ? t.loading : t.roll}</Btn>

        {gameId === 'dice' && !rolling && (
          <p className="caption">{faces[0]} + {faces[1]} = <b style={{ color: 'var(--ink)' }}>{faces[0] + faces[1]}</b></p>
        )}
      </Card>

      <p className="caption center-text">{t.gameDesc[gameId]}</p>
    </div>
  );
}

function pipOn(face: number, index: number) {
  const layout: Record<number, number[]> = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };
  return (layout[face] || []).includes(index);
}
