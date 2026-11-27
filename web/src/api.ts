const BASE = (import.meta.env.VITE_API_URL as string | undefined) || 'https://chanceclub-api.onrender.com/api/v1';
export const HEALTH_URL = `${BASE}/up`;

const TOKEN_KEY = 'cc.token';
const USER_KEY = 'cc.user';
const GUEST_KEY = 'cc.guest';

export type Member = {
  id: string;
  name: string;
  ready: boolean;
  score: number;
  is_host: boolean;
  online: boolean;
  rtt: number | null;
};

export type Round = {
  number: number;
  game: string;
  prompt: string;
  status: 'active' | 'complete';
  turn_player_id: string | null;
  private_clue: string | null;
  result: any;
  submitted: boolean;
  submission_count: number;
  scored_player_ids: string[];
  submission_status: { player_id: string; submitted: boolean }[];
  wordle?: { length: number; max: number; attempts: { word: string; pattern: string[] }[]; solved: boolean } | null;
};

export type Party = {
  id: string;
  name: string;
  code: string;
  players: string[];
  members: Member[];
  self_player_id: string | null;
  is_host: boolean;
  status: 'lobby' | 'playing';
  game: string | null;
  round: Round | null;
  createdAt: string;
};

export type Team = { id: string; name: string; code: string; members?: { id: string; name: string }[] };

export type WordleGame = {
  id: string;
  length: number;
  max: number;
  attempts: { word: string; pattern: string[] }[];
  solved: boolean;
  done: boolean;
  word: string | null;
};

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}
export function getSavedUser(): { name: string } | null {
  try { const raw = localStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function setSavedUser(user: { name: string } | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch { /* ignore */ }
}
export function getGuestName(): string {
  try { return localStorage.getItem(GUEST_KEY) || ''; } catch { return ''; }
}
export function setGuestName(name: string) {
  try { localStorage.setItem(GUEST_KEY, name); } catch { /* ignore */ }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export type Session = {
  identity: { kind: 'user' | 'guest'; id: string; name: string } | null;
  user: { id: string; name: string; email?: string; preferred_language?: string; theme?: string } | null;
  guest: { id: string; name: string } | null;
};

/** A guest token can expire or be cleared. Mint a fresh guest from the saved name instead of 401-ing. */
async function healGuest(): Promise<boolean> {
  let name = getGuestName().trim();
  if (name.length < 2) {
    const saved = (getSavedUser()?.name || '').trim();
    name = saved.length >= 2 ? saved : `Player-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  try {
    const response = await fetch(`${BASE}/guest`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) return false;
    const payload = await response.json();
    if (!payload?.token) return false;
    setToken(payload.token);
    setGuestName(name);
    return true;
  } catch {
    return false;
  }
}

/* Slow-request signal: any API call pending longer than ~3s means a cold start or a bad connection. */
const slowListeners = new Set<(slow: boolean) => void>();
let slowPending = 0;
let slowOn = false;
function emitSlow(value: boolean) {
  if (slowOn === value) return;
  slowOn = value;
  slowListeners.forEach((fn) => fn(value));
}
export function onSlowRequest(fn: (slow: boolean) => void): () => void {
  slowListeners.add(fn);
  return () => { slowListeners.delete(fn); };
}

async function request<T>(path: string, method = 'GET', body?: unknown, retry = true): Promise<T> {
  slowPending += 1;
  const slowTimer = window.setTimeout(() => emitSlow(true), 3000);
  try {
    return await requestInner<T>(path, method, body, retry);
  } finally {
    window.clearTimeout(slowTimer);
    slowPending -= 1;
    if (slowPending <= 0) { slowPending = 0; emitSlow(false); }
  }
}

async function requestInner<T>(path: string, method = 'GET', body?: unknown, retry = true): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Network error — check your connection and try again.', 0);
  }
  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
  if (!response.ok) {
    const message =
      payload?.message ||
      (payload?.errors ? Object.values(payload.errors).flat().join(' ') : '') ||
      `Request failed (${response.status})`;
    const authRoute = path === '/guest' || path === '/login' || path === '/register';
    if (response.status === 401 && retry && !authRoute) {
      if (await healGuest()) return request<T>(path, method, body, false);
    }
    throw new ApiError(String(message), response.status);
  }
  return payload as T;
}

export const api = {
  guest: (name: string) => request<{ token: string; guest: { id: string; name: string } }>('/guest', 'POST', { name }),
  guestMe: () => request<{ guest: { id: string; name: string } }>('/guest/me'),
  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: { id: string; name: string } }>('/register', 'POST', { name, email, password }),
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; name: string } }>('/login', 'POST', { email, password }),
  me: () => request<Session>('/me'),
  updateMe: (body: Record<string, unknown>) => request<{ user?: any; guest?: any }>('/me', 'PATCH', body),
  logout: () => request<{ message: string }>('/logout', 'POST'),
  parties: () => request<{ data: Party[] }>('/parties'),
  createParty: (name: string) => request<{ data: Party }>('/parties', 'POST', { name }),
  party: (code: string) => request<{ data: Party }>(`/parties/${encodeURIComponent(code)}`),
  joinParty: (code: string) => request<{ data: Party }>(`/parties/${encodeURIComponent(code)}/join`, 'POST'),
  ready: (code: string, ready: boolean) => request<{ data: Party }>(`/parties/${encodeURIComponent(code)}/ready`, 'POST', { ready }),
  start: (code: string, game: string, locale: string) =>
    request<{ data: Party }>(`/parties/${encodeURIComponent(code)}/start`, 'POST', { game, locale }),
  action: (code: string, body: Record<string, unknown>) =>
    request<{ data: Party }>(`/parties/${encodeURIComponent(code)}/action`, 'POST', body),
  advance: (code: string) => request<{ data: Party }>(`/parties/${encodeURIComponent(code)}/advance`, 'POST'),
  heartbeat: (code: string, rttMs: number) =>
    request<{ ok: boolean }>(`/parties/${encodeURIComponent(code)}/heartbeat`, 'POST', { rtt_ms: rttMs }),
  teams: () => request<{ data: Team[] }>('/teams'),
  createTeam: (name: string) => request<{ data: Team }>('/teams', 'POST', { name }),
  joinTeam: (code: string) => request<{ data: Team }>(`/teams/${encodeURIComponent(code)}/join`, 'POST'),
  wordleStart: () => request<{ data: WordleGame }>('/wordle/solo', 'POST'),
  wordleShow: (id: string) => request<{ data: WordleGame }>(`/wordle/solo/${id}`),
  wordleGuess: (id: string, word: string) => request<{ data: WordleGame }>(`/wordle/solo/${id}/guess`, 'POST', { word }),
};
