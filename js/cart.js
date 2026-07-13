/* --- mini-cart drawer: previews the just-added line, then offers a jump to
   the full cart. Reuses the .cart-line layout (minus qty controls) so the
   preview matches how the item reads in the cart view. --- */
const miniCart = document.getElementById('miniCart');
const miniCartLine = document.getElementById('miniCartLine');

function openMiniCart(id, size){
  const p = products.find((pp) => pp.id === id);
  if (!p) return;
  const line = findLine(id, size);
  const qty = line ? line.qty : 1;
  miniCartLine.innerHTML = `
    <div class="cart-line-media${p.photo ? ' has-photo' : ''}">
      <img src="${p.photo || swatchImgSrc}" alt="" />
    </div>
    <div class="cart-line-info">
      <div class="cart-line-top">
        <span class="cart-line-name"></span>
        <span class="cart-line-price">${fmt(p.price)}</span>
      </div>
      <span class="cart-line-size">Size ${size} · Qty ${qty}</span>
    </div>`;
  // name via textContent (not the template literal) to stay consistent with
  // renderCart and avoid trusting product strings as markup
  miniCartLine.querySelector('.cart-line-name').textContent = p.name;
  miniCart.classList.add('open');
  document.getElementById('miniCartClose').focus();
}

function closeMiniCart(){ miniCart.classList.remove('open'); }

document.getElementById('miniCartClose').addEventListener('click', closeMiniCart);
document.getElementById('miniCartBackdrop').addEventListener('click', closeMiniCart);
document.getElementById('miniCartView').addEventListener('click', () => { closeMiniCart(); show('cart'); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && miniCart.classList.contains('open')) closeMiniCart();
});

/* --- cart: line items are { id, size, qty }, merged on repeat add-to-cart --- */
let cart = [];
// keys (`id|size`) present in the last render, so renderCart can fade in only
// genuinely new lines and skip the ones that merely re-rendered on a qty change
let prevCartKeys = new Set();
const cartTpl = document.getElementById('cartLineTpl');
const cartList = document.getElementById('cartList');
const cartEmpty = document.getElementById('cartEmpty');
const cartSummary = document.getElementById('cartSummary');
const cartSubtotalEl = document.getElementById('cartSubtotal');
const cartItemCount = document.getElementById('cartItemCount');
const bagCount = document.getElementById('bagCount');

function findLine(id, size){
  return cart.find((l) => l.id === id && l.size === size);
}

function addToCart(id, size, qty){
  const line = findLine(id, size);
  if (line) line.qty += qty;
  else cart.push({ id, size, qty });
  updateBagCount();
}

function changeQty(id, size, delta){
  const line = findLine(id, size);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter((l) => l !== line);
  updateBagCount();
  renderCart();
}

function removeLine(id, size){
  const commit = () => {
    cart = cart.filter((l) => !(l.id === id && l.size === size));
    updateBagCount();
    renderCart();
  };
  const el = cartList.querySelector(`.cart-line[data-key="${id}|${size}"]`);
  if (!el || prefersReducedMotion()) { commit(); return; }
  // fade the line out in place, then re-render the list under it. guard with a
  // timer in case transitionend is missed (e.g. tab backgrounded mid-fade)
  el.classList.add('cart-line-leave');
  let done = false;
  const finish = () => { if (done) return; done = true; commit(); };
  el.addEventListener('transitionend', finish, { once: true });
  setTimeout(finish, 300);
}

function cartCount(){
  return cart.reduce((sum, l) => sum + l.qty, 0);
}

function cartSubtotal(){
  return cart.reduce((sum, l) => {
    const p = products.find((pp) => pp.id === l.id);
    return sum + (p ? p.price * l.qty : 0);
  }, 0);
}

function updateBagCount(){
  const prev = +bagCount.textContent || 0;
  const next = cartCount();
  bagCount.textContent = next;
  if (next > prev && !prefersReducedMotion()){
    bagCount.classList.remove('is-bumped');
    void bagCount.offsetWidth; // force reflow so the same animation can replay
    bagCount.classList.add('is-bumped');
  }
}

function renderCart(){
  cartList.innerHTML = '';
  cartItemCount.textContent = `(${cartCount()})`;
  cartEmpty.hidden = cart.length > 0;
  cartSummary.hidden = cart.length === 0;
  const nextKeys = new Set();
  cart.forEach((line) => {
    const p = products.find((pp) => pp.id === line.id);
    if (!p) return;
    const key = line.id + '|' + line.size;
    nextKeys.add(key);
    const node = cartTpl.content.cloneNode(true);
    const el = node.querySelector('.cart-line');
    el.dataset.key = key;
    if (!prevCartKeys.has(key)) el.classList.add('cart-line-enter');
    const media = node.querySelector('.cart-line-media');
    if (p.photo) media.classList.add('has-photo');
    node.querySelector('img').src = p.photo || swatchImgSrc;
    node.querySelector('.cart-line-name').textContent = p.name;
    node.querySelector('.cart-line-price').textContent = fmt(p.price * line.qty);
    node.querySelector('.cart-line-size').textContent = `Size ${line.size}`;
    node.querySelector('.qty-value').textContent = line.qty;
    node.querySelector('.qty-minus').addEventListener('click', () => changeQty(line.id, line.size, -1));
    node.querySelector('.qty-plus').addEventListener('click', () => changeQty(line.id, line.size, 1));
    node.querySelector('.remove').addEventListener('click', () => removeLine(line.id, line.size));
    cartList.appendChild(node);
  });
  prevCartKeys = nextKeys;
  cartSubtotalEl.textContent = fmt(cartSubtotal());
}
