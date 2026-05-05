/* ══════════════════════════════════════════
   reports.js — DairyMS Reports & Analytics
   Handles: filters, search, sort, history modal, print
══════════════════════════════════════════ */

'use strict';

/* ════════════════════════════════════════════
   ① FILTER BAR
════════════════════════════════════════════ */

function setPeriod(period) {
  document.getElementById('periodInput').value = period;
  document.getElementById('fromInput').value   = '';
  document.getElementById('toInput').value     = '';

  // Sync pill active states
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('pill-' + period);
  if (target) target.classList.add('active');

  // Hide custom range if open
  const customRange = document.getElementById('customRange');
  if (customRange) customRange.classList.remove('show');

  document.getElementById('filterForm').submit();
}

function toggleCustom(e) {
  const range = document.getElementById('customRange');
  const isOpen = range.classList.contains('show');

  range.classList.toggle('show', !isOpen);

  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  if (!isOpen) {
    const btn = document.getElementById('pill-custom');
    if (btn) btn.classList.add('active');
  }
}

function applyCustom() {
  const from = document.getElementById('fromDate').value;
  const to   = document.getElementById('toDate').value;

  if (!from || !to) {
    showToast('Please select both a start and end date.', 'warn');
    return;
  }
  if (from > to) {
    showToast('"From" date cannot be after "To" date.', 'warn');
    return;
  }

  document.getElementById('periodInput').value = 'custom';
  document.getElementById('fromInput').value   = from;
  document.getElementById('toInput').value     = to;
  document.getElementById('filterForm').submit();
}


/* ════════════════════════════════════════════
   ② FARMER TABLE — SEARCH
════════════════════════════════════════════ */

function filterTable(query) {
  const q    = query.toLowerCase().trim();
  const rows = document.querySelectorAll('#farmerTbody tr');
  let   vis  = 0;

  rows.forEach(row => {
    const name = (row.dataset.name || '').toLowerCase();
    const id   = String(row.dataset.id || '');
    const hit  = !q || name.includes(q) || id.includes(q);
    row.classList.toggle('hidden-row', !hit);
    if (hit) vis++;
  });

  const counter = document.getElementById('visibleCount');
  if (counter) counter.textContent = vis + ' farmer' + (vis !== 1 ? 's' : '');
}


/* ════════════════════════════════════════════
   ③ FARMER TABLE — SORT
════════════════════════════════════════════ */

function sortFarmers(key) {
  const tbody = document.getElementById('farmerTbody');
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll('tr'));

  rows.sort((a, b) => {
    const aVal = parseFloat(a.dataset[key === 'milk' ? 'milk' : 'revenue']) || 0;
    const bVal = parseFloat(b.dataset[key === 'milk' ? 'milk' : 'revenue']) || 0;
    return bVal - aVal; // descending
  });

  // Re-render
  rows.forEach(r => tbody.appendChild(r));

  // Update sort button styles
  const milkBtn    = document.getElementById('sortMilk');
  const revenueBtn = document.getElementById('sortRevenue');

  if (milkBtn && revenueBtn) {
    if (key === 'milk') {
      milkBtn.classList.add('active-milk');
      milkBtn.style.opacity = '1';
      revenueBtn.classList.remove('active-revenue');
      revenueBtn.style.opacity = '.55';
    } else {
      revenueBtn.classList.add('active-revenue');
      revenueBtn.style.opacity = '1';
      milkBtn.classList.remove('active-milk');
      milkBtn.style.opacity = '.55';
    }
  }
}


/* ════════════════════════════════════════════
   ④ HISTORY MODAL — STATE
════════════════════════════════════════════ */

let _farmerId   = null;
let _farmerName = '';

/* Attach row click listeners once DOM is ready */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#farmerTbody tr').forEach(row => {
    row.addEventListener('click', () => {
      const id    = row.dataset.id;
      const name  = row.querySelector('.fw-600')?.textContent.trim() || '—';
      const cells = row.querySelectorAll('td');
      const email = cells[2]?.textContent.trim() || '';
      const phone = cells[3]?.textContent.trim() || '';
      const meta  = [email, phone].filter(v => v && v !== '—').join(' · ') || 'No contact info';

      openHistory(id, name, meta);
    });
  });
});


/* ════════════════════════════════════════════
   ⑤ HISTORY MODAL — OPEN / CLOSE
════════════════════════════════════════════ */

function openHistory(farmerId, name, meta) {
  _farmerId   = farmerId;
  _farmerName = name;

  // Populate header
  document.getElementById('modalFarmerName').textContent = name;
  document.getElementById('modalFarmerMeta').textContent = meta;

  // Avatar initial
  const avatar = document.getElementById('modalAvatar');
  if (avatar) avatar.textContent = name.charAt(0).toUpperCase();

  // Reset tabs
  document.querySelectorAll('.h-tab').forEach(t => t.classList.remove('active'));
  const firstTab = document.querySelector('.h-tab');
  if (firstTab) firstTab.classList.add('active');

  // Hide custom date row
  const customDates = document.getElementById('historyCustomDates');
  if (customDates) customDates.classList.remove('show');

  // Clear stats
  ['statMilk', 'statRevenue', 'statFat', 'statSnf'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });

  // Show overlay
  document.getElementById('historyOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Load default period
  loadHistory('7', firstTab);
}

