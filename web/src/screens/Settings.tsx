import React, { useMemo } from 'react';
import type { ArDialect, Locale, Strings } from '../i18n';
import { Card, Seg } from '../components/ui';
import { getMotion, applyMotion, type Motion } from '../motion';
import type { ThemeName } from '../App';

const THEMES: { id: ThemeName; bg: string; surface: string; ink: string }[] = [
  { id: 'ink', bg: '#0b0b0c', surface: '#1c1c21', ink: '#f6f6f3' },
  { id: 'paper', bg: '#f3f2ee', surface: '#ffffff', ink: '#111110' },
  { id: 'midnight', bg: '#070b16', surface: '#121b2f', ink: '#eef2ff' },
  { id: 'sand', bg: '#efe7d8', surface: '#fbf6ec', ink: '#211b12' },
  { id: 'neon', bg: '#0a0614', surface: '#ff2bd6', ink: '#00e5ff' },
  { id: 'brutal', bg: '#ffe14d', surface: '#ff4fa3', ink: '#000000' },
  { id: 'terminal', bg: '#020a04', surface: '#0b2c16', ink: '#3dff7a' },
  { id: 'candy', bg: '#ffe6f2', surface: '#ff4f9f', ink: '#4a1d5c' },
  { id: 'forest', bg: '#0e1c16', surface: '#e3b04b', ink: '#f3ead2' },
  { id: 'newsprint', bg: '#e9e4d5', surface: '#c0271c', ink: '#141414' },
];

export default function Settings({ t, locale, setLocale, dialect, setDialect, theme, setTheme }: {
  t: Strings; locale: Locale; setLocale: (l: Locale) => void; dialect: ArDialect; setDialect: (d: ArDialect) => void; theme: ThemeName; setTheme: (t: ThemeName) => void;
}) {
  const themeLabels: Record<ThemeName, string> = useMemo(
    () => ({ ink: t.themeInk, paper: t.themePaper, midnight: t.themeMidnight, sand: t.themeSand, neon: t.themeNeon, brutal: t.themeBrutal, terminal: t.themeTerminal, candy: t.themeCandy, forest: t.themeForest, newsprint: t.themeNewsprint }),
    [t],
  );
  const [motion, setMotion] = React.useState<Motion>(getMotion());
  return (
    <div className="stage fade-up stack gap-16">
      <div className="stack gap-6">
        <p className="eyebrow">{t.settings}</p>
        <h1 className="h1">{t.settings}</h1>
        <p className="caption">{t.settingsHint}</p>
      </div>
      <Card pad="lg" className="stack gap-12">
        <h3 className="h3">{t.motion}</h3>
        <Seg value={motion} options={[{ value: 'auto' as Motion, label: t.motionAuto }, { value: 'reduced' as Motion, label: t.motionReduced }, { value: 'off' as Motion, label: t.motionOff }]} onChange={(m) => { applyMotion(m); setMotion(m); }} />
      </Card>
      <Card pad="lg" className="stack gap-12">
        <h3 className="h3">{t.language}</h3>
        <Seg value={locale} options={[{ value: 'en' as Locale, label: 'English' }, { value: 'ar' as Locale, label: 'العربية' }, { value: 'de' as Locale, label: 'Deutsch' }]} onChange={setLocale} />
      </Card>
      <Card pad="lg" className="stack gap-12">
        <h3 className="h3">{t.theme}</h3>
        <div className="theme-grid">
          {THEMES.map((option) => (
            <button key={option.id} className="theme-swatch" data-on={theme === option.id} onClick={() => setTheme(option.id)} aria-pressed={theme === option.id}>
              <span className="swatch-preview" style={{ background: option.bg }}>
                <span className="swatch-chip" style={{ background: option.ink }} />
                <span className="swatch-chip" style={{ background: option.surface }} />
              </span>
              <span className="swatch-name">{themeLabels[option.id]}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
