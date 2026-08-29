/* ChocoArt — online edition
   Frontend: HTML/CSS/JS
   Backend: Supabase Auth + PostgreSQL + Realtime
*/
const SUPABASE_URL = "https://sbdpzkzdfvweffgqdrum.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fgNCu0qPh4sO_dMFHQgdyw_LR6bxiO0";
const ADMIN_USERNAME = "luffy";
const ADMIN_AUTH_EMAIL = "luffy@chocoart.local";

const PRODUCTS = [
  { id: 1, name: "ChocoArt Rose", price: 1, color: "#c77f8d", filter: "sepia(.18) saturate(1.35) hue-rotate(305deg) brightness(1.03)", desc: "لمسة وردية ناعمة مستوحاة من الشوكولاتة." },
  { id: 2, name: "ChocoArt Marron", price: 1, color: "#79503b", filter: "sepia(.48) saturate(1.05) brightness(.88)", desc: "مارون دافئ بطابع ChocoArt." },
  { id: 3, name: "ChocoArt Blanc", price: 1, color: "#eee4d4", filter: "grayscale(.18) sepia(.08) brightness(1.18) saturate(.72)", desc: "أبيض كريمي هادئ وأنيق." },
  { id: 4, name: "ChocoArt Marron Foncé", price: 1, color: "#3a2118", filter: "sepia(.28) saturate(1.22) brightness(.64)", desc: "مارون غامق بطابع شوكولاتة غني." }
];

const $ = (id) => document.getElementById(id);
const db = window.supabase && SUPABASE_URL.startsWith("http")
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