function closeHistory() {
  document.getElementById('historyOverlay').classList.remove('open');
  document.body.style.overflow = '';
  _farmerId = null;
}

function overlayClick(e) {
  if (e.target === document.getElementById('historyOverlay')) closeHistory();
}

// Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeHistory();
});


/* ════════════════════════════════════════════
   ⑥ HISTORY MODAL — TABS & FETCH
════════════════════════════════════════════ */

function loadHistory(days, tabEl) {
  if (!_farmerId) return;

  document.querySelectorAll('.h-tab').forEach(t => t.classList.remove('active'));
  if (tabEl) tabEl.classList.add('active');

  const customDates = document.getElementById('historyCustomDates');
  if (customDates) customDates.classList.remove('show');

  fetchHistory({ farmer_id: _farmerId, period: days });  // ← change 'days' to 'period'
}

function toggleHistoryCustom(tabEl) {
  document.querySelectorAll('.h-tab').forEach(t => t.classList.remove('active'));
  if (tabEl) tabEl.classList.add('active');

  const customDates = document.getElementById('historyCustomDates');
  if (customDates) customDates.classList.toggle('show');
}

function applyHistoryCustom() {
  const from = document.getElementById('hFromDate').value;
  const to   = document.getElementById('hToDate').value;

  if (!from || !to) { showToast('Please select both dates.', 'warn'); return; }
  if (from > to)    { showToast('"From" date cannot be after "To" date.', 'warn'); return; }

  fetchHistory({ farmer_id: _farmerId, period: 'custom', from_date: from, to_date: to });
  //                                    ↑ add period: 'custom'
}



/* ════════════════════════════════════════════
   ⑦ HISTORY MODAL — FETCH & RENDER
════════════════════════════════════════════ */

function fetchHistory(params) {
  // Show loading
  setModalState('loading');

  // Build API URL — adjust path to match your Django URLs
const url = new URL('/reports/farmer-history/', window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  fetch(url.toString(), {
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  })
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(data => renderHistory(data))
    .catch(err => {
      console.error('[DairyMS] History fetch error:', err);
      setModalState('error');
    });
}

/* ── For local demo / testing: generate fake records ── */
function fetchHistoryDemo(params) {
  setModalState('loading');

  setTimeout(() => {
    const days   = parseInt(params.days || 7);
    const records = [];
    const sessions = ['morning', 'evening'];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      sessions.forEach(session => {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const milk    = +(Math.random() * 20 + 10).toFixed(1);
        const fat     = +(Math.random() * 1.5 + 3.5).toFixed(2);
        const snf     = +(Math.random() * 1.0 + 8.0).toFixed(2);
        const rate    = 40;
        records.push({
          date:        d.toISOString().split('T')[0],
          session,
          milk_liters: milk,
          fat_percent: fat,
          snf_percent: snf,
          amount:      Math.round(milk * rate),
        });
      });
    }

    const totalMilk    = records.reduce((s, r) => s + r.milk_liters, 0);
    const totalRevenue = records.reduce((s, r) => s + r.amount, 0);
    const avgFat       = records.reduce((s, r) => s + r.fat_percent, 0) / records.length;
    const avgSnf       = records.reduce((s, r) => s + r.snf_percent, 0) / records.length;

    renderHistory({
      total_milk:    totalMilk.toFixed(1),
      total_revenue: totalRevenue,
      avg_fat:       avgFat.toFixed(2),
      avg_snf:       avgSnf.toFixed(2),
      records,
    });
  }, 600);
}

