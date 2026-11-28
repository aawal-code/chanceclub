import React, { useMemo, useState } from 'react';
import { api, setSavedUser, setSession } from '../api';
import type { Locale, Strings } from '../i18n';
import { Btn, Card, Field, Seg, useToast } from '../components/ui';
import type { ThemeName } from '../App';


export default function Profile({
  t, locale, setLocale, theme, setTheme, identity, setIdentity, guestName, setGuestName, onSignOut,
}: {
  t: Strings;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  identity: { kind: 'user' | 'guest'; name: string } | null;
  setIdentity: (identity: { kind: 'user' | 'guest'; name: string } | null) => void;
  guestName: string;
  setGuestName: (name: string) => void;
  onSignOut: () => void;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState(identity?.name || guestName || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState(false);

  const isAccount = identity?.kind === 'user';
  const displayName = identity?.name || guestName || '';
  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= 2;

  const saveName = async () => {
    setError(null);
    if (!nameValid) { setError(t.displayNameHint); return; }
    setGuestName(trimmedName);
    if (!identity) { setSavedName(true); window.setTimeout(() => setSavedName(false), 1800); return; }
    setBusy(true);
    try {
      await api.updateMe({ name: trimmedName });
      setIdentity({ kind: identity.kind, name: trimmedName });
      setSavedName(true);
      window.setTimeout(() => setSavedName(false), 1800);
    } catch (problem: any) {
      setError(problem?.message || t.error);
    } finally {
      setBusy(false);
    }
  };

  const submitAuth = async () => {
    setError(null);
    if (mode === 'signup' && !nameValid) { setError(t.displayNameHint); return; }
    if (!email.trim()) { setError(t.email); return; }
    if (mode === 'signup' && password.length < 8) { setError(t.passwordHint); return; }
    if (mode === 'signin' && password.length < 1) { setError(t.password); return; }
    setBusy(true);
    try {
      const result = mode === 'signup'
        ? await api.register(trimmedName, email.trim(), password)
        : await api.login(email.trim(), password);
      setSession(result);
      setSavedUser({ name: result.user.name });
      setIdentity({ kind: 'user', name: result.user.name });
      setName(result.user.name);
      setPassword('');
      setEmail('');
      toast(t.saved);
    } catch (problem: any) {
      setError(problem?.message || t.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack gap-20 fade-up" style={{ maxWidth: 760 }}>
      <div className="stack gap-6">
        <p className="eyebrow">{t.profile}</p>
        <h1 className="h1">{t.profileTitle}</h1>
      </div>

      <Card pad="lg" className="stack gap-16">
        <div className="row gap-14 center wrap">
          <span className="avatar-chip" style={{ width: 56, height: 56, borderRadius: 18, fontSize: 22 }}>
            {(displayName || 'A').charAt(0).toUpperCase()}
          </span>
          <div className="stack gap-4">
            <span className="h2">{displayName || t.guestName}</span>
            <span className="caption">{isAccount ? t.account : t.guestAccount}</span>
          </div>
        </div>

        <div className="stack gap-8">
          <div className="row gap-10 wrap" style={{ alignItems: 'flex-end' }}>
            <div className="grow" style={{ minWidth: 220 }}>
              <Field label={t.displayName} value={name} onChange={(value) => { setName(value); setError(null); }} placeholder={t.guestNamePh} maxLength={60} />
            </div>
            <Btn onClick={saveName} disabled={busy || !nameValid}>{savedName ? t.saved : t.save}</Btn>
          </div>
          <p className="caption">{t.displayNameHint}</p>
        </div>
      </Card>

      <Card pad="lg" className="stack gap-14">
        {isAccount ? (
          <>
            <div className="row between center wrap gap-10">
              <h3 className="h3">{t.account}</h3>
              <Btn variant="ghost" onClick={onSignOut}>{t.signOut}</Btn>
            </div>
            <p className="caption">{t.guestNote}</p>
          </>
        ) : (
          <>
            <div className="row between center wrap gap-10">
              <h3 className="h3">{mode === 'signup' ? t.createAccount : t.signIn}</h3>
              <Seg
                value={mode}
                options={[{ value: 'signup' as const, label: t.signUp }, { value: 'signin' as const, label: t.signIn }]}
                onChange={(value) => { setMode(value); setError(null); }}
              />
            </div>
            <p className="caption">{t.guestNote}</p>

            <Field label={t.email} value={email} onChange={(value) => { setEmail(value); setError(null); }} placeholder="you@example.com" type="email" />
            <div className="stack gap-6">
              <label className="field">
                <span>{t.password}</span>
                <span className="pw-wrap">
                  <input
                    className="input"
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); setError(null); }}
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    onKeyDown={(event) => { if (event.key === 'Enter') submitAuth(); }}
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? t.hidePassword : t.showPassword}
                  </button>
                </span>
              </label>
              {mode === 'signup' && <p className="caption">{t.passwordHint}</p>}
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="row gap-10 wrap">
              <Btn disabled={busy} onClick={submitAuth}>
                {busy ? t.loading : mode === 'signup' ? t.createAccount : t.signIn}
              </Btn>
              {mode === 'signup' && (
                <Btn variant="ghost" onClick={() => { setMode('signin'); setError(null); }}>{t.haveAccount}</Btn>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
