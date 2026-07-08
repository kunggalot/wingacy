import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import 'tailwindcss/tailwind.css';

/**
 * Wingacy Coming 2026 (index.tsx)
 * ------------------------------------------------------------
 * Footer tagline switched from text to latitude/longitude map coordinates.
 */

type Mode = 'year' | 'pluses';

// Timing constants (ms)
const YEAR_TOTAL_MS = 1000;
const YEAR_HOLD_MS = 2000;
const PLUS_TOTAL_MS = 3000;
const FADE_UP_MS = 260;
const PLUS_SLIDE_MS = 260;
const ROLL_TICK_MS = 120;

// Parallax constants
const MAX_TILT_DEG = 5;
const TILT_EASE = 0.1;
const PERSPECTIVE = 800;

// Helpers
export function plusCountAt(elapsedMs: number, totalMs: number) {
  if (elapsedMs < 0) return 0;
  const perStep = totalMs / 3;
  return Math.min(3, Math.floor(elapsedMs / perStep) + 1);
}
export function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
export function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export default function WingacyComingSoon() {

  const [mode, setMode] = useState<Mode>('year');
  const [lastDigit, setLastDigit] = useState(0);
  const [showFinalSix, setShowFinalSix] = useState(false);
  const [plusStates, setPlusStates] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [yearRenderKey, setYearRenderKey] = useState(0);

  const rollFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const holdTimeoutRef = useRef<number | null>(null);
  const plusTimeoutsRef = useRef<number[]>([]);

  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [fixedWidth, setFixedWidth] = useState<number | undefined>(undefined);

  const tiltWrapRef = useRef<HTMLDivElement | null>(null);
  const rafTiltRef = useRef<number | null>(null);
  const targetRX = useRef(0);
  const targetRY = useRef(0);
  const currentRX = useRef(0);
  const currentRY = useRef(0);
  const runningRef = useRef(false);

  useLayoutEffect(() => {
    if (measureRef.current) {
      const w = Math.ceil(measureRef.current.getBoundingClientRect().width);
      if (w > 0) setFixedWidth(w);
    }
  }, []);

  useEffect(() => {
    if (rollFrameRef.current) cancelAnimationFrame(rollFrameRef.current);
    if (holdTimeoutRef.current) window.clearTimeout(holdTimeoutRef.current);
    plusTimeoutsRef.current.forEach((id) => window.clearTimeout(id));

    if (mode === 'year') {
      setPlusStates([false, false, false]);
      setShowFinalSix(false);
      setLastDigit(0);

      const start = performance.now();
      lastUpdateRef.current = start;

      const step = () => {
        const now = performance.now();
        const elapsed = now - start;
        if (elapsed < YEAR_TOTAL_MS) {
          if (now - lastUpdateRef.current >= ROLL_TICK_MS) {
            setLastDigit((prev) => {
              let d = prev;
              for (let tries = 0; tries < 5 && (d === prev || d === 6); tries++) {
                d = Math.floor(Math.random() * 10);
              }
              if (d === 6) d = (prev + 1) % 10;
              if (d === 6) d = (d + 1) % 10;
              return d;
            });
            lastUpdateRef.current = now;
          }
          rollFrameRef.current = requestAnimationFrame(step);
        } else {
          setLastDigit(6);
          setShowFinalSix(true);
          holdTimeoutRef.current = window.setTimeout(() => setMode('pluses'), YEAR_HOLD_MS);
        }
      };

      rollFrameRef.current = requestAnimationFrame(step);

      return () => {
        if (rollFrameRef.current) cancelAnimationFrame(rollFrameRef.current);
        if (holdTimeoutRef.current) window.clearTimeout(holdTimeoutRef.current);
      };
    }
  }, [mode]);

  useEffect(() => {
    plusTimeoutsRef.current.forEach((id) => window.clearTimeout(id));

    if (mode === 'pluses') {
      setPlusStates([false, false, false]);
      const perStep = PLUS_TOTAL_MS / 3;
      plusTimeoutsRef.current.push(window.setTimeout(() => setPlusStates([true, false, false]), 0));
      plusTimeoutsRef.current.push(window.setTimeout(() => setPlusStates([true, true, false]), Math.round(perStep)));
      plusTimeoutsRef.current.push(window.setTimeout(() => setPlusStates([true, true, true]), Math.round(perStep * 2)));
      plusTimeoutsRef.current.push(window.setTimeout(() => {
        setYearRenderKey((k) => k + 1);
        setMode('year');
      }, Math.round(PLUS_TOTAL_MS + PLUS_SLIDE_MS)));

      return () => {
        plusTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
      };
    }
  }, [mode]);

  useEffect(() => {

    if (typeof window === 'undefined') return;
    const wrap = tiltWrapRef.current;
    if (!wrap) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const px = clamp((e.clientX - cx) / (rect.width / 2), -1, 1);
      const py = clamp((e.clientY - cy) / (rect.height / 2), -1, 1);
      const rx = clamp(-py * MAX_TILT_DEG, -MAX_TILT_DEG, MAX_TILT_DEG);
      const ry = clamp(px * MAX_TILT_DEG, -MAX_TILT_DEG, MAX_TILT_DEG);
      targetRX.current = rx;
      targetRY.current = ry;
    };

    const tick = () => {
      const rx = (currentRX.current = lerp(currentRX.current, targetRX.current, TILT_EASE));
      const ry = (currentRY.current = lerp(currentRY.current, targetRY.current, TILT_EASE));
      wrap.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      wrap.style.willChange = 'transform';
      rafTiltRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!runningRef.current) {
        runningRef.current = true;
        if (rafTiltRef.current == null) rafTiltRef.current = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      runningRef.current = false;
      if (rafTiltRef.current) cancelAnimationFrame(rafTiltRef.current);
      rafTiltRef.current = null;
    };

    const onVisibility = () => {
      if (document.hidden) stop(); else start();
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility, { passive: true });
    start();

    return () => {
      window.removeEventListener('mousemove', onMouseMove as any);
      document.removeEventListener('visibilitychange', onVisibility as any);
      stop();
      wrap.style.transform = `perspective(${PERSPECTIVE}px) rotateX(0deg) rotateY(0deg)`;
    };
  }, []);

  return (
    <html>
      <body>
        <div className="relative min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-4 overflow-hidden">
          <style>{`
            .digit { line-height: 1; display: inline-block; font-variant-numeric: tabular-nums; }
            .fade-up { animation: fadeUp ${FADE_UP_MS}ms ease-out; }
            .plus { animation: slideInRight ${PLUS_SLIDE_MS}ms ease-out; display:inline-block; }
            .tight { letter-spacing: 0; }
            @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes slideInRight { from { transform: translateX(-10px); } to { transform: translateX(0); } }
          `}</style>

          <main className="relative flex-1 flex flex-col items-center justify-center w-full max-w-screen-md mx-auto">
            <div className="relative flex items-center justify-center gap-3 mb-6 translate-y-[-25px]">
              <img
                src="https://i.ibb.co/YTB8dvn8/009-1.png"
                alt="Wingacy logo"
                className="h-6 w-auto object-contain relative top-[2px]"
              />
              <span className="font-bold text-white uppercase tracking-wide text-lg leading-none">WINGACY</span>
              <span className="text-neutral-400">/</span>

              <div className="flex items-center h-6 gap-2">
                <span className="text-sm text-white">Coming</span>
                <span ref={measureRef} className="invisible absolute -z-10 pointer-events-none text-sm">2026</span>
                <div className="relative inline-flex items-center h-6 tight whitespace-nowrap" style={{ width: fixedWidth }}>
                  {mode === 'year' ? (
                    <div key={`year-${yearRenderKey}`} className="flex items-center fade-up tight">
                      <span className="digit text-sm text-white">202</span>
                      <span className="digit text-sm text-white">{showFinalSix ? 6 : lastDigit}</span>
                    </div>
                  ) : (
                    <div key="pluses" className="flex flex-row items-center text-sm text-white tight whitespace-nowrap">
                      {plusStates[0] && <span className="digit plus">+</span>}
                      {plusStates[1] && <span className="digit plus">+</span>}
                      {plusStates[2] && <span className="digit plus">+</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center w-full">
              <div
                ref={tiltWrapRef}
                className="w-full max-w-sm will-change-transform"
                style={{ transform: `perspective(${PERSPECTIVE}px) rotateX(0deg) rotateY(0deg)`, transformOrigin: 'center center' }}
              >
                <img
                  src="https://i.ibb.co/N6XXn2BC/kayywingacy.jpg"
                  alt="Wingacy background"
                  className="w-full h-auto object-contain select-none pointer-events-none"
                  draggable={false}
                />
              </div>

              {/* Footer: copyright stamp */}
              <div className="mt-4 text-base translate-y-[25px] text-neutral-400 tracking-wide uppercase text-center">
                © 2026 Wingacy · All Rights Reserved
              </div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}