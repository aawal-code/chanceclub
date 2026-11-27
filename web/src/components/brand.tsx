import React from 'react';

/** Isometric die mark — monochrome, three shaded faces. */
export function DieLogo({ size = 40, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={animated ? { animation: 'float 6s ease-in-out infinite' } : undefined}
    >
      <style>{`@keyframes float { 0%,100% { transform: translateY(0) rotate(0deg);} 50% { transform: translateY(-6px) rotate(-2deg);} }`}</style>
      <g>
        {/* top face */}
        <polygon points="50,3 95,26 50,49 5,26" fill="var(--ink)" opacity="0.95" />
        {/* left face */}
        <polygon points="5,26 50,49 50,97 5,74" fill="var(--ink)" opacity="0.62" />
        {/* right face */}
        <polygon points="95,26 50,49 50,97 95,74" fill="var(--ink)" opacity="0.38" />
        {/* pips on top face */}
        <circle cx="50" cy="26" r="4.4" fill="var(--bg)" />
        <circle cx="32" cy="24" r="3.2" fill="var(--bg)" opacity="0.85" />
        <circle cx="68" cy="28" r="3.2" fill="var(--bg)" opacity="0.85" />
        {/* pips on left face */}
        <circle cx="22" cy="55" r="3.4" fill="var(--bg)" opacity="0.8" />
        <circle cx="34" cy="70" r="3.4" fill="var(--bg)" opacity="0.55" />
        {/* pips on right face */}
        <circle cx="72" cy="58" r="3.4" fill="var(--bg)" opacity="0.5" />
        <circle cx="78" cy="74" r="3.4" fill="var(--bg)" opacity="0.32" />
      </g>
    </svg>
  );
}

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <button className="brand" onClick={onClick} aria-label="ChanceClub home">
      <DieLogo size={38} />
      <span>
        <span className="brand-name">ChanceClub</span>
        <span className="brand-tag">PLAY TOGETHER</span>
      </span>
    </button>
  );
}

type GlyphProps = { name: string; size?: number };

/** Minimal monochrome glyphs, one per game. */
export function Glyph({ name, size = 22 }: GlyphProps) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'dice':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
          <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'coin':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.5" opacity="0.55" />
        </svg>
      );
    case 'wheel':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18" opacity="0.45" />
        </svg>
      );
    case 'bracket':
      return (
        <svg {...common}>
          <path d="M3.5 5h5v5h-5M3.5 14h5v5h-5M8.5 7.5h4v9h-4M12.5 12h8" />
        </svg>
      );
    case 'number':
      return (
        <svg {...common}>
          <path d="M9 3.5 7 20.5M17 3.5l-2 17M4 9h16M3 15h16" />
        </svg>
      );
    case 'yesno':
      return (
        <svg {...common}>
          <path d="M4 13l4 4 6-9" />
          <path d="M15 7l5 10M20 7l-5 10" opacity="0.55" />
        </svg>
      );
    case 'trivia':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9.4 9.2a2.7 2.7 0 1 1 3.6 2.5c-.7.3-1 .9-1 1.6v.4" />
          <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'wyr':
      return (
        <svg {...common}>
          <path d="M3.5 8.5h13l-3-3M20.5 15.5h-13l3 3" />
        </svg>
      );
    case 'likely':
      return (
        <svg {...common}>
          <path d="M12 3.8l2.4 5 5.5.8-4 3.9.95 5.5-4.85-2.6-4.85 2.6.95-5.5-4-3.9 5.5-.8z" />
        </svg>
      );
    case 'categories':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="2" opacity="0.5" />
        </svg>
      );
    case 'charades':
      return (
        <svg {...common}>
          <circle cx="12" cy="7.5" r="3.2" />
          <path d="M5 20c.6-3.6 3.4-5.6 7-5.6s6.4 2 7 5.6" />
        </svg>
      );
    case 'whoami':
      return (
        <svg {...common}>
          <path d="M2.8 12s3.4-6 9.2-6 9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6z" />
          <circle cx="12" cy="12" r="2.6" />
        </svg>
      );
    case 'wordle':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="5" height="5" rx="1.4" />
          <rect x="9.5" y="3.5" width="5" height="5" rx="1.4" />
          <rect x="15.5" y="3.5" width="5" height="5" rx="1.4" opacity="0.4" />
          <rect x="3.5" y="9.5" width="5" height="5" rx="1.4" opacity="0.4" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1.4" />
          <rect x="15.5" y="9.5" width="5" height="5" rx="1.4" opacity="0.4" />
          <rect x="3.5" y="15.5" width="5" height="5" rx="1.4" opacity="0.4" />
          <rect x="9.5" y="15.5" width="5" height="5" rx="1.4" opacity="0.4" />
        </svg>
      );
    case 'home':
      return (
        <svg {...common}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /></svg>
      );
    case 'party':
      return (
        <svg {...common}><path d="M4 20l5.5-12 7 7z" /><path d="M15 3.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1L12 6.5l2.1-.9z" /></svg>
      );
    case 'games':
      return (
        <svg {...common}><rect x="2.5" y="7" width="19" height="10" rx="4" /><path d="M7.5 10v4M5.5 12h4M15.5 11.2h.01M18 13.2h.01" /></svg>
      );
    case 'teams':
      return (
        <svg {...common}><circle cx="9" cy="9" r="3" /><circle cx="16.5" cy="10.5" r="2.4" opacity="0.6" /><path d="M3 19c.5-3 2.9-4.6 6-4.6s5.5 1.6 6 4.6" /><path d="M15 19c.3-2 1.7-3.2 3.4-3.2" opacity="0.6" /></svg>
      );
    case 'profile':
      return (
        <svg {...common}><circle cx="12" cy="8.5" r="3.6" /><path d="M4.5 20c.7-3.8 3.7-5.8 7.5-5.8s6.8 2 7.5 5.8" /></svg>
      );
    case 'copy':
      return (
        <svg {...common}><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 5.5h-9a2 2 0 0 0-2 2v9" /></svg>
      );
    case 'check':
      return <svg {...common}><path d="M4.5 12.5l5 5 10-11" /></svg>;
    case 'arrow':
      return <svg {...common}><path d="M4 12h15M13 6l6 6-6 6" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
  }
}
