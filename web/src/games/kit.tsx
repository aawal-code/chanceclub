import React, { useEffect, useRef, useState } from 'react';
import type { Party } from '../api';
import type { Strings } from '../i18n';
import { Glyph } from '../components/brand';
import { Avatar } from '../components/Avatar';
import { Btn, Card } from '../components/ui';

/** Shared furniture for the turn-based party games: header, clock, turn rail, scores, host controls. */

export type ActResult = { ok: boolean; message?: string; raw?: string };
export type Act = (body: Record<string, unknown>) => Promise<ActResult> | void;

/** Milliseconds of clock skew between this device and the server. */
export function useServerOffset(serverNow: number | undefined) {
  const offset = useRef(0);
  if (serverNow) offset.current = serverNow - Date.now();
  return offset;
}

/** Re-render on a short tick while a clock is running. */
export function useTicker(active: boolean, ms = 250) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((n) => n + 1), ms);
    return () => window.clearInterval(id);
  }, [active, ms]);
}

export function secondsLeft(endsAt: number, offset: React.MutableRefObject<number>) {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - (Date.now() + offset.current)) / 1000));
}

export function Clock({ endsAt, total, offset, label }: { endsAt: number; total: number; offset: React.MutableRefObject<number>; label?: string }) {
  useTicker(!!endsAt);
  const left = secondsLeft(endsAt, offset);
  const pct = total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0;
  const tone = left <= 5 ? 'danger' : left <= 10 ? 'warn' : 'ok';
  return (
    <div className="gk-clock">
      <div className="row between center">
        <span className="caption">{label}</span>
        <span className="mono" style={{ fontWeight: 800, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{left}s</span>
      </div>
      <div className="gk-timer" data-tone={tone} role="progressbar" aria-valuenow={left} aria-valuemin={0} aria-valuemax={total}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function TurnRail({ party, order, currentId, doneIds, badge, youLabel, note }: {
  party: Party;
  order: string[];
  currentId?: string | null;
  doneIds?: Set<string>;
  badge?: (id: string) => string | null;
  youLabel: string;
  note?: string;
}) {
  const byId = new Map(party.members.map((member) => [member.id, member]));
  const list = order.map((id) => byId.get(id)).filter(Boolean);
  return (
    <div className="gk-rail" role="list" aria-label={note}>
      {list.map((member) => {
        const id = member!.id;
        const isTurn = id === currentId;
        const done = doneIds?.has(id) ?? false;
        const tag = badge?.(id);
        return (
          <span key={id} className="gk-chip" data-turn={isTurn ? 'true' : undefined} data-done={done ? 'true' : undefined} role="listitem">
            <span className="gk-dot" data-turn={isTurn ? 'true' : undefined}>{done ? <Glyph name="check" size={12} /> : member!.name.charAt(0).toUpperCase()}</span>
            <span style={{ fontWeight: isTurn ? 800 : 600 }}>{member!.name}{id === party.self_player_id ? ` · ${youLabel}` : ''}</span>
            {tag ? <span className="caption">{tag}</span> : null}
          </span>
        );
      })}
    </div>
  );
}

export function Scores({ t, party }: { t: Strings; party: Party }) {
  const sorted = [...party.members].sort((a, b) => b.score - a.score);
  return (
    <Card className="stack gap-10">
      <div className="row between center">
        <h3 className="h3">{t.scores}</h3>
        <span className="caption">{party.members.length} {t.members.toLowerCase()}</span>
      </div>
      {sorted.map((member, index) => (
        <div key={member.id} className="row gap-10 center">
          <span className="caption mono" style={{ width: 16 }}>{index + 1}</span>
          <Avatar avatar={member.avatar} name={member.name} size={28} />
          <span className="grow" style={{ fontWeight: 700, fontSize: 14 }}>{member.name}{member.id === party.self_player_id ? ` · ${t.you}` : ''}</span>
          <span className="mono" style={{ fontWeight: 800 }}>{member.score}</span>
        </div>
      ))}
    </Card>
  );
}

export function Shell({ t, party, title, subtitle, onBack, onLeave, onFinish, onAdvance, children, nextLabel }: {
  t: Strings;
  party: Party;
  title: string;
  subtitle?: React.ReactNode;
  onBack: () => void;
  onLeave: () => void;
  onFinish: () => void;
  onAdvance: () => void;
  children: React.ReactNode;
  nextLabel?: string;
}) {
  const round = party.round;
  const complete = round?.status === 'complete';
  return (
    <div className="game-stage fade-up">
      <div className="row between center wrap gap-10">
        <div className="row gap-10 center">
          <Btn variant="ghost" size="sm" onClick={onBack}><Glyph name="back" size={16} /> {t.lobby}</Btn>
          <span className="caption">{party.name} · {party.code}</span>
        </div>
        <div className="row gap-8 center">
          <span className="caption">{t.round} {round?.number ?? 1}</span>
          <Btn variant="ghost" size="sm" onClick={onLeave}>{t.leave}</Btn>
        </div>
      </div>

      <Card pad="lg" className="stack gap-14">
        <div className="row between center wrap gap-10">
          <h2 className="h2">{title}</h2>
          {subtitle ? <span className="caption">{subtitle}</span> : null}
        </div>
        {children}
      </Card>

      <Scores t={t} party={party} />

      {party.is_host && (
        <div className="row gap-10 wrap">
          {complete
            ? <Btn onClick={onAdvance}>{nextLabel || t.nextRound}</Btn>
            : <Btn variant="ghost" onClick={onFinish}>{t.endGame}</Btn>}
        </div>
      )}
    </div>
  );
}

/** Big payoff banner used by every game at reveal time. */
export function Reveal({ tone, headline, sub, children }: { tone: 'win' | 'lose' | 'neutral'; headline: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="gk-reveal" data-tone={tone}>
      <p className="gk-reveal-head">{headline}</p>
      {sub ? <p className="caption" style={{ opacity: .9 }}>{sub}</p> : null}
      {children}
    </div>
  );
}
