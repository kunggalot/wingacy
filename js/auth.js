/* --- auth: talks to the separate wingacy-auth API over cross-origin
   fetch with cookies. In prod this constant must point at a subdomain of
   the storefront's own registrable domain (e.g. api.wingacy.com from
   wingacy.com) — the backend's session cookie is sameSite:'strict', so
   the browser only attaches it on same-site requests; localhost:8000 and
   localhost:4000 are same-site today (port doesn't count), but two
   unrelated domains never are. --- */
const AUTH_API = 'http://localhost:4000';
const ADMIN_DASHBOARD_URL = AUTH_API + '/dashboard/';
let currentUser = null;
let selectedAddressId = null;

async function authFetch(path, options = {}) {
  return fetch(AUTH_API + path, {
    ...options,
    credentials: 'include',
    // The API sets no Cache-Control headers, so the browser's HTTP cache
    // can serve a stale GET (e.g. /orders right after placing a new one)
    // instead of hitting the network — force every call to bypass it.
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
}

function showAuthError(el, message) { el.textContent = message; el.hidden = false; }
function hideAuthError(el) { el.hidden = true; }
// Locks a form's submit button for the duration of an async submit so a
// second click can't fire a duplicate register/login POST (which the argon2
// hash makes slow enough to double-tap easily).
async function withSubmitLock(form, fn) {
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  try { return await fn(); }
  finally { if (btn) btn.disabled = false; }
}
function renderAccount() {
  document.getElementById('accountNote').hidden = true;
  document.getElementById('accountEmail').textContent = currentUser ? currentUser.email : '';
  document.getElementById('adminNavBtn').hidden = !currentUser || currentUser.role !== 'admin';
  if (currentUser) {
    renderAccountAddresses();
    renderOrderHistory();
  }
}

// --- addresses: shared between the Account page and Checkout (checkout
// reuses buildAddressCard/bindAddressForm for its own "add new address"
// flow, see the checkout wiring below). ---
function addressSummaryLine(a) {
  const parts = [a.line1];
  if (a.line2) parts.push(a.line2);
  if (a.country_code === 'TH') {
    parts.push(`${a.subdistrict} ${a.district} ${a.province} ${a.postal_code}`);
  } else {
    const region = a.state_region ? `${a.state_region}, ` : '';
    parts.push(`${a.city}, ${region}${a.country_name} ${a.postal_code}`);
  }
  return parts.join(', ');
}

function buildAddressCard(a) {
  const card = document.createElement('div');
  card.className = 'address-card';
  card.dataset.id = a.id;
  card.innerHTML = `
    <div class="address-card-top">
      <span>${a.label ? a.label + ' — ' : ''}${a.recipient_name}</span>
      ${a.is_default ? '<span class="address-card-default">Default</span>' : ''}
    </div>
    <div class="address-card-body">${a.phone}<br>${addressSummaryLine(a)}</div>
  `;
  return card;
}

// Clones #addressFormTpl into `container`, wires the Thailand/International
// toggle and submit/cancel, and POSTs (new) or PATCHes (`existing` given).
// `onSaved(address)` runs after a successful save so callers (Account list,
// Checkout) can each decide how to refresh themselves.
function bindAddressForm(container, existing, { onSaved, onCancel }) {
  container.innerHTML = '';
  const node = document.getElementById('addressFormTpl').content.cloneNode(true);
  const form = node.querySelector('.address-form');
  const thBtn = form.querySelector('.f-country-th');
  const intlBtn = form.querySelector('.f-country-intl');
  const thFields = form.querySelector('.address-fields-th');
  const intlFields = form.querySelector('.address-fields-intl');
  const errorEl = form.querySelector('.auth-error');

  function setCountry(isThai) {
    thBtn.setAttribute('aria-pressed', String(isThai));
    intlBtn.setAttribute('aria-pressed', String(!isThai));
    thFields.hidden = !isThai;
    intlFields.hidden = isThai;
  }
  thBtn.addEventListener('click', () => setCountry(true));
  intlBtn.addEventListener('click', () => setCountry(false));

  if (existing) {
    form.querySelector('.f-label').value = existing.label || '';
    form.querySelector('.f-recipientName').value = existing.recipient_name;
    form.querySelector('.f-phone').value = existing.phone;
    form.querySelector('.f-subdistrict').value = existing.subdistrict || '';
    form.querySelector('.f-district').value = existing.district || '';
    form.querySelector('.f-province').value = existing.province || '';
    form.querySelector('.f-city').value = existing.city || '';
    form.querySelector('.f-stateRegion').value = existing.state_region || '';
    form.querySelector('.f-countryName').value = existing.country_name || '';
    form.querySelector('.f-line1').value = existing.line1;
    form.querySelector('.f-line2').value = existing.line2 || '';
    form.querySelector('.f-postalCode').value = existing.postal_code;
    form.querySelector('.f-isDefault').checked = existing.is_default;
    setCountry(existing.country_code === 'TH');
  }

  form.querySelector('.f-cancel').addEventListener('click', () => onCancel());
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError(errorEl);
    const isThai = thBtn.getAttribute('aria-pressed') === 'true';
    const body = {
      label: form.querySelector('.f-label').value || undefined,
      recipientName: form.querySelector('.f-recipientName').value,
      phone: form.querySelector('.f-phone').value,
      countryCode: isThai ? 'TH' : 'XX',
      line1: form.querySelector('.f-line1').value,
      line2: form.querySelector('.f-line2').value || undefined,
      postalCode: form.querySelector('.f-postalCode').value,
      isDefault: form.querySelector('.f-isDefault').checked,
    };
    if (isThai) {
      body.subdistrict = form.querySelector('.f-subdistrict').value;
      body.district = form.querySelector('.f-district').value;
      body.province = form.querySelector('.f-province').value;
    } else {
      body.city = form.querySelector('.f-city').value;
      body.stateRegion = form.querySelector('.f-stateRegion').value || undefined;
      body.countryName = form.querySelector('.f-countryName').value;
    }
    await withSubmitLock(form, async () => {
      try {
        const path = existing ? `/addresses/${existing.id}` : '/addresses';
        const method = existing ? 'PATCH' : 'POST';
        const res = await authFetch(path, { method, body: JSON.stringify(body) });
        if (!res.ok) {
          const resBody = await res.json().catch(() => ({}));
          showAuthError(errorEl, resBody.error || 'Could not save address.');
          return;
        }
        onSaved(await res.json());
      } catch {
        showAuthError(errorEl, 'Could not reach the server. Check your connection and try again.');
      }
    });
  });

  container.appendChild(node);
  container.hidden = false;
}

