import React, { useEffect, useState } from 'react';
import type { Party } from '../api';
import TournamentCard from './TournamentCard';
import type { Locale, Strings } from '../i18n';
import { Glyph } from '../components/brand';
import { SetupForm, buildTeams, defaultSetup } from '../games/Bracket';
import type { SetupState } from '../games/Bracket';
import { Btn, Card, CopyButton, Field, Seg, useToast, LagPill } from '../components/ui';

const GAMES = ['wordle', 'draw', 'bracket', 'trivia', 'charades', 'whoami', 'wyr', 'likely', 'categories', 'dice', 'coin', 'wheel', 'number', 'yesno'];

export default function PartyScreen({
  t, locale, identity, guestName, setGuestName, parties, activeParty, busy, initialCode,
  onCreate, onJoin, onOpen, onReady, onStart, onLeave, onOpenGame, onSignIn, onTournament,
}: {
  t: Strings;
  locale: Locale;
  identity: { kind: 'user' | 'guest'; name: string } | null;
  guestName: string;
  setGuestName: (name: string) => void;
  parties: Party[];
  activeParty: Party | null;
  busy: boolean;
  initialCode?: string;
  onCreate: (name: string) => void;
  onJoin: (code: string) => void;
  onOpen: (code: string) => void;
  onReady: (ready: boolean) => void;
  onStart: (game: string, opts?: { entries?: string[]; eliminate?: boolean; teams?: { name: string; members: string[] }[] }) => void;
  onLeave: () => void;
  onOpenGame: () => void;
  onSignIn: () => void;
  onTournament: (party: Party, started?: boolean) => void;
}) {
  const toast = useToast();
  const [partyName, setPartyName] = useState('');
  const [joinCode, setJoinCode] = useState(initialCode || '');
  const [picked, setPicked] = useState('wordle');
  const [wheelText, setWheelText] = useState('');
  const [bSetup, setBSetup] = useState<SetupState>(defaultSetup);
  const [wheelMode, setWheelMode] = useState<'keep' | 'remove'>('keep');

  useEffect(() => {
    if (initialCode) setJoinCode(initialCode.toUpperCase());
  }, [initialCode]);

  /* ---------- lobby ---------- */
  if (activeParty && activeParty.status === 'lobby') {
    const me = activeParty.members.find((member) => member.id === activeParty.self_player_id);
    const present = activeParty.members.filter((member) => member.online || member.is_host);
    const everyoneReady = present.every((member) => member.ready);
    const canStart = activeParty.is_host && present.length >= 2 && everyoneReady;
    const invite = `${window.location.origin}${window.location.pathname}#/party/${activeParty.code}`;

    return (
      <div className="lobby fade-up">
        <div className="stack gap-16">
          <Card pad="lg" className="stack gap-16">
            <div className="row between center wrap gap-10">
              <div className="stack gap-4">
                <p className="eyebrow">{t.lobby}</p>
                <h1 className="h1">{activeParty.name}</h1>
              </div>
              <span className="seg" style={{ padding: '6px 14px' }}>
                <b style={{ fontSize: 12, letterSpacing: '.08em' }}>{activeParty.members.length} {t.members.toLowerCase()}</b>
              </span>
            </div>

            <div className="code-block">
              <div className="stack gap-4">
                <p className="caption">{t.invite}</p>
                <span className="code-value">{activeParty.code}</span>
              </div>
              <CopyButton value={invite} label={t.copyLink} onCopied={() => toast(t.copied)} />
            </div>

            <div className="stack gap-4">
              <p className="caption">{t.members}</p>
              {activeParty.members.map((member) => (
                <div key={member.id} className="member">
                  <span className="avatar-chip">{member.name.charAt(0).toUpperCase()}</span>
                  <div className="grow stack">
                    <span className="name">
                      {member.name}
                      {member.is_host ? <span className="caption" style={{ marginLeft: 8 }}>· {t.host}</span> : null}
                      {member.id === activeParty.self_player_id ? <span className="caption" style={{ marginLeft: 8 }}>· {t.you}</span> : null}
                    </span>
                    <span className="meta">{member.online ? t.connected : t.offline} · {member.ready ? t.ready : t.notReady} · <LagPill rtt={member.rtt} online={member.online} labels={{ none: t.lagNone, slight: t.lagSlight, heavy: t.lagHeavy, checking: t.lagChecking, offline: t.offline }} /></span>
                  </div>
                  <span className="dot" data-on={member.online} />
                  <span className="mono" style={{ fontWeight: 700 }}>{member.score}</span>
                </div>
              ))}
            </div>

            <div className="row gap-10 wrap">
              <Btn variant={me?.ready ? 'ghost' : 'solid'} onClick={() => onReady(!me?.ready)}>
                {me?.ready ? t.notReady : t.ready}
              </Btn>
              <Btn variant="ghost" onClick={onLeave}>{t.leave}</Btn>
              {activeParty.is_host && !(activeParty.tournament && activeParty.tournament.status === 'active') && (
                <Btn disabled={!canStart || busy} onClick={() => onStart(picked, picked === 'bracket' ? { teams: buildTeams(bSetup, activeParty.members.map((x) => x.name)) } : picked === 'wheel' ? { entries: wheelText.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 24), eliminate: wheelMode === 'remove' } : undefined)}>
                  {t.startGame}
                </Btn>
              )}
            </div>
            {activeParty.is_host && !canStart && (
              <p className="caption">
                {present.length < 2 ? t.needTwo : !everyoneReady ? t.everyoneReady : ''}
              </p>
            )}
          </Card>

          <TournamentCard t={t} locale={locale} party={activeParty} onParty={onTournament} />

          {activeParty.is_host && !(activeParty.tournament && activeParty.tournament.status === 'active') && (
            <Card pad="lg" className="stack gap-12">
              <div className="section-head">
                <h2 className="h2">{t.chooseGame}</h2>
              </div>
              <div className="game-grid">
                {GAMES.map((game) => (
                  <button
                    key={game}
                    className="game-card"
                    data-selected={picked === game}
                    onClick={() => setPicked(game)}
                    style={picked === game ? { borderColor: 'var(--ink)', background: 'var(--surface-2)' } : undefined}
                  >
                    <span className="glyph"><Glyph name={game} /></span>
                    <span className="name">{t.gameNames[game]}</span>
                    <span className="cat">{t.gameCats[game]}</span>
                  </button>
                ))}
              </div>
              {picked === 'bracket' && <SetupForm t={t} setup={bSetup} onChange={setBSetup} hint={t.bracketPartyHint} />}
              {picked === 'wheel' && (
                <div className="stack gap-10">
                  <label className="field">
                    <span>{t.wheelEntries}</span>
                    <textarea className="input" rows={5} value={wheelText} placeholder={t.wheelPartyHint} onChange={(e) => setWheelText(e.target.value)} />
                  </label>
                  <p className="caption">{t.wheelMode}</p>
                  <Seg value={wheelMode} onChange={setWheelMode} options={[{ value: 'keep', label: t.wheelKeep }, { value: 'remove', label: t.wheelRemove }]} />
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="stack gap-16">
          <Card className="stack gap-10">
            <h3 className="h3">{t.hostControls}</h3>
            <p className="caption">
              {locale === 'ar'
                ? 'المضيف يختار اللعبة ويبدأ الجولات. الجميع يحتاج للضغط على "أنا جاهز".'
                : 'The host picks the game and starts rounds. Everyone needs to hit ready.'}
            </p>
          </Card>
          {parties.filter((party) => party.code !== activeParty.code).length > 0 && (
            <Card className="stack gap-10">
              <h3 className="h3">{t.yourParties}</h3>
              {parties.filter((party) => party.code !== activeParty.code).map((party) => (
                <button key={party.code} className="member" onClick={() => onOpen(party.code)} style={{ border: 0, background: 'none', textAlign: 'left', cursor: 'pointer' }}>
                  <span className="avatar-chip">{party.name.charAt(0).toUpperCase()}</span>
                  <div className="grow stack">
                    <span className="name">{party.name}</span>
                    <span className="meta">{party.code} · {party.status === 'playing' ? t.multiplayer : t.lobby} · {party.players.length} {t.members.toLowerCase()}</span>
                  </div>
                  <Glyph name="arrow" size={18} />
                </button>
              ))}
            </Card>
          )}
        </div>
      </div>
    );
  }

  /* ---------- game in progress ---------- */
  if (activeParty && activeParty.status === 'playing') {
    return (
      <div className="fade-up" style={{ maxWidth: 620 }}>
        <Card pad="lg" className="stack gap-16">
          <p className="eyebrow">{t.round} {activeParty.round?.number ?? 1}</p>
          <h1 className="h1">{activeParty.name}</h1>
          <p className="body">{t.gameNames[activeParty.game || ''] || activeParty.game}</p>
          <div className="row gap-10 wrap">
            <Btn onClick={onOpenGame}>{t.open} →</Btn>
            <Btn variant="ghost" onClick={onLeave}>{t.leave}</Btn>
          </div>
        </Card>
      </div>
    );
  }

  /* ---------- create / join ---------- */
  return (
    <div className="fade-up stack gap-16" style={{ maxWidth: 760 }}>
      <div className="stack gap-6">
        <p className="eyebrow">{t.party}</p>
        <h1 className="h1">{t.startParty}</h1>
      </div>

      <div className="game-grid" style={{ gridTemplateColumns: '1fr' }}>
        <Card pad="lg" className="stack gap-12">
          <h2 className="h2">{t.createParty}</h2>
          {!identity && (
            <Field label={t.guestName} value={guestName} onChange={setGuestName} placeholder={t.guestNamePh} maxLength={60} />
          )}
          <Field label={t.partyName} value={partyName} onChange={setPartyName} placeholder={t.partyNamePh} maxLength={80} />
          <Btn disabled={busy} onClick={() => onCreate(partyName.trim() || t.partyNamePh)}>{t.createAction}</Btn>
        </Card>

        <Card pad="lg" className="stack gap-12">
          <h2 className="h2">{t.joinParty}</h2>
          {!identity && (
            <Field label={t.guestName} value={guestName} onChange={setGuestName} placeholder={t.guestNamePh} maxLength={60} />
          )}
          <Field label={t.code} value={joinCode} onChange={(value) => setJoinCode(value.toUpperCase())} placeholder={t.codePh} maxLength={12} />
          <Btn variant="ghost" disabled={busy || joinCode.trim().length < 4} onClick={() => onJoin(joinCode)}>{t.joinAction}</Btn>
        </Card>
      </div>

      {parties.length > 0 && (
        <Card className="stack gap-8">
          <h3 className="h3">{t.yourParties}</h3>
          {parties.map((party) => (
            <button key={party.code} className="member" onClick={() => onOpen(party.code)} style={{ border: 0, background: 'none', textAlign: 'left', cursor: 'pointer' }}>
              <span className="avatar-chip">{party.name.charAt(0).toUpperCase()}</span>
              <div className="grow stack">
                <span className="name">{party.name}</span>
                <span className="meta">{party.code} · {party.status === 'playing' ? t.multiplayer : t.lobby} · {party.players.length} {t.members.toLowerCase()}</span>
              </div>
              <Glyph name="arrow" size={18} />
            </button>
          ))}
        </Card>
      )}

      {!identity && (
        <p className="caption">{t.guestNote} <button onClick={onSignIn} style={{ background: 'none', border: 0, color: 'var(--ink)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>{t.signIn}</button></p>
      )}
    </div>
  );
}
