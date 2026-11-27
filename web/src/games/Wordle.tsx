import React from 'react';

export type Attempt = { word: string; pattern: string[] };

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

export function WordleBoard({
  attempts, current = '', length = 5, max = 6, revealRow, shake,
}: {
  attempts: Attempt[];
  current?: string;
  length?: number;
  max?: number;
  revealRow?: number;
  shake?: boolean;
}) {
  const rows: { letters: string[]; state: 'empty' | 'typed' | 'scored'; pattern?: string[] }[] = [];
  for (let i = 0; i < max; i++) {
    const attempt = attempts[i];
    if (attempt) rows.push({ letters: attempt.word.split(''), state: 'scored', pattern: attempt.pattern });
    else if (i === attempts.length && current) rows.push({ letters: current.padEnd(length, ' ').slice(0, length).split(''), state: 'typed' });
    else rows.push({ letters: Array.from({ length }, () => ' '), state: 'empty' });
  }

  return (
    <div className={`wordle-grid ${shake ? 'shake' : ''}`} aria-label="word grid">
      {rows.map((row, rowIndex) => (
        <div className="wordle-row" key={rowIndex}>
          {row.letters.map((letter, letterIndex) => {
            const state = row.state === 'scored' ? (row.pattern?.[letterIndex] || 'miss') : 'empty';
            return (
              <div
                key={letterIndex}
                className="tile"
                data-state={state}
                data-filled={letter.trim() ? 'true' : 'false'}
                data-pop={row.state === 'typed' && letter.trim() ? 'true' : undefined}
                data-flip={row.state === 'scored' && revealRow === rowIndex ? 'true' : undefined}
                style={row.state === 'scored' && revealRow === rowIndex ? { animationDelay: `${letterIndex * 90}ms` } : undefined}
              >
                {letter.trim()}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function Keyboard({ onKey, keyStates }: { onKey: (key: string) => void; keyStates: Record<string, string> }) {
  return (
    <div className="keyboard">
      {ROWS.map((row, index) => (
        <div className="kb-row" key={row}>
          {row.split('').map((letter) => (
            <button key={letter} className="key" data-state={keyStates[letter]} onClick={() => onKey(letter)}>
              {letter}
            </button>
          ))}
          {index === 2 ? (
            <>
              <button className="key" data-wide="true" onClick={() => onKey('enter')}>ENTER</button>
              <button className="key" data-wide="true" onClick={() => onKey('back')}>⌫</button>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function keyStatesFrom(attempts: Attempt[]): Record<string, string> {
  const rank: Record<string, number> = { miss: 1, near: 2, hit: 3 };
  const states: Record<string, string> = {};
  for (const attempt of attempts) {
    attempt.word.split('').forEach((letter, index) => {
      const next = attempt.pattern[index];
      if (!states[letter] || rank[next] > rank[states[letter]]) states[letter] = next;
    });
  }
  return states;
}
