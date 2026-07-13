// Read-only line summary for the checkout view — same cart-line classes as
// #cartList for consistent styling, minus the qty +/- and remove controls
// (checkout reviews the cart, it doesn't edit it; go back to Cart for that).
function renderCheckout(){
  const summary = document.getElementById('checkoutSummary');
  summary.innerHTML = '';
  cart.forEach((line) => {
    const p = products.find((pp) => pp.id === line.id);
    if (!p) return;
    const row = document.createElement('div');
    row.className = 'cart-line';
    row.innerHTML = `
      <div class="cart-line-info">
        <div class="cart-line-top">
          <span>${p.name}</span>
          <span class="cart-line-price">${fmt(p.price * line.qty)}</span>
        </div>
        <span class="cart-line-size">Size ${line.size} &times; ${line.qty}</span>
      </div>`;
    summary.appendChild(row);
  });
  document.getElementById('checkoutSubtotal').textContent = fmt(cartSubtotal());
  document.getElementById('checkoutError').hidden = true;
  document.getElementById('checkoutAddressFormContainer').hidden = true;
  renderCheckoutAddresses();
}

// Selectable version of the account address list — cards toggle
// aria-pressed on click (same pattern as PDP .size-chip) instead of
// exposing Edit/Delete, since checkout only needs to pick one.
async function renderCheckoutAddresses() {
  const list = document.getElementById('checkoutAddressList');
  const placeOrderBtn = document.getElementById('placeOrderBtn');
  let addresses;
  try {
    addresses = await authFetch('/addresses').then((r) => r.json());
  } catch {
    return;
  }
  list.innerHTML = '';
  if (!addresses.some((a) => a.id === selectedAddressId)) {
    const def = addresses.find((a) => a.is_default) || addresses[0];
    selectedAddressId = def ? def.id : null;
  }
  addresses.forEach((a) => {
    const card = buildAddressCard(a);
    card.setAttribute('aria-pressed', String(a.id === selectedAddressId));
    card.addEventListener('click', () => {
      selectedAddressId = a.id;
      renderCheckoutAddresses();
    });
    list.appendChild(card);
  });
  placeOrderBtn.disabled = !selectedAddressId || cart.length === 0;
}
