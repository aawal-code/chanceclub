import React, { useState } from 'react';
import type { Strings } from '../i18n';
import { Btn, Card } from '../components/ui';
import { Glyph } from '../components/brand';
import { BracketView, SetupForm, buildTeams, defaultSetup, makeBracket, pickWinner } from './Bracket';
import type { BracketState, SetupState } from './Bracket';

export default function SoloBracket({ t, onBack }: { t: Strings; onBack: () => void }) {
  const [setup, setSetup] = useState<SetupState>({ ...defaultSetup, text: 'Alex\nSam\nNoor\nJo\nMia\nLeo' });
  const [bracket, setBracket] = useState<BracketState | null>(null);
  const [error, setError] = useState('');

  const generate = () => {
    const teams = buildTeams(setup);
    if (teams.length < 2) { setError(t.bracketNeed2); return; }
    setError('');
    setBracket(makeBracket(teams));
  };

  return (
    <div className="stack gap-20 fade-up" style={{ maxWidth: 860, margin: '0 auto', width: '100%', minWidth: 0 }}>
      <div className="row between center wrap gap-10">
        <div className="row gap-10 center">
          <Btn variant="ghost" size="sm" onClick={onBack}>← {t.back}</Btn>
          <span className="row gap-8 center"><Glyph name="bracket" size={18} /><span className="caption">{t.gameNames.bracket}</span></span>
        </div>
        <span className="caption">{t.solo}</span>
      </div>
      <Card pad="lg" className="stack gap-16" style={{ minWidth: 0 }}>
        {bracket && <BracketView t={t} bracket={bracket} onPick={(r, m, side) => setBracket(pickWinner(bracket, r, m, side))} />}
        <SetupForm t={t} setup={setup} onChange={setSetup} />
        {error && <p className="caption">{error}</p>}
        <div className="row gap-10 wrap">
          <Btn onClick={generate}>{bracket ? t.bracketReshuffle : t.bracketGenerate}</Btn>
        </div>
      </Card>
      <p className="caption center-text">{t.gameBlurbs.bracket}</p>
    </div>
  );
}
