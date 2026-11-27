import type { Strings } from './i18n';

/** Turn an API error into one plain sentence in the player's language. */
export function friendlyError(e: any, t: Strings): string {
  const status = Number(e?.status ?? -1);
  const msg = String(e?.message || '');
  if (status === 0) return t.errNet;
  if (status === 401) return t.errAuth;
  if (status === 404) return t.errRoom;
  if (status === 403) return t.errHost;
  if (status === 429) return t.errSlow;
  if (status === 409 && /started/i.test(msg)) return t.errStarted;
  if (status === 409 && /full/i.test(msg)) return t.errFull;
  if (status === 409 && /ready/i.test(msg)) return t.everyoneReady;
  if (status === 409 && /two/i.test(msg)) return t.needTwo;
  if (status === 422 && msg) return msg;
  return msg && status >= 400 && status < 500 ? msg : t.error;
}
