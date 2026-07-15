const BASE = 'http://localhost:8070';

/* ── STATE ─────────────────────────────────────────── */
let currentRole  = null;
let currentUser  = null;
let currentToken = null;
let selectedRole = null;
let cart         = [];
let allProducts  = [];

/* ── SESSION PERSISTENCE ────────────────────────────── */
function saveSession() {
  localStorage.setItem('se_role',  currentRole  || '');
  localStorage.setItem('se_user',  currentUser  ? JSON.stringify(currentUser) : '');
  localStorage.setItem('se_cart',  JSON.stringify(cart));
  localStorage.setItem('se_token', currentToken || '');
}

function clearSession() {
  ['se_role','se_user','se_cart','se_token'].forEach(k => localStorage.removeItem(k));
}

function restoreSession() {
  const role    = localStorage.getItem('se_role');
  const userRaw = localStorage.getItem('se_user');
  const cartRaw = localStorage.getItem('se_cart');
  const token   = localStorage.getItem('se_token');
  if (!role) return;
  try { if (cartRaw) cart = JSON.parse(cartRaw); } catch {}
  if (token) currentToken = token;
  if (role === 'owner') {
    currentRole = 'owner';
    launchAdmin();
  } else if (role === 'customer' && userRaw) {
    try {
      currentUser = JSON.parse(userRaw);
      currentRole = 'customer';
      launchCustomer();
    } catch {}
  }
}

/* ── PRODUCT EMOJIS ────────────────────────────────── */
const EMOJIS = ['📱','💻','🎧','⌚','📷','🎮','🖥️','⌨️','🖱️','📺','🔋','💡','🎒','👟','👗','📚','🎵','🍕','☕','🌿'];
function productEmoji(id) { return EMOJIS[(id - 1) % EMOJIS.length]; }

