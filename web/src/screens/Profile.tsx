import React, { useMemo, useState } from 'react';
import { api, setSavedUser, setSession, setAvatarPreset, type AvatarInfo } from '../api';
import { Avatar, AVATAR_PRESETS } from '../components/Avatar';
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
  const [avatar, setAvatar] = useState<AvatarInfo | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const isAccount = identity?.kind === 'user';
  const displayName = identity?.name || guestName || '';
  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= 2;

  React.useEffect(() => {
    let live = true;
    api.me().then((r) => {
      if (!live) return;
      const info = r.user?.avatar || r.guest?.avatar || null;
      if (info) { setAvatar(info); setAvatarPreset(info.preset); }
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  const pickPreset = async (preset: string) => {
    if (avatarBusy) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const r = await api.updateMe({ avatar_preset: preset });
      const info = r.user?.avatar || r.guest?.avatar;
      if (info) setAvatar(info); else setAvatar({ preset, custom: false, url: null });
      setAvatarPreset(preset);
      toast(t.avatarSaved);
    } catch (problem: any) {
      setAvatarError(problem?.message || t.error);
    } finally {
      setAvatarBusy(false);
    }
  };

  /** Shrink to 128x128 in the browser so uploads stay tiny and never time out. */
  const shrink = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode'));
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas'));
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/webp', 0.9));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

  const uploadPhoto = async (file: File) => {
    if (!isAccount) { setAvatarError(t.avatarNeedsAccount); return; }
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) { setAvatarError(t.avatarBadFile); return; }
    if (file.size > 12 * 1024 * 1024) { setAvatarError(t.avatarTooBig); return; }
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const data = await shrink(file);
      if (!data) throw new Error('resize');
      const r = await api.avatarUpload(data);
      setAvatar(r.avatar);
      toast(t.avatarSaved);
    } catch (problem: any) {
      setAvatarError(problem?.message || t.avatarUploadFailed);
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = async () => {
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const r = await api.avatarRemove();
      setAvatar(r.avatar);
    } catch (problem: any) {
      setAvatarError(problem?.message || t.error);
    } finally {
      setAvatarBusy(false);
    }
  };

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
          <Avatar avatar={avatar} name={displayName || 'A'} size={56} />
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
        <div className="row between center wrap gap-10">
          <h3 className="h3">{t.avatarTitle}</h3>
          <span className="caption">{isAccount ? t.avatarHintAccount : t.avatarHintGuest}</span>
        </div>
        <div className="avatar-picker" role="radiogroup" aria-label={t.avatarTitle}>
          {AVATAR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              role="radio"
              aria-checked={!avatar?.custom && (avatar?.preset || 'ink') === preset}
              className="avatar-pick"
              data-active={!avatar?.custom && (avatar?.preset || 'ink') === preset}
              onClick={() => pickPreset(preset)}
              disabled={avatarBusy}
            >
              <Avatar avatar={{ preset, custom: false, url: null }} size={40} />
            </button>
          ))}
        </div>
        <div className="row gap-10 wrap center">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={(event) => { const f = event.target.files?.[0]; if (f) uploadPhoto(f); }}
          />
          <Btn variant="ghost" onClick={() => { if (!isAccount) { setAvatarError(t.avatarNeedsAccount); return; } fileRef.current?.click(); }} disabled={avatarBusy}>
            {avatarBusy ? t.avatarUploading : avatar?.custom ? t.avatarReplace : t.avatarUpload}
          </Btn>
          {avatar?.custom ? <Btn variant="ghost" onClick={removePhoto} disabled={avatarBusy}>{t.avatarRemove}</Btn> : null}
          <span className="caption">{t.avatarUploadHint}</span>
        </div>
        {avatarError ? <p className="caption" style={{ color: 'var(--danger, #c33)' }}>{avatarError}</p> : null}
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
