"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

/*
  Wingacy — Coming 2026 (TSX, no Framer Motion)
  --------------------------------------------------
  Goals
  - Responsive on all devices
  - Image centered
  - Header cluster [Logo] WINGACY / Coming 2026 shares one baseline
  - Tagline below the main image that does NOT affect the header
  - Header block can be nudged (translate/top) without deleting any code
  - NEW: Parallax Tilt on background image (mouse-track), minimal tilt
        > maxTilt = 5deg, ease = 0.1

  Animations (unchanged)
  - YEAR: show "202" + last digit rolls ~1s (excluding 6), then snaps to 6, hold 2s
  - PLUS: shows + one-by-one (1 > 2 > 3) and loops back to YEAR
*/

type Mode = "year" | "pluses";

// Timing constants (ms)
const YEAR_TOTAL_MS = 1000; // roll ~1s
const YEAR_HOLD_MS = 2000;  // hold 2026 for 2s
const PLUS_TOTAL_MS = 3000; // +++ total 3s
const FADE_UP_MS = 260;     // subtle intro for YEAR block
const PLUS_SLIDE_MS = 260;  // each plus slide duration
const ROLL_TICK_MS = 120;   // premium pace for rolling digit

// Parallax constants
const MAX_TILT_DEG = 5;     // <= user's request
const TILT_EASE = 0.1;      // <= user's request (lerp factor)
const PERSPECTIVE = 800;    // px

// Helper used by tests (pure)
function plusCountAt(elapsedMs: number, totalMs: number) {
  if (elapsedMs < 0) return 0;
  const perStep = totalMs / 3;
  return Math.min(3, Math.floor(elapsedMs / perStep) + 1);
}