function escapeHTML(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function money(value) { return `${Number(value || 0).toFixed(0)} DT`; }
function setStatus(id, message = "", type = "") { const el = $(id); if (!el) return; el.textContent = message; el.className = `${id.includes("admin") ? "admin-status" : "login-status form-status"} ${type}`.trim(); }

/* ---------------- Cart ---------------- */
function getCart() {
  try {
    const raw = JSON.parse(localStorage.getItem("chocoCart") || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map(item => {
      const product = PRODUCTS.find(p => p.id === Number(item.id));
      if (!product) return null;
      return { id: product.id, name: product.name, price: 1, quantity: Math.max(1, Number(item.quantity) || 1) };
    }).filter(Boolean);
  } catch { return []; }
}
function saveCart(cart) { localStorage.setItem("chocoCart", JSON.stringify(cart.map(item => ({ ...item, price: 1 })))); }
function cartTotal() { return getCart().reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0); }
function updateCartUI() {
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  if ($("cartCount")) $("cartCount").textContent = count;
  if ($("cartTotal")) $("cartTotal").textContent = money(cartTotal());
  if (!$('cartItems')) return;
  $('cartItems').innerHTML = cart.length ? cart.map(item => `<div class="cart-item"><div><strong>${escapeHTML(item.name)}</strong><span>${money(item.price)}</span></div><div class="quantity"><button type="button" onclick="changeQty(${item.id},-1)">−</button><b>${item.quantity}</b><button type="button" onclick="changeQty(${item.id},1)">+</button></div><button class="remove-btn" type="button" onclick="removeCartItem(${item.id})">حذف</button></div>`).join("") : `<p class="empty">السلة فارغة.</p>`;
}
function addToCart(id) {
  const p = PRODUCTS.find(x => x.id === id); if (!p) return;
  const cart = getCart(); const item = cart.find(x => x.id === id);
  if (item) item.quantity += 1; else cart.push({ id: p.id, name: p.name, price: 1, quantity: 1 });
  saveCart(cart); updateCartUI(); $("drawerOverlay")?.classList.add("active");
}
function changeQty(id, amount) { const cart = getCart(); const item = cart.find(x => x.id === id); if (!item) return; item.quantity += amount; saveCart(cart.filter(x => x.quantity > 0)); updateCartUI(); }
function removeCartItem(id) { saveCart(getCart().filter(x => x.id !== id)); updateCartUI(); }
function renderProducts() {
  if (!$('productsGrid')) return;
  $('productsGrid').innerHTML = PRODUCTS.map(p => `<article class="product-card" style="--product-color:${p.color}"><div class="product-image real-product-image"><img src="montage.png" alt="${escapeHTML(p.name)}" style="filter:${p.filter}"></div><div class="product-meta"><span>CHOCOART / 0${p.id}</span><strong>1 DT</strong></div><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.desc)}</p><button class="btn full" type="button" onclick="addToCart(${p.id})">أضف إلى السلة</button></article>`).join("");
}

/* ---------------- Auth ---------------- */
async function getUser() { if (!db) return null; const { data } = await db.auth.getUser(); return data?.user || null; }
async function getProfile(userId) { 
  if (!db || !userId) return null; 
  const { data } = await db.from("profiles").select("id,name,email,role,created_at").eq("id", userId).maybeSingle(); 
  return data || null; 
}
async function updateAccountArea() {
  if (!$('accountArea')) return;
  const user = await getUser();
  if (!user) { $('accountArea').innerHTML = `<a class="account-link" href="login.html">دخول</a>`; return; }
  const profile = await getProfile(user.id);
  $('accountArea').innerHTML = `<div class="user-area"><span>👤 ${escapeHTML(profile?.name || user.email?.split('@')[0] || "Client")}</span><button type="button" onclick="logoutCustomer()">خروج</button></div>`;
}
async function logoutCustomer() { if (db) await db.auth.signOut(); updateAccountArea(); }

async function openCheckout() {
  if (!getCart().length) return alert("السلة فارغة.");
  const user = await getUser();
  if (!user) { alert("سجّل الدخول أولاً لإتمام الطلب."); location.href = "login.html"; return; }
  const profile = await getProfile(user.id);
  if ($('orderName')) $('orderName').value = profile?.name || user.user_metadata?.name || "";
  if ($('orderEmail')) $('orderEmail').value = user.email || "";
  $('checkoutModal')?.classList.add('active'); $('drawerOverlay')?.classList.remove('active');
}

async function submitOrder(e) {
  e.preventDefault();
  const cart = getCart(); if (!cart.length) return;
  const user = await getUser(); if (!user) { location.href = 'login.html'; return; }
  
  // توليد كود طلب عشوائي وفريد باش ما يصيرش Conflict
  const uniqueOrderCode = 'CHOCO-' + Math.floor(100000 + Math.random() * 900000);

  const payload = {
    user_id: user.id,
    order_code: uniqueOrderCode,
    customer_name: $('orderName').value.trim(), 
    customer_email: $('orderEmail').value.trim().toLowerCase(),
    phone: $('orderPhone').value.trim(), 
    state: $('orderState') ? $('orderState').value : '', // ولات اختيارية وما تقلقش لو فارغة
    address: $('orderAddress').value.trim(), 
    notes: $('orderNotes').value.trim(),
    items: cart.map(x => ({ id: x.id, name: x.name, quantity: x.quantity, price: 1 })),
    total: cart.reduce((s, x) => s + x.quantity, 0), 
    status: 'قيد المعالجة'
  };

  if (!payload.customer_name || !payload.customer_email || !payload.phone || !payload.address) {
    return setStatus('checkoutStatus', 'كمّل المعلومات المطلوبة (الاسم، الإيميل، الهاتف، والعنوان).', 'error');
  }

  const btn = $('checkoutForm').querySelector('button[type="submit"]'); 
  btn.disabled = true; 
  setStatus('checkoutStatus', 'جاري إرسال الطلب...');

  const { error } = await db.from('orders').insert(payload);
  btn.disabled = false;

  if (error) { 
    console.error(error); 
    return setStatus('checkoutStatus', 'صار مشكل في إرسال الطلب: ' + (error.message || ''), 'error'); 
  }

  localStorage.removeItem('chocoCart'); 
  $('checkoutForm').reset(); 
  $('checkoutModal').classList.remove('active'); 
  $('successModal').classList.add('active'); 
  updateCartUI();
}

async function setupStore() {
  renderProducts(); updateCartUI(); updateAccountArea();
  $('cartBtn')?.addEventListener('click', () => $('drawerOverlay').classList.add('active'));
  $('closeCart')?.addEventListener('click', () => $('drawerOverlay').classList.remove('active'));
  $('drawerOverlay')?.addEventListener('click', e => { if (e.target === $('drawerOverlay')) $('drawerOverlay').classList.remove('active'); });
  $('checkoutBtn')?.addEventListener('click', openCheckout);
  $('closeCheckout')?.addEventListener('click', () => $('checkoutModal').classList.remove('active'));
  $('successClose')?.addEventListener('click', () => $('successModal').classList.remove('active'));
  $('checkoutForm')?.addEventListener('submit', submitOrder);
  if (db) db.auth.onAuthStateChange(() => updateAccountArea());
}

/* ---------------- Lamp + login ---------------- */
function updateLamp() {
  const on = localStorage.getItem('chocoLamp') === 'true';
  document.body.classList.toggle('lamp-on', on);
  $('lamp')?.setAttribute('aria-label', on ? 'إطفاء اللمبة' : 'تشغيل اللمبة');
  $('rope')?.setAttribute('aria-label', on ? 'إطفاء اللمبة' : 'تشغيل اللمبة');
  $('lamp')?.setAttribute('aria-pressed', String(on));
}
function toggleLamp() {
  const next = localStorage.getItem('chocoLamp') !== 'true';
  localStorage.setItem('chocoLamp', String(next));
  updateLamp();
  document.body.classList.remove('lamp-toggle-feedback');
  void document.body.offsetWidth;
  document.body.classList.add('lamp-toggle-feedback');
}
function setupLampControls() {
  const lamp = $('lamp');
  const rope = $('rope');
  if (!lamp && !rope) return;
  const activate = (e) => { if (e) e.preventDefault(); toggleLamp(); };
  lamp?.addEventListener('click', activate);
  rope?.addEventListener('click', activate);
  lamp?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(e); });
}

