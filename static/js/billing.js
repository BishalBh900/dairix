/* billing.js — Dairix Billing Page
   Requires: CSRF, SAVE_URL, LIST_URL, DELETE_URL, IS_ADMIN
   injected as data attributes on <div id="billingConfig"> in the template */

const cfg        = document.getElementById('billingConfig').dataset;
const CSRF       = cfg.csrf;
const SAVE_URL   = cfg.saveUrl;
const LIST_URL   = cfg.listUrl;
const DELETE_URL = cfg.deleteUrl;
const IS_ADMIN   = cfg.isAdmin === 'true';

/* ══════════════════════════════════════
   PRODUCTS — 2 categories, English + Nepali
══════════════════════════════════════ */
const CATEGORIES = [
  {
    label: '🐄 Dairy Products',
    labelNepali: 'दुग्ध उत्पादनहरू',
    products: [
      { id:'milk',   name:'Milk',   nepali:'दूध',     icon:'🥛', rate:65,   unit:'Ltr' },
      { id:'butter', name:'Butter', nepali:'मक्खन',   icon:'🧈', rate:520,  unit:'Kg'  },
      { id:'cheese', name:'Cheese', nepali:'चिज',     icon:'🧀', rate:680,  unit:'Kg'  },
      { id:'curd',   name:'Curd',   nepali:'दही',     icon:'🍶', rate:90,   unit:'Kg'  },
      { id:'ghee',   name:'Ghee',   nepali:'घिउ',     icon:'🫙', rate:1200, unit:'Kg'  },
      { id:'cream',  name:'Cream',  nepali:'क्रिम',   icon:'🍦', rate:380,  unit:'Kg'  },
      { id:'paneer', name:'Paneer', nepali:'पनिर',    icon:'🍱', rate:420,  unit:'Kg'  },
      { id:'lassi',  name:'Lassi',  nepali:'लस्सी',   icon:'🥤', rate:45,   unit:'Ltr' },
    ]
  },
  {
    label: '🌾 Animal Feed',
    labelNepali: 'पशु आहार',
    products: [
      { id:'goti_dana',    name:'Goti Dana',    nepali:'गोली दाना',    icon:'🟡', rate:55, unit:'Kg' },
      { id:'veli_dana',    name:'Veli Dana',    nepali:'भेली दाना',    icon:'🟤', rate:48, unit:'Kg' },
      { id:'soybean_meal', name:'Soybean Meal', nepali:'सोयाबिन खली', icon:'🫘', rate:72, unit:'Kg' },
      { id:'wheat_bran',   name:'Wheat Bran',   nepali:'गहुँको चोकर', icon:'🌾', rate:32, unit:'Kg' },
    ]
  },
];

const PRODUCTS = CATEGORIES.flatMap(c => c.products);
const cardQty  = {};
PRODUCTS.forEach(p => cardQty[p.id] = 1);

let items = [];
let selectedFarmerId = null;

/* ── FARMER SELECTOR ── */
function onFarmerSelect() {
  const sel   = document.getElementById('custSelect');
  const opt   = sel.options[sel.selectedIndex];
  const badge = document.getElementById('custModeBadge');

  if (!sel.value) {
    selectedFarmerId = null;
    setFieldsReadonly(false);
    document.getElementById('custName').value  = '';
    document.getElementById('custAddr').value  = '';
    document.getElementById('custPhone').value = '';
    document.getElementById('custIdRow').style.display = 'none';
    badge.textContent = 'Walk-in';
    badge.className   = 'cust-mode-badge walk-in';
    return;
  }

  selectedFarmerId = sel.value;
  document.getElementById('custName').value  = opt.dataset.name  || '';
  document.getElementById('custAddr').value  = opt.dataset.addr  || '';
  document.getElementById('custPhone').value = opt.dataset.phone || '';
  document.getElementById('custIdDisplay').textContent = 'F-' + sel.value;
  document.getElementById('custIdRow').style.display   = 'flex';
  setFieldsReadonly(true);
  badge.textContent = 'Linked Farmer';
  badge.className   = 'cust-mode-badge registered';
}