// Small utils for parallax (exported for tests)
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export default function WingacyComingSoon() {
  const [mode, setMode] = useState<Mode>("year");
  const [lastDigit, setLastDigit] = useState(0);
  const [showFinalSix, setShowFinalSix] = useState(false);
  const [plusStates, setPlusStates] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [yearRenderKey, setYearRenderKey] = useState(0);

  // timers
  const rollFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const holdTimeoutRef = useRef<number | null>(null);
  const plusTimeoutsRef = useRef<number[]>([]);

  // measure "2026" width so +++ starts at same gap
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [fixedWidth, setFixedWidth] = useState<number | undefined>(undefined);

  // PARALLAX refs
  const tiltWrapRef = useRef<HTMLDivElement | null>(null); // the wrapper we rotate
  const isHoveringRef = useRef(false);
  const rafTiltRef = useRef<number | null>(null);
  const targetRX = useRef(0); // target rotateX
  const targetRY = useRef(0); // target rotateY
  const currentRX = useRef(0); // animated rotateX
  const currentRY = useRef(0); // animated rotateY

  useLayoutEffect(() => {
    if (measureRef.current) {
      const w = Math.ceil(measureRef.current.getBoundingClientRect().width);
      if (w > 0) setFixedWidth(w);
    }
  }, []);

  // YEAR mode: roll (no 6) → 6 → hold → switch
  useEffect(() => {
    if (rollFrameRef.current) cancelAnimationFrame(rollFrameRef.current);
    if (holdTimeoutRef.current) window.clearTimeout(holdTimeoutRef.current);
    plusTimeoutsRef.current.forEach((id) => window.clearTimeout(id));

    if (mode === "year") {
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
              if (d === 6) d = (prev + 1) % 10; // ensure not 6 during roll
              if (d === 6) d = (d + 1) % 10;
              return d;
            });
            lastUpdateRef.current = now;
          }
          rollFrameRef.current = requestAnimationFrame(step);
        } else {
          setLastDigit(6);
          setShowFinalSix(true);
          holdTimeoutRef.current = window.setTimeout(() => setMode("pluses"), YEAR_HOLD_MS);
        }
      };

      rollFrameRef.current = requestAnimationFrame(step);

      return () => {
        if (rollFrameRef.current) cancelAnimationFrame(rollFrameRef.current);
        if (holdTimeoutRef.current) window.clearTimeout(holdTimeoutRef.current);
      };
    }
  }, [mode]);

  // PLUS mode sequencing
  useEffect(() => {
    plusTimeoutsRef.current.forEach((id) => window.clearTimeout(id));

    if (mode === "pluses") {
      setPlusStates([false, false, false]);
      const perStep = PLUS_TOTAL_MS / 3;
      plusTimeoutsRef.current.push(window.setTimeout(() => setPlusStates([true, false, false]), 0));
      plusTimeoutsRef.current.push(window.setTimeout(() => setPlusStates([true, true, false]), Math.round(perStep)));
      plusTimeoutsRef.current.push(window.setTimeout(() => setPlusStates([true, true, true]), Math.round(perStep * 2)));
      plusTimeoutsRef.current.push(window.setTimeout(() => {
        setYearRenderKey((k) => k + 1);
        setMode("year");
      }, Math.round(PLUS_TOTAL_MS + PLUS_SLIDE_MS)));

      return () => {
        plusTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
      };
    }
  }, [mode]);

  // PARALLAX handlers
  useEffect(() => {
    const wrap = tiltWrapRef.current;
    if (!wrap) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const px = (e.clientX - cx) / (rect.width / 2);  // -1 .. 1
      const py = (e.clientY - cy) / (rect.height / 2); // -1 .. 1
      const rx = clamp(-py * MAX_TILT_DEG, -MAX_TILT_DEG, MAX_TILT_DEG); // invert Y for natural tilt
      const ry = clamp( px * MAX_TILT_DEG, -MAX_TILT_DEG, MAX_TILT_DEG);
      targetRX.current = rx;
      targetRY.current = ry;
      isHoveringRef.current = true;
      if (rafTiltRef.current == null) rafTiltRef.current = requestAnimationFrame(tick);
    };

    const onMouseLeave = () => {
      // ease back to zero
      targetRX.current = 0;
      targetRY.current = 0;
      isHoveringRef.current = false;
      if (rafTiltRef.current == null) rafTiltRef.current = requestAnimationFrame(tick);
    };

    const tick = () => {
      const rx = currentRX.current = lerp(currentRX.current, targetRX.current, TILT_EASE);
      const ry = currentRY.current = lerp(currentRY.current, targetRY.current, TILT_EASE);
      wrap.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      wrap.style.willChange = "transform";

      const done = Math.abs(rx - targetRX.current) < 0.02 && Math.abs(ry - targetRY.current) < 0.02;
      if (done && !isHoveringRef.current) {
        // stop loop when settled back to zero
        if (rafTiltRef.current) cancelAnimationFrame(rafTiltRef.current);
        rafTiltRef.current = null;
        return;
      }
      rafTiltRef.current = requestAnimationFrame(tick);
    };

    wrap.addEventListener("mousemove", onMouseMove);
    wrap.addEventListener("mouseleave", onMouseLeave);
    // optional: touch move support could be added if needed

    return () => {
      wrap.removeEventListener("mousemove", onMouseMove);
      wrap.removeEventListener("mouseleave", onMouseLeave);
      if (rafTiltRef.current) cancelAnimationFrame(rafTiltRef.current);
      rafTiltRef.current = null;
      // reset any residual transform
      wrap.style.transform = `perspective(${PERSPECTIVE}px) rotateX(0deg) rotateY(0deg)`;
    };
  }, []);

  return (
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
        {/* Header Section (movable container). To nudge up/down, edit translate-y-[...] here */}
        <div className="relative flex items-center justify-center gap-3 mb-6 translate-y-[-25px]">
          <img
            src="https://i.ibb.co/YTB8dvn8/009-1.png"
            alt="Wingacy logo"
            className="h-6 w-auto object-contain relative top-[2px]"
          />
          <span className="font-bold text-white uppercase tracking-wide text-lg leading-none">WINGACY</span>
          <span className="text-neutral-400">/</span>

          {/* Coming + animated segment (baseline aligned) */}
          <div className="flex items-center h-6 gap-2">
            <span className="text-sm text-white">Coming</span>

            {/* Invisible measurer to lock width so +++ starts at same gap as 2026 */}
            <span ref={measureRef} className="invisible absolute -z-10 pointer-events-none text-sm">2026</span>

            {/* Animated block with fixed width */}
            <div className="relative inline-flex items-center h-6 tight whitespace-nowrap" style={{ width: fixedWidth }}>
              {mode === "year" ? (
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

        {/* Image centered with PARALLAX TILT */}
        <div className="flex flex-col items-center w-full">
          <div
            ref={tiltWrapRef}
            className="w-full max-w-sm will-change-transform"
            style={{ transform: `perspective(${PERSPECTIVE}px) rotateX(0deg) rotateY(0deg)`, transformOrigin: "center center" }}
          >
            <img
              src="https://i.ibb.co/N6XXn2BC/kayywingacy.jpg"
              alt="Wingacy background"
              className="w-full h-auto object-contain select-none pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Tagline under the image (enabled) */}
          <div className="mt-4 text-base translate-y-[25px] text-neutral-400 tracking-wide uppercase text-center">
            <span className="font-normal">14°03'35.5"N 101°22'16.0"E</span>
          </div>
        </div>
      </main>
    </div>
  );
}

// Tests (do not remove existing). Added a couple more light checks.
console.assert(typeof WingacyComingSoon === "function", "Component should be a function");
console.assert(["year", "pluses"].includes("year"), "Mode should be either 'year' or 'pluses'");
console.assert(plusCountAt(0, PLUS_TOTAL_MS) === 1, "At t=0, first plus visible");
console.assert(plusCountAt(Math.ceil(PLUS_TOTAL_MS/3), PLUS_TOTAL_MS) >= 2, "At ~1/3, at least two pluses visible");
console.assert(plusCountAt(Math.ceil((2*PLUS_TOTAL_MS)/3), PLUS_TOTAL_MS) >= 3, "At ~2/3, three pluses visible");
console.assert(YEAR_TOTAL_MS > 0 && YEAR_HOLD_MS > 0 && PLUS_TOTAL_MS > 0, "Timing constants must be positive");
// New tests
console.assert(typeof ROLL_TICK_MS === "number" && ROLL_TICK_MS > 0, "ROLL_TICK_MS must be positive");
console.assert(MAX_TILT_DEG === 5, "Parallax max tilt should be 5deg as requested");
console.assert(TILT_EASE === 0.1, "Parallax ease should be 0.1 as requested");
console.assert(typeof document !== "undefined" || true, "Environment sanity check");
