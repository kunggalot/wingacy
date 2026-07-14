/* --- hero tilt: exact port of wingacy.com (window mousemove -> rAF lerp
   -> GPU transform). Cursor anywhere on screen tilts the photo. --- */
(function heroTilt(){
  const wrap = document.getElementById('heroFrame');
  if (!wrap) return;
  // touch devices have no cursor to follow, and iOS Safari synthesizes a
  // single mousemove at the tap point after a touch — with no further move
  // to lerp back to center, that stray event left the photo stuck tilted
  // (visible as a gap at one edge, since .hero-media has no fill behind the
  // rotated frame). Real-mouse-only devices don't hit this at all.
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const MAX = 5;        // MAX_TILT_DEG
  const EASE = 0.1;     // TILT_EASE
  const PERSP = 800;    // PERSPECTIVE
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  let targetRX = 0, targetRY = 0, curRX = 0, curRY = 0;
  let raf = null, running = false;

  const onMove = (e) => {
    if (wrap.offsetParent === null) return;   // hero not visible (Shop/other view) -> ignore
    const r = wrap.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const px = clamp((e.clientX - cx) / (r.width / 2), -1, 1);
    const py = clamp((e.clientY - cy) / (r.height / 2), -1, 1);
    targetRX = clamp(-py * MAX, -MAX, MAX);
    targetRY = clamp(px * MAX, -MAX, MAX);
  };

  const tick = () => {
    curRX += (targetRX - curRX) * EASE;
    curRY += (targetRY - curRY) * EASE;
    wrap.style.transform =
      `perspective(${PERSP}px) rotateX(${curRX.toFixed(3)}deg) rotateY(${curRY.toFixed(3)}deg)`;
    raf = requestAnimationFrame(tick);
  };

  const start = () => { if (!running){ running = true; if (raf == null) raf = requestAnimationFrame(tick); } };
  const stop  = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = null; };

  window.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); }, { passive: true });
  start();
})();

/* --- vanilla tilt: passive mousemove -> rAF + lerp -> GPU transform ---
   Explicitly requested effect, so it runs regardless of the reduced-motion
   hint. Swatch tilts in 3D; the inner logo parallaxes the other way for
   depth, and the tile lifts slightly so the motion is unmistakable. */
(function setupTilt(){
  /* renderShop() replaces the card nodes on every category switch, so the
     hover listener must be (re)attached to whatever swatches are in the DOM
     now. _hoverBound marks a swatch as already wired (idempotent rebind). */
  function bind(){
    document.querySelectorAll('.swatch').forEach((swatch) => {
      if (swatch._hoverBound) return;
      swatch._hoverBound = true;
      // demo only: no second product photo exists yet, so hover swaps the
      // logo's color instead of an image src
      swatch.addEventListener('mouseenter', () => {
        swatch.classList.add('is-swap');
        const img = swatch.querySelector('img');
        if (img._photoHover) img.src = img._photoHover;
      }, { passive: true });
      swatch.addEventListener('mouseleave', () => {
        swatch.classList.remove('is-swap');
        const img = swatch.querySelector('img');
        if (img._photoDefault) img.src = img._photoDefault;
      }, { passive: true });
    });
  }
  bind();
  window.rebindSwatchTilt = bind;
})();
