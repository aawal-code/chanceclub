import React from 'react';
import type { Strings } from '../i18n';
import { Glyph } from '../components/brand';
import { partyGames, GAME_GROUPS, type GroupKey } from '../games/meta';

export default function Games({ t, onOpen, onParty }: { t: Strings; onOpen: (id: string) => void; onParty: () => void }) {
  const groups = GAME_GROUPS.filter((grp) => grp.key !== 'gDeciders');
  const deciders = GAME_GROUPS.find((grp) => grp.key === 'gDeciders');

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
            <h2 className="h2">{t.partyGames}</h2>
            <p className="section-sub">{t.partyHint}</p>
          </div>
          <button className="nav-link" onClick={onParty}>{t.startParty}<Glyph name="arrow" size={16} /></button>
        </div>
        {groups.map((grp) => (
          <div key={grp.key} className="game-group">
            <p className="group-label">{t[grp.key as GroupKey]}</p>
            <div className="game-grid stagger">
              {partyGames.filter((g) => grp.ids.includes(g.id)).map((game) => (
                <button key={`p-${game.id}`} className="game-card" onClick={() => onOpen(game.id)}>
                  <span className="badge">{game.modes.includes('solo') ? t.both : t.multiplayer}</span>
                  <span className="glyph"><Glyph name={game.id} /></span>
                  <span className="name">{t.gameNames[game.id]}</span>
                  <span className="desc">{t.gameDesc[game.id]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {deciders && (
        <section className="section deciders">
          <div className="section-title">
            <div className="stack gap-4">
              <h2 className="h2">{t.gDeciders}</h2>
              <p className="section-sub">{t.gDecidersHint}</p>
            </div>
          </div>
          <div className="game-grid stagger">
            {partyGames.filter((g) => deciders.ids.includes(g.id)).map((game) => (
              <button key={`d-${game.id}`} className="game-card" data-tool="true" onClick={() => onOpen(game.id)}>
                <span className="badge">{game.modes.includes('solo') ? t.both : t.multiplayer}</span>
                <span className="glyph"><Glyph name={game.id} /></span>
                <span className="name">{t.gameNames[game.id]}</span>
                <span className="desc">{t.gameDesc[game.id]}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
