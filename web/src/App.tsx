import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, getGuestName, getSavedUser, getToken, setGuestName, setSavedUser, setToken, type Party } from './api';
import { strings, type Locale } from './i18n';
import { Brand, DieLogo } from './components/brand';
import { Btn, Card, Field, Spinner, ToastProvider, useToast } from './components/ui';
import Home from './screens/Home';
import PartyScreen from './screens/Party';
import GameScreen from './screens/Game';
import Games from './screens/Games';
import Teams from './screens/Teams';
import Profile from './screens/Profile';
import WordleSolo from './games/WordleSolo';

export type Route =
  | { name: 'home' }
  | { name: 'party'; code?: string }
  | { name: 'game' }
  | { name: 'games' }
  | { name: 'teams' }
  | { name: 'profile' }
  | { name: 'wordle' };

export type Identity = { kind: 'user' | 'guest'; name: string } | null;

const THEME_KEY = 'cc.theme';
const LOCALE_KEY = 'cc.locale';

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [head, tail] = hash.split('/');
  if (head === 'party') return { name: 'party', code: tail || undefined };
  if (head === 'join' && tail) return { name: 'party', code: tail };
  if (head === 'game') return { name: 'game' };
  if (head === 'games') return { name: 'games' };
  if (head === 'teams') return { name: 'teams' };
  if (head === 'profile') return { name: 'profile' };
  if (head === 'wordle') return { name: 'wordle' };
  return { name: 'home' };
}