/* ── TOAST ─────────────────────────────────────────── */
function toast(msg, type = 'i') {
  const icons = { s:'fa-circle-check', e:'fa-circle-xmark', i:'fa-circle-info' };
  const box = document.getElementById('toastBox');
  const el  = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="ti fa-solid ${icons[type]}"></i><span class="toast-txt">${msg}</span><i class="toast-x fa-solid fa-xmark" onclick="rmToast(this.parentElement)"></i>`;
  box.appendChild(el);
  setTimeout(() => rmToast(el), 4000);
}
function rmToast(el) { if (!el || !el.parentElement) return; el.classList.add('out'); setTimeout(() => el.remove(), 230); }

/* ── HELPERS ───────────────────────────────────────── */
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function skRows(cols, rows) {
  const c = Array(cols).fill(`<td><div class="sk" style="height:14px;width:75%">&nbsp;</div></td>`).join('');
  return Array(rows).fill(`<tr>${c}</tr>`).join('');
}
function emptyRow(cols, icon, msg) {
  return `<tr><td colspan="${cols}"><div class="empty-row"><i class="fa-solid ${icon}"></i>${msg}</div></td></tr>`;
}
function setLoading(id, on) {
  const b = document.getElementById(id); if (!b) return;
  b.disabled = on;
  if (on) { b._h = b.innerHTML; b.innerHTML = `<span class="spinner"></span> Processing…`; }
  else    { b.innerHTML = b._h || b.innerHTML; }
}
function filterTbl(id, q) {
  const t = document.getElementById(id); if (!t) return;
  Array.from(t.rows).forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

/* ── ROLE SELECTION ────────────────────────────────── */
function selectRole(role) {
  selectedRole = role;
  document.getElementById('rc-customer').classList.toggle('selected', role === 'customer');
  document.getElementById('rc-owner').classList.toggle('selected', role === 'owner');

  const tabs      = document.getElementById('authTabs');
  const divider   = document.getElementById('authDividerText');
  const ownerHint = document.getElementById('ownerHint');

  if (role === 'customer') {
    tabs.style.display      = 'flex';
    ownerHint.style.display = 'none';
    divider.textContent     = '';
    switchAuthTab('signin');
  } else {
    tabs.style.display      = 'none';
    ownerHint.style.display = 'block';
    divider.textContent     = 'sign in as owner';
    document.getElementById('panel-signin').classList.add('active');
    document.getElementById('panel-register').classList.remove('active');
  }
}

function switchAuthTab(tab) {
  ['signin','register'].forEach(t => {
    document.getElementById('tab-'   + t).classList.toggle('active', t === tab);
    document.getElementById('panel-' + t).classList.toggle('active', t === tab);
  });
  document.getElementById('loginErr').style.display = 'none';
  document.getElementById('regErr').style.display   = 'none';
  document.getElementById('regOk').style.display    = 'none';
}

/* ── LOGIN ─────────────────────────────────────────── */
function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const err   = document.getElementById('loginErr');
  err.style.display = 'none';

  if (!selectedRole) { toast('Please select a role first.', 'e'); return; }

  if (selectedRole === 'owner') {
    setLoading('btnSignIn', true);
    fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    })
      .then(r => {
        if (!r.ok) throw new Error('Invalid credentials');
        return r.json();
      })
      .then(data => {
        if (data.role !== 'ADMIN') { throw new Error('Not an admin account'); }
        currentToken = data.token;
        currentUser  = { name: data.name, email: data.email, role: data.role };
        currentRole  = 'owner';
        saveSession();
        launchAdmin();
      })
      .catch(e => {
        err.textContent  = e.message === 'Not an admin account'
          ? 'This account does not have admin access.'
          : 'Invalid owner credentials.';
        err.style.display = 'block';
      })
      .finally(() => setLoading('btnSignIn', false));
    return;
  }

  if (!email) { err.textContent = 'Please enter your email.';    err.style.display = 'block'; return; }
  if (!pass)  { err.textContent = 'Please enter your password.'; err.style.display = 'block'; return; }

  setLoading('btnSignIn', true);
  fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass })
  })
    .then(r => {
      if (!r.ok) return r.json().then(e => { throw new Error(e.message || 'Invalid credentials'); });
      return r.json();
    })
    .then(data => {
      currentToken = data.token;
      currentUser  = { id: data.id, name: data.name, email: data.email, role: data.role };
      currentRole  = 'customer';
      saveSession();
      launchCustomer();
    })
    .catch(e => {
      err.textContent  = e.message || 'Invalid credentials. Please try again.';
      err.style.display = 'block';
    })
    .finally(() => setLoading('btnSignIn', false));
}

/* ── REGISTER ──────────────────────────────────────── */
function doRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  const err   = document.getElementById('regErr');
  const ok    = document.getElementById('regOk');
  err.style.display = 'none';
  ok.style.display  = 'none';

  if (!name)           { err.textContent = 'Full name is required.';              err.style.display = 'block'; return; }
  if (!email)          { err.textContent = 'Email is required.';                  err.style.display = 'block'; return; }
  if (!pass)           { err.textContent = 'Password is required.';               err.style.display = 'block'; return; }
  if (pass !== pass2)  { err.textContent = 'Passwords do not match.';             err.style.display = 'block'; return; }
  if (pass.length < 6) { err.textContent = 'Password must be at least 6 characters.'; err.style.display = 'block'; return; }

  setLoading('btnRegister', true);
  fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password: pass })
  })
    .then(r => {
      if (!r.ok) return r.json().then(e => { throw new Error(e.message || 'Registration failed'); });
      return r.json();
    })
    .then(u => {
      ok.textContent  = `Account created! Welcome, ${u.name}. You can now sign in.`;
      ok.style.display = 'block';
      document.getElementById('regName').value  = '';
      document.getElementById('regEmail').value = '';
      document.getElementById('regPass').value  = '';
      document.getElementById('regPass2').value = '';
      document.getElementById('loginEmail').value = email;
      setTimeout(() => switchAuthTab('signin'), 1800);
    })
    .catch(e => {
      err.textContent  = e.message || 'Registration failed. Is the backend running?';
      err.style.display = 'block';
    })
    .finally(() => setLoading('btnRegister', false));
}

/* ── LAUNCH CUSTOMER ─────────────────────────────────── */
function launchCustomer() {
  document.getElementById('loginScreen').style.display   = 'none';
  document.getElementById('customerShell').style.display = 'block';
  document.getElementById('adminShell').style.display    = 'none';
  document.getElementById('custNamePill').textContent    = currentUser.name;
  document.getElementById('custAvatarPill').textContent  = currentUser.name.charAt(0).toUpperCase();
  loadShopProducts();
}

/* ── LAUNCH ADMIN ─────────────────────────────────────── */
function launchAdmin() {
  document.getElementById('loginScreen').style.display   = 'none';
  document.getElementById('customerShell').style.display = 'none';
  document.getElementById('adminShell').style.display    = 'block';
  const name = currentUser ? currentUser.name : 'Admin';
  document.querySelector('.as-uname').textContent = name;
  document.querySelector('.as-avatar').textContent = name.charAt(0).toUpperCase();
  adminRefreshAll();
}

/* ── LOGOUT ─────────────────────────────────────────── */
function logout() {
  currentRole = null; currentUser = null; currentToken = null; cart = []; allProducts = [];
  clearSession();
  document.getElementById('loginScreen').style.display    = 'flex';
  document.getElementById('customerShell').style.display  = 'none';
  document.getElementById('adminShell').style.display     = 'none';
  document.getElementById('loginEmail').value             = '';
  document.getElementById('loginPass').value              = '';
  document.getElementById('loginErr').style.display       = 'none';
  document.getElementById('authTabs').style.display       = 'none';
  document.getElementById('ownerHint').style.display      = 'none';
  document.getElementById('authDividerText').textContent  = 'sign in to your account';
  selectedRole = null;
  document.getElementById('rc-customer').classList.remove('selected');
  document.getElementById('rc-owner').classList.remove('selected');
  switchAuthTab('signin');
  updateCartUI();
}

/* ═══════════════════════════════════════════
   CUSTOMER SIDE
═══════════════════════════════════════════ */

function custNav(page) {
  ['shop','orders'].forEach(p => {
    document.getElementById('cust-' + p).classList.toggle('active', p === page);
    document.getElementById('cnav-' + p).classList.toggle('active', p === page);
  });
  document.getElementById('heroSection').style.display = page === 'shop' ? 'block' : 'none';
  if (page === 'orders') loadMyOrders();
}

async function loadShopProducts() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = Array(6).fill(`<div class="product-card"><div class="product-img"><div class="sk" style="width:70px;height:70px;border-radius:50%"></div></div><div class="product-body"><div class="sk" style="height:14px;width:80%;margin-bottom:10px"></div><div class="sk" style="height:18px;width:50%"></div></div></div>`).join('');
  try {
    const data = await fetch(`${BASE}/products/get`).then(r => r.json());
    allProducts = data;
    renderProductGrid(data);
  } catch {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--txt3)"><i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;display:block;margin-bottom:12px"></i>Cannot load products. Is the server running?</div>`;
  }
}

