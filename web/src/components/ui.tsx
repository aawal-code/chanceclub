import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/* ---------------- buttons ---------------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'ghost' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
};

export function Btn({ variant = 'solid', size = 'md', block, children, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={`btn ${rest.className || ''}`}
      data-variant={variant === 'solid' ? undefined : variant}
      data-size={size === 'md' ? undefined : size}
      data-block={block ? 'true' : undefined}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '', pad, flat, ...rest }: React.HTMLAttributes<HTMLDivElement> & { pad?: 'lg'; flat?: boolean }) {
  return (
    <div {...rest} className={`card ${className}`} data-pad={pad} data-flat={flat ? 'true' : undefined}>
      {children}
    </div>
  );
}

export function Field({
  label, value, onChange, placeholder, type = 'text', maxLength, className, inputMode, autoFocus, onKeyDown,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  className?: string;
  inputMode?: 'text' | 'numeric';
  autoFocus?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}) {
  return (
    <label className={`field ${className || ''}`}>
      {label ? <span>{label}</span> : null}
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        maxLength={maxLength}
        inputMode={inputMode}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map((option) => (
        <button key={option.value} role="tab" data-on={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- toasts ---------------- */
type Toast = { id: number; message: string };
const ToastCtx = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const push = useCallback((message: string) => {
    const id = ++counter.current;
    setToasts((current) => [...current.slice(-2), { id, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">{toast.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- small helpers ---------------- */
export function CopyButton({ value, label, onCopied }: { value: string; label: string; onCopied: () => void }) {
  return (
    <Btn
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          onCopied();
        } catch {
          window.prompt('Copy this link', value);
        }
      }}
    >
      {label}
    </Btn>
  );
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(query).matches));
  useEffect(() => {
    const list = window.matchMedia(query);
    const handler = () => setMatches(list.matches);
    list.addEventListener('change', handler);
    return () => list.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 18, height: 18, borderRadius: '50%', display: 'inline-block',
        border: '2px solid color-mix(in srgb, currentColor 25%, transparent)',
        borderTopColor: 'currentColor',
        animation: 'spin .7s linear infinite',
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

export function useInterval(callback: () => void, delay: number | null) {
  const saved = useRef(callback);
  useEffect(() => { saved.current = callback; }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = window.setInterval(() => saved.current(), delay);
    return () => window.clearInterval(id);
  }, [delay]);
}

export function avatarInitial(name: string) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

export function useStableCallback<T extends (...args: any[]) => any>(fn: T) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; }, [fn]);
  return useMemo(() => ((...args: Parameters<T>) => ref.current(...args)) as T, []);
}
