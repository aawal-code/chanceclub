import React from 'react';
import type { Strings } from '../i18n';
import { Glyph } from '../components/brand';
import { soloGames, partyGames, GAME_GROUPS } from '../games/meta';

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
          <button className="nav-link" onClick={onParty}>{t.startParty}<Glyph name="arrow" size={16} /></button>
        </div>
        {GAME_GROUPS.map((grp) => (
          <div key={grp.key} className="stack gap-8" style={{ marginBottom: 16 }}>
            <p className="caption" style={{ fontWeight: 700 }}>{t[grp.key]}</p>
        <div className="game-grid stagger">
          {partyGames.filter((g) => grp.ids.includes(g.id)).map((game) => (
            <button key={`p-${game.id}`} className="game-card" onClick={() => onOpen(game.id)}>
              <span className="badge">{game.modes.includes('solo') ? t.both : t.multiplayer}</span>
              <span className="glyph"><Glyph name={game.id} /></span>
              <span className="name">{t.gameNames[game.id]}</span>
              <span className="cat">{t.gameCats[game.id]}</span>
            </button>
          ))}
        </div>
          </div>
        ))}
      </section>
    </div>
  );
}
