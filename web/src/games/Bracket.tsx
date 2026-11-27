import React from 'react';
import type { Strings } from '../i18n';

export type BTeam = { name: string; members: string[] };
export type BMatch = { a: number | null; b: number | null; w: number | null };
export type BracketState = { teams: BTeam[]; rounds: BMatch[][] };
export type SetupState = { text: string; mode: 'each' | 'random' | 'manual'; count: number };

export const defaultSetup: SetupState = { text: '', mode: 'each', count: 2 };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const lines = (text: string) => text.split('\n').map((x) => x.trim()).filter(Boolean);

/** Turns the setup form into teams. `fallback` supplies names when the text box is empty (party players). */
export function buildTeams(setup: SetupState, fallback: string[] = []): BTeam[] {
  if (setup.mode === 'manual') {
    return lines(setup.text).slice(0, 32).map((line, i) => {
      const idx = line.indexOf(':');
      const name = idx > 0 ? line.slice(0, idx).trim() : `${i + 1}`;
      const members = (idx > 0 ? line.slice(idx + 1) : line).split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12);
      return { name: (idx > 0 ? name : members[0] || name).slice(0, 40), members: idx > 0 ? members : members.slice(1) };
    });
  }
  const names = (lines(setup.text).length ? lines(setup.text) : fallback).slice(0, 60);
  if (setup.mode === 'each') return names.slice(0, 32).map((name) => ({ name: name.slice(0, 40), members: [] }));
  const count = Math.max(2, Math.min(32, setup.count || 2, names.length));
  const teams: BTeam[] = Array.from({ length: count }, (_, i) => ({ name: `Team ${i + 1}`, members: [] }));
  shuffle(names).forEach((name, i) => { if (teams[i % count].members.length < 12) teams[i % count].members.push(name.slice(0, 40)); });
  return teams;
}

export function normalizeBracket(b: BracketState): BracketState {
  const rounds = b.rounds.map((r) => r.map((m) => ({ ...m })));
  rounds.forEach((matches, r) => {
    matches.forEach((m, i) => {
      if (r > 0) { m.a = rounds[r - 1][2 * i].w; m.b = rounds[r - 1][2 * i + 1].w; }
      else if ((m.a === null) !== (m.b === null)) m.w = m.a ?? m.b;
      if (m.w !== null && m.w !== m.a && m.w !== m.b) m.w = null;
    });
  });
  return { teams: b.teams, rounds };
}

export function makeBracket(teams: BTeam[]): BracketState {
  const seeds = shuffle(teams.map((_, i) => i));
  let size = 2;
  while (size < seeds.length) size *= 2;
  const half = size / 2;
  let matches: BMatch[] = [];
  for (let i = 0; i < half; i++) matches.push({ a: seeds[i], b: seeds[half + i] ?? null, w: null });
  const rounds = [matches];
  while (matches.length > 1) {
    matches = Array.from({ length: matches.length / 2 }, () => ({ a: null, b: null, w: null }));
    rounds.push(matches);
  }
  return normalizeBracket({ teams, rounds });
}

export function pickWinner(b: BracketState, r: number, m: number, side: 'a' | 'b'): BracketState {
  const match = b.rounds[r]?.[m];
  if (!match || match.a === null || match.b === null) return b;
  const next = { teams: b.teams, rounds: b.rounds.map((x) => x.map((y) => ({ ...y }))) };
  next.rounds[r][m].w = side === 'a' ? match.a : match.b;
  return normalizeBracket(next);
}

export function SetupForm({ t, setup, onChange, hint }: { t: Strings; setup: SetupState; onChange: (s: SetupState) => void; hint?: string }) {
  const modes: SetupState['mode'][] = ['each', 'random', 'manual'];
  const label = { each: t.bracketEach, random: t.bracketRandom, manual: t.bracketManual };
  return (
    <div className="stack gap-10" style={{ width: '100%' }}>
      <div className="seg">
        {modes.map((m) => (
          <button key={m} type="button" data-on={setup.mode === m} onClick={() => onChange({ ...setup, mode: m })}>{label[m]}</button>
        ))}
      </div>
      <label className="field">
        <span>{setup.mode === 'manual' ? t.bracketManualHint : t.bracketNames}</span>
        <textarea className="input" rows={5} value={setup.text} placeholder={hint || t.bracketPlaceholder} onChange={(e) => onChange({ ...setup, text: e.target.value })} />
      </label>
      {setup.mode === 'random' && (
        <label className="field" style={{ maxWidth: 180 }}>
          <span>{t.bracketTeamCount}</span>
          <input className="input" inputMode="numeric" value={String(setup.count)} onChange={(e) => onChange({ ...setup, count: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
        </label>
      )}
    </div>
  );
}

export function BracketView({ t, bracket, onPick }: { t: Strings; bracket: BracketState; onPick?: (r: number, m: number, side: 'a' | 'b') => void }) {
  const total = bracket.rounds.length;
  const final = bracket.rounds[total - 1]?.[0];
  const champ = final && final.w !== null ? bracket.teams[final.w] : null;
  const title = (r: number) => (r === total - 1 ? t.bracketFinal : r === total - 2 && total > 2 ? t.bracketSemis : `${t.round} ${r + 1}`);
  const slot = (r: number, m: number, side: 'a' | 'b', match: BMatch) => {
    const idx = match[side];
    const team = idx === null ? null : bracket.teams[idx];
    const won = match.w !== null && match.w === idx;
    const lost = match.w !== null && idx !== null && match.w !== idx;
    const ready = match.a !== null && match.b !== null;
    return (
      <button
        key={side}
        type="button"
        className="bracket-slot"
        data-won={won}
        data-lost={lost}
        disabled={!onPick || !ready}
        onClick={() => onPick && onPick(r, m, side)}
      >
        <b>{team ? team.name : r === 0 ? t.bracketBye : '…'}</b>
        {team && team.members.length > 0 && <small>{team.members.join(', ')}</small>}
      </button>
    );
  };
  return (
    <div className="stack gap-12" style={{ width: '100%', minWidth: 0 }}>
      {champ && (
        <div className="result-banner">
          <div className="stack">
            <span className="caption">{t.bracketChampion}</span>
            <span className="h2">{champ.name}</span>
            {champ.members.length > 0 && <span className="caption">{champ.members.join(', ')}</span>}
          </div>
        </div>
      )}
      <div className="bracket-scroll">
        {bracket.rounds.map((matches, r) => (
          <div className="bracket-col" key={r}>
            <p className="caption">{title(r)}</p>
            <div className="bracket-matches">
              {matches.map((match, m) => (
                <div className="bracket-match" key={m}>
                  {slot(r, m, 'a', match)}
                  {slot(r, m, 'b', match)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {onPick && !champ && <p className="caption">{t.bracketTap}</p>}
    </div>
  );
}
