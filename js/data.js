/* --- catalog: read straight from the products table via PostgREST (RLS
   exposes only active rows to the public). `products` stays a plain
   top-level `let` so shop.js/pdp.js/cart.js/checkout.js keep reading it
   exactly as before — only *how* it gets populated changed. Starts empty
   and renderShop() is deferred until the fetch resolves; by then every
   other script below has already finished its synchronous top-level
   execution (network I/O can't land before that), so calling the
   shop.js-defined renderShop() here is always safe. --- */
let products = [];

(async () => {
  const { data, error } = await sb
    .from('products')
    .select('id, name, price, category, section, angle, image_count, photo, photo_hover, sizes, badge')
    .order('position')
    .order('created_at');
  if (!error && data) {
    // snake_case -> camelCase: same field mapping the old GET /products did,
    // so the rest of the storefront keeps its existing product shape
    products = data.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category,
      section: p.section,
      angle: p.angle,
      imageCount: p.image_count,
      photo: p.photo,
      photoHover: p.photo_hover,
      sizes: p.sizes,
      badge: p.badge,
    }));
  }
  /* on error: stay with an empty catalog rather than throw */
  if (typeof renderShop === 'function') renderShop();
})();