function go(route: Route) {
  const hash =
    route.name === 'home' ? '#/' :
    route.name === 'party' ? `#/party${route.code ? `/${route.code}` : ''}` :
    `#/${route.name}`;
  if (window.location.hash !== hash) window.location.hash = hash;
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => ((localStorage.getItem(LOCALE_KEY) as Locale) || 'en'));
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'dark');
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [identity, setIdentity] = useState<Identity>(null);
  const [booting, setBooting] = useState(true);
  const [parties, setParties] = useState<Party[]>([]);
  const [activeParty, setActiveParty] = useState<Party | null>(null);
  const [guestName, setGuestNameState] = useState(() => getGuestName());
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

  const t = strings[locale];
  const toast = useToast();

  /* ---- theme + locale side effects ---- */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(LOCALE_KEY, locale);
  }, [theme, locale]);

  /* ---- hash routing ---- */
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /* ---- boot: restore session ---- */
  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const legacyJoin = params.get('join');
      if (legacyJoin) {
        go({ name: 'party', code: legacyJoin.toUpperCase() });
        window.history.replaceState({}, '', `${window.location.pathname}#/party/${legacyJoin.toUpperCase()}`);
      }
      const token = getToken();
      if (token) {
        try {
          const me = await api.me();
          setIdentity({ kind: 'user', name: me.user.name });
        } catch {
          try {
            const guest = await api.guestMe();
            setIdentity({ kind: 'guest', name: guest.guest.name });
          } catch {
            setToken(null);
            setSavedUser(null);
            setIdentity(null);
          }
        }
      }
      setBooting(false);
    })();
  }, []);

  const refreshParties = useCallback(async () => {
    if (!getToken()) { setParties([]); return; }
    try {
      const result = await api.parties();
      setParties(result.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!booting && identity) refreshParties();
    if (!identity) setParties([]);
  }, [booting, identity, refreshParties]);

  /* ---- ensure an identity exists before any lobby action ---- */
  const ensureIdentity = useCallback(async (): Promise<Identity> => {
    if (identity) return identity;
    const name = (guestName || '').trim();
    if (name.length < 2) throw new ApiError(t.guestName, 422);
    const result = await api.guest(name);
    setToken(result.token);
    setGuestName(result.guest.name);
    const next: Identity = { kind: 'guest', name: result.guest.name };
    setIdentity(next);
    return next;
  }, [identity, guestName, t.guestName]);

  /* ---- polling the active party ---- */
  useEffect(() => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    if (!activeParty || !identity) return;
    const code = activeParty.code;
    let cancelled = false;
    const tick = async () => {
      try {
        const result = await api.party(code);
        if (cancelled) return;
        setActiveParty(result.data);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && (error.status === 404 || error.status === 401)) {
          setActiveParty(null);
          go({ name: 'home' });
        }
      }
    };
    tick();
    pollRef.current = window.setInterval(tick, 2000);
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [activeParty?.code, identity]);

  /* ---- party actions ---- */
  const createParty = useCallback(async (name: string) => {
    setBusy(true);
    try {
      await ensureIdentity();
      const result = await api.createParty(name);
      setActiveParty(result.data);
      go({ name: 'party', code: result.data.code });
      refreshParties();
    } catch (error: any) {
      toast(error?.message || t.error);
    } finally {
      setBusy(false);
    }
  }, [ensureIdentity, refreshParties, t.error, toast]);

  const joinParty = useCallback(async (code: string) => {
    setBusy(true);
    try {
      await ensureIdentity();
      const result = await api.joinParty(code.trim().toUpperCase());
      setActiveParty(result.data);
      go({ name: 'party', code: result.data.code });
      refreshParties();
    } catch (error: any) {
      toast(error?.message || t.error);
    } finally {
      setBusy(false);
    }
  }, [ensureIdentity, refreshParties, t.error, toast]);

  const openParty = useCallback(async (code: string) => {
    setBusy(true);
    try {
      await ensureIdentity();
      const result = await api.party(code);
      setActiveParty(result.data);
      go({ name: 'party', code });
    } catch (error: any) {
      toast(error?.message || t.error);
    } finally {
      setBusy(false);
    }
  }, [ensureIdentity, t.error, toast]);

  const act = useCallback(async (body: Record<string, unknown>) => {
    if (!activeParty) return;
    try {
      const result = await api.action(activeParty.code, body);
      setActiveParty(result.data);
    } catch (error: any) {
      toast(error?.message || t.error);
    }
  }, [activeParty, t.error, toast]);

  const setReady = useCallback(async (ready: boolean) => {
    if (!activeParty) return;
    try {
      const result = await api.ready(activeParty.code, ready);
      setActiveParty(result.data);
    } catch (error: any) {
      toast(error?.message || t.error);
    }
  }, [activeParty, t.error, toast]);

  const startGame = useCallback(async (game: string) => {
    if (!activeParty) return;
    setBusy(true);
    try {
      const result = await api.start(activeParty.code, game, locale);
      setActiveParty(result.data);
      go({ name: 'game' });
    } catch (error: any) {
      toast(error?.message || t.error);
    } finally {
      setBusy(false);
    }
  }, [activeParty, locale, t.error, toast]);

  const advance = useCallback(async () => {
    if (!activeParty) return;
    try {
      const result = await api.advance(activeParty.code);
      setActiveParty(result.data);
    } catch (error: any) {
      toast(error?.message || t.error);
    }
  }, [activeParty, t.error, toast]);

  const leaveParty = useCallback(() => {
    setActiveParty(null);
    go({ name: 'home' });
    refreshParties();
  }, [refreshParties]);

  const signOut = useCallback(async () => {
    try { await api.logout(); } catch { /* guest sessions may refuse while in a lobby */ }
    setToken(null);
    setSavedUser(null);
    setIdentity(null);
    setActiveParty(null);
    go({ name: 'home' });
  }, []);

  /* ---- route to a screen ---- */
  const screen = useMemo(() => {
    if (booting) {
      return (
        <div className="auth-shell">
          <div className="row gap-10 center" style={{ color: 'var(--muted)' }}>
            <Spinner /> {t.loading}
          </div>
        </div>
      );
    }
    switch (route.name) {
      case 'party':
        return (
          <PartyScreen
            t={t}
            locale={locale}
            identity={identity}
            guestName={guestName}
            setGuestName={(name) => { setGuestNameState(name); setGuestName(name); }}
            parties={parties}
            activeParty={activeParty}
            busy={busy}
            initialCode={(route as any).code}
            onCreate={createParty}
            onJoin={joinParty}
            onOpen={openParty}
            onReady={setReady}
            onStart={startGame}
            onLeave={leaveParty}
            onOpenGame={() => go({ name: 'game' })}
            onSignIn={() => go({ name: 'profile' })}
          />
        );
      case 'game':
        return activeParty ? (
          <GameScreen
            t={t}
            locale={locale}
            party={activeParty}
            onAct={act}
            onAdvance={advance}
            onLeave={leaveParty}
            onBack={() => go({ name: 'party', code: activeParty.code })}
          />
        ) : (
          <Home t={t} parties={parties} identity={identity} guestName={guestName}
            setGuestName={(name) => { setGuestNameState(name); setGuestName(name); }}
            onStart={createParty} onJoin={joinParty} onOpen={openParty}
            onBrowse={() => go({ name: 'games' })} onSolo={() => go({ name: 'wordle' })} busy={busy} />
        );
      case 'games':
        return <Games t={t} onSolo={() => go({ name: 'wordle' })} onParty={() => go({ name: 'party' })} />;
      case 'teams':
        return <Teams t={t} identity={identity} />;
      case 'profile':
        return (
          <Profile
            t={t}
            locale={locale}
            setLocale={setLocale}
            theme={theme}
            setTheme={setTheme}
            identity={identity}
            setIdentity={setIdentity}
            guestName={guestName}
            setGuestName={(name) => { setGuestNameState(name); setGuestName(name); }}
            onSignOut={signOut}
          />
        );
      case 'wordle':
        return <WordleSolo t={t} onBack={() => go({ name: 'games' })} />;
      default:
        return (
          <Home
            t={t}
            parties={parties}
            identity={identity}
            guestName={guestName}
            setGuestName={(name) => { setGuestNameState(name); setGuestName(name); }}
            onStart={createParty}
            onJoin={joinParty}
            onOpen={openParty}
            onBrowse={() => go({ name: 'games' })}
            onSolo={() => go({ name: 'wordle' })}
            busy={busy}
          />
        );
    }
  }, [booting, route, t, locale, identity, guestName, parties, activeParty, busy, theme, createParty, joinParty, openParty, setReady, startGame, leaveParty, act, advance, signOut]);

  const navItems: { id: Route['name']; label: string; icon: string }[] = [
    { id: 'home', label: t.home, icon: 'home' },
    { id: 'party', label: t.party, icon: 'party' },
    { id: 'games', label: t.games, icon: 'games' },
    { id: 'teams', label: t.teams, icon: 'teams' },
    { id: 'profile', label: t.profile, icon: 'profile' },
  ];

  return (
    <div className="shell">
      <header className="topbar">
        <Brand onClick={() => go({ name: 'home' })} />
        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className="nav-link"
              data-active={route.name === item.id || (item.id === 'party' && route.name === 'game')}
              onClick={() => go({ name: item.id } as Route)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')} aria-label={t.language}>
            {locale === 'en' ? 'عربي' : 'EN'}
          </button>
          <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={t.theme}>
            {theme === 'dark' ? '☾' : '☀'}
          </button>
          <button className="avatar" onClick={() => go({ name: 'profile' })} aria-label={t.profile}>
            {(identity?.name || 'A').charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <main className="page" key={route.name}>
        {screen}
      </main>

      <nav className="mobile-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            data-active={route.name === item.id || (item.id === 'party' && route.name === 'game')}
            onClick={() => go({ name: item.id } as Route)}
          >
            <span style={{ fontSize: 17, lineHeight: 1 }}>{iconFor(item.icon)}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function iconFor(name: string) {
  switch (name) {
    case 'home': return '⌂';
    case 'party': return '✦';
    case 'games': return '◈';
    case 'teams': return '❖';
    default: return '●';
  }
}

/* wrap the app in the toast provider at the module root */
export function Root() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}

export { DieLogo };
