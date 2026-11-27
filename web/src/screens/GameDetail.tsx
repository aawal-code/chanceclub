import React from 'react';
import type { Party } from '../api';
import type { Strings } from '../i18n';
import { Glyph } from '../components/brand';
import { Btn, Card } from '../components/ui';
import { GAMES, type GameMeta } from '../games/meta';

export default function GameDetail({
  t, gameId, meta, parties, onBack, onSolo, onParty, onPick,
}: {
  t: Strings;
  gameId: string;
  meta: GameMeta;
  parties: Party[];
  onBack: () => void;
  onSolo: () => void;
  onParty: () => void;
  onPick: (id: string) => void;
}) {
  const canSolo = meta.modes.includes('solo');
  const openParties = parties.filter((party) => party.status === 'lobby');
  const others = GAMES.filter((game) => game.id !== gameId).slice(0, 5);

  return (
    <div className="stack gap-20 fade-up detail-wrap">
      <div className="row gap-10 center">
        <Btn variant="ghost" size="sm" onClick={onBack}>← {t.games}</Btn>
      </div>

      <div className="detail">
        <div className="stack gap-16">
          <div className="row gap-14 center">
            <span className="detail-mark"><Glyph name={gameId} size={34} /></span>
            <div className="stack gap-4">
              <p className="eyebrow">{t.gameCats[gameId]}</p>
              <h1 className="h1">{t.gameNames[gameId]}</h1>
            </div>
          </div>
          <p className="lead">{t.gameBlurbs[gameId]}</p>
          <div className="row gap-8 wrap">
            {meta.modes.map((mode) => (
              <span key={mode} className="mode-chip">{mode === 'solo' ? t.solo : t.multiplayer}</span>
            ))}
          </div>
          <div className="row gap-10 wrap">
            {canSolo && <Btn size="lg" onClick={onSolo}>{t.playSolo}</Btn>}
            <Btn size="lg" variant={canSolo ? 'ghost' : 'solid'} onClick={onParty}>{t.startParty}</Btn>
          </div>
        </div>

        <div className="stack gap-14">
          <Card pad="lg" className="stack gap-10">
            <h3 className="h3">{t.howTitle}</h3>
            <p className="caption">{canSolo ? `${t.soloHint} ${t.partyHint}` : t.partyHint}</p>
            {openParties.length > 0 && (
              <div className="stack gap-6">
                <span className="caption">{t.yourParties}</span>
                {openParties.slice(0, 3).map((party) => (
                  <span key={party.code} className="row gap-8 center">
                    <span className="dot" data-on="true" />
                    <span className="caption">{party.name} · {party.code}</span>
                  </span>
                ))}
              </div>
            )}
          </Card>

          <Card className="stack gap-8">
            <span className="caption">{t.allGames}</span>
            {others.map((game) => (
              <button key={game.id} className="mini-row" onClick={() => onPick(game.id)}>
                <span className="mini-glyph"><Glyph name={game.id} size={16} /></span>
                <span className="grow stack">
                  <span className="mini-name">{t.gameNames[game.id]}</span>
                  <span className="mini-cat">{t.gameCats[game.id]}</span>
                </span>
                <span className="mini-mode">{game.modes.includes('solo') ? t.both : t.multiplayer}</span>
              </button>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