function renderHistory(data) {
  // Stats
  const milk    = data.total_milk    != null ? parseFloat(data.total_milk).toFixed(1) + ' L'    : '—';
  const revenue = data.total_revenue != null ? 'Rs.' + Math.round(data.total_revenue).toLocaleString() : '—';
  const fat     = data.avg_fat       != null ? parseFloat(data.avg_fat).toFixed(2) + '%'         : '—';
  const snf     = data.avg_snf       != null ? parseFloat(data.avg_snf).toFixed(2) + '%'         : '—';

  setText('statMilk',    milk);
  setText('statRevenue', revenue);
  setText('statFat',     fat);
  setText('statSnf',     snf);

  const records = data.records || [];

  if (!records.length) {
    setModalState('empty');
    return;
  }

  // Build rows
  const tbody = document.getElementById('historyTbody');
  tbody.innerHTML = '';

  records.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(r.date)}</td>
      <td class="ta-center">
        <span class="session-badge session-${(r.session||'').toLowerCase()}">${capitalize(r.session)}</span>
      </td>
      <td class="ta-right">${r.milk_liters != null ? (+r.milk_liters).toFixed(1) : '—'}</td>
      <td class="ta-right">${r.fat_percent != null ? (+r.fat_percent).toFixed(2) : '—'}</td>
      <td class="ta-right">${r.snf_percent != null ? (+r.snf_percent).toFixed(2) : '—'}</td>
      <td class="ta-right"><span class="amt">${r.amount != null ? 'Rs.' + Math.round(r.amount).toLocaleString() : '—'}</span></td>
    `;
    tbody.appendChild(tr);
  });

  setModalState('table');
}

/* Toggle which state is visible in the modal body */
function setModalState(state) {
  const loading   = document.getElementById('modalLoading');
  const empty     = document.getElementById('historyEmpty');
  const tableWrap = document.getElementById('historyTableWrap');

  loading.style.display   = state === 'loading' ? 'flex'   : 'none';
  empty.style.display     = state === 'empty'   ? 'block'  : 'none';
  tableWrap.style.display = state === 'table'   ? 'block'  : 'none';

  if (state === 'error') {
    empty.style.display   = 'block';
    empty.textContent     = '⚠️ Failed to load records. Please try again.';
  } else {
    empty.textContent     = 'No records found for this period.';
  }
}


/* ════════════════════════════════════════════
   ⑧ PRINT FARMER HISTORY
════════════════════════════════════════════ */

function printFarmerHistory() {
  const name    = document.getElementById('modalFarmerName')?.textContent || '—';
  const meta    = document.getElementById('modalFarmerMeta')?.textContent || '';
  const milk    = document.getElementById('statMilk')?.textContent        || '—';
  const revenue = document.getElementById('statRevenue')?.textContent     || '—';
  const fat     = document.getElementById('statFat')?.textContent         || '—';
  const snf     = document.getElementById('statSnf')?.textContent         || '—';
  const table   = document.getElementById('historyTable');

  if (!table || document.getElementById('historyTableWrap').style.display === 'none') {
    showToast('No data available to print.', 'warn');
    return;
  }

  const win = window.open('', '_blank', 'width=960,height=720');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Farmer History – ${escHtml(name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #111; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .farm-name { font-size: 20px; font-weight: 700; }
    .farm-meta { font-size: 12px; color: #666; margin-top: 4px; }
    .brand { font-size: 13px; font-weight: 600; color: #2D6A4F; }
    .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
    .stat { background: #f5f5f3; border-radius: 8px; padding: 12px 14px; }
    .stat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #888; margin-bottom: 4px; }
    .stat-value { font-size: 16px; font-weight: 700; }
    .green { color: #16A34A; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f5f5f3; text-align: left; padding: 8px 10px; border-bottom: 1px solid #e0e0e0;
         font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #666; }
    td { padding: 9px 10px; border-bottom: 1px solid #f0f0f0; }
    .ta-right  { text-align: right; }
    .ta-center { text-align: center; }
    .amt { color: #16A34A; font-weight: 600; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .morning { background: #FEF9C3; color: #854D0E; }
    .evening { background: #EDE9FE; color: #4C1D95; }
    .footer { margin-top: 20px; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="farm-name">${escHtml(name)}</div>
      <div class="farm-meta">${escHtml(meta)}</div>
    </div>
    <div class="brand">🐄 DairyMS</div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-label">Total Milk</div><div class="stat-value">${escHtml(milk)}</div></div>
    <div class="stat"><div class="stat-label">Revenue</div><div class="stat-value green">${escHtml(revenue)}</div></div>
    <div class="stat"><div class="stat-label">Avg Fat %</div><div class="stat-value">${escHtml(fat)}</div></div>
    <div class="stat"><div class="stat-label">Avg SNF %</div><div class="stat-value">${escHtml(snf)}</div></div>
  </div>
  ${table.outerHTML}
  <div class="footer">Printed on ${new Date().toLocaleString()} · DairyMS Reports</div>
</body></html>`);

  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}


/* ════════════════════════════════════════════
   ⑨ TOAST NOTIFICATION
════════════════════════════════════════════ */

function showToast(msg, type = 'info') {
  // Remove existing toasts
  document.querySelectorAll('.dms-toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'dms-toast';
  toast.textContent = msg;

  Object.assign(toast.style, {
    position:     'fixed',
    bottom:       '24px',
    right:        '24px',
    padding:      '10px 18px',
    borderRadius: '8px',
    fontSize:     '13px',
    fontFamily:   "'Sora', sans-serif",
    fontWeight:   '500',
    zIndex:       '9999',
    boxShadow:    '0 8px 24px rgba(0,0,0,.15)',
    animation:    'slideUp .25s ease',
    background:   type === 'warn' ? '#D97706' : '#1A1916',
    color:        '#fff',
    maxWidth:     '340px',
  });

  // Inject keyframe if not already there
  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = `
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }`;
    document.head.appendChild(s);
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    // Handle "29 May 2025" format from Django strftime('%d %b %Y')
    const parts = dateStr.trim().split(' ');
    if (parts.length === 3) {
      const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5,
                       Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
      const d = new Date(+parts[2], months[parts[1]], +parts[0]);
      if (!isNaN(d)) return d.toLocaleDateString('en-GB', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    // Fallback: ISO format "2025-05-29"
    const d = new Date(dateStr + 'T00:00:00');
    if (!isNaN(d)) return d.toLocaleDateString('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    });
    return dateStr;
  } catch { return dateStr; }
}
function capitalize(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