function setFieldsReadonly(ro) {
  ['custName','custAddr','custPhone'].forEach(id => {
    const el = document.getElementById(id);
    ro ? el.setAttribute('readonly', true) : el.removeAttribute('readonly');
  });
}

function clearFarmerSelect() {
  document.getElementById('custSelect').value = '';
  onFarmerSelect();
}

/* ── PRODUCT CARDS ── */
function renderCards() {
  document.getElementById('productGrid').innerHTML = CATEGORIES.map((cat, ci) => `
    <div class="category-section">
      ${ci > 0 ? '<hr class="category-divider">' : ''}
      <div class="category-label">
        ${cat.label}
        <span class="category-label-nepali">${cat.labelNepali}</span>
      </div>
      <div class="product-grid">
        ${cat.products.map(p => {
          const added = items.some(it => it.pid === p.id);
          return `
            <div class="product-card${added ? ' added' : ''}">
              <div class="product-icon">${p.icon}</div>
              <div class="product-name">${p.name}</div>
              <div class="product-nepali">${p.nepali}</div>
              <div class="product-rate">Rs. ${p.rate.toLocaleString('en-IN')}</div>
              <div class="product-unit">per ${p.unit}</div>
              <div class="qty-row">
                <button onclick="adjQty('${p.id}',-1)">−</button>
                <input type="number" id="qty-${p.id}" value="${cardQty[p.id]}"
                  min="0.01" step="0.01"
                  oninput="cardQty['${p.id}']=parseFloat(this.value)||1" />
                <button onclick="adjQty('${p.id}',1)">+</button>
              </div>
              <button class="add-btn${added ? ' update-btn' : ''}"
                onclick="addProduct('${p.id}')">
                ${added ? '✓ Update' : '+ Add'}
              </button>
            </div>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function adjQty(id, d) {
  const inp = document.getElementById('qty-' + id);
  const v   = Math.max(0.01, Math.round(((parseFloat(inp.value)||1) + d)*100)/100);
  inp.value = v; cardQty[id] = v;
}

function addProduct(id) {
  const p   = PRODUCTS.find(x => x.id === id);
  const qty = parseFloat(document.getElementById('qty-'+id).value) || 1;
  const idx = items.findIndex(it => it.pid === id);
  if (idx >= 0) { items[idx].qty = qty; items[idx].rate = p.rate; }
  else items.push({
    pid:  id,
    desc: p.name + ' / ' + p.nepali + ' (' + p.unit + ')',
    qty,
    rate: p.rate
  });
  renderItems(); renderCards();
}

/* ── INVOICE TABLE ── */
function removeRow(i) { items.splice(i, 1); renderItems(); renderCards(); }

function renderItems() {
  const tbody = document.getElementById('itemBody');
  if (!items.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No items yet — select products above.</td></tr>`;
    recalc(); return;
  }
  tbody.innerHTML = items.map((it, i) => {
    const amt = it.qty * it.rate;
    const rs  = Math.floor(amt);
    const ps  = Math.round((amt - rs) * 100);
    return `
      <tr>
        <td class="col-sn">${i+1}</td>
        <td class="col-part">
          <input value="${esc(it.desc)}" oninput="items[${i}].desc=this.value" />
        </td>
        <td class="col-qty">
          <input type="number" value="${it.qty}" min="0" step="0.01" style="text-align:right;"
            oninput="items[${i}].qty=parseFloat(this.value)||0;recalc()" />
        </td>
        <td class="col-rate">
          <input type="number" value="${it.rate}" min="0" step="0.01" style="text-align:right;"
            oninput="items[${i}].rate=parseFloat(this.value)||0;recalc()" />
        </td>
        <td class="col-rs">${rs ? rs.toLocaleString('en-IN') : ''}</td>
        <td class="col-ps">${ps || ''}</td>
        <td style="border:none;text-align:center;">
          <button class="btn-rm" onclick="removeRow(${i})">&times;</button>
        </td>
      </tr>`;
  }).join('');
  recalc();
}

function recalc() {
  const total = items.reduce((s, it) => s + it.qty * it.rate, 0);
  const rs = Math.floor(total), ps = Math.round((total - rs) * 100);
  document.getElementById('totalRs').textContent = rs ? rs.toLocaleString('en-IN') : '';
  document.getElementById('totalPs').textContent = ps || '';
  document.getElementById('wordsBox').textContent =
    rs ? 'In Words: ' + cap(toWords(rs)) + ' rupees only.' : '';
}

/* ── SAVE & PRINT ── */
async function saveAndPrint() {
  if (!items.length) { showToast('⚠ Add at least one item.', '#b00'); return; }

  const payload = {
    farmer_id:  selectedFarmerId,
    inv_no:     document.getElementById('invNo').value.trim()  || 'INV-???',
    inv_date:   document.getElementById('invDate').value       || new Date().toISOString().slice(0,10),
    cust_name:  document.getElementById('custName').value.trim(),
    cust_addr:  document.getElementById('custAddr').value.trim(),
    cust_phone: document.getElementById('custPhone').value.trim(),
    total:      Math.round(items.reduce((s,it) => s + it.qty*it.rate, 0) * 100) / 100,
    items:      items.map(it => ({ desc: it.desc, qty: it.qty, rate: it.rate })),
  };

  try {
    const res  = await fetch(SAVE_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': CSRF },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showToast('✓ Bill saved to database!');
      loadHistory();
      window.print();
      autoIncrementInvNo();
    } else {
      showToast('⚠ Save failed: ' + (data.error || 'unknown'), '#b00');
    }
  } catch(e) {
    showToast('⚠ Network error — bill not saved.', '#b00');
    window.print();
  }
}

function autoIncrementInvNo() {
  const cur = document.getElementById('invNo').value;
  const m   = cur.match(/(\D*)(\d+)(\D*)$/);
  if (m) document.getElementById('invNo').value =
    m[1] + String(parseInt(m[2])+1).padStart(m[2].length, '0') + m[3];
}

function newInvoice() {
  clearAll(); clearFarmerSelect();
  document.getElementById('invDate').valueAsDate = new Date();
  showToast('New invoice ready.');
}

function clearAll() {
  items = [];
  PRODUCTS.forEach(p => cardQty[p.id] = 1);
  renderItems(); renderCards();
}

/* ── HISTORY ── */
async function loadHistory() {
  try {
    const res  = await fetch(LIST_URL);
    const data = await res.json();
    renderHistory(data.bills || []);
  } catch(e) {
    document.getElementById('histList').innerHTML =
      '<div class="hist-empty">Could not load history.</div>';
  }
}

function renderHistory(bills) {
  document.getElementById('histCount').textContent = bills.length;
  const list = document.getElementById('histList');
  if (!bills.length) {
    list.innerHTML = '<div class="hist-empty">No bills saved yet.</div>'; return;
  }
  list.innerHTML = bills.map(b => `
    <div class="hist-item">
      <div class="hi-invno">${esc(b.inv_no)}</div>
      ${b.farmer_id ? `<div class="hi-farmer">👨‍🌾 Farmer #${b.farmer_id}</div>` : ''}
      <div class="hi-name">${esc(b.cust_name || '—')}</div>
      <div class="hi-total">Rs. ${Math.floor(b.total).toLocaleString('en-IN')}</div>
      <div class="hi-date">${formatDate(b.inv_date)}</div>
      <div class="hi-actions">
        <button onclick="viewBill(${b.id})">👁 View</button>
        ${IS_ADMIN ? `<button class="del-btn" onclick="deleteBill(${b.id})">🗑 Delete</button>` : ''}
      </div>
    </div>`).join('');
  window._billHistory = bills;
}

function viewBill(id) {
  const b = (window._billHistory||[]).find(x => x.id === id);
  if (!b) return;
  const rows = b.items.map((it,i) => `
    <tr>
      <td>${i+1}</td>
      <td>${esc(it.desc)}</td>
      <td style="text-align:right">${it.qty}</td>
      <td style="text-align:right">Rs.${it.rate.toLocaleString('en-IN')}</td>
      <td>Rs.${Math.floor(it.amount).toLocaleString('en-IN')}</td>
    </tr>`).join('');

  document.getElementById('modalTitle').textContent = 'Bill — ' + b.inv_no;
  document.getElementById('modalContent').innerHTML = `
    <div class="modal-row"><span class="lbl">Invoice No.</span><span class="val">${esc(b.inv_no)}</span></div>
    <div class="modal-row"><span class="lbl">Date</span><span class="val">${formatDate(b.inv_date)}</span></div>
    ${b.farmer_id ? `<div class="modal-row"><span class="lbl">Farmer ID</span><span class="val" style="color:#2e7d32;">F-${b.farmer_id}</span></div>` : ''}
    <div class="modal-row"><span class="lbl">Customer</span><span class="val">${esc(b.cust_name||'—')}</span></div>
    <div class="modal-row"><span class="lbl">Address</span><span class="val">${esc(b.cust_addr||'—')}</span></div>
    ${b.cust_phone ? `<div class="modal-row"><span class="lbl">Phone</span><span class="val">${esc(b.cust_phone)}</span></div>` : ''}
    <div class="modal-items">
      <table>
        <thead>
          <tr><th>#</th><th>Particulars</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="modal-total">Total: Rs. ${Math.floor(b.total).toLocaleString('en-IN')}</div>
    <div style="font-size:11px;color:#aaa;margin-top:8px;">
      Saved: ${new Date(b.saved_at).toLocaleString()}
    </div>`;
  document.getElementById('detailModal').classList.add('open');
}

async function deleteBill(id) {
  if (!confirm('Delete this bill permanently?')) return;
  try {
    const res  = await fetch(DELETE_URL + id + '/', {
      method:  'POST',
      headers: { 'X-CSRFToken': CSRF },
    });
    const data = await res.json();
    if (data.success) { showToast('Bill deleted.', '#555'); loadHistory(); }
    else showToast('⚠ ' + (data.error || 'Delete failed'), '#b00');
  } catch(e) { showToast('⚠ Network error.', '#b00'); }
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('open');
}

/* ── FARMER VIEW: print single bill ── */
function printBill(btn) {
  const card    = btn.closest('.bill-card');
  const actions = card.querySelector('.bill-card-actions');
  actions.style.display = 'none';
  window.print();
  actions.style.display = '';
}

/* ── HELPERS ── */
function showToast(msg, bg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.background = bg || '#2e7d32';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN',
    { day:'2-digit', month:'short', year:'numeric' });
}

function esc(s) {
  return String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const O = ['','one','two','three','four','five','six','seven','eight','nine','ten',
           'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen',
           'eighteen','nineteen'];
const T = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

function toWords(n) {
  n = Math.floor(n);
  if (!n)      return 'zero';
  if (n < 20)  return O[n];
  if (n < 100) return T[Math.floor(n/10)] + (n%10 ? ' '+O[n%10] : '');
  if (n < 1e3) return O[Math.floor(n/100)] + ' hundred' + (n%100 ? ' '+toWords(n%100) : '');
  if (n < 1e5) return toWords(Math.floor(n/1000)) + ' thousand' + (n%1000 ? ' '+toWords(n%1000) : '');
  if (n < 1e7) return toWords(Math.floor(n/1e5))  + ' lakh'     + (n%1e5  ? ' '+toWords(n%1e5)  : '');
  return toWords(Math.floor(n/1e7)) + ' crore' + (n%1e7 ? ' '+toWords(n%1e7) : '');
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ── INIT (admin/staff view only) ── */
const invDateEl = document.getElementById('invDate');
if (invDateEl) {
  invDateEl.valueAsDate = new Date();
  renderCards();
  renderItems();
  loadHistory();

  document.getElementById('detailModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
}