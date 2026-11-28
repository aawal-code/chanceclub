import { friendlyError } from './friendly';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, clearSession, getGuestName, getSavedUser, getToken, HEALTH_URL, onSessionExpired, onSlowRequest, renewIfStale, setGuestName, setSavedUser, setToken, type Party, getAvatarPreset } from './api';
import { strings, type Locale, getStrings, DEFAULT_AR_DIALECT } from './i18n';
import type { ArDialect } from './i18n';
import { Brand, DieLogo } from './components/brand';
import { Glyph } from './components/brand';
import { Btn, Card, Field, Spinner, ToastProvider, useToast } from './components/ui';
const Home = React.lazy(() => import('./screens/Home'));
const PartyScreen = React.lazy(() => import('./screens/Party'));
const GameScreen = React.lazy(() => import('./screens/Game'));
const Games = React.lazy(() => import('./screens/Games'));
const Teams = React.lazy(() => import('./screens/Teams'));
const Profile = React.lazy(() => import('./screens/Profile'));
const WordleSolo = React.lazy(() => import('./games/WordleSolo'));
const GameDetail = React.lazy(() => import('./screens/GameDetail'));
const SoloChance = React.lazy(() => import('./games/SoloChance'));
const SoloBracket = React.lazy(() => import('./games/SoloBracket'));
import { gameById } from './games/meta';
import Stats from './screens/Stats';
import { applyMotion, getMotion } from './motion';
import Settings from './screens/Settings';

export type Route =
  | { name: 'home' }
  | { name: 'party'; code?: string }
  | { name: 'game' }
  | { name: 'games' }
  | { name: 'teams' }
  | { name: 'stats' }
  | { name: 'settings' }
  | { name: 'profile' }
  | { name: 'wordle' }
  | { name: 'detail'; id: string }
  | { name: 'solo'; id: string };

export type Identity = { kind: 'user' | 'guest'; name: string } | null;

export type ThemeName = 'ink' | 'paper' | 'midnight' | 'sand' | 'neon' | 'brutal' | 'terminal' | 'candy' | 'forest' | 'newsprint';
const THEME_ORDER: ThemeName[] = ['ink', 'paper', 'midnight', 'sand', 'neon', 'brutal', 'terminal', 'candy', 'forest', 'newsprint'];
const THEME_KEY = 'cc.theme';

function normalizeTheme(value: string | null): ThemeName {
  if (value && (THEME_ORDER as string[]).includes(value)) return value as ThemeName;
  if (value === 'light') return 'paper';
  return 'ink';
}

function normalizeLocale(value: string | null): Locale {
  return value === 'ar' || value === 'de' ? value : 'en';
}
const LOCALE_KEY = 'cc.locale';
const PARTY_KEY = 'cc.party';

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [head, tail] = hash.split('/');
  if (head === 'party') return { name: 'party', code: tail || undefined };
  if (head === 'join' && tail) return { name: 'party', code: tail };
  if (head === 'game') return { name: 'game' };
  if (head === 'games' && tail) return { name: 'detail', id: tail };
  if (head === 'games') return { name: 'games' };
  if (head === 'teams') return { name: 'teams' };
  if (head === 'stats') return { name: 'stats' };
  if (head === 'settings') return { name: 'settings' };
  if (head === 'profile') return { name: 'profile' };
  if (head === 'wordle') return { name: 'wordle' };
  if (head === 'play' && tail) return { name: 'solo', id: tail };
  return { name: 'home' };
}

