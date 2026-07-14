/* --- view router: nav links + brand switch views client-side (no reload).
   Brand logo -> Home (hero only); each tab renders its own layout. --- */
/* --- view router: exposed as a plain top-level fn (not an IIFE) so the
   PDP/cart code below can navigate views too, not just nav-link clicks. --- */

// Pre-launch pages/entry points are `disabled`/`aria-disabled` in the
// markup itself (index.html), so production always ships them off without
// anyone having to remember to flip them back before a push. On localhost
// only, auto-enable them for testing — same location.hostname check auth.js
// already uses for AUTH_API. placeOrderBtn is NOT in this list: it's not a
// pre-launch placeholder, checkout.js drives its disabled state from real
// cart/address conditions and must keep doing so even on localhost.
if (location.hostname === 'localhost') {
  document.querySelectorAll(
    '[data-view="pro"], [data-view="pri"], [data-view="shop"], #accountBtn, #notiBtn'
  ).forEach((el) => { el.disabled = false; });
  document.querySelectorAll('.hero-cta, .home-band').forEach((el) => {
    el.removeAttribute('aria-disabled');
    el.removeAttribute('tabindex');
  });
}

const views = [...document.querySelectorAll('.view')];
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function show(name){
  const target = document.getElementById('view-' + name) ? name : 'home';
  const next = document.getElementById('view-' + target);
  // finalize any view still mid-leave from a rapid previous switch, so the
  // "currently visible" lookup below is unambiguous
  views.forEach((v) => {
    if (v.classList.contains('view-leaving')) { v.classList.remove('view-leaving'); v.hidden = true; }
  });
  const curr = views.find((v) => !v.hidden && v !== next);

  // populate the incoming view before it fades in
  if (target === 'cart') renderCart();
  if (target === 'checkout') renderCheckout();
  if (target === 'account') renderAccount();

  // reveal the incoming view (fades in via viewIn); keep `curr` mounted so it
  // can fade out over it, hide any other stragglers immediately
  views.forEach((v) => { if (v !== next && v !== curr) v.hidden = true; });
  next.hidden = false;

  if (curr && curr !== next && !prefersReducedMotion()) {
    curr.classList.add('view-leaving');
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      curr.classList.remove('view-leaving');
      curr.hidden = true;
    };
    curr.addEventListener('animationend', cleanup, { once: true });
    setTimeout(cleanup, 260); // fallback if animationend is missed (tab backgrounded)
  } else if (curr && curr !== next) {
    curr.hidden = true;
  }

  window.scrollTo(0, 0);
}
// mobile nav-links dropdown (hamburger toggle) — desktop hides #navToggleBtn
// via CSS so this listener is harmless/unused there
const navToggleBtn = document.getElementById('navToggleBtn');
const navbarLinks = document.getElementById('navbarLinks');
function closeNavDrawer(){
  navbarLinks.classList.remove('nav-open');
  navToggleBtn.setAttribute('aria-expanded', 'false');
}
navToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = navbarLinks.classList.toggle('nav-open');
  navToggleBtn.setAttribute('aria-expanded', String(open));
});
document.addEventListener('click', (e) => {
  if (navbarLinks.classList.contains('nav-open') && !navbarLinks.contains(e.target)) closeNavDrawer();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeNavDrawer();
});

document.querySelectorAll('[data-view]').forEach((t) => {
  t.addEventListener('click', (e) => {
    e.preventDefault();
    // Native `disabled` already blocks <button> clicks, but <a> has no such
    // attribute — aria-disabled="true" only affects styling/a11y, so it needs
    // this explicit guard to actually stop navigation.
    if (t.disabled || t.getAttribute('aria-disabled') === 'true') return;
    show(t.dataset.view);
    closeNavDrawer();
  });
});

// Lets an external link (e.g. a notification's #view-shop) land on the right
// view instead of scrolling to an inert hidden element — the browser's
// default anchor behavior otherwise does nothing useful here, since every
// .view except the active one carries the `hidden` attribute. This only
// covers link-in: internal nav clicks still call show() directly and don't
// write back to the hash, so the address bar isn't wired as two-way routing.
// Falls back to Home on an empty/unmatched hash (not just "do nothing")
// so native back/forward navigation — which never had an in-app history
// entry to land on, since internal nav clicks don't touch the hash — always
// resolves to a real view instead of leaving the screen blank.
function showFromHash(){
  const name = location.hash.replace(/^#view-/, '').replace(/^#/, '');
  if (name && document.getElementById('view-' + name)) show(name);
  else show('home');
}
window.addEventListener('hashchange', showFromHash);
window.addEventListener('popstate', showFromHash);
if (location.hash) showFromHash(); else show('home');
