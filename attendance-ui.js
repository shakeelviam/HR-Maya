// ============================================================
// attendance-ui.js — Attendance page: view + admin amend the log
// ------------------------------------------------------------
// Replaces the old stub Attendance page content. Filters by date/employee/
// location, shows punches, and lets the admin Add / Edit / Delete (audited).
// index.html (after app.js):  <script src="attendance-ui.js"></script>
// Backend: getAttendanceLog, addAttendancePunch, editAttendancePunch, deleteAttendancePunch.
// ============================================================

(function () {
  const EXEC_URL = 'https://script.google.com/macros/s/AKfycbyG5XLC79FnyLtSGGWunhJwU83SV0b0kz3y1FKdal-JBcTUM-X0ax134konYyTaKxYiiQ/exec';
  const STAGES = ['Check In', 'Break Out', 'Break In', 'Check Out'];
  let EMPS = [];

  function todayIso() { return new Date().toISOString().split('T')[0]; }
  function toDd(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return d + '-' + m + '-' + y; }
  function adminEmail() { const el = document.getElementById('userEmail'); return el && el.innerText && el.innerText !== 'Loading...' ? el.innerText.trim() : 'Admin'; }

  async function api(qs) { const r = await fetch(EXEC_URL + '?' + qs + '&_=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); const d = await r.json(); if (!d.success) throw new Error(d.error || 'err'); return d; }
  async function post(m, b) {
    // one auto-retry for Apps Script cold-start
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(EXEC_URL + '?method=' + m, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(b) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json(); if (!d.success) throw new Error(d.error || 'err'); return d;
      } catch (e) { if (attempt === 1) throw e; await new Promise(res => setTimeout(res, 800)); }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Replace the stub Attendance page section content.
    const attach = () => {
      const sec = document.getElementById('page-attendance');
      if (!sec) return setTimeout(attach, 100);
      sec.innerHTML =
        '<div class="table-container mb-3">' +
          '<div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">' +
            '<h5 class="mb-0"><i class="bi bi-calendar-check"></i> Attendance Log</h5>' +
            '<button class="btn btn-primary btn-sm" onclick="app.openAddPunch()"><i class="bi bi-plus-circle"></i> Add Punch</button>' +
          '</div>' +
          '<div class="row g-2 align-items-end">' +
            '<div class="col-auto"><label class="form-label small mb-1">Date</label><input type="date" id="atDate" class="form-control form-control-sm" value="' + todayIso() + '"></div>' +
            '<div class="col-auto"><label class="form-label small mb-1">Employee ID</label><input id="atEmp" class="form-control form-control-sm" placeholder="MT-…"></div>' +
            '<div class="col-auto"><label class="form-label small mb-1">Location</label><input id="atLoc" class="form-control form-control-sm" placeholder="any"></div>' +
            '<div class="col-auto"><button class="btn btn-outline-secondary btn-sm" onclick="app.loadAttendance()"><i class="bi bi-search"></i> Load</button></div>' +
            '<div class="col-auto"><button class="btn btn-outline-secondary btn-sm" onclick="document.getElementById(\'atEmp\').value=\'\';document.getElementById(\'atLoc\').value=\'\';app.loadAttendance()">Clear</button></div>' +
          '</div>' +
        '</div>' +
        '<div id="atTableWrap" class="table-container table-responsive"><div class="text-muted small">Pick a date and Load.</div></div>';
    };
    attach();
  });

  (function wire() {
    if (typeof app === 'undefined') return setTimeout(wire, 50);

    app.loadAttendance = async function () {
      const wrap = document.getElementById('atTableWrap');
      wrap.innerHTML = '<div class="text-muted small">Loading…</div>';
      if (!EMPS.length && app.employeesData) EMPS = app.employeesData.map(e => ({ id: e['Employee ID'], name: e['Name (English)'] }));
      let qs = 'method=getAttendanceLog';
      const dt = document.getElementById('atDate').value; if (dt) qs += '&date=' + encodeURIComponent(toDd(dt));
      const emp = document.getElementById('atEmp').value.trim(); if (emp) qs += '&empId=' + encodeURIComponent(emp);
      const loc = document.getElementById('atLoc').value.trim(); if (loc) qs += '&location=' + encodeURIComponent(loc);
      try {
        const d = await api(qs);
        if (!d.rows.length) { wrap.innerHTML = '<div class="text-muted small">No punches for this filter.</div>'; return; }
        const body = d.rows.map(r => {
          const flag = /OK/.test(r.flag) ? '<span class="text-success small">' + r.flag + '</span>'
            : /MANUAL/.test(r.flag) ? '<span class="text-primary small">' + r.flag + '</span>'
            : '<span class="text-danger small">' + (r.flag || '—') + '</span>';
          const tm = (r.ts.split(' ')[1] || '').slice(0, 5);
          return '<tr><td>' + r.empId + '</td><td>' + (r.name || '') + '</td><td>' + r.date + '</td><td>' + tm + '</td><td>' + r.stage + '</td><td>' + (r.branch || '') + '</td><td>' + flag + '</td>' +
            '<td class="text-end"><button class="btn btn-outline-secondary btn-sm me-1" onclick="app.openEditPunch(' + r.row + ',\'' + r.stage + '\',\'' + tm + '\',\'' + String(r.branch || '').replace(/'/g,"\\'") + '\')"><i class="bi bi-pencil"></i></button>' +
              '<button class="btn btn-outline-danger btn-sm" onclick="app.deletePunch(' + r.row + ',\'' + r.empId + '\',\'' + r.stage + '\')"><i class="bi bi-trash"></i></button></td></tr>';
        }).join('');
        wrap.innerHTML = '<table class="table table-sm table-striped align-middle"><thead><tr><th>ID</th><th>Name</th><th>Date</th><th>Time</th><th>Stage</th><th>Location</th><th>Geo</th><th></th></tr></thead><tbody>' + body + '</tbody></table>';
      } catch (err) { wrap.innerHTML = '<div class="alert alert-danger mb-0">' + err.message + '</div>'; }
    };

    app.openAddPunch = function () {
      const empOpts = (app.employeesData || []).map(e => '<option value="' + e['Employee ID'] + '">' + e['Name (English)'] + ' (' + e['Employee ID'] + ')</option>').join('');
      const html =
        '<div class="modal fade" id="apModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
          '<div class="modal-header"><h5 class="modal-title">Add Punch (manual)</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>' +
          '<div class="modal-body"><div class="row g-2">' +
            '<div class="col-12"><label class="form-label small mb-1">Employee</label><select id="apEmp" class="form-select form-select-sm">' + empOpts + '</select></div>' +
            '<div class="col-6"><label class="form-label small mb-1">Date</label><input type="date" id="apDate" class="form-control form-control-sm" value="' + (document.getElementById('atDate').value || todayIso()) + '"></div>' +
            '<div class="col-6"><label class="form-label small mb-1">Time</label><input type="time" id="apTime" class="form-control form-control-sm"></div>' +
            '<div class="col-6"><label class="form-label small mb-1">Stage</label><select id="apStage" class="form-select form-select-sm">' + STAGES.map(s => '<option>' + s + '</option>').join('') + '</select></div>' +
            '<div class="col-6"><label class="form-label small mb-1">Location</label><input id="apLoc" class="form-control form-control-sm"></div>' +
          '</div><div id="apStatus" class="mt-2"></div></div>' +
          '<div class="modal-footer"><button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>' +
            '<button class="btn btn-primary btn-sm" onclick="app.saveAddPunch()"><i class="bi bi-check2"></i> Add</button></div>' +
        '</div></div></div>';
      const old = document.getElementById('apModal'); if (old) old.remove();
      document.body.insertAdjacentHTML('beforeend', html);
      new bootstrap.Modal(document.getElementById('apModal')).show();
    };

    app.saveAddPunch = async function () {
      const status = document.getElementById('apStatus');
      const payload = { empId: document.getElementById('apEmp').value, date: toDd(document.getElementById('apDate').value),
        time: document.getElementById('apTime').value, stage: document.getElementById('apStage').value,
        location: document.getElementById('apLoc').value.trim(), by: adminEmail() };
      if (!payload.empId || !payload.date) { status.innerHTML = '<div class="alert alert-warning mb-0 py-1">Employee and date required.</div>'; return; }
      try { const d = await post('addAttendancePunch', payload); status.innerHTML = '<div class="alert alert-success mb-0 py-1">' + d.message + '</div>';
        setTimeout(() => { const m = bootstrap.Modal.getInstance(document.getElementById('apModal')); if (m) m.hide(); app.loadAttendance(); }, 1000); }
      catch (err) { status.innerHTML = '<div class="alert alert-danger mb-0 py-1">' + err.message + '</div>'; }
    };

    app.openEditPunch = function (row, stage, time, loc) {
      const html =
        '<div class="modal fade" id="epuModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
          '<div class="modal-header"><h5 class="modal-title">Edit Punch</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>' +
          '<div class="modal-body"><div class="row g-2">' +
            '<div class="col-6"><label class="form-label small mb-1">Stage</label><select id="epuStage" class="form-select form-select-sm">' + STAGES.map(s => '<option' + (s===stage?' selected':'') + '>' + s + '</option>').join('') + '</select></div>' +
            '<div class="col-6"><label class="form-label small mb-1">Time</label><input type="time" id="epuTime" class="form-control form-control-sm" value="' + (time || '') + '"></div>' +
            '<div class="col-12"><label class="form-label small mb-1">Location</label><input id="epuLoc" class="form-control form-control-sm" value="' + (loc || '') + '"></div>' +
          '</div><div id="epuStatus" class="mt-2"></div></div>' +
          '<div class="modal-footer"><button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>' +
            '<button class="btn btn-primary btn-sm" onclick="app.saveEditPunch(' + row + ')"><i class="bi bi-check2"></i> Save</button></div>' +
        '</div></div></div>';
      const old = document.getElementById('epuModal'); if (old) old.remove();
      document.body.insertAdjacentHTML('beforeend', html);
      new bootstrap.Modal(document.getElementById('epuModal')).show();
    };

    app.saveEditPunch = async function (row) {
      const status = document.getElementById('epuStatus');
      const payload = { row: row, stage: document.getElementById('epuStage').value, time: document.getElementById('epuTime').value, location: document.getElementById('epuLoc').value.trim(), by: adminEmail() };
      try { const d = await post('editAttendancePunch', payload); status.innerHTML = '<div class="alert alert-success mb-0 py-1">' + d.message + '</div>';
        setTimeout(() => { const m = bootstrap.Modal.getInstance(document.getElementById('epuModal')); if (m) m.hide(); app.loadAttendance(); }, 1000); }
      catch (err) { status.innerHTML = '<div class="alert alert-danger mb-0 py-1">' + err.message + '</div>'; }
    };

    app.deletePunch = async function (row, empId, stage) {
      if (!confirm('Delete ' + stage + ' for ' + empId + '?')) return;
      try { await api('method=deleteAttendancePunch&row=' + row + '&by=' + encodeURIComponent(adminEmail())); app.loadAttendance(); }
      catch (err) { alert(err.message); }
    };
  })();
})();
