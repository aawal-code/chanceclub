import React from 'react';

const TAU = Math.PI * 2;

function seg(i: number, n: number) {
  const a0 = (i / n) * TAU - Math.PI / 2;
  const a1 = ((i + 1) / n) * TAU - Math.PI / 2;
  const p = (a: number) => `${100 + 96 * Math.cos(a)} ${100 + 96 * Math.sin(a)}`;
  if (n === 1) return 'M100 4 A96 96 0 1 1 99.99 4 Z';
  return `M100 100 L${p(a0)} A96 96 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z`;
}

/** Spinning wheel. `angle` is the cumulative rotation in degrees. */
export function Wheel({ entries, angle, dim = [], spinning }: { entries: string[]; angle: number; dim?: string[]; spinning?: boolean }) {
  const n = Math.max(entries.length, 1);
  const step = 360 / n;
  const font = n > 16 ? 6 : n > 10 ? 7.5 : n > 6 ? 9 : 11;
  return (
    <div className="wheel-wrap" style={{ width: '100%', maxWidth: 320, margin: '0 auto', position: 'relative' }}>
      <svg viewBox="0 0 200 210" width="100%" role="img" style={{ display: 'block', overflow: 'visible' }}>
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 100px', transition: spinning ? 'transform 3.2s cubic-bezier(.12,.7,.1,1)' : 'none' }}>
          {(entries.length ? entries : ['—']).map((label, i) => {
            const mid = (i + 0.5) * step;
            const off = dim.includes(label);
            return (
              <g key={i} opacity={off ? 0.25 : 1}>
                <path d={seg(i, n)} fill={`hsl(${(i * 360) / n + 20} 62% ${i % 2 ? 52 : 44}%)`} stroke="rgba(0,0,0,.35)" strokeWidth="0.6" />
                <text
                  x="100" y="30" fill="#fff" fontSize={font} fontWeight="700" textAnchor="middle"
                  transform={`rotate(${mid} 100 100)`}
                >{label.length > 11 ? label.slice(0, 10) + '…' : label}</text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="10" fill="var(--surface-2, #222)" stroke="rgba(0,0,0,.4)" />
        </g>
        <path d="M92 -2 L108 -2 L100 14 Z" fill="var(--ink, #fff)" stroke="rgba(0,0,0,.5)" strokeWidth="0.8" />
      </svg>
    </div>
  );
}

/** Rotation that lands entry `index` under the top pointer, adding full turns. */
export function angleFor(index: number, n: number, turns: number) {
  return turns * 360 * 5 - ((index + 0.5) * 360) / Math.max(n, 1);
}
