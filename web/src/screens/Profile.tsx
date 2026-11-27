import React, { useState } from 'react';
import { api, setSavedUser, setToken } from '../api';
import type { Locale, Strings } from '../i18n';
import { Btn, Card, Field, Seg, useToast } from '../components/ui';

export default function Profile({
  t, locale, setLocale, theme, setTheme, identity, setIdentity, guestName, setGuestName, onSignOut,
}: {
  t: Strings;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  identity: { kind: 'user' | 'guest'; name: string } | null;
  setIdentity: (identity: { kind: 'user' | 'guest'; name: string } | null) => void;
  guestName: string;
  setGuestName: (name: string) => void;
  onSignOut: () => void;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [name, setName] = useState(guestName);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const saveName = async () => {
    setGuestName(name.trim());
    if (identity?.kind === 'user') {
      try {
        await api.updateMe({ name: name.trim() });
        setIdentity({ kind: 'user', name: name.trim() });
        toast(t.saved);
      } catch (error: any) {
        toast(error?.message || t.error);
      }
    } else {
      toast(t.saved);
    }
  };

  const submitAuth = async () => {
    setBusy(true);
    try {
      const result = mode === 'signup' ? await api.register(name.trim() || 'Player', email.trim(), password) : await api.login(email.trim(), password);
      setToken(result.token);
      setSavedUser({ name: result.user.name });
      setIdentity({ kind: 'user', name: result.user.name });
      toast(t.saved);
    } catch (error: any) {
      toast(error?.message || t.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack gap-20 fade-up" style={{ maxWidth: 720 }}>
      <div className="stack gap-6">
        <p className="eyebrow">{t.profile}</p>
        <h1 className="h1">{t.profileTitle}</h1>
      </div>

      <Card pad="lg" className="stack gap-16">
        <div className="row gap-14 center">
          <span className="avatar-chip" style={{ width: 56, height: 56, borderRadius: 18, fontSize: 22 }}>
            {(identity?.name || guestName || 'A').charAt(0).toUpperCase()}
          </span>
          <div className="stack">
            <span className="h2">{identity?.name || guestName || t.guestName}</span>
            <span className="caption">{identity?.kind === 'user' ? t.account : t.guestAccount}</span>
          </div>
        </div>

        <div className="row gap-10 wrap" style={{ alignItems: 'flex-end' }}>
          <div className="grow" style={{ minWidth: 220 }}>
            <Field label={t.displayName} value={name} onChange={setName} placeholder={t.guestNamePh} maxLength={60} />
          </div>
          <Btn onClick={saveName}>{t.save}</Btn>
        </div>
      </Card>

      <Card pad="lg" className="stack gap-14">
        <h3 className="h3">{t.theme} · {t.language}</h3>
        <div className="row gap-12 wrap">
          <Seg
            value={theme}
            options={[{ value: 'dark', label: t.dark }, { value: 'light', label: t.light }]}
            onChange={(value) => setTheme(value)}
          />
          <Seg
            value={locale}
            options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'عربي' }]}
            onChange={(value) => setLocale(value)}
          />
        </div>
      </Card>

      <Card pad="lg" className="stack gap-14">
        <div className="row between center wrap gap-10">
          <h3 className="h3">{identity?.kind === 'user' ? t.account : t.continueAsGuest}</h3>
          {identity?.kind !== 'user' && (
            <Seg
              value={mode}
              options={[{ value: 'signup', label: t.signUp }, { value: 'signin', label: t.signIn }]}
              onChange={(value) => setMode(value)}
            />
          )}
        </div>

        {identity?.kind === 'user' ? (
          <Btn variant="ghost" onClick={onSignOut}>{t.signOut}</Btn>
        ) : (
          <div className="stack gap-10">
            <p className="caption">{t.guestNote}</p>
            {mode === 'signup' && <Field label={t.displayName} value={name} onChange={setName} placeholder={t.guestNamePh} maxLength={60} />}
            <Field label={t.email} value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
            <Field label={t.password} value={password} onChange={setPassword} placeholder="••••••••" type="password" />
            <div className="row gap-10 wrap">
              <Btn disabled={busy || !email.trim() || password.length < 6} onClick={submitAuth}>
                {mode === 'signup' ? t.signUp : t.signIn}
              </Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
