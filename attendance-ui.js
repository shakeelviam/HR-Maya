// ============================================================
// attendance-ui.js — Attendance page
// ------------------------------------------------------------
// Filters: date range (From/To), searchable employee,
//          location dropdown, stage dropdown.
// Backend: getAttendanceLog, addAttendancePunch,
//          editAttendancePunch, deleteAttendancePunch.
//
// NOTE: getAttendanceLog backend must support params:
//   from=dd-mm-yyyy, to=dd-mm-yyyy (in addition to date=)
// ============================================================

(function () {
  const EXEC_URL = 'https://script.google.com/macros/s/AKfycbyG5XLC79FnyLtSGGWunhJwU83SV0b0kz3y1FKdal-JBcTUM-X0ax134konYyTaKxYiiQ/exec';
  const STAGES   = ['Check In', 'Break Out', 'Break In', 'Check Out', 'Day Off'];
  let   EMPS     = [];   // { id, name, location }
  let   LOCS     = [];   // location names

  function todayIso() { return new Date().toISOString().split('T')[0]; }
  function toDd(iso)  { if (!iso) return ''; const [y,m,d] = iso.split('-'); return d+'-'+m+'-'+y; }
  function adminEmail() {
    const el = document.getElementById('userEmail');
    return el && el.innerText && el.innerText !== 'Loading...' ? el.innerText.trim() : 'Admin';
  }
  // Robust time extraction — handles "3 Sep 2026 10:51:32" and "03/09/2026 10:51:32"
  function extractTime(ts) {
    const m = String(ts || '').match(/(\d{1,2}:\d{2})/);
    return m ? m[1] : '';
  }

  async function api(qs) {
    const r = await fetch(EXEC_URL + '?' + qs + '&_=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'err');
    return d;
  }
  async function post(m, b) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(EXEC_URL + '?method=' + m, {
          method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(b)
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if (!d.success) throw new Error(d.error || 'err');
        return d;
      } catch (e) { if (attempt === 1) throw e; await new Promise(res => setTimeout(res, 800)); }
    }
  }

  // ── Build the page ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    const attach = () => {
      const sec = document.getElementById('page-attendance');
      if (!sec) return setTimeout(attach, 100);

      sec.innerHTML =
        '<div class="table-container mb-3">' +
          '<div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">' +
            '<h5 class="mb-0">Attendance Log</h5>' +
            '<button class="btn btn-primary btn-sm" onclick="app.openAddPunch()">' +
              '<i class="bi bi-plus-circle"></i> Add Punch</button>' +
          '</div>' +

          // ── Filter row ───────────────────────────────────────────────
          '<div class="row g-2 align-items-end flex-wrap">' +

            // From date
            '<div class="col-auto">' +
              '<label class="form-label small mb-1">From</label>' +
              '<input type="date" id="atFrom" class="form-control form-control-sm" value="' + todayIso() + '">' +
            '</div>' +

            // To date
            '<div class="col-auto">' +
              '<label class="form-label small mb-1">To</label>' +
              '<input type="date" id="atTo" class="form-control form-control-sm" value="' + todayIso() + '">' +
            '</div>' +

            // Employee — searchable (type → filters datalist)
            '<div class="col-auto" style="position:relative;min-width:220px">' +
              '<label class="form-label small mb-1">Employee</label>' +
              '<input id="atEmpSearch" class="form-control form-control-sm" placeholder="Type name or ID…"' +
                ' autocomplete="off" oninput="app.atFilterEmps()">' +
              '<select id="atEmpDrop" class="form-select form-select-sm mt-1"' +
                ' size="5" style="display:none;position:absolute;z-index:50;width:100%;max-height:140px"' +
                ' onchange="app.atPickEmp(this.value)">' +
              '</select>' +
              '<input type="hidden" id="atEmpId">' +
            '</div>' +

            // Location dropdown
            '<div class="col-auto">' +
              '<label class="form-label small mb-1">Location</label>' +
              '<select id="atLocDrop" class="form-select form-select-sm" style="min-width:160px">' +
                '<option value="">All locations</option>' +
              '</select>' +
            '</div>' +

            // Stage dropdown
            '<div class="col-auto">' +
              '<label class="form-label small mb-1">Stage</label>' +
              '<select id="atStageDrop" class="form-select form-select-sm">' +
                '<option value="">All stages</option>' +
                '<option>Check In</option>' +
                '<option>Break Out</option>' +
                '<option>Break In</option>' +
                '<option>Check Out</option>' +
                '<option>Day Off</option>' +
              '</select>' +
            '</div>' +

            // Buttons
            '<div class="col-auto d-flex gap-2">' +
              '<button class="btn btn-outline-secondary btn-sm" onclick="app.loadAttendance()">' +
                '<i class="bi bi-search"></i> Load</button>' +
              '<button class="btn btn-outline-secondary btn-sm" onclick="app.atClearFilters()">Clear</button>' +
            '</div>' +

          '</div>' + // /row
        '</div>' +   // /table-container

        '<div id="atTableWrap" class="table-container table-responsive">' +
          '<div class="text-muted small">Pick a date range and click Load.</div>' +
        '</div>';

      // Close employee dropdown when clicking elsewhere
      document.addEventListener('click', function (e) {
        const drop = document.getElementById('atEmpDrop');
        const inp  = document.getElementById('atEmpSearch');
        if (drop && inp && !drop.contains(e.target) && e.target !== inp) {
          drop.style.display = 'none';
        }
      });
    };
    attach();
  });

  // ── Wire logic after app is ready ────────────────────────────────────
  (function wire() {
    if (typeof app === 'undefined') return setTimeout(wire, 50);

    // Initialise employee list and location dropdown from loaded data
    app.atInitFilters = function () {
      if (app.employeesData && app.employeesData.length) {
        EMPS = app.employeesData.map(e => ({
          id       : e['Employee ID']   || '',
          name     : e['Name (English)'] || e['Name'] || '',
          location : e['Location']      || e['Branch'] || '',
        }));
        // Unique sorted locations
        LOCS = [...new Set(EMPS.map(e => e.location).filter(Boolean))].sort();
        const locDrop = document.getElementById('atLocDrop');
        if (locDrop && locDrop.options.length <= 1) {
          LOCS.forEach(l => {
            const o = document.createElement('option');
            o.text = o.value = l;
            locDrop.add(o);
          });
        }
      }
    };

    // Type in employee search → show filtered dropdown
    app.atFilterEmps = function () {
      app.atInitFilters();
      const q    = (document.getElementById('atEmpSearch').value || '').toLowerCase().trim();
      const drop = document.getElementById('atEmpDrop');
      const idEl = document.getElementById('atEmpId');
      idEl.value = ''; // clear previous selection
      if (!q) { drop.style.display = 'none'; return; }
      const hits = EMPS.filter(e =>
        e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q)
      ).slice(0, 20);
      drop.innerHTML = hits.map(e =>
        '<option value="' + e.id + '">' + e.id + ' — ' + e.name + '</option>'
      ).join('');
      drop.style.display = hits.length ? 'block' : 'none';
    };

    // User picks from employee dropdown
    app.atPickEmp = function (empId) {
      const emp  = EMPS.find(e => e.id === empId);
      const inp  = document.getElementById('atEmpSearch');
      const idEl = document.getElementById('atEmpId');
      const drop = document.getElementById('atEmpDrop');
      if (emp) { inp.value = emp.id + ' — ' + emp.name; idEl.value = emp.id; }
      drop.style.display = 'none';
    };

    // Clear all filters, reset to today
    app.atClearFilters = function () {
      const today = todayIso();
      const f = document.getElementById('atFrom'); if (f) f.value = today;
      const t = document.getElementById('atTo');   if (t) t.value = today;
      const s = document.getElementById('atEmpSearch'); if (s) s.value = '';
      const i = document.getElementById('atEmpId');     if (i) i.value = '';
      const l = document.getElementById('atLocDrop');   if (l) l.value = '';
      const st= document.getElementById('atStageDrop'); if (st) st.value = '';
      const d = document.getElementById('atEmpDrop');   if (d) d.style.display = 'none';
      const w = document.getElementById('atTableWrap');
      if (w) w.innerHTML = '<div class="text-muted small">Pick a date range and click Load.</div>';
    };

    // ── Load attendance ──────────────────────────────────────────────
    app.loadAttendance = async function () {
      app.atInitFilters();
      const wrap = document.getElementById('atTableWrap');
      wrap.innerHTML = '<div class="text-muted small">Loading…</div>';

      let qs = 'method=getAttendanceLog';

      // Date range — send as from/to (backend must support these params)
      const from  = document.getElementById('atFrom').value;
      const to    = document.getElementById('atTo').value;
      if (from) qs += '&from=' + encodeURIComponent(toDd(from));
      if (to)   qs += '&to='   + encodeURIComponent(toDd(to));
      // Fallback: also send 'date' for backends that only support single date
      if (from === to && from) qs += '&date=' + encodeURIComponent(toDd(from));

      // Employee ID (from hidden field set by picker, or raw typed text)
      const empId = (document.getElementById('atEmpId').value || '').trim() ||
                    (document.getElementById('atEmpSearch').value || '').trim();
      if (empId) qs += '&empId=' + encodeURIComponent(empId.split(' ')[0]); // strip name if typed

      // Location
      const loc = (document.getElementById('atLocDrop').value || '').trim();
      if (loc) qs += '&location=' + encodeURIComponent(loc);

      // Stage — filtered client-side after load
      const stageFilter = (document.getElementById('atStageDrop').value || '').trim();

      try {
        const d = await api(qs);
        let rows = d.rows || [];

        // Client-side stage filter
        if (stageFilter) rows = rows.filter(r => r.stage === stageFilter);

        if (!rows.length) {
          wrap.innerHTML = '<div class="text-muted small">No punches for this filter.</div>';
          return;
        }

        const body = rows.map(r => {
          const tm = extractTime(r.ts);
          const geoClass = /^OK/.test(r.flag)     ? 'text-success'
                         : /MANUAL/.test(r.flag)  ? 'text-primary'
                         :                          'text-danger';
          const geo  = '<span class="small ' + geoClass + '">' + (r.flag || '—') + '</span>';
          const shft = r.shift || '—';
          return '<tr>' +
            '<td style="font-family:\'JetBrains Mono\',monospace;font-size:12px">' + r.empId + '</td>' +
            '<td>' + (r.name || '') + '</td>' +
            '<td style="font-family:\'JetBrains Mono\',monospace">' + r.date + '</td>' +
            '<td style="font-family:\'JetBrains Mono\',monospace">' + tm + '</td>' +
            '<td>' + shft + '</td>' +
            '<td><span class="badge bg-secondary" style="font-weight:500;font-size:12px">' + r.stage + '</span></td>' +
            '<td>' + (r.branch || '') + '</td>' +
            '<td>' + geo + '</td>' +
            '<td class="text-end">' +
              '<button class="btn btn-outline-secondary btn-sm me-1"' +
                ' onclick="app.openEditPunch(' + r.row + ',\'' + r.stage + '\',\'' + tm + '\',\'' +
                  String(r.branch || '').replace(/'/g, "\\'") + '\')">' +
                '<i class="bi bi-pencil"></i></button>' +
              '<button class="btn btn-outline-danger btn-sm"' +
                ' onclick="app.deletePunch(' + r.row + ',\'' + r.empId + '\',\'' + r.stage + '\')">' +
                '<i class="bi bi-trash"></i></button>' +
            '</td>' +
          '</tr>';
        }).join('');

        wrap.innerHTML =
          '<div class="text-muted small mb-2">' + rows.length + ' punch' +
            (rows.length !== 1 ? 'es' : '') + '</div>' +
          '<table class="table table-sm table-striped align-middle">' +
            '<thead><tr>' +
              '<th>ID</th><th>Name</th><th>Date</th><th>Time</th>' +
              '<th>Shift</th><th>Stage</th><th>Location</th><th>Geo</th><th></th>' +
            '</tr></thead>' +
            '<tbody>' + body + '</tbody>' +
          '</table>';

      } catch (err) {
        wrap.innerHTML = '<div class="alert alert-danger mb-0">' + err.message + '</div>';
      }
    };

    // ── Add Punch modal ──────────────────────────────────────────────
    app.openAddPunch = function () {
      app.atInitFilters();
      const empOpts = EMPS.map(e =>
        '<option value="' + e.id + '">' + e.name + ' (' + e.id + ')</option>'
      ).join('');
      const fromVal = document.getElementById('atFrom') ? document.getElementById('atFrom').value : todayIso();
      const html =
        '<div class="modal fade" id="apModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
          '<div class="modal-header"><h5 class="modal-title">Add Punch (manual)</h5>' +
            '<button class="btn-close" data-bs-dismiss="modal"></button></div>' +
          '<div class="modal-body"><div class="row g-2">' +
            '<div class="col-12"><label class="form-label small mb-1">Employee</label>' +
              '<select id="apEmp" class="form-select form-select-sm">' + empOpts + '</select></div>' +
            '<div class="col-6"><label class="form-label small mb-1">Date</label>' +
              '<input type="date" id="apDate" class="form-control form-control-sm" value="' + (fromVal || todayIso()) + '"></div>' +
            '<div class="col-6"><label class="form-label small mb-1">Time</label>' +
              '<input type="time" id="apTime" class="form-control form-control-sm"></div>' +
            '<div class="col-6"><label class="form-label small mb-1">Stage</label>' +
              '<select id="apStage" class="form-select form-select-sm">' +
                STAGES.map(s => '<option>' + s + '</option>').join('') +
              '</select></div>' +
            '<div class="col-6"><label class="form-label small mb-1">Location</label>' +
              '<input id="apLoc" class="form-control form-control-sm"></div>' +
          '</div><div id="apStatus" class="mt-2"></div></div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>' +
            '<button class="btn btn-primary btn-sm" onclick="app.saveAddPunch()">' +
              '<i class="bi bi-check2"></i> Add</button></div>' +
        '</div></div></div>';
      const old = document.getElementById('apModal'); if (old) old.remove();
      document.body.insertAdjacentHTML('beforeend', html);
      new bootstrap.Modal(document.getElementById('apModal')).show();
    };

    app.saveAddPunch = async function () {
      const status  = document.getElementById('apStatus');
      const payload = {
        empId    : document.getElementById('apEmp').value,
        date     : toDd(document.getElementById('apDate').value),
        time     : document.getElementById('apTime').value,
        stage    : document.getElementById('apStage').value,
        location : document.getElementById('apLoc').value.trim(),
        by       : adminEmail()
      };
      if (!payload.empId || !payload.date) {
        status.innerHTML = '<div class="alert alert-warning mb-0 py-1">Employee and date required.</div>';
        return;
      }
      try {
        const d = await post('addAttendancePunch', payload);
        status.innerHTML = '<div class="alert alert-success mb-0 py-1">' + d.message + '</div>';
        setTimeout(() => {
          const m = bootstrap.Modal.getInstance(document.getElementById('apModal'));
          if (m) m.hide();
          app.loadAttendance();
        }, 1000);
      } catch (err) {
        status.innerHTML = '<div class="alert alert-danger mb-0 py-1">' + err.message + '</div>';
      }
    };

    // ── Edit Punch modal ─────────────────────────────────────────────
    app.openEditPunch = function (row, stage, time, loc) {
      const html =
        '<div class="modal fade" id="epuModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
          '<div class="modal-header"><h5 class="modal-title">Edit Punch</h5>' +
            '<button class="btn-close" data-bs-dismiss="modal"></button></div>' +
          '<div class="modal-body"><div class="row g-2">' +
            '<div class="col-6"><label class="form-label small mb-1">Stage</label>' +
              '<select id="epuStage" class="form-select form-select-sm">' +
                STAGES.map(s => '<option' + (s === stage ? ' selected' : '') + '>' + s + '</option>').join('') +
              '</select></div>' +
            '<div class="col-6"><label class="form-label small mb-1">Time</label>' +
              '<input type="time" id="epuTime" class="form-control form-control-sm" value="' + (time || '') + '"></div>' +
            '<div class="col-12"><label class="form-label small mb-1">Location</label>' +
              '<input id="epuLoc" class="form-control form-control-sm" value="' + (loc || '') + '"></div>' +
          '</div><div id="epuStatus" class="mt-2"></div></div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>' +
            '<button class="btn btn-primary btn-sm" onclick="app.saveEditPunch(' + row + ')">' +
              '<i class="bi bi-check2"></i> Save</button></div>' +
        '</div></div></div>';
      const old = document.getElementById('epuModal'); if (old) old.remove();
      document.body.insertAdjacentHTML('beforeend', html);
      new bootstrap.Modal(document.getElementById('epuModal')).show();
    };

    app.saveEditPunch = async function (row) {
      const status  = document.getElementById('epuStatus');
      const payload = {
        row      : row,
        stage    : document.getElementById('epuStage').value,
        time     : document.getElementById('epuTime').value,
        location : document.getElementById('epuLoc').value.trim(),
        by       : adminEmail()
      };
      try {
        const d = await post('editAttendancePunch', payload);
        status.innerHTML = '<div class="alert alert-success mb-0 py-1">' + d.message + '</div>';
        setTimeout(() => {
          const m = bootstrap.Modal.getInstance(document.getElementById('epuModal'));
          if (m) m.hide();
          app.loadAttendance();
        }, 1000);
      } catch (err) {
        status.innerHTML = '<div class="alert alert-danger mb-0 py-1">' + err.message + '</div>';
      }
    };

    // ── Delete Punch ─────────────────────────────────────────────────
    app.deletePunch = async function (row, empId, stage) {
      if (!confirm('Delete ' + stage + ' for ' + empId + '?')) return;
      try {
        await api('method=deleteAttendancePunch&row=' + row + '&by=' + encodeURIComponent(adminEmail()));
        app.loadAttendance();
      } catch (err) { alert(err.message); }
    };

  })();
})();
