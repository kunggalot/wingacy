const fmt = (n) => `฿${n.toLocaleString('en-US')}`;
const tpl = document.getElementById('cardTpl');
const swatchImgSrc = tpl.content.querySelector('.swatch img').src;
const shopChapters = document.getElementById('shopChapters');

/* collection chapters, in display order. Each maps to a real products.category
   value so counts are always truthful (no invented "Collection N"). */
const collections = [
  { key: 'run', name: 'Run' },
  { key: 'gym', name: 'Gym' },
];

/* fade-up: reveal .fade-up nodes as they enter the viewport. Registered once,
   re-scanned after each renderShop for the freshly-built cards. Falls back to
   showing everything if IntersectionObserver is unavailable. */
const fadeObserver = ('IntersectionObserver' in window)
  ? new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting){ e.target.classList.add('is-in'); fadeObserver.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
  : null;
function observeFadeUp(){
  const nodes = document.querySelectorAll('.fade-up:not(.is-in)');
  if (!fadeObserver){ nodes.forEach((n) => n.classList.add('is-in')); return; }
  nodes.forEach((n) => fadeObserver.observe(n));
}
function isSoldOut(p){
  return p.sizes.every((s) => !s.inStock);
}

/* --- shared card builder: used by the shop grids so the sold-out badge
   and click-to-PDP wiring stay in one place. --- */
function buildCard(p){
  const node = tpl.content.cloneNode(true);
  const card = node.querySelector('.card');
  const swatch = node.querySelector('.swatch');
  // real product photo, once shot, replaces the shared logo-watermark placeholder
  if (p.photo){
    swatch.classList.add('has-photo');
    const img = swatch.querySelector('img');
    img.src = p.photo;
    // second angle swapped in on hover, see setupTilt below
    if (p.photoHover){ img._photoDefault = p.photo; img._photoHover = p.photoHover; }
  }
  node.querySelector('.name').textContent = p.name;
  node.querySelector('.price').textContent = fmt(p.price);
  node.querySelector('.sold-out-badge').hidden = !isSoldOut(p);
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${p.name}, ${fmt(p.price)}`);
  card.addEventListener('click', () => openProduct(p.id));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProduct(p.id); }
  });
  return card;
}

function renderShop(){
  shopChapters.innerHTML = '';
  let idx = 0;
  collections.forEach((col) => {
    const items = products.filter((p) => p.category === col.key);
    if (!items.length) return; // skip empty collections so counts never lie
    idx++;
    const chapter = document.createElement('div');
    chapter.className = 'collection';

    const head = document.createElement('div');
    head.className = 'collection-head fade-up';
    head.innerHTML =
      `<span class="collection-idx">${String(idx).padStart(2, '0')}</span>` +
      `<h2 class="collection-name">${col.name}</h2>` +
      `<span class="collection-count">${items.length} ${items.length === 1 ? 'piece' : 'pieces'}</span>`;

    const grid = document.createElement('div');
    grid.className = 'grid';
    items.forEach((p) => {
      const card = buildCard(p);
      card.classList.add('fade-up');
      grid.appendChild(card);
    });

    chapter.append(head, grid);
    shopChapters.appendChild(chapter);
  });
  // re-renders replace the card nodes, so freshly-created swatches need tilt
  // wiring again; undefined on the very first render (tilt module isn't
  // parsed yet — its IIFE binds that initial batch itself)
  if (typeof rebindSwatchTilt === 'function') rebindSwatchTilt();
  observeFadeUp(); // register the new chapter headers + cards for reveal
}

renderShop();
