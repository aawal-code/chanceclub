import React, { useState } from 'react';
import type { Party } from '../api';
import type { Strings } from '../i18n';
import { DieLogo, Glyph } from '../components/brand';
import { Btn, Card, Field } from '../components/ui';
import { soloGames, partyGames } from '../games/meta';

export default function Home({
  t, parties, identity, guestName, setGuestName, onStart, onJoin, onOpen, onBrowse, onSolo, onGame, busy,
}: {
  t: Strings;
  parties: Party[];
  identity: { kind: 'user' | 'guest'; name: string } | null;
  guestName: string;
  setGuestName: (name: string) => void;
  onStart: (name: string) => void;
  onJoin: (code: string) => void;
  onOpen: (code: string) => void;
  onBrowse: () => void;
  onSolo: () => void;
  onGame: (id: string) => void;
  busy: boolean;
}) {
  const [joinCode, setJoinCode] = useState('');
  const [tipOpen, setTipOpen] = useState(() => { try { return !localStorage.getItem('cc.tip1'); } catch { return false; } });

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ChanceClub</p>
          <h1 className="display">{t.heroTitle}</h1>
          <p className="lead">{t.heroLead}</p>
          {tipOpen && (
            <p className="tip-line" onClick={() => { setTipOpen(false); try { localStorage.setItem('cc.tip1', '1'); } catch { /* ignore */ } }}>
              <Glyph name="bulb" size={18} /> <span style={{ flex: 1 }}>{t.firstTip}</span> <Glyph name="close" size={16} />
            </p>
          )}
          <div className="hero-actions">
            <Btn size="lg" disabled={busy} onClick={() => onStart(t.partyNamePh)}>{t.playFriends}</Btn>
            <Btn size="lg" variant="ghost" onClick={onSolo}>{t.playSolo}</Btn>
          </div>
          <div className="row gap-8" style={{ marginTop: 14, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Field label={t.joinParty} value={joinCode} onChange={(value) => setJoinCode(value.toUpperCase())} placeholder={t.codePh} maxLength={12} />
            </div>
            <Btn variant="soft" disabled={busy || joinCode.trim().length < 4} onClick={() => onJoin(joinCode)}>{t.joinAction}</Btn>
          </div>
          {!identity && (
            <div style={{ marginTop: 10 }}>
              <Field label={t.nameOptional} value={guestName} onChange={setGuestName} placeholder={t.guestNamePh} maxLength={60} />
            </div>
          )}
          <div className="hero-meta">
            <span><Glyph name="check" size={14} /> {t.hostedFree}</span>
            <span><Glyph name="check" size={14} /> {t.noAccount}</span>
            <span><Glyph name="check" size={14} /> {t.instant}</span>
          </div>
        </div>
        <div className="hero-art">
          <DieLogo size={260} animated />
        </div>
      </section>

      <details className="section how">
        <summary className="h2">{t.howItWorks}</summary>
        <div className="section-head">
          <h2 className="h1">{t.whatTitle}</h2>
        </div>
        <p className="lead">{t.whatBody}</p>
        <div className="band">
          {[
            { n: '01', title: t.step1T, body: t.step1B },
            { n: '02', title: t.step2T, body: t.step2B },
            { n: '03', title: t.step3T, body: t.step3B },
          ].map((step) => (
            <div className="band-card" key={step.n}>
              <span className="step-num">{step.n}</span>
              <span className="h3">{step.title}</span>
              <span className="caption">{step.body}</span>
            </div>
          ))}
        </div>
      </details>

      <section className="section">
        <div className="section-title">
          <div className="stack gap-4">
            <h2 className="h1">{t.soloGames}</h2>
            <p className="section-sub">{t.soloHint}</p>
          </div>
        </div>
        <div className="game-grid stagger">
          {soloGames.map((game) => (
            <button key={`solo-${game.id}`} className="game-card" onClick={() => onGame(game.id)}>
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
            <h2 className="h1">{t.partyGames}</h2>
            <p className="section-sub">{t.partyHint}</p>
          </div>
          <Btn variant="ghost" size="sm" onClick={onBrowse}>{t.allGames}<Glyph name="arrow" size={16} /></Btn>
        </div>
        <div className="game-grid stagger">
          {partyGames.map((game) => (
            <button key={`party-${game.id}`} className="game-card" onClick={() => onGame(game.id)}>
              <span className="badge">{game.modes.includes('solo') ? t.both : t.multiplayer}</span>
              <span className="glyph"><Glyph name={game.id} /></span>
              <span className="name">{t.gameNames[game.id]}</span>
              <span className="cat">{t.gameCats[game.id]}</span>
            </button>
          ))}
        </div>
      </section>

      {parties.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="h1">{t.yourParties}</h2>
          </div>
          <div className="game-grid stagger">
            {parties.map((party) => (
              <button key={party.code} className="game-card" onClick={() => onOpen(party.code)}>
                <span className="badge">{party.status === 'playing' ? t.multiplayer : t.lobby}</span>
                <span className="glyph"><Glyph name="party" /></span>
                <span className="name">{party.name}</span>
                <span className="cat">{party.code} · {party.players.length} {party.players.length === 1 ? t.playerOne : t.members.toLowerCase()}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="caption" style={{ textAlign: 'center', marginTop: 44, letterSpacing: '.2em' }}>
        CHANCECLUB · PLAY MORE, SCROLL LESS
      </p>
    </div>
  );
}