async function renderAccountAddresses() {
  const list = document.getElementById('accountAddressList');
  const formContainer = document.getElementById('accountAddressFormContainer');
  let addresses;
  try {
    addresses = await authFetch('/addresses').then((r) => r.json());
  } catch {
    return;
  }
  list.innerHTML = '';
  addresses.forEach((a) => {
    const card = buildAddressCard(a);
    const actions = document.createElement('div');
    actions.className = 'address-card-actions';
    actions.innerHTML = `
      <button class="hoverable" type="button"><span>Edit</span></button>
      <button class="hoverable" type="button"><span>Delete</span></button>
    `;
    const [editBtn, deleteBtn] = actions.querySelectorAll('button');
    editBtn.addEventListener('click', () => {
      bindAddressForm(formContainer, a, {
        onSaved: () => { formContainer.hidden = true; renderAccountAddresses(); },
        onCancel: () => { formContainer.hidden = true; },
      });
    });
    deleteBtn.addEventListener('click', async () => {
      await authFetch(`/addresses/${a.id}`, { method: 'DELETE' });
      renderAccountAddresses();
    });
    card.appendChild(actions);
    list.appendChild(card);
  });
}

document.getElementById('addAddressBtn').addEventListener('click', () => {
  const formContainer = document.getElementById('accountAddressFormContainer');
  bindAddressForm(formContainer, null, {
    onSaved: () => { formContainer.hidden = true; renderAccountAddresses(); },
    onCancel: () => { formContainer.hidden = true; },
  });
});

document.getElementById('checkoutAddAddressBtn').addEventListener('click', () => {
  const formContainer = document.getElementById('checkoutAddressFormContainer');
  bindAddressForm(formContainer, null, {
    onSaved: (created) => {
      formContainer.hidden = true;
      selectedAddressId = created.id;
      renderCheckoutAddresses();
    },
    onCancel: () => { formContainer.hidden = true; },
  });
});

