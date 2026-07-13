/* --- catalog: fetched from the backend's `products` table (source of truth
   as of the NOTI/stock work) instead of a hardcoded array. `products` stays
   a plain top-level `let` so shop.js/pdp.js/cart.js/checkout.js keep reading
   it exactly as before — only *how* it gets populated changed. Starts empty
   and renderShop() is deferred until the fetch resolves; by then every other
   script below has already finished its synchronous top-level execution
   (network I/O can't land before that), so calling the shop.js-defined
   renderShop() here is always safe. --- */
let products = [];

(async () => {
  try {
    const res = await fetch(`${AUTH_API}/products`);
    if (res.ok) products = await res.json();
  } catch {
    /* offline/unreachable API — stay with an empty catalog rather than throw */
  }
  if (typeof renderShop === 'function') renderShop();
})();
