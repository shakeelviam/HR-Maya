// ============================================================
// grant-ui.js — Leave Management page: grant leave + reactivation reminders
// ------------------------------------------------------------
// One line in index.html, AFTER leave-ui.js:
//   <script src="grant-ui.js"></script>
// Injects its own sidebar link + page. Backend: getRemainingVacationTally,
// getLeaveTypes, grantLeave, getLeaveStatusReminders, applyLeaveStatusChanges.
// ============================================================

(function () {
  const EXEC_URL = 'https://script.google.com/macros/s/AKfycbyG5XLC79FnyLtSGGWunhJwU83SV0b0kz3y1FKdal-JBcTUM-X0ax134konYyTaKxYiiQ/exec';
  let GTYPES = [];
  let TALLY = [];

  function todayIso() { return new Date().toISOString().split('T')[0]; }
  function toDdMmYyyy(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return d + '-' + m + '-' + y; }
  function adminEmail() { const el = document.getElementById('userEmail'); return el && el.innerText && el.innerText !== 'Loading...' ? el.innerText.trim() : 'Dashboard'; }

  async function callApi(qs) {
    const res = await fetch(EXEC_URL + '?' + qs + '&_=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json(); if (!d.success) throw new Error(d.error || 'Unknown error'); return d;
  }

  document.addEventListener('DOMContentLoaded', function () {
    const navList = document.querySelector('#sidebar ul.nav');
    if (navList && !document.querySelector('[data-page="grantleave"]')) {
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.innerHTML = '<a class="nav-link" data-page="grantleave"><i class="bi bi-calendar-plus"></i> Leave Management</a>';
      const bal = document.querySelector('[data-page="leavebal"]');
      if (bal && bal.closest('li')) bal.closest('li').insertAdjacentElement('afterend', li);
      else navList.appendChild(li);
      li.querySelector('.nav-link').addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('#sidebar .nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
        const pg = document.getElementById('page-grantleave');
        if (pg) pg.classList.add('active');
        document.getElementById('pageTitle').innerText = 'Leave Management';
        if (app.loadGrantPage) app.loadGrantPage();
      });
    }

    const anchor = document.getElementById('page-dashboard');
    if (anchor && anchor.parentElement && !document.getElementById('page-grantleave')) {
      const s = document.createElement('div');
      s.className = 'page-section'; s.id = 'page-grantleave';
      s.innerHTML =
        '<div id="reactivateWrap"></div>' +
        '<div class="table-container mb-4">' +
          '<div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">' +
            '<h5><i class="bi bi-calendar-plus"></i> Grant Leave</h5>' +
            '<div class="d-flex gap-2">' +
              '<input type="text" id="grantSearch" class="form-control form-control-sm" style="width:200px" placeholder="Search name / ID">' +
              '<button class="btn btn-outline-secondary btn-sm" onclick="app.loadGrantPage()"><i class="bi bi-arrow-repeat"></i> Refresh</button>' +
            '</div>' +
          '</div>' +
          '<div id="grantTableWrap" class="table-responsive"><div class="text-muted small">Loading…</div></div>' +
        '</div>';
      anchor.parentElement.appendChild(s);

      const se = s.querySelector('#grantSearch');
      if (se) se.addEventListener('input', function () { app.renderGrantTable(this.value.trim().toLowerCase()); });
    }
  });

  (function attach() {
    if (typeof app === 'undefined') return setTimeout(attach, 50);

    app.loadGrantPage = async function () {
      const wrap = document.getElementById('grantTableWrap');
      wrap.innerHTML = '<div class="text-muted small">Loading…</div>';
      try {
        const t = await callApi('method=getLeaveTypes'); GTYPES = t.data || [];
      } catch (e) { GTYPES = []; }
      try {
        const d = await callApi('method=getRemainingVacationTally');
        TALLY = d.data || [];
        app.renderGrantTable('');
      } catch (err) { wrap.innerHTML = '<div class="alert alert-danger mb-0">' + err.message + '</div>'; }
      app.loadReactivateReminders();
    };

    app.renderGrantTable = function (q) {
      const wrap = document.getElementById('grantTableWrap');
      let rows = TALLY;
      if (q) rows = rows.filter(r => (r.name || '').toLowerCase().includes(q) || (r.empId || '').toLowerCase().includes(q));
      if (!rows.length) { wrap.innerHTML = '<div class="text-muted small">No employees.</div>'; return; }
      const body = rows.map(r => {
        const rem = r.balanceRemaining != null ? r.balanceRemaining : r.hrRemaining;
        const warn = r.mismatch ? ' <span class="badge bg-warning text-dark" title="HR Maya ' + r.hrRemaining + ' vs Balances ' + r.balanceRemaining + '">⚠ check</span>' : '';
        const badge = String(r.status).toLowerCase() === 'on leave' ? '<span class="badge bg-info text-dark">On Leave</span>'
                    : String(r.status).toLowerCase() === 'inactive' ? '<span class="badge bg-secondary">Inactive</span>'
                    : '<span class="badge bg-success">Active</span>';
        return '<tr><td>' + r.empId + '</td><td>' + r.name + '</td><td>' + badge + '</td>' +
          '<td class="text-end fw-bold">' + rem + warn + '</td>' +
          '<td class="text-end"><button class="btn btn-primary btn-sm" onclick="app.openGrant(\'' + r.empId + '\',\'' + String(r.name).replace(/'/g, "\\'") + '\',' + rem + ')"><i class="bi bi-calendar-plus"></i> Grant</button></td></tr>';
      }).join('');
      wrap.innerHTML = '<table class="table table-sm table-striped align-middle"><thead><tr>' +
        '<th>ID</th><th>Name</th><th>Status</th><th class="text-end">Remaining Vacation</th><th></th></tr></thead><tbody>' + body + '</tbody></table>';
    };

    app.openGrant = function (empId, name, remaining) {
      const typeOpts = (GTYPES.length ? GTYPES.map(t => t.type) : ['Annual', 'Sick', 'Emergency', 'Unpaid']).map(t => '<option>' + t + '</option>').join('');
      const html =
        '<div class="modal fade" id="grantModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
          '<div class="modal-header"><h5 class="modal-title">Grant Leave — ' + name + ' (' + empId + ')</h5>' +
            '<button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>' +
          '<div class="modal-body">' +
            '<div class="text-muted small mb-2">Remaining vacation: <b>' + remaining + '</b> days</div>' +
            '<div class="row g-2">' +
              '<div class="col-6"><label class="form-label small mb-1">Type</label><select id="grType" class="form-select form-select-sm">' + typeOpts + '</select></div>' +
              '<div class="col-6"><label class="form-label small mb-1">Days (auto)</label><input id="grDays" class="form-control form-control-sm" readonly></div>' +
              '<div class="col-6"><label class="form-label small mb-1">Start date</label><input type="date" id="grStart" class="form-control form-control-sm" value="' + todayIso() + '"></div>' +
              '<div class="col-6"><label class="form-label small mb-1">End date</label><input type="date" id="grEnd" class="form-control form-control-sm" value="' + todayIso() + '"></div>' +
            '</div>' +
            '<div id="grStatus" class="mt-2"></div>' +
            '<div class="text-muted small mt-2">On the <b>start date</b>, vacation/unpaid leave flips the employee to <b>On Leave</b> (excluded from payroll). Sick/Emergency stay Active.</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>' +
            '<button type="button" class="btn btn-primary btn-sm" onclick="app.submitGrant(\'' + empId + '\')"><i class="bi bi-check2"></i> Grant Leave</button>' +
          '</div>' +
        '</div></div></div>';
      const old = document.getElementById('grantModal'); if (old) old.remove();
      document.body.insertAdjacentHTML('beforeend', html);
      const calcDays = () => {
        const s = document.getElementById('grStart').value, e = document.getElementById('grEnd').value;
        if (s && e) { const d = Math.round((new Date(e) - new Date(s)) / 86400000) + 1; document.getElementById('grDays').value = d > 0 ? d : ''; }
      };
      document.getElementById('grStart').addEventListener('change', calcDays);
      document.getElementById('grEnd').addEventListener('change', calcDays);
      calcDays();
      new bootstrap.Modal(document.getElementById('grantModal')).show();
    };

    app.submitGrant = async function (empId) {
      const status = document.getElementById('grStatus');
      const type = document.getElementById('grType').value;
      const start = document.getElementById('grStart').value;
      const end = document.getElementById('grEnd').value;
      if (!start || !end) { status.innerHTML = '<div class="alert alert-warning mb-0 py-1">Start and end dates required.</div>'; return; }
      if (new Date(end) < new Date(start)) { status.innerHTML = '<div class="alert alert-warning mb-0 py-1">End is before start.</div>'; return; }
      try {
        const qs = 'method=grantLeave&empId=' + encodeURIComponent(empId) + '&type=' + encodeURIComponent(type) +
          '&start=' + encodeURIComponent(toDdMmYyyy(start)) + '&end=' + encodeURIComponent(toDdMmYyyy(end)) +
          '&by=' + encodeURIComponent(adminEmail());
        const d = await callApi(qs);
        status.innerHTML = '<div class="alert alert-success mb-0 py-1"><i class="bi bi-check-circle"></i> ' + d.message + '</div>';
        setTimeout(() => { const m = bootstrap.Modal.getInstance(document.getElementById('grantModal')); if (m) m.hide(); app.loadGrantPage(); }, 1400);
      } catch (err) { status.innerHTML = '<div class="alert alert-danger mb-0 py-1">' + err.message + '</div>'; }
    };

    app.loadReactivateReminders = async function () {
      const wrap = document.getElementById('reactivateWrap');
      try {
        const d = await callApi('method=getLeaveStatusReminders');
        if (d.toReactivate && d.toReactivate.length) {
          wrap.innerHTML = '<div class="alert alert-warning"><b><i class="bi bi-bell"></i> Leave ended — reactivate:</b> ' +
            d.toReactivate.map(r => r.name + ' (' + r.id + ')').join(', ') +
            '. <span class="text-muted small">Set their Status back to Active on the employee page.</span></div>';
        } else { wrap.innerHTML = ''; }
      } catch (e) { wrap.innerHTML = ''; }
    };
  })();
})();
