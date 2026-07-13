/* --- view router: nav links + brand switch views client-side (no reload).
   Brand logo -> Home (hero only); each tab renders its own layout. --- */
/* --- view router: exposed as a plain top-level fn (not an IIFE) so the
   PDP/cart code below can navigate views too, not just nav-link clicks. --- */
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
document.querySelectorAll('[data-view]').forEach((t) => {
  t.addEventListener('click', (e) => { e.preventDefault(); show(t.dataset.view); });
});

// Lets an external link (e.g. a notification's #view-shop) land on the right
// view instead of scrolling to an inert hidden element — the browser's
// default anchor behavior otherwise does nothing useful here, since every
// .view except the active one carries the `hidden` attribute. This only
// covers link-in: internal nav clicks still call show() directly and don't
// write back to the hash, so the address bar isn't wired as two-way routing.
function showFromHash(){
  const name = location.hash.replace(/^#view-/, '').replace(/^#/, '');
  if (name && document.getElementById('view-' + name)) show(name);
}
window.addEventListener('hashchange', showFromHash);
if (location.hash) showFromHash(); else show('home');
