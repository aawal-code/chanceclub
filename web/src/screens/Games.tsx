import React from 'react';
import type { Strings } from '../i18n';
import { Glyph } from '../components/brand';
import { Card } from '../components/ui';

const ALL = ['wordle', 'trivia', 'charades', 'whoami', 'wyr', 'likely', 'categories', 'dice', 'coin', 'wheel', 'number', 'yesno'];

export default function Games({ t, onSolo, onParty }: { t: Strings; onSolo: () => void; onParty: () => void }) {
  return (
    <div className="stack gap-20 fade-up">
      <div className="stack gap-6">
        <p className="eyebrow">{t.games}</p>
        <h1 className="h1">{t.pickGame}</h1>
        <p className="lead">{t.heroLead}</p>
      </div>

      <div className="game-grid stagger">
        {ALL.map((game) => {
          const solo = game === 'wordle';
          return (
            <button key={game} className="game-card" onClick={() => (solo ? onSolo() : onParty())}>
              <span className="badge">{solo ? t.solo : t.multiplayer}</span>
              <span className="glyph"><Glyph name={game} /></span>
              <span className="name">{t.gameNames[game]}</span>
              <span className="cat">{t.gameCats[game]}</span>
            </button>
          );
        })}
      </div>

      <Card className="stack gap-8">
        <h3 className="h3">{t.wordleSolo}</h3>
        <p className="caption">
          {t.wordle} · {t.solo} — six guesses, five letters. The word is checked on the server, so nobody can peek.
        </p>
      </Card>
    </div>
  );
}
