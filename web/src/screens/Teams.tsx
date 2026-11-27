import React, { useEffect, useState } from 'react';
import { api, type Team } from '../api';
import type { Strings } from '../i18n';
import { Btn, Card, Field, useToast } from '../components/ui';

export default function Teams({ t, identity, onSignIn }: { t: Strings; identity: { kind: 'user' | 'guest'; name: string } | null; onSignIn: () => void }) {
  const toast = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!identity) return;
    api.teams().then((result) => setTeams(result.data || [])).catch(() => setTeams([]));
  }, [identity]);

  const create = async () => {
    setBusy(true);
    try {
      const result = await api.createTeam(name.trim() || 'The crew');
      setTeams((current) => [result.data, ...current]);
      setName('');
      toast(t.saved);
    } catch (error: any) {
      toast(error?.message || t.error);
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    try {
      const result = await api.joinTeam(code.trim().toUpperCase());
      setTeams((current) => [result.data, ...current.filter((team) => team.code !== result.data.code)]);
      setCode('');
      toast(t.saved);
    } catch (error: any) {
      toast(error?.message || t.error);
    } finally {
      setBusy(false);
    }
  };

  if (!identity || identity.kind !== 'user') {
    return (
      <div className="stack gap-16 fade-up" style={{ maxWidth: 620 }}>
        <div className="stack gap-6">
          <p className="eyebrow">{t.teams}</p>
          <h1 className="h1">{t.teams}</h1>
        </div>
        <Card className="empty stack gap-12">
          <p className="body">{t.teamsEmpty}</p>
          <p className="caption">{t.guestNote}</p>
          <Btn onClick={onSignIn}>{t.signUp}</Btn>
        </Card>
      </div>
    );
  }

  return (
    <div className="stack gap-20 fade-up">
      <div className="stack gap-6">
        <p className="eyebrow">{t.teams}</p>
        <h1 className="h1">{t.teams}</h1>
      </div>

      <div className="game-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))' }}>
        <Card className="stack gap-10">
          <h3 className="h3">{t.createTeam}</h3>
          <Field label={t.teamName} value={name} onChange={setName} placeholder="The crew" maxLength={60} />
          <Btn disabled={busy} onClick={create}>{t.createTeam}</Btn>
        </Card>
        <Card className="stack gap-10">
          <h3 className="h3">{t.joinTeam}</h3>
          <Field label={t.code} value={code} onChange={(value) => setCode(value.toUpperCase())} placeholder={t.codePh} maxLength={12} />
          <Btn variant="ghost" disabled={busy || code.trim().length < 4} onClick={join}>{t.joinTeam}</Btn>
        </Card>
      </div>

      {teams.length === 0 ? (
        <div className="empty">{t.teamsEmpty}</div>
      ) : (
        <div className="game-grid stagger">
          {teams.map((team) => (
            <Card key={team.code} className="stack gap-6">
              <span className="h3">{team.name}</span>
              <span className="caption mono">{team.code}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
