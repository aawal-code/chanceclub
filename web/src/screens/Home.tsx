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
  const [partyName, setPartyName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ChanceClub</p>
          <h1 className="display">{t.heroTitle}</h1>
          <p className="lead">{t.heroLead}</p>
          <div className="hero-actions">
            <Btn size="lg" onClick={() => document.getElementById('start-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
              {t.startParty}
            </Btn>
            <Btn size="lg" variant="ghost" onClick={onSolo}>{t.playSolo}</Btn>
          </div>
          <div className="hero-meta">
            <span>● {t.hostedFree}</span>
            <span>● {t.noAccount}</span>
            <span>● {t.instant}</span>
          </div>
        </div>
        <div className="hero-art">
          <DieLogo size={260} animated />
        </div>
      </section>

      <section className="section">
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
      </section>

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
          <Btn variant="ghost" size="sm" onClick={onBrowse}>{t.allGames} →</Btn>
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
                <span className="badge">{party.status}</span>
                <span className="glyph"><Glyph name="party" /></span>
                <span className="name">{party.name}</span>
                <span className="cat">{party.code} · {party.players.length} {t.members.toLowerCase()}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="game-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <Card id="start-card" pad="lg" className="stack gap-12">
            <div className="row between center">
              <h2 className="h2">{t.createParty}</h2>
              <Glyph name="party" />
            </div>
            {!identity && (
              <Field label={t.guestName} value={guestName} onChange={setGuestName} placeholder={t.guestNamePh} maxLength={60} />
            )}
            <Field label={t.partyName} value={partyName} onChange={setPartyName} placeholder={t.partyNamePh} maxLength={80} />
            <Btn block disabled={busy} onClick={() => onStart(partyName.trim() || t.partyNamePh)}>{t.createAction}</Btn>
          </Card>

          <Card pad="lg" className="stack gap-12">
            <div className="row between center">
              <h2 className="h2">{t.joinParty}</h2>
              <Glyph name="games" />
            </div>
            {!identity && (
              <Field label={t.guestName} value={guestName} onChange={setGuestName} placeholder={t.guestNamePh} maxLength={60} />
            )}
            <Field label={t.code} value={joinCode} onChange={(value) => setJoinCode(value.toUpperCase())} placeholder={t.codePh} maxLength={12} />
            <Btn block variant="ghost" disabled={busy || joinCode.trim().length < 4} onClick={() => onJoin(joinCode)}>{t.joinAction}</Btn>
          </Card>
        </div>
      </section>

      <p className="caption" style={{ textAlign: 'center', marginTop: 44, letterSpacing: '.2em' }}>
        CHANCECLUB · PLAY MORE, SCROLL LESS
      </p>
    </div>
  );
}
