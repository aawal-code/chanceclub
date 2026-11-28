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
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', style: { strokeWidth: 'var(--icon-sw, 1.7)' } as React.CSSProperties, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
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
    case 'draw':
      return (
        <svg {...common}>
          <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
          <path d="M14 7l3 3" opacity="0.55" />
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
          <path d="M12 3.8l2.4 5 5.5.8-4 3.9.95 5.5-4.85-2.6-4.85 2.6.95-5.5-4-3.9 5.5-.8z" fill="currentColor" />
        </svg>
      );
    case 'categories':
      return (
        <svg {...common}>
          <circle cx="5.5" cy="6.5" r="2" fill="currentColor" stroke="none" />
          <circle cx="5.5" cy="12" r="2" fill="currentColor" stroke="none" />
          <circle cx="5.5" cy="17.5" r="2" fill="currentColor" stroke="none" />
          <path d="M10 6.5h10M10 12h8M10 17.5h10" />
        </svg>
      );
    case 'charades':
      return (
        <svg {...common}>
          <circle cx="12" cy="6.2" r="2.8" fill="currentColor" stroke="none" />
          <path d="M12 10.5v5" />
          <path d="M12 12.2L6.4 8.4M12 12.2l5.6-3.8" />
          <path d="M12 15.5l-3 5M12 15.5l3 5" />
        </svg>
      );
    case 'whoami':
      return (
        <svg {...common}>
          <path d="M12 3.2a6.6 6.6 0 0 0-3.6 12.1v3.1c0 1 .8 1.8 1.8 1.8h3.6c1 0 1.8-.8 1.8-1.8v-3.1A6.6 6.6 0 0 0 12 3.2z" />
          <path d="M10.4 8.9a1.7 1.7 0 1 1 2.3 1.6c-.5.2-.7.6-.7 1.1v.3" opacity="0.85" />
          <circle cx="12" cy="13.8" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'wordle':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="5" height="5" rx="1.4" fill="currentColor" stroke="none" />
          <rect x="9.5" y="3.5" width="5" height="5" rx="1.4" />
          <rect x="15.5" y="3.5" width="5" height="5" rx="1.4" opacity="0.35" />
          <rect x="3.5" y="9.5" width="5" height="5" rx="1.4" opacity="0.35" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1.4" fill="currentColor" stroke="none" />
          <rect x="15.5" y="9.5" width="5" height="5" rx="1.4" opacity="0.35" />
          <rect x="3.5" y="15.5" width="5" height="5" rx="1.4" opacity="0.35" />
          <rect x="9.5" y="15.5" width="5" height="5" rx="1.4" opacity="0.35" />
          <rect x="15.5" y="15.5" width="5" height="5" rx="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'wordbomb':
      return (
        <svg {...common}>
          <circle cx="9.8" cy="15" r="6.2" fill="currentColor" stroke="none" />
          <path d="M14.2 10.4l3.4-3.4" strokeWidth="2.2" />
          <path d="M19 4.2l.55 2.05 2.05.55-2.05.55L19 9.4l-.55-2.05L16.4 6.8l2.05-.55z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'imposter':
      return (
        <svg {...common}>
          <path d="M3.2 9.4c0-1.3 1-2.3 2.3-2.4 4.3-.4 8.7-.4 13 0 1.3.1 2.3 1.1 2.3 2.4v2.5c0 1.6-1.2 3-2.8 3.2l-4.2.5c-1.2.1-2.4.1-3.6 0l-4.2-.5C4.4 14.9 3.2 13.5 3.2 11.9z" />
          <ellipse cx="8.6" cy="11.4" rx="1.7" ry="1.2" fill="currentColor" stroke="none" />
          <ellipse cx="15.4" cy="11.4" rx="1.7" ry="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'truths':
      return (
        <svg {...common}>
          <path d="M4 6.5h9M4 17.5h9" />
          <path d="M4 12h2.6l1.6-2 1.6 4 1.6-2H13" />
          <path d="M16.6 15.6l4.4 4.4M21 15.6l-4.4 4.4" />
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
      return <svg {...common} className="flip-rtl"><path d="M4 12h15M13 6l6 6-6 6" /></svg>;
    case 'trophy':
      return <svg {...common}><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5" /><path d="M12 14v4M8.5 20.5h7M9.5 18h5" /></svg>;
    case 'medal': return <svg {...common}><path d="M8.5 2.5l2.6 7M15.5 2.5l-2.6 7" /><circle cx="12" cy="15.5" r="5.5" /></svg>;
    case 'crown': return <svg {...common}><path d="M3.5 8l4.5 4 4-7 4 7 4.5-4-1.8 10.5H5.3z" /></svg>;
    case 'bulb': return <svg {...common}><path d="M9 18h6M10 21h4" /><path d="M12 3.5a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.2 1.1 2.2h5c0-1 .4-1.6 1.1-2.2A6 6 0 0 0 12 3.5z" /></svg>;
    case 'stats': return <svg {...common}><path d="M5 20V11M12 20V4M19 20v-6" /></svg>;
    case 'gear': return <svg {...common}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></svg>;
    case 'pencil': return <svg {...common}><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" /></svg>;
    case 'up': return <svg {...common}><path d="M12 19V6M6 11l6-6 6 6" /></svg>;
    case 'down': return <svg {...common}><path d="M12 5v13M6 13l6 6 6-6" /></svg>;
    case 'close': return <svg {...common}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case 'plus': return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'back': return <svg {...common} className="flip-rtl"><path d="M20 12H5M11 6l-6 6 6 6" /></svg>;
    case 'dot': return <svg {...common}><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></svg>;
    case 'confetti': return <svg {...common}><path d="M4 20l5.5-12 7 7z" /></svg>;

    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
  }
}