function switchLoginTab(signIn) {
  $('signInTab')?.classList.toggle('active', signIn); $('signUpTab')?.classList.toggle('active', !signIn);
  $('signInForm')?.classList.toggle('hidden', !signIn); $('signUpForm')?.classList.toggle('hidden', signIn);
}
async function signUp(e) {
  e.preventDefault(); 
  const name = $('signupName').value.trim(), email = $('signupEmail').value.trim().toLowerCase(), password = $('signupPassword').value;
  if (!name || !email || password.length < 6) return setStatus('loginStatus', 'تأكد من المعلومات وكلمة المرور (6 أحرف على الأقل).', 'error');
  setStatus('loginStatus', 'جاري إنشاء الحساب...');
  const { data, error } = await db.auth.signUp({ email, password, options: { data: { name } } });
  if (error) return setStatus('loginStatus', error.message, 'error');
  if (data.session) { location.href = 'index.html'; return; }
  setStatus('loginStatus', 'الحساب تخلق. إذا فعّلت تأكيد الإيميل في Supabase، أكد بريدك ثم ارجع للدخول.', 'success'); switchLoginTab(true);
}
async function signIn(e) {
  e.preventDefault(); 
  const identity = $('loginIdentity').value.trim(), password = $('loginPassword').value;
  const email = identity.toLowerCase() === ADMIN_USERNAME ? ADMIN_AUTH_EMAIL : identity.toLowerCase();
  setStatus('loginStatus', 'جاري الدخول...');
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) return setStatus('loginStatus', 'بيانات الدخول غير صحيحة.', 'error');
  const profile = await getProfile(data.user.id);
  if (identity.toLowerCase() === ADMIN_USERNAME && profile?.role === 'admin') { location.href = 'admin.html'; return; }
  if (profile?.role === 'admin') { location.href = 'admin.html'; return; }
  location.href = 'index.html';
}
async function setupLogin() {
  if (!$('loginWrap')) return;
  updateLamp(); setupLampControls();
  $('signInTab')?.addEventListener('click', () => switchLoginTab(true)); $('signUpTab')?.addEventListener('click', () => switchLoginTab(false));
  $('signUpForm')?.addEventListener('submit', signUp); $('signInForm')?.addEventListener('submit', signIn);
  if (db) { const user = await getUser(); if (user) setStatus('loginStatus', 'أنت داخل بالحساب بالفعل.'); }
}

