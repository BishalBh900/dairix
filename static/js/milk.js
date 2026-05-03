// ── Rate Calculator ──
function calcRate() {
  const qty   = parseFloat(document.getElementById('quantity')?.value)   || 0;
  const fat   = parseFloat(document.getElementById('fat')?.value)        || 0;
  const snf   = parseFloat(document.getElementById('snf')?.value)        || 0;
  const allow = parseFloat(document.getElementById('allowances')?.value) || 0;
  const rate  = (fat * 11) + (snf * 2.62);
  const total = (qty * rate) + allow;
  document.getElementById('rateOut').textContent  = 'Rs.' + rate.toFixed(2);
  document.getElementById('totalOut').textContent = 'Rs.' + total.toFixed(2);
}

function toggleCustom(val) {
  document.getElementById('customRange').style.display = val === 'custom' ? 'flex' : 'none';
  if (val !== 'custom') document.querySelector('form').submit();
}

// ── Compute footer total from existing rows on page load ──
function recomputeFooter() {
  const tbody = document.getElementById('sessionTbody');
  const ft    = document.getElementById('footerTotal');
  if (!tbody || !ft) return;
  let sum = 0;
  tbody.querySelectorAll('tr').forEach(tr => {
    const cell = tr.querySelector('td:last-child');
    if (cell) sum += parseFloat(cell.textContent.replace('Rs.','').trim()) || 0;
  });
  ft.textContent = 'Rs.' + sum.toFixed(2);
}

