let currentProduct = null;
let selectedSize = null;
const pdpGallery = document.getElementById('pdpGallery');
const pdpDots = document.getElementById('pdpDots');
let galleryIndex = 0;

function showGalleryImage(i){
  const items = [...pdpGallery.children];
  galleryIndex = (i + items.length) % items.length;
  items.forEach((item, idx) => item.classList.toggle('is-active', idx === galleryIndex));
  [...pdpDots.children].forEach((dot, idx) => dot.setAttribute('aria-current', String(idx === galleryIndex)));
}

/* --- drag/swipe (mouse on desktop, touch on mobile — Pointer Events cover both)
   plus trackpad/wheel, so the gallery is browsable without the removed arrow buttons --- */
const SWIPE_THRESHOLD = 40;
let dragStartX = null;
pdpGallery.addEventListener('pointerdown', (e) => { dragStartX = e.clientX; });
pdpGallery.addEventListener('pointerup', (e) => {
  if (dragStartX === null) return;
  const delta = e.clientX - dragStartX;
  dragStartX = null;
  if (Math.abs(delta) < SWIPE_THRESHOLD) return;
  showGalleryImage(galleryIndex + (delta < 0 ? 1 : -1));
});
pdpGallery.addEventListener('pointercancel', () => { dragStartX = null; });

let wheelCooldown = false;
pdpGallery.addEventListener('wheel', (e) => {
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (Math.abs(delta) < 15 || wheelCooldown) return;
  e.preventDefault();
  wheelCooldown = true;
  showGalleryImage(galleryIndex + (delta > 0 ? 1 : -1));
  setTimeout(() => { wheelCooldown = false; }, 350);
}, { passive: false });

const pdpName = document.getElementById('pdpName');
const pdpPrice = document.getElementById('pdpPrice');
const pdpSizes = document.getElementById('pdpSizes');
const pdpError = document.getElementById('pdpError');
const pdpAdd = document.getElementById('pdpAdd');

function openProduct(id){
  currentProduct = products.find((p) => p.id === id);
  if (!currentProduct) return;
  selectedSize = null;
  pdpGallery.innerHTML = '';
  pdpDots.innerHTML = '';
  for (let i = 0; i < currentProduct.imageCount; i++) {
    const item = document.createElement('div');
    item.className = 'pdp-gallery-item';
    item.classList.toggle('is-active', i === 0);
    // Real photography only covers slots 0/1 (photo/photoHover) so far;
    // remaining slots fall back to the shared logo-watermark placeholder
    // until more angles are shot, same as the shop card treatment.
    const src = i === 0 && currentProduct.photo ? currentProduct.photo
      : i === 1 && currentProduct.photoHover ? currentProduct.photoHover
      : swatchImgSrc;
    if (src !== swatchImgSrc) item.classList.add('has-photo');
    item.innerHTML = `<img src="${src}" alt="" />`;
    pdpGallery.appendChild(item);

    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'pdp-dot';
    dot.setAttribute('aria-label', `Image ${i + 1}`);
    dot.setAttribute('aria-current', String(i === 0));
    dot.addEventListener('click', () => showGalleryImage(i));
    pdpDots.appendChild(dot);
  }
  galleryIndex = 0;
  pdpName.textContent = currentProduct.name;
  pdpPrice.textContent = fmt(currentProduct.price);
  pdpError.hidden = true;

  pdpSizes.innerHTML = '';
  // a single size (e.g. "One Size") isn't really a choice — pre-select it so
  // it doesn't block Add to Cart on a click that has nothing to decide
  const onlySize = currentProduct.sizes.length === 1 && currentProduct.sizes[0].inStock
    ? currentProduct.sizes[0].size : null;
  if (onlySize) selectedSize = onlySize;
  currentProduct.sizes.forEach(({ size, inStock }) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'hoverable size-chip';
    chip.setAttribute('aria-pressed', String(size === onlySize));
    chip.disabled = !inStock;
    chip.innerHTML = `<span>${size}</span>`;
    chip.addEventListener('click', () => {
      selectedSize = size;
      pdpError.hidden = true;
      [...pdpSizes.children].forEach((c) => c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'));
    });
    pdpSizes.appendChild(chip);
  });

  show('product');
}

pdpAdd.addEventListener('click', () => {
  if (!selectedSize) {
    pdpError.textContent = 'Please select a size';
    pdpError.hidden = false;
    return;
  }
  addToCart(currentProduct.id, selectedSize, 1);
  openMiniCart(currentProduct.id, selectedSize);
  // crossfade the label out, swap the text at zero opacity, fade it back in
  const span = pdpAdd.querySelector('span');
  const setLabel = (text) => {
    if (prefersReducedMotion()) { span.textContent = text; return; }
    span.style.opacity = '0';
    setTimeout(() => { span.textContent = text; span.style.opacity = '1'; }, 120);
  };
  setLabel('Added');
  setTimeout(() => setLabel('Add to Cart'), 900);
});
