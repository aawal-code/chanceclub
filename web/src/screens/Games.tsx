import React from 'react';
import type { Strings } from '../i18n';
import { Glyph } from '../components/brand';
import { soloGames, partyGames } from '../games/meta';

export default function Games({ t, onOpen, onParty }: { t: Strings; onOpen: (id: string) => void; onParty: () => void }) {
  return (
    <div className="stack gap-20 fade-up">
      <div className="stack gap-6">
        <p className="eyebrow">{t.games}</p>
        <h1 className="h1">{t.pickGame}</h1>
        <p className="lead">{t.heroLead}</p>
      </div>

      <section className="section">
        <div className="section-title">
          <div className="stack gap-4">
            <h2 className="h2">{t.soloGames}</h2>
            <p className="section-sub">{t.soloHint}</p>
          </div>
        </div>
        <div className="game-grid stagger">
          {soloGames.map((game) => (
            <button key={`s-${game.id}`} className="game-card" onClick={() => onOpen(game.id)}>
              <span className="badge">{t.solo}</span>
              <span className="glyph"><Glyph name={game.id} /></span>
              <span className="name">{t.gameNames[game.id]}</span>
              <span className="cat">{t.gameCats[game.id]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <div className="stack gap-4">
            <h2 className="h2">{t.partyGames}</h2>
            <p className="section-sub">{t.partyHint}</p>
          </div>
          <button className="nav-link" onClick={onParty}>{t.startParty} →</button>
        </div>
        <div className="game-grid stagger">
          {partyGames.map((game) => (
            <button key={`p-${game.id}`} className="game-card" onClick={() => onOpen(game.id)}>
              <span className="badge">{game.modes.includes('solo') ? t.both : t.multiplayer}</span>
              <span className="glyph"><Glyph name={game.id} /></span>
              <span className="name">{t.gameNames[game.id]}</span>
              <span className="cat">{t.gameCats[game.id]}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