// ─────────────────────────────────────────
// ── DATE + SESSION LOCK SYSTEM ──
// ─────────────────────────────────────────
const milkForm = document.getElementById('milkForm');
if (milkForm) {

  const LOCK_KEY = 'milkLock_v1';

  function fmtDate(iso) {
    const [y, m, d] = iso.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d} ${months[+m-1]} ${y}`;
  }

  window.onDateChange = function() {
    const val = document.getElementById('dateInput').value;
    if (val) {
      document.getElementById('sessionStep').classList.remove('form-disabled');
    } else {
      document.getElementById('sessionStep').classList.add('form-disabled');
      document.getElementById('lockBothRow').style.display = 'none';
    }
  };

  window.pickSession = function(session) {
    document.getElementById('session').value = session;
    document.getElementById('btnMorning').className = 'session-btn' + (session === 'Morning' ? ' active-morning' : '');
    document.getElementById('btnEvening').className = 'session-btn' + (session === 'Evening' ? ' active-evening' : '');
    if (document.getElementById('dateInput').value) {
      document.getElementById('lockBothRow').style.display = 'block';
    }
  };

  window.lockBoth = function() {
    const dateVal = document.getElementById('dateInput').value;
    const session = document.getElementById('session').value;
    if (!dateVal) { alert('Please select a date first.'); return; }
    if (!session)  { alert('Please select Morning or Evening.'); return; }
    localStorage.setItem(LOCK_KEY, JSON.stringify({ date: dateVal, session }));
    applyLock(dateVal, session);
    loadSessionPanel(dateVal, session);
  };

  window.unlockDate = function() {
    localStorage.removeItem(LOCK_KEY);
    applyFullUnlock();
  };

  window.unlockSession = function() {
    const saved = JSON.parse(localStorage.getItem(LOCK_KEY) || '{}');
    localStorage.removeItem(LOCK_KEY);
    document.getElementById('datePicker').style.display    = 'none';
    document.getElementById('dateLocked').style.display    = 'flex';
    document.getElementById('sessionLocked').style.display = 'none';
    document.getElementById('sessionPicker').style.display = 'flex';
    document.getElementById('sessionStep').classList.remove('form-disabled');
    document.getElementById('entryFields').classList.add('form-disabled');
    document.getElementById('sessionStatus').style.display = 'none';
    document.getElementById('lockBothRow').style.display   = 'block';
    document.getElementById('btnMorning').className = 'session-btn';
    document.getElementById('btnEvening').className = 'session-btn';
    document.getElementById('session').value = '';
    if (saved.date) document.getElementById('dateInput').value = saved.date;
  };

  function applyLock(dateVal, session) {
    document.getElementById('datePicker').style.display    = 'none';
    document.getElementById('sessionPicker').style.display = 'none';
    document.getElementById('lockBothRow').style.display   = 'none';

    const dateBadge = document.getElementById('dateLocked');
    dateBadge.style.display = 'flex';
    dateBadge.className = 'lock-badge date-locked';
    document.getElementById('dateLockedLabel').textContent = '🔒 📅 ' + fmtDate(dateVal);

    const sesBadge = document.getElementById('sessionLocked');
    sesBadge.style.display = 'flex';
    sesBadge.className = 'lock-badge ' + (session === 'Morning' ? 'morning-locked' : 'evening-locked');
    document.getElementById('sessionLockedLabel').textContent =
      session === 'Morning' ? '🔒 🌅 Morning' : '🔒 🌙 Evening';

    document.getElementById('date').value    = dateVal;
    document.getElementById('session').value = session;
    document.getElementById('entryFields').classList.remove('form-disabled');
    document.getElementById('sessionStep').classList.remove('form-disabled');

    const bar = document.getElementById('sessionStatus');
    bar.style.display = 'block';
    bar.textContent = `📋 ${session} session on ${fmtDate(dateVal)} is locked. Enter farmers' milk below.`;

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [y,mo,d] = dateVal.split('-');
    const label = `${session} — ${d} ${months[+mo-1]} ${y}`;
    const pt = document.getElementById('panelTitle');
    if (pt) pt.textContent = label;

    document.getElementById('farmer_id').focus();
  }

  function applyFullUnlock() {
    document.getElementById('datePicker').style.display    = 'flex';
    document.getElementById('dateLocked').style.display    = 'none';
    document.getElementById('sessionPicker').style.display = 'flex';
    document.getElementById('sessionLocked').style.display = 'none';
    document.getElementById('lockBothRow').style.display   = 'none';
    document.getElementById('entryFields').classList.add('form-disabled');
    document.getElementById('sessionStep').classList.add('form-disabled');
    document.getElementById('sessionStatus').style.display = 'none';
    document.getElementById('date').value      = '';
    document.getElementById('session').value   = '';
    document.getElementById('dateInput').value = '';
    document.getElementById('btnMorning').className = 'session-btn';
    document.getElementById('btnEvening').className = 'session-btn';
  }

  // ── Fetch and re-render session panel via AJAX ──
  function loadSessionPanel(dateVal, session) {
    fetch(`?panel_date=${dateVal}&panel_session=${session}`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest-Panel' }
    })
    .then(r => r.json())
    .then(data => {
      const wrap = document.getElementById('sessionTableWrap');
      const ec   = document.getElementById('entryCount');
      const records = data.records || [];

      ec.textContent = records.length + (records.length === 1 ? ' entry' : ' entries');

      if (records.length === 0) {
        wrap.innerHTML = `
          <div class="empty-state" id="emptyState">
            <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" width="48" height="48">
              <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
            </svg>
            <p>No entries yet for this session.</p>
          </div>`;
        return;
      }

      let rows = '';
      let sum  = 0;
      records.forEach(r => {
        sum += parseFloat(r.total_amount) || 0;
        rows += `<tr>
          <td style="font-weight:500;">${r.farmer_name}</td>
          <td>${parseFloat(r.quantity).toFixed(1)}</td>
          <td>${parseFloat(r.fat).toFixed(2)}</td>
          <td>${parseFloat(r.snf).toFixed(2)}</td>
          <td>Rs.${parseFloat(r.rate).toFixed(2)}</td>
          <td style="text-align:right;font-weight:600;">Rs.${parseFloat(r.total_amount).toFixed(2)}</td>
        </tr>`;
      });

      wrap.innerHTML = `
        <div class="session-table-wrap">
          <table>
            <thead><tr>
              <th>Farmer</th><th>Qty (L)</th><th>Fat</th>
              <th>SNF</th><th>Rate</th><th style="text-align:right;">Total</th>
            </tr></thead>
            <tbody id="sessionTbody">${rows}</tbody>
            <tfoot><tr>
              <td colspan="5">Total</td>
              <td style="text-align:right;"><span id="footerTotal">Rs.${sum.toFixed(2)}</span></td>
            </tr></tfoot>
          </table>
        </div>`;
    })
    .catch(() => {});
  }

  // ── On page load ──
  const saved = localStorage.getItem(LOCK_KEY);
  if (saved) {
    try {
      const { date, session } = JSON.parse(saved);
      if (date && session) {
        document.getElementById('dateInput').value = date;
        document.getElementById('session').value   = session;
        applyLock(date, session);
        loadSessionPanel(date, session);
      }
    } catch(e) {
      localStorage.removeItem(LOCK_KEY);
      document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
    }
  } else {
    document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
    const suggested = milkForm.dataset.activeSession;
    if (suggested === 'Morning' || suggested === 'Evening') {
      window.pickSession(suggested);
    }
  }

  recomputeFooter();

  // ── AJAX submit ──
  milkForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const msg = document.getElementById('formMsg');
    msg.style.color = '';
    msg.textContent = 'Saving…';

    const payload = {
      farmer_id:    document.getElementById('farmer_id').value,
      quantity:     document.getElementById('quantity').value,
      fat:          document.getElementById('fat').value,
      snf:          document.getElementById('snf').value,
      allowances:   document.getElementById('allowances').value,
      rate:         parseFloat(document.getElementById('rateOut').textContent.replace('Rs.','')),
      total_amount: parseFloat(document.getElementById('totalOut').textContent.replace('Rs.','')),
      session:      document.getElementById('session').value,
      date:         document.getElementById('date').value,
    };

    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    try {
      const res  = await fetch('', {
        method:  'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type':     'application/json',
          'X-CSRFToken':      csrfToken,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.error) {
        msg.style.color = 'var(--red, red)';
        msg.textContent = data.error;
      } else {
        msg.style.color = 'var(--green, green)';
        msg.textContent = `✓ ${data.session} entry saved for ${data.farmer_name}!`;

        let tbody = document.getElementById('sessionTbody');
        const emptyState = document.getElementById('emptyState');

        if (!tbody) {
          document.getElementById('sessionTableWrap').innerHTML = `
            <div class="session-table-wrap">
              <table>
                <thead><tr>
                  <th>Farmer</th><th>Qty (L)</th><th>Fat</th>
                  <th>SNF</th><th>Rate</th><th style="text-align:right;">Total</th>
                </tr></thead>
                <tbody id="sessionTbody"></tbody>
                <tfoot><tr>
                  <td colspan="5">Total</td>
                  <td style="text-align:right;"><span id="footerTotal">Rs.0.00</span></td>
                </tr></tfoot>
              </table>
            </div>`;
          tbody = document.getElementById('sessionTbody');
        }

        if (emptyState) emptyState.remove();

        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="font-weight:500;">${data.farmer_name}</td>
          <td>${parseFloat(data.quantity).toFixed(1)}</td>
          <td>${parseFloat(data.fat).toFixed(2)}</td>
          <td>${parseFloat(data.snf).toFixed(2)}</td>
          <td>Rs.${parseFloat(data.rate).toFixed(2)}</td>
          <td style="text-align:right;font-weight:600;">Rs.${parseFloat(data.total_amount).toFixed(2)}</td>`;
        tbody.appendChild(row);

        let sum = 0;
        tbody.querySelectorAll('tr').forEach(tr => {
          const cell = tr.querySelector('td:last-child');
          if (cell) sum += parseFloat(cell.textContent.replace('Rs.','').trim()) || 0;
        });
        const ft = document.getElementById('footerTotal');
        if (ft) ft.textContent = 'Rs.' + sum.toFixed(2);

        const count = tbody.querySelectorAll('tr').length;
        const ec = document.getElementById('entryCount');
        if (ec) ec.textContent = count + (count === 1 ? ' entry' : ' entries');

        document.getElementById('farmer_id').value  = '';
        document.getElementById('quantity').value   = '';
        document.getElementById('fat').value        = '';
        document.getElementById('snf').value        = '';
        document.getElementById('allowances').value = '0';
        document.getElementById('rateOut').textContent  = 'Rs.0.00';
        document.getElementById('totalOut').textContent = 'Rs.0.00';
        document.getElementById('farmer_id').focus();
        setTimeout(() => { msg.textContent = ''; }, 2000);
      }
    } catch {
      msg.style.color = 'var(--red, red)';
      msg.textContent = 'Network error — please try again.';
    }
  });
}