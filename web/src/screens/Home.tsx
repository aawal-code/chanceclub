import React, { useState } from 'react';
import type { Party } from '../api';
import type { Strings } from '../i18n';
import { DieLogo, Glyph } from '../components/brand';
import { Btn, Card, Field } from '../components/ui';

const GAMES = ['wordle', 'dice', 'trivia', 'wyr', 'charades', 'likely', 'categories', 'whoami', 'coin', 'wheel', 'number', 'yesno'];

export default function Home({
  t, parties, identity, guestName, setGuestName, onStart, onJoin, onOpen, onBrowse, onSolo, busy,
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
  busy: boolean;
}) {
  const [partyName, setPartyName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  return (
    <>
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
        <div className="game-grid stagger">
          <Card id="start-card" className="stack gap-12" style={{ gridColumn: 'span 2', minWidth: 0 }}>
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

          <Card className="stack gap-12" style={{ gridColumn: 'span 2', minWidth: 0 }}>
            <div className="row between center">
              <h2 className="h2">{t.joinParty}</h2>
              <Glyph name="games" />
            </div>
            {!identity && (
              <Field label={t.guestName} value={guestName} onChange={setGuestName} placeholder={t.guestNamePh} maxLength={60} />
            )}
            <Field
              label={t.code}
              value={joinCode}
              onChange={(value) => setJoinCode(value.toUpperCase())}
              placeholder={t.codePh}
              maxLength={12}
            />
            <Btn block variant="ghost" disabled={busy || joinCode.trim().length < 4} onClick={() => onJoin(joinCode)}>
              {t.joinAction}
            </Btn>
          </Card>
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
        <div className="section-head">
          <h2 className="h1">{t.pickGame}</h2>
          <Btn variant="ghost" size="sm" onClick={onBrowse}>{t.allGames} →</Btn>
        </div>
        <div className="game-grid stagger">
          {GAMES.slice(0, 6).map((game) => (
            <button
              key={game}
              className="game-card"
              onClick={() => (game === 'wordle' ? onSolo() : document.getElementById('start-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))}
            >
              <span className="glyph"><Glyph name={game} /></span>
              <span className="name">{t.gameNames[game]}</span>
              <span className="cat">{t.gameCats[game]}</span>
            </button>
          ))}
        </div>
      </section>

      <p className="caption" style={{ textAlign: 'center', marginTop: 44, letterSpacing: '.2em' }}>
        CHANCECLUB · PLAY MORE, SCROLL LESS
      </p>
    </>
  );
}
