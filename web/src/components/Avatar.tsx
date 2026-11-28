import React, { useState } from 'react';
import { assetUrl, type AvatarInfo } from '../api';

/**
 * Profile pictures. Ten presets, one per theme, drawn with the page's own palette so a
 * face always belongs to the room it is in. A signed-in player can replace theirs with a
 * custom picture; if that picture ever fails to load we fall back to their preset rather
 * than showing a broken image.
 */

export const AVATAR_PRESETS = ['ink', 'paper', 'midnight', 'sand', 'neon', 'brutal', 'terminal', 'candy', 'forest', 'newsprint'] as const;
export type AvatarPreset = (typeof AVATAR_PRESETS)[number];

/** A stable preset for someone who never picked one, so two guests don't look identical. */
export function presetForName(name: string): AvatarPreset {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 100000;
  return AVATAR_PRESETS[hash % AVATAR_PRESETS.length];
}

function normalize(preset?: string | null): AvatarPreset {
  return (AVATAR_PRESETS as readonly string[]).includes(preset || '') ? (preset as AvatarPreset) : 'ink';
}

/** Bold shapes only: every preset has to read as a distinct face at 24px. */
export function PresetFace({ preset, size = 28 }: { preset: AvatarPreset; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 32 32', role: 'img' as const, 'aria-hidden': true };
  const bg = 'var(--avatar-bg, var(--accent))';
  const fg = 'var(--avatar-fg, var(--bg))';

  const art = (() => {
    switch (preset) {
      case 'paper':
        return (
          <>
            <rect x="2" y="2" width="28" height="28" rx="9" fill={bg} />
            <circle cx="12" cy="13" r="2.2" fill={fg} />
            <circle cx="20" cy="13" r="2.2" fill={fg} />
            <path d="M11 21h10" stroke={fg} strokeWidth="2.4" strokeLinecap="round" />
          </>
        );
      case 'midnight':
        return (
          <>
            <circle cx="16" cy="16" r="14" fill={bg} />
            <path d="M20 8a9 9 0 100 16 7 7 0 010-16z" fill={fg} />
            <circle cx="23.5" cy="10.5" r="1.4" fill={fg} />
          </>
        );
      case 'sand':
        return (
          <>
            <rect x="2" y="2" width="28" height="28" rx="14" fill={bg} />
            <path d="M6 21c3-4 5 2 8-1s5 1 7-2 3 1 5 0" stroke={fg} strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <circle cx="21" cy="11" r="3" fill={fg} />
          </>
        );
      case 'neon':
        return (
          <>
            <circle cx="16" cy="16" r="14" fill={bg} />
            <path d="M18 6l-7 12h5l-2 8 8-13h-5l1-7z" fill={fg} />
          </>
        );
      case 'brutal':
        return (
          <>
            <rect x="2" y="2" width="28" height="28" fill={bg} />
            <path d="M9 9l14 14M23 9L9 23" stroke={fg} strokeWidth="4" strokeLinecap="butt" />
          </>
        );
      case 'terminal':
        return (
          <>
            <rect x="2" y="4" width="28" height="24" rx="5" fill={bg} />
            <path d="M8 12l4 4-4 4" stroke={fg} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M16 21h8" stroke={fg} strokeWidth="2.6" strokeLinecap="round" />
          </>
        );
      case 'candy':
        return (
          <>
            <circle cx="16" cy="16" r="14" fill={bg} />
            <path d="M16 24s-8-4.6-8-10a4.6 4.6 0 018-3 4.6 4.6 0 018 3c0 5.4-8 10-8 10z" fill={fg} />
          </>
        );
      case 'forest':
        return (
          <>
            <circle cx="16" cy="16" r="14" fill={bg} />
            <path d="M16 6c6 3 8 9 5 14-2 3-6 4-9 3 4-2 6-6 4-17z" fill={fg} />
          </>
        );
      case 'newsprint':
        return (
          <>
            <rect x="3" y="3" width="26" height="26" rx="4" fill={bg} />
            <path d="M9 11h14M9 16h14M9 21h9" stroke={fg} strokeWidth="2.4" strokeLinecap="round" />
          </>
        );
      case 'ink':
      default:
        return (
          <>
            <circle cx="16" cy="16" r="14" fill={bg} />
            <circle cx="11.5" cy="14" r="2.1" fill={fg} />
            <circle cx="20.5" cy="14" r="2.1" fill={fg} />
            <path d="M11 20.5c1.6 2 3.2 3 5 3s3.4-1 5-3" stroke={fg} strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </>
        );
    }
  })();

  return <svg {...common} className="avatar-svg" data-preset={preset}>{art}</svg>;
}

export function Avatar({ avatar, name = '', size = 28, className = '' }: { avatar?: AvatarInfo | null; name?: string; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const preset = normalize(avatar?.preset || presetForName(name));
  const src = avatar?.custom && avatar.url && !broken ? assetUrl(avatar.url) : null;

  if (src) {
    return (
      <img
        className={`avatar-img ${className}`}
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  }
  return <span className={`avatar-face ${className}`} style={{ width: size, height: size }}><PresetFace preset={preset} size={size} /></span>;
}
