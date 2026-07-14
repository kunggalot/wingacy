/* --- auth/data client: talks to Supabase directly (Auth JWTs + PostgREST
   guarded by RLS + plpgsql RPCs) — the standalone wingacy-auth Express
   server is retired. The anon key below is public by design: every browser
   gets it, and row access is enforced server-side by RLS policies, not by
   the key. supabase-js is vendored into js/vendor/ (not CDN-loaded) so a
   CDN outage can't leave `sb` undefined and take auth down with it. */
const SUPABASE_URL = 'https://tvcrbfkrthriuxhioyya.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2Y3JiZmtydGhyaXV4aGlveXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Nzk0ODIsImV4cCI6MjA5OTI1NTQ4Mn0._YuUSqq20kQ5hWo9FvsXIDghR31BULPLW_1s52DwSCA';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Stage 6 of the Supabase migration moves the admin dashboard into this repo;
// until then the button stays hidden for everyone but the admin anyway.
const ADMIN_DASHBOARD_URL = 'admin.html';
let currentUser = null; // { id, email, isAdmin }
let selectedAddressId = null;

// Resolves the signed-in user (or null) from the local session, then asks
// the server whether they're the admin. isAdmin is decided by the is_admin()
// Postgres function (role + admin email, both server-side) — the client
// never derives admin-ness from anything it holds locally.
async function loadCurrentUser() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { currentUser = null; return null; }
  let isAdmin = false;
  try {
    const { data } = await sb.rpc('is_admin');
    isAdmin = data === true;
  } catch { /* treat RPC failure as non-admin — fail closed */ }
  currentUser = { id: session.user.id, email: session.user.email, isAdmin };
  return currentUser;
}

function showAuthError(el, message) { el.textContent = message; el.hidden = false; }
function hideAuthError(el) { el.hidden = true; }
// Locks a form's submit button for the duration of an async submit so a
// second click can't fire a duplicate register/login request.
async function withSubmitLock(form, fn) {
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  try { return await fn(); }
  finally { if (btn) btn.disabled = false; }
}
function renderAccount() {
  document.getElementById('accountNote').hidden = true;
  document.getElementById('accountEmail').textContent = currentUser ? currentUser.email : '';
  document.getElementById('adminNavBtn').hidden = !currentUser || !currentUser.isAdmin;
  if (currentUser) {
    renderAccountAddresses();
    renderOrderHistory();
  }
}

// --- addresses: shared between the Account page and Checkout (checkout
// reuses buildAddressCard/bindAddressForm for its own "add new address"
// flow, see the checkout wiring below). ---
// Default-first so both lists lead with the address most likely to be used.
async function listAddresses() {
  const { data, error } = await sb
    .from('addresses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at');
  if (error) throw error;
  return data;
}

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
// toggle and submit/cancel, and inserts (new) or updates (`existing` given)
// the row directly — RLS scopes both to the signed-in user, and the
// addresses_single_default trigger keeps at most one default per user.
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
    // snake_case column names — rows go straight into Postgres now, the old
    // camelCase API-body mapping layer is gone with the Express server
    const row = {
      label: form.querySelector('.f-label').value || null,
      recipient_name: form.querySelector('.f-recipientName').value,
      phone: form.querySelector('.f-phone').value,
      country_code: isThai ? 'TH' : 'XX',
      line1: form.querySelector('.f-line1').value,
      line2: form.querySelector('.f-line2').value || null,
      postal_code: form.querySelector('.f-postalCode').value,
      is_default: form.querySelector('.f-isDefault').checked,
    };
    if (isThai) {
      row.subdistrict = form.querySelector('.f-subdistrict').value;
      row.district = form.querySelector('.f-district').value;
      row.province = form.querySelector('.f-province').value;
      row.city = null; row.state_region = null; row.country_name = null;
    } else {
      row.city = form.querySelector('.f-city').value;
      row.state_region = form.querySelector('.f-stateRegion').value || null;
      row.country_name = form.querySelector('.f-countryName').value;
      row.subdistrict = null; row.district = null; row.province = null;
    }
    await withSubmitLock(form, async () => {
      let saved, error;
      if (existing) {
        ({ data: saved, error } = await sb.from('addresses')
          .update(row).eq('id', existing.id).select().single());
      } else {
        // RLS insert policy requires user_id = auth.uid(), so set it explicitly
        row.user_id = currentUser.id;
        ({ data: saved, error } = await sb.from('addresses')
          .insert(row).select().single());
      }
      if (error) {
        showAuthError(errorEl, 'Could not save address.');
        return;
      }
      onSaved(saved);
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
    addresses = await listAddresses();
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
      await sb.from('addresses').delete().eq('id', a.id);
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
  // create_order re-prices every line server-side and validates stock — the
  // payload deliberately carries no prices, same contract as the old API
  const { data: order, error } = await sb.rpc('create_order', {
    p_address_id: selectedAddressId,
    p_items: cart.map((l) => ({ productId: l.id, size: l.size, quantity: l.qty })),
  });
  if (error) {
    // Cart left deliberately untouched on failure (e.g. a size sold out
    // between add-to-cart and checkout) so the user can adjust and retry
    // without re-adding everything. error.message carries the RPC's own
    // human-readable reason ("Size not in stock: …").
    showAuthError(errorEl, error.message || 'Could not place order.');
    btn.disabled = false;
    return;
  }
  cart = [];
  updateBagCount();
  show('account');
  const accountNote = document.getElementById('accountNote');
  accountNote.textContent = `Order #${order.order_number} placed.`;
  accountNote.hidden = false;
});