function renderProductGrid(products) {
  const grid = document.getElementById('productGrid');
  if (!products.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--txt3)"><i class="fa-solid fa-box-open" style="font-size:2.5rem;display:block;margin-bottom:12px;color:#cbd5e1"></i><strong>No products available yet.</strong><br/><span style="font-size:.82rem">Check back soon!</span></div>`;
    return;
  }
  grid.innerHTML = products.map(p => {
    const imgHtml = p.imageUrl
      ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover"/>`
      : productEmoji(p.id);
    const stockBadge = p.stock != null
      ? (p.stock > 0
          ? `<span style="font-size:.72rem;color:var(--success);font-weight:600"><i class="fa-solid fa-circle-check"></i> ${p.stock} in stock</span>`
          : `<span style="font-size:.72rem;color:var(--danger);font-weight:600"><i class="fa-solid fa-circle-xmark"></i> Out of stock</span>`)
      : '';
    const desc = p.description ? `<div style="font-size:.78rem;color:var(--txt2);margin-bottom:8px;line-height:1.4">${esc(p.description)}</div>` : '';
    const outOfStock = p.stock != null && p.stock <= 0;
    return `
    <div class="product-card">
      <div class="product-img" style="font-size:${p.imageUrl?'0':'3.5rem'}">${imgHtml}</div>
      <div class="product-body">
        <div class="product-name">${esc(p.name)}</div>
        ${desc}
        <div class="product-price">$${p.price.toFixed(2)}</div>
        <div style="margin:4px 0 10px">${stockBadge}</div>
        <button class="btn-add-cart" id="add-btn-${p.id}" onclick="addToCart(${p.id})" ${outOfStock ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
          <i class="fa-solid fa-cart-plus"></i> ${outOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>`;
  }).join('');
}

