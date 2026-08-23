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
      li.innerHTML = '<a class="nav-link" data-page="grantleave"><i class="bi bi-calendar-plus"></i> Grant Leave</a>';
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
        document.getElementById('pageTitle').innerText = 'Grant Leave';
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
              '<button class="btn btn-warning btn-sm" onclick="app.applyStatusNow()" title="Flip anyone currently on leave to On Leave, and list those to reactivate"><i class="bi bi-lightning-charge"></i> Apply Status Changes Now</button>' +
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

    app.GMATRIX = null;

    app.loadGrantPage = async function () {
      const wrap = document.getElementById('grantTableWrap');
      wrap.innerHTML = '<div class="text-muted small">Loading…</div>';
      try {
        const d = await callApi('method=getGrantMatrix');
        app.GMATRIX = d;
        app.renderGrantTable('');
      } catch (err) { wrap.innerHTML = '<div class="alert alert-danger mb-0">' + err.message + '</div>'; }
      app.loadReactivateReminders();
    };

    app.balFor = function (empId, type) {
      const b = app.GMATRIX && app.GMATRIX.balances[empId];
      if (!b) return null;
      const v = b[String(type).toLowerCase()];
      return (v === undefined) ? null : v;
    };

    app.renderGrantTable = function (q) {
      const wrap = document.getElementById('grantTableWrap');
      const M = app.GMATRIX;
      if (!M) { wrap.innerHTML = '<div class="text-muted small">No data.</div>'; return; }
      let emps = M.employees;
      if (q) emps = emps.filter(r => (r.name || '').toLowerCase().includes(q) || (r.id || '').toLowerCase().includes(q));
      if (!emps.length) { wrap.innerHTML = '<div class="text-muted small">No employees.</div>'; return; }
      const typeOpts = M.types.map(t => '<option>' + t.type + '</option>').join('');
      const today = new Date().toISOString().split('T')[0];

      const body = emps.map(r => {
        const badge = String(r.status).toLowerCase() === 'on leave' ? '<span class="badge bg-info text-dark">On Leave</span>'
                    : String(r.status).toLowerCase() === 'inactive' ? '<span class="badge bg-secondary">Inactive</span>'
                    : '<span class="badge bg-success">Active</span>';
        const firstType = M.types.length ? M.types[0].type : 'Annual';
        const bal = app.balFor(r.id, firstType);
        const balHtml = bal === null ? '<span class="text-warning">not allocated</span>' : '<b>' + bal + '</b>';
        return '<tr data-emp="' + r.id + '">' +
          '<td>' + r.id + '</td><td>' + r.name + '</td><td>' + badge + '</td>' +
          '<td><select class="form-select form-select-sm gv-type" style="min-width:130px" onchange="app.onTypeChange(\'' + r.id + '\')">' + typeOpts + '</select></td>' +
          '<td class="text-end gv-bal" style="min-width:90px">' + balHtml + '</td>' +
          '<td><input type="date" class="form-control form-control-sm gv-start" value="' + today + '" style="min-width:140px"></td>' +
          '<td><input type="date" class="form-control form-control-sm gv-end" value="' + today + '" style="min-width:140px"></td>' +
          '<td class="text-end gv-days">1</td>' +
          '<td class="text-end"><button class="btn btn-primary btn-sm" onclick="app.grantRow(\'' + r.id + '\')"><i class="bi bi-check2"></i> Grant</button></td>' +
          '</tr>';
      }).join('');
      wrap.innerHTML = '<table class="table table-sm table-striped align-middle"><thead><tr>' +
        '<th>ID</th><th>Name</th><th>Status</th><th>Leave Type</th><th class="text-end">Balance</th><th>Start</th><th>End</th><th class="text-end">Days</th><th></th>' +
        '</tr></thead><tbody>' + body + '</tbody></table>';

      // wire per-row day calc
      wrap.querySelectorAll('tr[data-emp]').forEach(tr => {
        const s = tr.querySelector('.gv-start'), e = tr.querySelector('.gv-end'), dd = tr.querySelector('.gv-days');
        const calc = () => { const a = s.value, b = e.value; if (a && b) { const n = Math.round((new Date(b) - new Date(a)) / 86400000) + 1; dd.innerText = n > 0 ? n : '—'; } };
        s.addEventListener('change', calc); e.addEventListener('change', calc);
      });
    };

    app.onTypeChange = function (empId) {
      const tr = document.querySelector('tr[data-emp="' + empId + '"]');
      if (!tr) return;
      const type = tr.querySelector('.gv-type').value;
      const bal = app.balFor(empId, type);
      tr.querySelector('.gv-bal').innerHTML = bal === null ? '<span class="text-warning">not allocated</span>' : '<b>' + bal + '</b>';
    };

    app.grantRow = async function (empId) {
      const tr = document.querySelector('tr[data-emp="' + empId + '"]');
      if (!tr) return;
      const type = tr.querySelector('.gv-type').value;
      const start = tr.querySelector('.gv-start').value;
      const end = tr.querySelector('.gv-end').value;
      const btn = tr.querySelector('button');
      if (!start || !end) { alert('Start and end dates required.'); return; }
      if (new Date(end) < new Date(start)) { alert('End is before start.'); return; }
      const bal = app.balFor(empId, type);
      if (bal === null) { if (!confirm(type + ' is not allocated to this employee. Allocate it first (Leave Allocation), or continue anyway?')) return; }
      const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      try {
        const toDd = (iso) => { const [y,m,d] = iso.split('-'); return d + '-' + m + '-' + y; };
        const qs = 'method=grantLeave&empId=' + encodeURIComponent(empId) + '&type=' + encodeURIComponent(type) +
          '&start=' + encodeURIComponent(toDd(start)) + '&end=' + encodeURIComponent(toDd(end)) +
          '&by=' + encodeURIComponent(adminEmail());
        const d = await callApi(qs);
        btn.innerHTML = '<i class="bi bi-check-circle"></i> Done';
        btn.className = 'btn btn-success btn-sm';
        setTimeout(() => app.loadGrantPage(), 1200);
      } catch (err) { alert(err.message); btn.disabled = false; btn.innerHTML = orig; }
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