// --- order history ---
async function renderOrderHistory() {
  const list = document.getElementById('orderList');
  const emptyEl = document.getElementById('orderListEmpty');
  // order_items(count) piggybacks the item count on the same query — the
  // old API did this with a subquery; RLS scopes rows to the signed-in user
  const { data: orders, error } = await sb
    .from('orders')
    .select('id, order_number, status, subtotal, currency, created_at, order_items(count)')
    .order('created_at', { ascending: false });
  if (error) return;
  list.innerHTML = '';
  emptyEl.hidden = orders.length > 0;
  orders.forEach((o) => {
    const itemCount = o.order_items[0] ? o.order_items[0].count : 0;
    const row = document.createElement('div');
    row.className = 'order-row';
    row.innerHTML = `
      <div class="order-row-top">
        <span>Order #${o.order_number}</span>
        <span>${fmt(o.subtotal)}</span>
      </div>
      <div class="order-row-meta">${new Date(o.created_at).toLocaleDateString()} · ${o.status} · ${itemCount} item${itemCount === 1 ? '' : 's'}</div>
      <div class="order-row-detail" hidden></div>
    `;
    const top = row.querySelector('.order-row-top');
    const detail = row.querySelector('.order-row-detail');
    let loaded = false;
    top.addEventListener('click', async () => {
      detail.hidden = !detail.hidden;
      if (detail.hidden || loaded) return;
      const { data: full, error: detailError } = await sb
        .from('orders')
        .select('shipping_address, order_items(product_name, size, quantity, line_total, created_at)')
        .eq('id', o.id)
        .order('created_at', { referencedTable: 'order_items' })
        .single();
      if (detailError) return;
      loaded = true;
      const itemsHtml = full.order_items
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

document.getElementById('adminNavBtn').addEventListener('click', () => {
  window.location.href = ADMIN_DASHBOARD_URL;
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
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      // Supabase's own copy ("Invalid login credentials", "Email not
      // confirmed") is already generic + anti-enumeration safe
      showAuthError(errorEl, error.message || 'Log in failed.');
      return;
    }
    await loadCurrentUser();
    renderAccount();
    show('account');
  });
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('registerError');
  hideAuthError(errorEl);
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  await withSubmitLock(e.target, async () => {
    const { error } = await sb.auth.signUp({ email, password });
    if (error) {
      showAuthError(errorEl, error.message || 'Registration failed.');
      return;
    }
    // Email confirmation is on, and signUp answers identically whether the
    // email was new or already registered (anti-enumeration) — so always
    // show the same neutral next step; the UI must not branch on account
    // existence either.
    e.target.reset();
    document.getElementById('loginEmail').value = email;
    show('login');
    const note = document.getElementById('loginNote');
    note.textContent = 'Check your email to confirm your account, then log in.';
    note.hidden = false;
  });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await sb.auth.signOut();
  } catch {
    /* logout is best-effort client-side regardless of network state */
  }
  currentUser = null;
  document.getElementById('adminNavBtn').hidden = true;
  show('login');
});

// Silently restore session on load (supabase-js persists it in localStorage
// and auto-refreshes the token, so a returning visitor stays signed in).
(async () => {
  try {
    if (await loadCurrentUser()) renderAccount();
  } catch {
    /* no session / Supabase unreachable — stay logged out, no user-facing error */
  }
})();