document.getElementById('placeOrderBtn').addEventListener('click', async () => {
  const btn = document.getElementById('placeOrderBtn');
  const errorEl = document.getElementById('checkoutError');
  hideAuthError(errorEl);
  if (!selectedAddressId || cart.length === 0) return;
  btn.disabled = true;
  try {
    const res = await authFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({
        addressId: selectedAddressId,
        items: cart.map((l) => ({ productId: l.id, size: l.size, quantity: l.qty })),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // Left deliberately untouched on failure (e.g. a size sold out
      // between add-to-cart and checkout) so the user can adjust and retry
      // without re-adding everything.
      showAuthError(errorEl, body.error || 'Could not place order.');
      btn.disabled = false;
      return;
    }
    const order = await res.json();
    cart = [];
    updateBagCount();
    show('account');
    const accountNote = document.getElementById('accountNote');
    accountNote.textContent = `Order #${order.order_number} placed.`;
    accountNote.hidden = false;
  } catch {
    showAuthError(errorEl, 'Could not reach the server. Check your connection and try again.');
    btn.disabled = false;
  }
});

// --- order history ---
async function renderOrderHistory() {
  const list = document.getElementById('orderList');
  const emptyEl = document.getElementById('orderListEmpty');
  let orders;
  try {
    orders = await authFetch('/orders').then((r) => r.json());
  } catch {
    return;
  }
  list.innerHTML = '';
  emptyEl.hidden = orders.length > 0;
  orders.forEach((o) => {
    const row = document.createElement('div');
    row.className = 'order-row';
    row.innerHTML = `
      <div class="order-row-top">
        <span>Order #${o.order_number}</span>
        <span>${fmt(o.subtotal)}</span>
      </div>
      <div class="order-row-meta">${new Date(o.created_at).toLocaleDateString()} · ${o.status} · ${o.item_count} item${o.item_count === 1 ? '' : 's'}</div>
      <div class="order-row-detail" hidden></div>
    `;
    const top = row.querySelector('.order-row-top');
    const detail = row.querySelector('.order-row-detail');
    let loaded = false;
    top.addEventListener('click', async () => {
      detail.hidden = !detail.hidden;
      if (detail.hidden || loaded) return;
      const full = await authFetch(`/orders/${o.id}`).then((r) => r.json());
      loaded = true;
      const itemsHtml = full.items
        .map((it) => `<div class="cart-line-size">${it.product_name} — Size ${it.size} &times; ${it.quantity} — ${fmt(it.line_total)}</div>`)
        .join('');
      detail.innerHTML = `${itemsHtml}<p class="address-card-body">${addressSummaryLine(full.shipping_address)}</p>`;
    });
    list.appendChild(row);
  });
}

document.getElementById('accountBtn').addEventListener('click', (e) => {
  e.preventDefault();
  show(currentUser ? 'account' : 'login');
});

// Admin dashboard lives on the backend (wingacy-auth), not this storefront —
// opens in a new tab so browsing state here isn't lost. Same-origin as the
// login POST, so the session cookie already covers it, no re-login needed.
document.getElementById('adminNavBtn').addEventListener('click', () => {
  window.open(ADMIN_DASHBOARD_URL, '_blank', 'noopener');
});

document.getElementById('checkoutBtn').addEventListener('click', () => {
  if (!currentUser) {
    const note = document.getElementById('loginNote');
    note.textContent = 'Log in to check out.';
    note.hidden = false;
    show('login');
    return;
  }
  show('checkout');
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('loginError');
  hideAuthError(errorEl);
  document.getElementById('loginNote').hidden = true;
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  await withSubmitLock(e.target, async () => {
    try {
      const res = await authFetch('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showAuthError(errorEl, body.error || 'Log in failed.');
        return;
      }
      currentUser = await res.json();
      renderAccount();
      show('account');
    } catch {
      showAuthError(errorEl, 'Could not reach the server. Check your connection and try again.');
    }
  });
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('registerError');
  hideAuthError(errorEl);
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  await withSubmitLock(e.target, async () => {
    try {
      const res = await authFetch('/register', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showAuthError(errorEl, body.error || 'Registration failed.');
        return;
      }
      // Register no longer auto-logs-in and the server replies identically
      // whether the email was new or already taken (anti-enumeration), so we
      // always send the user to log in with the same neutral confirmation —
      // the UI must not branch on account existence either.
      e.target.reset();
      document.getElementById('loginEmail').value = email;
      show('login');
      const note = document.getElementById('loginNote');
      note.textContent = 'You can now log in.';
      note.hidden = false;
    } catch {
      showAuthError(errorEl, 'Could not reach the server. Check your connection and try again.');
    }
  });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await authFetch('/logout', { method: 'POST' }); // 204 No Content — no body to parse
  } catch {
    /* logout is best-effort client-side regardless of network state */
  }
  currentUser = null;
  document.getElementById('adminNavBtn').hidden = true;
  show('login');
});

// Silently restore session on load (e.g. returning visitor with a live cookie).
(async () => {
  try {
    const res = await authFetch('/me');
    if (res.ok) {
      currentUser = await res.json();
      renderAccount();
    }
  } catch {
    /* no session / API unreachable — stay logged out, no user-facing error */
  }
})();
