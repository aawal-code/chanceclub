export type Motion = 'auto' | 'reduced' | 'off';
export function getMotion(): Motion {
  try { const v = localStorage.getItem('cc.motion'); if (v === 'reduced' || v === 'off') return v; } catch { /* ignore */ }
  return 'auto';
}
export function applyMotion(m: Motion) {
  document.documentElement.setAttribute('data-motion', m);
  try { localStorage.setItem('cc.motion', m); } catch { /* ignore */ }
}
export function motionOn(): boolean {
  const m = getMotion();
  return m === 'auto' && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
