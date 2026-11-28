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

/** Every preset is an illustrated portrait, drawn at 256 and 64 px, cropped for a circle. */
const PRESET_BASE = `${import.meta.env.BASE_URL}avatars`;

export function PresetFace({ preset, size = 28 }: { preset: AvatarPreset; size?: number }) {
  const src = `${PRESET_BASE}/${preset}-${size <= 64 ? 64 : 256}.png`;
  return (
    <img
      className="avatar-img avatar-preset"
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      data-preset={preset}
      loading="lazy"
      decoding="async"
    />
  );
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