function go(route: Route) {
  const hash =
    route.name === 'home' ? '#/' :
    route.name === 'party' ? `#/party${route.code ? `/${route.code}` : ''}` :
    route.name === 'detail' ? `#/games/${route.id}` :
    route.name === 'solo' ? `#/play/${route.id}` :
    `#/${route.name}`;
  if (window.location.hash !== hash) window.location.hash = hash;
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => normalizeLocale(localStorage.getItem(LOCALE_KEY)));
  const [theme, setTheme] = useState<ThemeName>(() => normalizeTheme(localStorage.getItem(THEME_KEY)));
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [identity, setIdentity] = useState<Identity>(null);
  const [booting, setBooting] = useState(true);
  const [wakePct, setWakePct] = useState(0);
  const [parties, setParties] = useState<Party[]>([]);
  const [activeParty, setActiveParty] = useState<Party | null>(null);
  const [guestName, setGuestNameState] = useState(() => getGuestName());
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ code: string; status: 'pending' | 'denied' } | null>(null);
  const pollRef = useRef<number | null>(null);
  useEffect(() => { applyMotion(getMotion()); }, []);
  const [slowNet, setSlowNet] = useState(false);
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => { const on = () => setOffline(false), off = () => setOffline(true); window.addEventListener('online', on); window.addEventListener('offline', off); return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); }; }, []);
  useEffect(() => onSlowRequest(setSlowNet), []);

  const [dialect, setDialectState] = useState<ArDialect>(() => (localStorage.getItem('cc.ardialect') === 'msa' ? 'msa' : DEFAULT_AR_DIALECT));
  const setDialect = useCallback((d: ArDialect) => { setDialectState(d); try { localStorage.setItem('cc.ardialect', d); } catch { /* ignore */ } }, []);
  const t = useMemo(() => getStrings(locale, dialect), [locale, dialect]);
  const toast = useToast();

  /* ---- theme + locale side effects ---- */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(LOCALE_KEY, locale);
  }, [theme, locale]);

  /* ---- keep account preferences in step with the device (accounts only) ---- */
  /* The account owns the theme: on sign-in adopt the saved one (a new device inherits it); if the account has
     never chosen, the device's current theme becomes the account's, so a guest-to-account upgrade keeps it. */
  const [themeSynced, setThemeSynced] = useState(false);
  useEffect(() => {
    if (identity?.kind !== 'user') { setThemeSynced(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const session = await api.me();
        const saved = session.user?.theme;
        if (!cancelled && saved && (THEME_ORDER as string[]).includes(saved)) setTheme(saved as ThemeName);
        if (!cancelled && session.user?.preferred_language && !localStorage.getItem(LOCALE_KEY)) setLocale(normalizeLocale(session.user.preferred_language));
      } catch { /* offline: keep the device theme, sync later */ }
      if (!cancelled) setThemeSynced(true);
    })();
    return () => { cancelled = true; };
  }, [identity?.kind]);
  useEffect(() => {
    if (!themeSynced || identity?.kind !== 'user') return;
    const id = window.setTimeout(() => { api.updateMe({ preferred_language: locale, theme }).catch(() => { /* best effort */ }); }, 600);
    return () => window.clearTimeout(id);
  }, [themeSynced, identity?.kind, locale, theme]);

  /* ---- sessions: renew quietly; only a genuine rejection sends the person to sign in ---- */
  useEffect(() => {
    const off = onSessionExpired(() => { setIdentity(null); setActiveParty(null); toast(t.sessionExpired); go({ name: 'profile' }); });
    const tick = () => { void renewIfStale(); };
    const timer = window.setInterval(tick, 30 * 60 * 1000);
    const vis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('online', tick);
    return () => { off(); window.clearInterval(timer); document.removeEventListener('visibilitychange', vis); window.removeEventListener('online', tick); };
  }, [t.sessionExpired]);

  /* ---- hash routing ---- */
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /* ---- boot: restore session ---- */
  useEffect(() => {
    (async () => {
      /* Wake gate: never let the app boot into a sleeping server. Poll /up and show real progress. */
      const isUp = async (): Promise<boolean> => {
        try {
          const r = await fetch(HEALTH_URL, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
          return r.ok;
        } catch { return false; }
      };
      /* Always run the progress loop: a cold Render service makes the very first probe hang
         for ~50s instead of failing, so the bar must tick from the start. The loop checks
         immediately, so a warm server still boots without added delay. */
      {
        const startedAt = Date.now();
        await new Promise<void>((resolve) => {
          let busy = false;
          const tick = async () => {
            const elapsed = (Date.now() - startedAt) / 1000;
            const pct = elapsed < 3 ? 10 + elapsed * 8 : Math.min(95, 34 + 61 * (1 - Math.exp(-(elapsed - 3) / 25)));
            setWakePct(Math.round(pct));
            if (busy) return;
            busy = true;
            const up = await isUp();
            busy = false;
            if (up) { window.clearInterval(timer); setWakePct(100); resolve(); }
            else if (elapsed > 180) { window.clearInterval(timer); resolve(); }
          };
          const timer = window.setInterval(tick, 1500);
          void tick();
        });
      }
      const params = new URLSearchParams(window.location.search);
      const legacyJoin = params.get('join');
      if (legacyJoin) {
        go({ name: 'party', code: legacyJoin.toUpperCase() });
        window.history.replaceState({}, '', `${window.location.pathname}#/party/${legacyJoin.toUpperCase()}`);
      }
      await renewIfStale();
      const token = getToken();
      if (token) {
        try {
          const session = await api.me();
          if (session.user) { setIdentity({ kind: 'user', name: session.user.name }); setSavedUser({ name: session.user.name }); }
          else if (session.guest) setIdentity({ kind: 'guest', name: session.guest.name });
        } catch (problem) {
          // A failed network call must never sign anyone out: keep the remembered identity.
          // Only a genuine rejection (handled in api.ts) clears the session.
          const saved = getSavedUser();
          if (getToken() && saved) setIdentity({ kind: 'user', name: saved.name });
          else if (getToken() && getGuestName()) setIdentity({ kind: 'guest', name: getGuestName() });
          else setIdentity(null);
        }
      }
      // A reload or a deep link must not drop the lobby you are in.
      const savedParty = (() => { try { return localStorage.getItem(PARTY_KEY); } catch { return null; } })();
      const wanted = route.name === 'party' && route.code ? route.code : route.name === 'game' ? savedParty : null;
      if (wanted && getToken()) {
        try {
          const party = await api.party(wanted);
          setActiveParty(party.data);
          if (route.name === 'game' && party.data.status === 'lobby') go({ name: 'party', code: party.data.code });
        } catch {
          try { localStorage.removeItem(PARTY_KEY); } catch { /* ignore */ }
          if (route.name === 'game') go({ name: 'home' });
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
    let name = (guestName || '').trim();
    if (name.length < 2) name = `${t.playerWord}-${Math.floor(1000 + Math.random() * 9000)}`;
    const result = await api.guest(name);
    setToken(result.token);
    setGuestName(result.guest.name);
    const next: Identity = { kind: 'guest', name: result.guest.name };
    setIdentity(next);
    return next;
  }, [identity, guestName, t.guestName]);

  /* ---- remember the lobby across reloads ---- */
  useEffect(() => {
    if (!activeParty?.code) return;
    try { localStorage.setItem(PARTY_KEY, activeParty.code); } catch { /* ignore */ }
  }, [activeParty?.code]);

  /* ---- polling the active party ---- */
  useEffect(() => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    if (!activeParty || !identity) return;
    const code = activeParty.code;
    let cancelled = false;
    let ticks = 0;
    const tick = async () => {
      try {
        const startedAt = performance.now();
        const result = await api.party(code);
        if (cancelled) return;
        const rtt = Math.max(1, Math.round(performance.now() - startedAt));
        ticks += 1;
        if (ticks % 5 === 1) api.heartbeat(code, rtt).catch(() => { /* best effort */ });
        setActiveParty(result.data);
        if (result.data.status === 'lobby' && parseHash().name === 'game') go({ name: 'party', code: result.data.code });
        if (result.data.status === 'playing' && parseHash().name === 'party') go({ name: 'game' });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && (error.status === 404 || error.status === 401)) {
          setActiveParty(null);
          go({ name: 'home' });
        }
      }
    };
    tick();
    const fast = !!activeParty?.game && ['imposter', 'wordbomb', 'truths'].includes(activeParty.game);
    pollRef.current = window.setInterval(tick, fast ? 900 : 2000);
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [activeParty?.code, activeParty?.game, identity]);

  /* ---- party actions ---- */
  const createParty = useCallback(async (name: string) => {
    setBusy(true);
    try {
      await ensureIdentity();
      const result = await api.createParty(name, getAvatarPreset());
      setActiveParty(result.data);
      go({ name: 'party', code: result.data.code });
      refreshParties();
    } catch (error: any) {
      toast(friendlyError(error, t));
    } finally {
      setBusy(false);
    }
  }, [ensureIdentity, refreshParties, t.error, toast]);

  const joinParty = useCallback(async (code: string) => {
    setBusy(true);
    try {
      await ensureIdentity();
      const clean = code.trim().toUpperCase();
      const result = await api.joinParty(clean, getAvatarPreset());
      if (result.requested || !result.data) {
        // The game is already running: the host decides.
        setPending({ code: clean, status: 'pending' });
        go({ name: 'party', code: clean });
        return;
      }
      setPending(null);
      setActiveParty(result.data);
      go({ name: 'party', code: result.data.code });
      refreshParties();
    } catch (error: any) {
      toast(friendlyError(error, t));
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
      toast(friendlyError(error, t));
    } finally {
      setBusy(false);
    }
  }, [ensureIdentity, t.error, toast]);

  const act = useCallback(async (body: Record<string, unknown>) => {
    if (!activeParty) return { ok: false as const };
    try {
      const result = await api.action(activeParty.code, body);
      setActiveParty(result.data);
      return { ok: true as const };
    } catch (error: any) {
      const message = friendlyError(error, t);
      // The turn-based games print the reason next to the input, so a toast would double it.
      if (!['imposter', 'wordbomb', 'truths'].includes(activeParty.game || '')) toast(message);
      return { ok: false as const, message, raw: String(error?.message || '') };
    }
  }, [activeParty, t, toast]);

  const setReady = useCallback(async (ready: boolean) => {
    if (!activeParty) return;
    try {
      const result = await api.ready(activeParty.code, ready);
      setActiveParty(result.data);
    } catch (error: any) {
      toast(friendlyError(error, t));
    }
  }, [activeParty, t.error, toast]);

  const startGame = useCallback(async (game: string, opts?: { entries?: string[]; eliminate?: boolean; teams?: { name: string; members: string[] }[] }) => {
    if (!activeParty) return;
    setBusy(true);
    try {
      const result = await api.start(activeParty.code, game, locale, opts);
      setActiveParty(result.data);
      go({ name: 'game' });
    } catch (error: any) {
      toast(friendlyError(error, t));
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
      toast(friendlyError(error, t));
    }
  }, [activeParty, t.error, toast]);

  const finishParty = useCallback(async () => {
    if (!activeParty) return;
    try {
      const result = await api.finish(activeParty.code);
      setActiveParty(result.data);
      go({ name: 'party', code: result.data.code });
    } catch (error: any) {
      toast(friendlyError(error, t));
    }
  }, [activeParty, t.error, toast]);

  /* ---- waiting to be let in: poll the request until the host answers ---- */
  useEffect(() => {
    if (!pending || pending.status !== 'pending' || !identity) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await api.myRequest(pending.code);
        if (cancelled) return;
        if (r.request?.status === 'approved') {
          const party = await api.party(pending.code);
          if (cancelled) return;
          setPending(null);
          setActiveParty(party.data);
          go({ name: party.data.status === 'playing' ? 'game' : 'party', code: party.data.code });
          refreshParties();
        } else if (r.request?.status === 'denied') {
          setPending({ code: pending.code, status: 'denied' });
        }
      } catch { /* keep waiting */ }
    };
    const id = window.setInterval(tick, 2000);
    void tick();
    return () => { cancelled = true; window.clearInterval(id); };
  }, [pending?.code, pending?.status, identity, refreshParties]);

  const claimSeat = useCallback(async (code: string, playerId: string) => {
    try {
      await api.claim(code, playerId, getAvatarPreset());
      setPending({ code, status: 'pending' });
      toast(t.claimSent);
    } catch (error: any) { toast(friendlyError(error, t)); }
  }, [t, toast]);

  const decideRequest = useCallback(async (id: string, action: 'approve' | 'deny') => {
    if (!activeParty) return;
    try {
      await api.decide(activeParty.code, id, action);
      const fresh = await api.party(activeParty.code);
      setActiveParty(fresh.data);
    } catch (error: any) { toast(friendlyError(error, t)); }
  }, [activeParty?.code, t, toast]);

  const handHost = useCallback(async (playerId: string) => {
    if (!activeParty) return;
    try {
      await api.makeHost(activeParty.code, playerId);
      const fresh = await api.party(activeParty.code);
      setActiveParty(fresh.data);
    } catch (error: any) { toast(friendlyError(error, t)); }
  }, [activeParty?.code, t, toast]);

  /* ---- told once when the host role lands on me ---- */
  const wasHost = useRef<boolean | null>(null);
  useEffect(() => {
    if (!activeParty) { wasHost.current = null; return; }
    if (wasHost.current === false && activeParty.is_host) toast(t.youAreHost);
    wasHost.current = activeParty.is_host;
  }, [activeParty?.is_host, activeParty?.code]);

  const leaveGroup = useCallback(async (code: string) => {
    try { await api.leave(code); } catch (error: any) { toast(friendlyError(error, t)); return; }
    if (activeParty?.code === code) { setActiveParty(null); try { localStorage.removeItem(PARTY_KEY); } catch { /* ignore */ } }
    refreshParties();
  }, [activeParty?.code, refreshParties, t.error, toast]);

  const leaveParty = useCallback(() => {
    setActiveParty(null);
    try { localStorage.removeItem(PARTY_KEY); } catch { /* ignore */ }
    go({ name: 'home' });
    refreshParties();
  }, [refreshParties]);

  const signOut = useCallback(async () => {
    try { await api.logout(); } catch { /* guest sessions may refuse while in a lobby */ }
    clearSession();
    setIdentity(null);
    setActiveParty(null);
    go({ name: 'home' });
  }, []);

  /* ---- route to a screen ---- */
  const screen = useMemo(() => {
    if (booting) {
      return (
        <div className="auth-shell">
          <div className="stack gap-12 center" style={{ color: 'var(--muted)', maxWidth: 320, width: '100%' }}>
            <div className="row gap-10 center"><Spinner /> {wakePct > 0 ? t.waking : t.loading}</div>
            {wakePct > 0 ? (
              <div className="wake-bar" role="progressbar" aria-valuenow={wakePct} aria-valuemin={0} aria-valuemax={100}>
                <div className="wake-bar-fill" style={{ width: `${wakePct}%` }} />
              </div>
            ) : null}
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
            onLeaveGroup={leaveGroup}
            pending={pending}
            onClaim={claimSeat}
            onCancelPending={() => setPending(null)}
            onDecide={decideRequest}
            onHost={handHost}
            onTournament={(p, started) => { setActiveParty(p); if (started) go({ name: 'game' }); }}
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
            onFinish={finishParty}
            onLeave={leaveParty}
            onBack={() => go({ name: 'party', code: activeParty.code })}
            onDecide={decideRequest}
            onHost={handHost}
          />
        ) : (
          <Home t={t} parties={parties} identity={identity} guestName={guestName}
            setGuestName={(name) => { setGuestNameState(name); setGuestName(name); }}
            onStart={createParty} onJoin={joinParty} onOpen={openParty}
            onBrowse={() => go({ name: 'games' })} onSolo={() => go({ name: 'detail', id: 'wordle' })}
            onGame={(id) => go({ name: 'detail', id })} busy={busy} />
        );
      case 'games':
        return <Games t={t} onOpen={(id) => go({ name: 'detail', id })} onParty={() => go({ name: 'party' })} />;
      case 'settings':
        return <Settings t={t} locale={locale} setLocale={setLocale} dialect={dialect} setDialect={setDialect} theme={theme} setTheme={setTheme} />;
      case 'stats':
        return <Stats t={t} partyCode={activeParty?.code ?? null} hasIdentity={!!identity} />;
      case 'teams':
        return <Teams t={t} identity={identity} onSignIn={() => go({ name: 'profile' })} />;
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
      case 'detail': {
        const meta = gameById(route.id);
        if (!meta) return <Games t={t} onOpen={(id) => go({ name: 'detail', id })} onParty={() => go({ name: 'party' })} />;
        return (
          <GameDetail
            t={t}
            gameId={meta.id}
            meta={meta}
            parties={parties}
            onBack={() => go({ name: 'games' })}
            onSolo={() => go({ name: 'solo', id: meta.id })}
            onParty={() => go({ name: 'party' })}
            onPick={(id) => go({ name: 'detail', id })}
          />
        );
      }
      case 'solo': {
        const meta = gameById(route.id);
        if (!meta) return <Games t={t} onOpen={(id) => go({ name: 'detail', id })} onParty={() => go({ name: 'party' })} />;
        if (meta.id === 'wordle') return <WordleSolo t={t} onBack={() => go({ name: 'detail', id: 'wordle' })} />;
        if (meta.id === 'bracket') return <SoloBracket t={t} onBack={() => go({ name: 'detail', id: 'bracket' })} />;
        return <SoloChance t={t} gameId={meta.id} onBack={() => go({ name: 'detail', id: meta.id })} />;
      }
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
            onSolo={() => go({ name: 'detail', id: 'wordle' })}
            onGame={(id) => go({ name: 'detail', id })}
            busy={busy}
          />
        );
    }
  }, [booting, route, t, locale, identity, guestName, parties, activeParty, busy, theme, createParty, joinParty, openParty, setReady, startGame, leaveParty, act, advance, finishParty, leaveGroup, setDialect, dialect, signOut, pending, claimSeat, decideRequest, handHost]);

  const navItems: { id: Route['name']; label: string; icon: string }[] = [
    { id: 'home', label: t.home, icon: 'home' },
    { id: 'party', label: t.party, icon: 'party' },
    { id: 'games', label: t.games, icon: 'games' },
    { id: 'stats', label: t.stats, icon: 'teams' },
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
          <button className="icon-btn" onClick={() => go({ name: 'settings' })} aria-label={t.settings} title={t.settings} data-active={route.name === 'settings'}><Glyph name="gear" size={18} /></button>
          <button className="avatar" onClick={() => go({ name: 'profile' })} aria-label={t.profile}>
            {(identity?.name || 'A').charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <main className="page" key={route.name}>
        <React.Suspense fallback={<div className="auth-shell"><div className="row gap-10 center" style={{ color: 'var(--muted)' }}><Spinner /> {t.loading}</div></div>}>{screen}</React.Suspense>
        {offline ? <div className="offline-banner" role="alert"><span>{t.offlineBanner}</span><Btn size="sm" variant="soft" onClick={() => window.location.reload()}>{t.retry}</Btn></div> : null}
        {slowNet ? <div className="slow-banner">{t.waking}</div> : null}
      </main>

      <nav className="mobile-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            data-active={route.name === item.id || (item.id === 'party' && route.name === 'game')}
            onClick={() => go({ name: item.id } as Route)}
          >
            <span className="nav-ic">{iconFor(item.icon)}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function iconFor(name: string) {
  const map: Record<string, string> = { home: 'home', party: 'party', games: 'games', teams: 'stats', stats: 'stats', profile: 'profile' };
  return <Glyph name={map[name] || 'dot'} size={22} />;
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
