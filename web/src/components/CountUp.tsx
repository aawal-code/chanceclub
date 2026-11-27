import React, { useEffect, useRef, useState } from 'react';
import { motionOn } from '../motion';

/** Counts from the previous value to `to`. Text only, never blocks input. */
export default function CountUp({ to, ms = 700 }: { to: number; ms?: number }) {
  const [v, setV] = useState(to);
  const from = useRef(to);
  useEffect(() => {
    if (!motionOn() || from.current === to) { from.current = to; setV(to); return; }
    const start = performance.now(), a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setV(Math.round(a + (to - a) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{v}</>;
}