/* ---------------- Admin ---------------- */
let adminChannel = null;
async function ensureAdmin() {
  if (!db) { location.replace('login.html'); return false; }
  const user = await getUser(); if (!user) { location.replace('login.html'); return false; }
  const profile = await getProfile(user.id);
  if (profile?.role !== 'admin') { await db.auth.signOut(); location.replace('login.html'); return false; }
  return true;
}
function itemsText(items) { return (items || []).map(x => `${escapeHTML(x.name)} × ${Number(x.quantity)}`).join('<br>'); }
async function loadOrders() {
  if (!db || !$('ordersTable')) return;
  const { data, error } = await db.from('orders').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); setStatus('adminStatus', 'تعذر تحميل الطلبات. راجع RLS وSupabase.', 'error'); return; }
  $('ordersStat').textContent = data.length; $('salesStat').textContent = money(data.reduce((s, x) => s + Number(x.total || 0), 0));
  $('ordersTable').innerHTML = data.length ? data.map(o => `<tr><td><strong>${escapeHTML(o.order_code)}</strong></td><td><strong>${escapeHTML(o.customer_name)}</strong><br><small>${escapeHTML(o.customer_email)}</small></td><td>${escapeHTML(o.phone)}</td><td>${escapeHTML(o.state || '-')}</td><td class="address-cell">${escapeHTML(o.address)}${o.notes ? `<br><small>ملاحظة: ${escapeHTML(o.notes)}</small>` : ''}</td><td>${itemsText(o.items)}</td><td>${money(o.total)}</td><td>${new Date(o.created_at).toLocaleString('ar-TN')}</td><td><select onchange="changeOrderStatus('${o.id}',this.value)"><option value="قيد المعالجة" ${o.status==='قيد المعالجة'?'selected':''}>قيد المعالجة</option><option value="تم التوصيل" ${o.status==='تم التوصيل'?'selected':''}>تم التوصيل</option></select></td><td><button class="delete-btn" type="button" onclick="deleteOrder('${o.id}')">حذف</button></td></tr>`).join('') : '<tr><td colspan="10">لا توجد طلبات حالياً.</td></tr>';
}
async function loadUsers() {
  if (!db || !$('usersTable')) return;
  const { data, error } = await db.from('profiles').select('id,name,email,created_at').eq('role','customer').order('created_at',{ascending:false});
  if (error) { console.error(error); return; }
  $('usersStat').textContent = data.length;
  $('usersTable').innerHTML = data.length ? data.map((u,i)=>`<tr><td>${i+1}</td><td>${escapeHTML(u.name)}</td><td>${escapeHTML(u.email)}</td><td>${new Date(u.created_at).toLocaleString('ar-TN')}</td></tr>`).join('') : '<tr><td colspan="4">لا يوجد عملاء مسجلون.</td></tr>';
}
async function changeOrderStatus(id, status) { if (!db) return; const { error } = await db.from('orders').update({ status }).eq('id', id); if (error) alert('ما نجمتش نبدل الحالة.'); else loadOrders(); }
async function deleteOrder(id) { if (!confirm('هل تريد حذف هذا الطلب نهائياً؟')) return; const { error } = await db.from('orders').delete().eq('id', id); if (error) alert('ما نجمتش نحذف الطلب.'); else loadOrders(); }
async function setupAdmin() {
  if (!$('ordersTable')) return; if (!(await ensureAdmin())) return;
  await Promise.all([loadOrders(), loadUsers()]);
  $('refreshOrders')?.addEventListener('click', loadOrders); $('refreshUsers')?.addEventListener('click', loadUsers); $('refreshAll')?.addEventListener('click', async()=>{await Promise.all([loadOrders(),loadUsers()]);setStatus('adminStatus','تم تحديث البيانات.','success');});
  $('adminLogout')?.addEventListener('click', async()=>{await db.auth.signOut(); location.href='login.html';});
  adminChannel = db.channel('chocoart-orders').on('postgres_changes',{event:'*',schema:'public',table:'orders'},()=>loadOrders()).subscribe();
  db.channel('chocoart-users').on('postgres_changes',{event:'*',schema:'public',table:'profiles'},()=>loadUsers()).subscribe();
  setInterval(()=>{loadOrders();loadUsers();},15000);
}

document.addEventListener('DOMContentLoaded', () => { setupStore(); setupLogin(); setupAdmin(); });
