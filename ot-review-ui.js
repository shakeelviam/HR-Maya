// ============================================================
// ot-review-ui.js — OT Review: verify attendance-computed OT, post to OT_Entries
// ------------------------------------------------------------
// index.html (after ot-ui.js):  <script src="ot-review-ui.js"></script>
// Backend: getAttendanceOtDraft, postOtToEntries.
// ============================================================

(function () {
  const EXEC_URL = 'https://script.google.com/macros/s/AKfycbyG5XLC79FnyLtSGGWunhJwU83SV0b0kz3y1FKdal-JBcTUM-X0ax134konYyTaKxYiiQ/exec';
  let DRAFT = null;

  function todayIso() { return new Date().toISOString().split('T')[0]; }
  function toDd(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return d + '-' + m + '-' + y; }
  function adminEmail() { const el = document.getElementById('userEmail'); return el && el.innerText && el.innerText !== 'Loading...' ? el.innerText.trim() : 'Compiler'; }

  async function callApi(qs) {
    const res = await fetch(EXEC_URL + '?' + qs + '&_=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json(); if (!d.success) throw new Error(d.error || 'Unknown error'); return d;
  }
  async function callPost(method, body) {
    const res = await fetch(EXEC_URL + '?method=' + method, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json(); if (!d.success) throw new Error(d.error || 'Unknown error'); return d;
  }

  document.addEventListener('DOMContentLoaded', function () {
    const navList = document.querySelector('#sidebar ul.nav');
    if (navList && !document.querySelector('[data-page="otreview"]')) {
      const li = document.createElement('li'); li.className = 'nav-item';
      li.innerHTML = '<a class="nav-link" data-page="otreview"><i class="bi bi-clipboard-check"></i> OT Review</a>';
      const ot = document.querySelector('[data-page="overtime"]') || document.querySelector('[data-page="attendance"]');
      if (ot && ot.closest('li')) ot.closest('li').insertAdjacentElement('afterend', li);
      else navList.appendChild(li);
      li.querySelector('.nav-link').addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('#sidebar .nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
        const pg = document.getElementById('page-otreview'); if (pg) pg.classList.add('active');
        document.getElementById('pageTitle').innerText = 'OT Review';
      });
    }

    const anchor = document.getElementById('page-dashboard');
    if (anchor && anchor.parentElement && !document.getElementById('page-otreview')) {
      const s = document.createElement('div'); s.className = 'page-section'; s.id = 'page-otreview';
      s.innerHTML =
        '<div id="orPendingWrap" class="table-container mb-3"></div>' +
        '<div class="table-container mb-3">' +
          '<h5 class="mb-3"><i class="bi bi-clipboard-check"></i> OT Review &amp; Post</h5>' +
          '<div class="row g-2 align-items-end">' +
            '<div class="col-auto"><label class="form-label small mb-1">From</label><input type="date" id="orFrom" class="form-control form-control-sm"></div>' +
            '<div class="col-auto"><label class="form-label small mb-1">To</label><input type="date" id="orTo" class="form-control form-control-sm" value="' + todayIso() + '"></div>' +
            '<div class="col-auto"><button class="btn btn-primary btn-sm" onclick="app.loadOtDraft()"><i class="bi bi-search"></i> Compute</button></div>' +
            '<div class="col-auto"><input type="text" id="orSearch" class="form-control form-control-sm" placeholder="Filter name/ID" style="width:170px"></div>' +
            '<div class="col-auto form-check ms-2"><input type="checkbox" class="form-check-input" id="orFlagsOnly"><label class="form-check-label small" for="orFlagsOnly">Flagged only</label></div>' +
          '</div>' +
          '<div class="text-muted small mt-2">OT = presence − shift Normal Hours (computed per day from attendance). Edit any OT before posting. Posting writes to OT_Entries (replaces prior attendance rows for the same person+day; manual rows untouched).</div>' +
        '</div>' +
        '<div id="orTableWrap" class="table-container table-responsive"><div class="text-muted small">Pick a range and click Compute.</div></div>' +
        '<div id="orPostBar"></div>';
      anchor.parentElement.appendChild(s);
      const se = s.querySelector('#orSearch'); if (se) se.addEventListener('input', () => app.renderOtDraft());
      const fo = s.querySelector('#orFlagsOnly'); if (fo) fo.addEventListener('change', () => app.renderOtDraft());
    }
  });

  (function attach() {
    if (typeof app === 'undefined') return setTimeout(attach, 50);

    app.loadOtDraft = async function () {
      app.loadPendingOt();
      const wrap = document.getElementById('orTableWrap');
      const from = document.getElementById('orFrom').value, to = document.getElementById('orTo').value;
      wrap.innerHTML = '<div class="text-muted small">Computing…</div>';
      document.getElementById('orPostBar').innerHTML = '';
      try {
        let qs = 'method=getAttendanceOtDraft';
        if (from) qs += '&from=' + encodeURIComponent(toDd(from));
        if (to) qs += '&to=' + encodeURIComponent(toDd(to));
        DRAFT = await callApi(qs);
        app.renderOtDraft();
      } catch (err) { wrap.innerHTML = '<div class="alert alert-danger mb-0">' + err.message + '</div>'; }
    };

    app.loadPendingOt = async function () {
      const wrap = document.getElementById('orPendingWrap');
      if (!wrap) return;
      try {
        const d = await callApi('method=getPendingOt');
        if (!d.rows || !d.rows.length) { wrap.innerHTML = ''; return; }
        const body = d.rows.map(r => {
          const geo = /OK/.test(r.geoFlag) ? '<span class="text-success small">' + r.geoFlag + '</span>' : '<span class="text-danger small">' + (r.geoFlag || '—') + '</span>';
          return '<tr data-row="' + r.row + '"><td>' + r.empId + '</td><td>' + r.name + '</td><td>' + r.date + '</td>' +
          '<td><input type="number" step="0.25" class="form-control form-control-sm po-hrs" value="' + r.hours + '" style="width:90px"></td>' +
          '<td class="small"><b>' + (r.computedOt || '—') + '</b></td>' +
          '<td>' + geo + '</td>' +
          '<td class="small text-muted">' + (r.submitted || '') + '</td>' +
          '<td class="text-end"><button class="btn btn-success btn-sm me-1" onclick="app.approvePending(' + r.row + ')"><i class="bi bi-check"></i></button>' +
            '<button class="btn btn-outline-danger btn-sm" onclick="app.rejectPending(' + r.row + ')"><i class="bi bi-x"></i></button></td></tr>';
        }).join('');
        wrap.innerHTML = '<h6 class="mb-2"><i class="bi bi-hourglass-split"></i> Self-submitted OT — pending approval (' + d.rows.length + ')</h6>' +
          '<div class="table-responsive"><table class="table table-sm table-striped align-middle"><thead><tr><th>ID</th><th>Name</th><th>Date</th><th>Claimed</th><th>Computed (presence−shift)</th><th>Geo</th><th>Submitted</th><th></th></tr></thead><tbody>' + body + '</tbody></table></div>' +
          '<div class="text-muted small">Compare <b>Claimed</b> against <b>Computed</b> (from punches). Edit the hours before approving if they differ. Approving posts into OT_Entries (paid).</div>';
      } catch (e) { wrap.innerHTML = ''; }
    };

    app.approvePending = async function (row) {
      const tr = document.querySelector('#orPendingWrap tr[data-row="' + row + '"]');
      const hrs = tr ? tr.querySelector('.po-hrs').value : '';
      try { const d = await callApi('method=approvePendingOt&row=' + row + '&hours=' + encodeURIComponent(hrs) + '&by=' + encodeURIComponent(adminEmail())); alert(d.message); app.loadPendingOt(); }
      catch (err) { alert(err.message); }
    };
    app.rejectPending = async function (row) {
      if (!confirm('Reject this OT submission?')) return;
      try { await callApi('method=rejectPendingOt&row=' + row); app.loadPendingOt(); }
      catch (err) { alert(err.message); }
    };

    app.renderOtDraft = function () {
      const wrap = document.getElementById('orTableWrap');
      if (!DRAFT || !DRAFT.rows.length) { wrap.innerHTML = '<div class="text-muted small">No attendance days in range.</div>'; return; }
      const q = (document.getElementById('orSearch').value || '').toLowerCase();
      const flagsOnly = document.getElementById('orFlagsOnly').checked;
      let rows = DRAFT.rows.map((r, i) => Object.assign({ _i: i }, r));
      if (q) rows = rows.filter(r => (r.name || '').toLowerCase().includes(q) || (r.empId || '').toLowerCase().includes(q));
      if (flagsOnly) rows = rows.filter(r => r.flags);

      const body = rows.map(r => {
        const flagCell = r.flags ? '<span class="text-danger small">' + r.flags + '</span>' : '<span class="text-success">OK</span>';
        return '<tr data-i="' + r._i + '"' + (r.flags ? ' class="table-warning"' : '') + '>' +
          '<td>' + r.empId + '</td><td>' + r.name + '</td><td>' + r.date + '</td><td>' + (r.shift || '<span class="text-danger">—</span>') + '</td>' +
          '<td>' + (r.checkIn || '—') + '</td><td>' + (r.checkOut || '—') + '</td>' +
          '<td class="text-end">' + (r.presence == null ? '—' : r.presence) + '</td>' +
          '<td>' + (r.dayType === 'Half' ? '<span class="badge bg-warning text-dark">Half</span>' : (r.dayType === 'Full' ? '<span class="badge bg-success">Full</span>' : '—')) + '</td>' +
          '<td class="text-end">' + r.breakMin + (r.breakOver ? ' <span class="text-danger">(+' + r.breakOver + ')</span>' : '') + '</td>' +
          '<td><input type="number" step="0.01" class="form-control form-control-sm or-ot text-end" value="' + (r.ot || 0) + '" style="width:80px"></td>' +
          '<td>' + flagCell + '</td>' +
          '<td class="text-center"><input type="checkbox" class="form-check-input or-pick"' + (r.ot > 0 ? ' checked' : '') + '></td>' +
          '</tr>';
      }).join('');
      wrap.innerHTML = '<table class="table table-sm table-striped align-middle" style="min-width:1000px"><thead><tr>' +
        '<th>ID</th><th>Name</th><th>Date</th><th>Shift</th><th>In</th><th>Out</th><th class="text-end">Presence</th><th>Day</th><th class="text-end">Break(m)</th><th class="text-end">OT (hrs)</th><th>Flags</th><th>Post?</th>' +
        '</tr></thead><tbody>' + body + '</tbody></table>';
      app.renderOtPostBar();
    };

    app.renderOtPostBar = function () {
      document.getElementById('orPostBar').innerHTML =
        '<div class="table-container d-flex justify-content-between align-items-center flex-wrap gap-2">' +
          '<div class="text-muted small">Computed total OT in range: <b>' + (DRAFT ? DRAFT.totalOt : 0) + '</b> hrs across ' + (DRAFT ? DRAFT.count : 0) + ' day-rows. Only ticked rows with OT &gt; 0 are posted.</div>' +
          '<button class="btn btn-success" onclick="app.postOt()"><i class="bi bi-upload"></i> Post ticked to OT_Entries</button>' +
        '</div>';
    };

    app.postOt = async function () {
      const picks = [];
      document.querySelectorAll('#orTableWrap tr[data-i]').forEach(tr => {
        if (!tr.querySelector('.or-pick').checked) return;
        const r = DRAFT.rows[+tr.getAttribute('data-i')];
        const ot = Number(tr.querySelector('.or-ot').value) || 0;
        if (ot > 0) picks.push({ empId: r.empId, name: r.name, date: r.date, ot: ot, remark: 'Auto from attendance' });
      });
      if (!picks.length) { alert('No ticked rows with OT > 0 to post.'); return; }
      if (!confirm('Post ' + picks.length + ' OT row(s) to OT_Entries?')) return;
      const bar = document.getElementById('orPostBar');
      bar.innerHTML = '<div class="alert alert-info"><span class="spinner-border spinner-border-sm"></span> Posting…</div>';
      try {
        const d = await callPost('postOtToEntries', { rows: picks, by: adminEmail() });
        bar.innerHTML = '<div class="alert alert-success"><i class="bi bi-check-circle"></i> ' + d.message + '</div>';
      } catch (err) { bar.innerHTML = '<div class="alert alert-danger">' + err.message + '</div>'; app.renderOtPostBar(); }
    };
  })();
})();