function filterProducts(q) {
  renderProductGrid(allProducts.filter(p => p.name.toLowerCase().includes(q.toLowerCase())));
}

/* ── CART ──────────────────────────────────────────── */
function addToCart(productId) {
  const product  = allProducts.find(p => p.id === productId);
  if (!product) return;
  const existing = cart.find(i => i.product.id === productId);
  if (existing) existing.qty++;
  else cart.push({ product, qty: 1 });

  const btn = document.getElementById('add-btn-' + productId);
  if (btn) {
    btn.classList.add('added');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Added!';
    setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Add to Cart'; }, 1200);
  }
  updateCartUI();
  toast(`"${product.name}" added to cart.`, 's');
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.product.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.product.id !== productId);
  updateCartUI();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.product.id !== productId);
  updateCartUI();
}

function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const cc    = document.getElementById('cartCount');
  if (cc) { cc.textContent = count; cc.style.display = count > 0 ? 'flex' : 'none'; }
  const tot = document.getElementById('cartTotal');
  if (tot) tot.textContent = '$' + total.toFixed(2);
  const btn = document.getElementById('btnCheckout');
  if (btn) btn.disabled = cart.length === 0;
  saveSession();
  renderCartItems();
}

function renderCartItems() {
  const el = document.getElementById('cartItems');
  if (!el) return;
  if (!cart.length) { el.innerHTML = '<div class="cart-empty"><i class="fa-solid fa-cart-shopping"></i>Your cart is empty</div>'; return; }
  el.innerHTML = cart.map(i => `
    <div class="cart-item">
      <div class="ci-icon">${productEmoji(i.product.id)}</div>
      <div class="ci-info">
        <div class="ci-name">${esc(i.product.name)}</div>
        <div class="ci-price">$${(i.product.price * i.qty).toFixed(2)}</div>
        <div class="ci-qty">
          <button class="qty-btn" onclick="changeQty(${i.product.id},-1)"><i class="fa-solid fa-minus"></i></button>
          <span class="qty-val">${i.qty}</span>
          <button class="qty-btn" onclick="changeQty(${i.product.id},1)"><i class="fa-solid fa-plus"></i></button>
        </div>
      </div>
      <button class="ci-remove" onclick="removeFromCart(${i.product.id})"><i class="fa-solid fa-trash"></i></button>
    </div>`).join('');
}

function toggleCart() {
  document.getElementById('cartOverlay').classList.toggle('open');
  document.getElementById('cartPanel').classList.toggle('open');
}

/* ── CHECKOUT ──────────────────────────────────────── */
function openCheckout() {
  if (!cart.length) return;
  const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const rows  = cart.map(i => `<div class="modal-row"><span>${esc(i.product.name)} × ${i.qty}</span><span>$${(i.product.price * i.qty).toFixed(2)}</span></div>`).join('');
  document.getElementById('checkoutSummary').innerHTML =
    rows + `<div class="modal-row total"><span>Total</span><span>$${total.toFixed(2)}</span></div>`;
  document.getElementById('checkoutModal').classList.add('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.getElementById('cartPanel').classList.remove('open');
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('open');
}

async function confirmOrder() {
  setLoading('btnConfirmOrder', true);
  try {
    for (const item of cart) {
      for (let q = 0; q < item.qty; q++) {
        await fetch(`${BASE}/orders/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, productId: item.product.id })
        });
      }
    }
    cart = [];
    updateCartUI();
    closeCheckout();
    document.getElementById('successMsg').textContent = `Thank you, ${currentUser.name}! Your order has been placed and is being processed.`;
    document.getElementById('successModal').classList.add('open');
  } catch {
    toast('Order failed. Please try again.', 'e');
  } finally {
    setLoading('btnConfirmOrder', false);
  }
}

function closeSuccess() {
  document.getElementById('successModal').classList.remove('open');
  custNav('orders');
}

/* ── MY ORDERS ─────────────────────────────────────── */
async function loadMyOrders() {
  const el = document.getElementById('myOrdersList');
  el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--txt3)"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem"></i></div>`;
  try {
    const orders = await fetch(`${BASE}/orders/get`).then(r => r.json());
    const mine   = orders.filter(o => o.userId === currentUser.id);
    if (!mine.length) {
      el.innerHTML = `<div style="text-align:center;padding:48px;color:var(--txt3)"><i class="fa-solid fa-receipt" style="font-size:2.5rem;display:block;margin-bottom:12px;color:#cbd5e1"></i><strong>No orders yet</strong><br/><span style="font-size:.82rem">Go shop something!</span></div>`;
      return;
    }
    el.innerHTML = mine.map(o => `
      <div class="order-card">
        <div class="oc-left">
          <div class="oc-icon"><i class="fa-solid fa-receipt"></i></div>
          <div>
            <div class="oc-id">Order #${o.id}</div>
            <div class="oc-sub">Product ID: ${o.productId} &nbsp;·&nbsp; User ID: ${o.userId}</div>
          </div>
        </div>
        <span class="status-badge sb-placed"><i class="fa-solid fa-circle-check"></i> Placed</span>
      </div>`).join('');
  } catch {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--txt3)">Could not load orders.</div>`;
  }
}

/* ═══════════════════════════════════════════
   ADMIN SIDE
═══════════════════════════════════════════ */

function adminNav(page, el) {
  document.querySelectorAll('.as-nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('adm-' + page).classList.add('active');
  const titles = { dashboard:'Dashboard', products:'Products', users:'Customers', orders:'Orders' };
  document.getElementById('atp-title').textContent = titles[page] || page;
  document.getElementById('atp-bread').textContent = 'Home / ' + (titles[page] || page);
  if (page === 'products') adminLoadProducts();
  if (page === 'users')    adminLoadUsers();
  if (page === 'orders')   adminLoadOrders();
}

async function adminRefreshAll() {
  await Promise.all([adminLoadProducts(), adminLoadUsers(), adminLoadOrders()]);
  toast('Data refreshed.', 'i');
}

function clearProductForm() {
  ['ap-name','ap-price','ap-stock','ap-image','ap-desc'].forEach(id => document.getElementById(id).value = '');
}

/* ── ADMIN PRODUCTS ─────────────────────────────────── */
async function adminAddProduct() {
  const name  = document.getElementById('ap-name').value.trim();
  const price = parseFloat(document.getElementById('ap-price').value);
  const stock = parseInt(document.getElementById('ap-stock').value) || 0;
  const imageUrl = document.getElementById('ap-image').value.trim();
  const description = document.getElementById('ap-desc').value.trim();
  if (!name || isNaN(price) || price < 0) { toast('Please fill in valid name and price.', 'e'); return; }
  setLoading('btn-add-product', true);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (currentToken) headers['Authorization'] = 'Bearer ' + currentToken;
    const data = await fetch(`${BASE}/products/post`, {
      method: 'POST', headers,
      body: JSON.stringify({ name, price, stock, imageUrl, description })
    }).then(r => r.json());
    toast(`Product "${data.name}" added! ID: ${data.id}`, 's');
    clearProductForm();
    adminLoadProducts();
  } catch { toast('Failed to add product.', 'e'); }
  finally  { setLoading('btn-add-product', false); }
}

async function adminDeleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    const headers = {};
    if (currentToken) headers['Authorization'] = 'Bearer ' + currentToken;
    const res = await fetch(`${BASE}/products/${id}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error();
    toast(`Product "${name}" deleted.`, 's');
    adminLoadProducts();
  } catch { toast('Failed to delete product.', 'e'); }
}

async function adminLoadProducts() {
  const tbl = document.getElementById('adm-products-tbl');
  if (tbl) tbl.innerHTML = skRows(6, 4);
  try {
    const data = await fetch(`${BASE}/products/get`).then(r => r.json());
    document.getElementById('adm-stat-products').textContent = data.length;
    document.getElementById('anb-products').textContent      = data.length;
    if (tbl) {
      tbl.innerHTML = data.length
        ? data.map((p, i) => `
          <tr>
            <td><span class="id-chip">${i + 1}</span></td>
            <td><span style="font-weight:600">${p.imageUrl ? `<img src="${esc(p.imageUrl)}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;margin-right:8px;vertical-align:middle"/>` : productEmoji(p.id) + ' '}${esc(p.name)}</span><br/><span style="font-size:.72rem;color:var(--txt2)">${esc(p.description||'')}</span></td>
            <td><span class="price-green">$${p.price.toFixed(2)}</span></td>
            <td>${p.stock != null ? `<span class="badge ${p.stock > 0 ? 'b-green' : 'b-red'}">${p.stock}</span>` : '—'}</td>
            <td><span class="badge b-blue">#${p.id}</span></td>
            <td>
              <button class="btn btn-danger btn-sm" onclick="adminDeleteProduct(${p.id},'${esc(p.name)}')">
                <i class="fa-solid fa-trash"></i> Delete
              </button>
            </td>
          </tr>`).join('')
        : emptyRow(6, 'fa-box', 'No products yet');
    }
    const dp = document.getElementById('adm-dash-products');
    if (dp) dp.innerHTML = data.slice(0, 5).map(p => `<tr><td>${productEmoji(p.id)} ${esc(p.name)}</td><td><span class="price-green">$${p.price.toFixed(2)}</span></td></tr>`).join('') || emptyRow(2, 'fa-box', 'No products');
    adminComputeRevenue(data);
  } catch {
    if (tbl) tbl.innerHTML = emptyRow(5, 'fa-triangle-exclamation', 'Could not load products');
  }
}

async function adminComputeRevenue(products) {
  try {
    const orders = await fetch(`${BASE}/orders/get`).then(r => r.json());
    let rev = 0;
    orders.forEach(o => { const p = products.find(p => p.id === o.productId); if (p) rev += p.price; });
    document.getElementById('adm-stat-revenue').textContent = '$' + rev.toFixed(0);
  } catch {}
}

/* ── ADMIN USERS ────────────────────────────────────── */
async function adminLoadUsers() {
  const tbl = document.getElementById('adm-users-tbl');
  if (tbl) tbl.innerHTML = skRows(4, 4);
  try {
    const data = await fetch(`${BASE}/users/get`).then(r => r.json());
    document.getElementById('adm-stat-users').textContent = data.length;
    document.getElementById('anb-users').textContent      = data.length;
    if (tbl) {
      tbl.innerHTML = data.length
        ? data.map((u, i) => `
          <tr>
            <td><span class="id-chip">${i + 1}</span></td>
            <td><div class="user-cell"><div class="uc-avatar">${u.name.charAt(0).toUpperCase()}</div><span style="font-weight:600">${esc(u.name)}</span></div></td>
            <td style="color:var(--txt2)">${esc(u.email)}</td>
            <td><span class="badge b-green">#${u.id}</span></td>
          </tr>`).join('')
        : emptyRow(4, 'fa-users', 'No customers yet');
    }
  } catch {
    if (tbl) tbl.innerHTML = emptyRow(4, 'fa-triangle-exclamation', 'Could not load customers');
  }
}

/* ── ADMIN ORDERS ───────────────────────────────────── */
async function adminLoadOrders() {
  const tbl = document.getElementById('adm-orders-tbl');
  if (tbl) tbl.innerHTML = skRows(5, 4);
  try {
    const data = await fetch(`${BASE}/orders/get`).then(r => r.json());
    document.getElementById('adm-stat-orders').textContent = data.length;
    document.getElementById('anb-orders').textContent      = data.length;
    if (tbl) {
      tbl.innerHTML = data.length
        ? data.map((o, i) => `
          <tr>
            <td><span class="id-chip">${i + 1}</span></td>
            <td><span class="badge b-orange">#${o.id}</span></td>
            <td><span class="badge b-blue">User #${o.userId}</span></td>
            <td><span class="badge b-green">Product #${o.productId}</span></td>
            <td><span class="badge b-gray" style="background:var(--success-light);color:#065f46"><i class="fa-solid fa-circle-check"></i> Placed</span></td>
          </tr>`).join('')
        : emptyRow(5, 'fa-receipt', 'No orders yet');
    }
    const dt = document.getElementById('adm-dash-orders');
    if (dt) dt.innerHTML = data.slice(0, 5).map(o => `<tr><td><span class="badge b-orange">#${o.id}</span></td><td><span class="badge b-blue">User ${o.userId}</span></td><td><span class="badge b-green">Prod ${o.productId}</span></td></tr>`).join('') || emptyRow(3, 'fa-receipt', 'No orders');
  } catch {
    if (tbl) tbl.innerHTML = emptyRow(5, 'fa-triangle-exclamation', 'Could not load orders');
  }
}

/* ── BOOT ───────────────────────────────────────────── */
restoreSession();
