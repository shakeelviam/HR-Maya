// ============================================================
// ot-review-ui.js — OT Review: verify attendance-computed OT,
// post to OT_Entries.
// All hour values display as "Xh Ym" not decimal.
// ============================================================

(function () {
  const EXEC_URL = 'https://script.google.com/macros/s/AKfycbyG5XLC79FnyLtSGGWunhJwU83SV0b0kz3y1FKdal-JBcTUM-X0ax134konYyTaKxYiiQ/exec';
  let DRAFT = null;

  function todayIso() { return new Date().toISOString().split('T')[0]; }
  function toDd(iso)  { if (!iso) return ''; const [y,m,d] = iso.split('-'); return d+'-'+m+'-'+y; }
  function adminEmail() {
    const el = document.getElementById('userEmail');
    return el && el.innerText && el.innerText !== 'Loading...' ? el.innerText.trim() : 'Compiler';
  }

  // ── Core display helper — decimal hours → "Xh Ym" ──────────────────
  function toHM(h) {
    if (h == null || h === '' || isNaN(Number(h))) return '—';
    h = Number(h);
    if (h === 0) return '0h';
    const neg = h < 0;
    h = Math.abs(h);
    const hrs = Math.floor(h);
    const min = Math.round((h - hrs) * 60);
    let s = '';
    if (hrs > 0) s += hrs + 'h';
    if (min > 0) s += (s ? ' ' : '') + min + 'm';
    return (neg ? '-' : '') + (s || '0h');
  }

  // Format the computedOt field which can be a string like
  // "5.87h (presence 14.87h)" or "incomplete punch" or "no punch"
  function fmtComputed(raw) {
    if (!raw || raw === '—') return '—';
    // Already a text flag — leave as-is
    if (/incomplete|no punch/i.test(raw)) {
      return '<span class="text-warning small">' + raw + '</span>';
    }
    // Try to extract numeric OT and presence from "X.XXh (presence Y.YYh)"
    const m = raw.match(/([\d.]+)h\s*\(presence\s*([\d.]+)h\)/);
    if (m) {
      return toHM(m[1]) + ' <span class="text-muted small">(presence ' + toHM(m[2]) + ')</span>';
    }
    // Single number like "5.87h"
    const n = raw.match(/([\d.]+)h?/);
    if (n) return toHM(n[1]);
    return raw;
  }

  async function callApi(qs) {
    const res = await fetch(EXEC_URL + '?' + qs + '&_=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    if (!d.success) throw new Error(d.error || 'Unknown error');
    return d;
  }
  async function callPost(method, body) {
    const res = await fetch(EXEC_URL + '?method=' + method, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    if (!d.success) throw new Error(d.error || 'Unknown error');
    return d;
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
            '<div class="col-auto"><label class="form-label small mb-1">From</label>' +
              '<input type="date" id="orFrom" class="form-control form-control-sm"></div>' +
            '<div class="col-auto"><label class="form-label small mb-1">To</label>' +
              '<input type="date" id="orTo" class="form-control form-control-sm" value="' + todayIso() + '"></div>' +
            '<div class="col-auto"><button class="btn btn-primary btn-sm" onclick="app.loadOtDraft()">' +
              '<i class="bi bi-search"></i> Compute</button></div>' +
            '<div class="col-auto"><input type="text" id="orSearch" class="form-control form-control-sm" ' +
              'placeholder="Filter name/ID" style="width:170px"></div>' +
            '<div class="col-auto form-check ms-2"><input type="checkbox" class="form-check-input" id="orFlagsOnly">' +
              '<label class="form-check-label small" for="orFlagsOnly">Flagged only</label></div>' +
          '</div>' +
          '<div class="text-muted small mt-2">OT = presence − shift Normal Hours. ' +
            'Hours shown as <b>Xh Ym</b>. Edit decimal in the OT column before posting.</div>' +
        '</div>' +
        '<div id="orTableWrap" class="table-container table-responsive">' +
          '<div class="text-muted small">Pick a range and click Compute.</div></div>' +
        '<div id="orPostBar"></div>';
      anchor.parentElement.appendChild(s);
      const se = s.querySelector('#orSearch');  if (se) se.addEventListener('input', () => app.renderOtDraft());
      const fo = s.querySelector('#orFlagsOnly'); if (fo) fo.addEventListener('change', () => app.renderOtDraft());
    }
  });

  (function attach() {
    if (typeof app === 'undefined') return setTimeout(attach, 50);

    app.loadOtDraft = async function () {
      app.loadPendingOt();
      const wrap = document.getElementById('orTableWrap');
      const from = document.getElementById('orFrom').value;
      const to   = document.getElementById('orTo').value;
      wrap.innerHTML = '<div class="text-muted small">Computing…</div>';
      document.getElementById('orPostBar').innerHTML = '';
      try {
        let qs = 'method=getAttendanceOtDraft';
        if (from) qs += '&from=' + encodeURIComponent(toDd(from));
        if (to)   qs += '&to='   + encodeURIComponent(toDd(to));
        DRAFT = await callApi(qs);
        app.renderOtDraft();
      } catch (err) {
        wrap.innerHTML = '<div class="alert alert-danger mb-0">' + err.message + '</div>';
      }
    };

    // ── Pending OT (self-submitted by staff) ─────────────────────────
    app.loadPendingOt = async function () {
      const wrap = document.getElementById('orPendingWrap');
      if (!wrap) return;
      try {
        const d = await callApi('method=getPendingOt');
        if (!d.rows || !d.rows.length) { wrap.innerHTML = ''; return; }

        const body = d.rows.map(r => {
          const geo  = /^OK/.test(r.geoFlag)
            ? '<span class="text-success small">' + r.geoFlag + '</span>'
            : '<span class="text-danger small">'  + (r.geoFlag || '—') + '</span>';
          // Claimed: decimal input (for editing) + HM label
          const claimedHm = toHM(r.hours);
          return '<tr data-row="' + r.row + '">' +
            '<td style="font-size:12px;font-family:monospace">' + r.empId + '</td>' +
            '<td>' + r.name + '</td>' +
            '<td>' + r.date + '</td>' +
            // Claimed — editable input with HM display
            '<td>' +
              '<div class="d-flex align-items-center gap-1">' +
                '<input type="number" step="0.25" class="form-control form-control-sm po-hrs"' +
                  ' value="' + r.hours + '" style="width:70px"' +
                  ' oninput="this.nextElementSibling.innerText=window.otHM(this.value)">' +
                '<span class="text-muted small">' + claimedHm + '</span>' +
              '</div>' +
            '</td>' +
            // Computed — formatted
            '<td class="small"><b>' + fmtComputed(r.computedOt) + '</b></td>' +
            '<td>' + geo + '</td>' +
            '<td class="small text-muted">' + (r.submitted || '') + '</td>' +
            '<td class="text-end">' +
              '<button class="btn btn-success btn-sm me-1" onclick="app.approvePending(' + r.row + ')">' +
                '<i class="bi bi-check"></i></button>' +
              '<button class="btn btn-outline-danger btn-sm" onclick="app.rejectPending(' + r.row + ')">' +
                '<i class="bi bi-x"></i></button>' +
            '</td>' +
          '</tr>';
        }).join('');

        wrap.innerHTML =
          '<h6 class="mb-2"><i class="bi bi-hourglass-split"></i> Self-submitted OT pending (' +
            d.rows.length + ')</h6>' +
          '<div class="table-responsive"><table class="table table-sm table-striped align-middle">' +
            '<thead><tr>' +
              '<th>ID</th><th>Name</th><th>Date</th>' +
              '<th>Claimed</th><th>Computed (punch data)</th>' +
              '<th>Geo</th><th>Submitted</th><th></th>' +
            '</tr></thead><tbody>' + body + '</tbody>' +
          '</table></div>' +
          '<div class="text-muted small">Edit <b>Claimed</b> before approving if it differs from Computed. ' +
            'Approved rows go to OT_Entries.</div>';
      } catch (e) { wrap.innerHTML = ''; }
    };

    // Expose toHM globally so inline oninput can call it
    window.otHM = toHM;

    app.approvePending = async function (row) {
      const tr  = document.querySelector('#orPendingWrap tr[data-row="' + row + '"]');
      const hrs = tr ? tr.querySelector('.po-hrs').value : '';
      try {
        const d = await callApi(
          'method=approvePendingOt&row=' + row +
          '&hours=' + encodeURIComponent(hrs) +
          '&by=' + encodeURIComponent(adminEmail())
        );
        alert(d.message);
        app.loadPendingOt();
      } catch (err) { alert(err.message); }
    };

    app.rejectPending = async function (row) {
      if (!confirm('Reject this OT submission?')) return;
      try { await callApi('method=rejectPendingOt&row=' + row); app.loadPendingOt(); }
      catch (err) { alert(err.message); }
    };

    // ── Attendance-computed OT draft ──────────────────────────────────
    app.renderOtDraft = function () {
      const wrap = document.getElementById('orTableWrap');
      if (!DRAFT || !DRAFT.rows.length) {
        wrap.innerHTML = '<div class="text-muted small">No attendance days in range.</div>';
        return;
      }
      const q         = (document.getElementById('orSearch').value || '').toLowerCase();
      const flagsOnly = document.getElementById('orFlagsOnly').checked;
      let rows = DRAFT.rows.map((r, i) => Object.assign({ _i: i }, r));
      if (q)         rows = rows.filter(r => (r.name||'').toLowerCase().includes(q) || (r.empId||'').toLowerCase().includes(q));
      if (flagsOnly) rows = rows.filter(r => r.flags);

      const body = rows.map(r => {
        const flagCell = r.flags
          ? '<span class="text-danger small">' + r.flags + '</span>'
          : '<span class="text-success small">OK</span>';
        const dayBadge = r.dayType === 'Half'
          ? '<span class="badge bg-warning text-dark">Half</span>'
          : r.dayType === 'Full'
          ? '<span class="badge bg-success">Full</span>'
          : '—';
        const presenceDisplay = r.presence == null ? '—' : toHM(r.presence);
        return '<tr data-i="' + r._i + '"' + (r.flags ? ' class="table-warning"' : '') + '>' +
          '<td style="font-size:12px;font-family:monospace">' + r.empId + '</td>' +
          '<td>' + r.name + '</td>' +
          '<td>' + r.date + '</td>' +
          '<td>' + (r.shift || '<span class="text-danger">—</span>') + '</td>' +
          '<td>' + (r.checkIn  || '—') + '</td>' +
          '<td>' + (r.checkOut || '—') + '</td>' +
          // Presence — formatted as Xh Ym
          '<td class="text-end">' + presenceDisplay + '</td>' +
          '<td>' + dayBadge + '</td>' +
          '<td class="text-end">' + r.breakMin +
            (r.breakOver ? ' <span class="text-danger">(+' + r.breakOver + ')</span>' : '') +
          '</td>' +
          // OT — editable decimal input + live HM preview
          '<td>' +
            '<div class="d-flex align-items-center gap-1">' +
              '<input type="number" step="0.01" class="form-control form-control-sm or-ot text-end"' +
                ' value="' + (r.ot || 0) + '" style="width:70px"' +
                ' oninput="this.nextElementSibling.innerText=window.otHM(this.value)">' +
              '<span class="text-muted small" style="white-space:nowrap">' + toHM(r.ot || 0) + '</span>' +
            '</div>' +
          '</td>' +
          '<td>' + flagCell + '</td>' +
          '<td class="text-center">' +
            '<input type="checkbox" class="form-check-input or-pick"' + (r.ot > 0 ? ' checked' : '') + '>' +
          '</td>' +
        '</tr>';
      }).join('');

      wrap.innerHTML =
        '<table class="table table-sm table-striped align-middle" style="min-width:1100px">' +
          '<thead><tr>' +
            '<th>ID</th><th>Name</th><th>Date</th><th>Shift</th>' +
            '<th>In</th><th>Out</th>' +
            '<th class="text-end">Presence</th>' +
            '<th>Day</th>' +
            '<th class="text-end">Break (m)</th>' +
            '<th>OT</th>' +
            '<th>Flags</th><th>Post?</th>' +
          '</tr></thead>' +
          '<tbody>' + body + '</tbody>' +
        '</table>';

      app.renderOtPostBar();
    };

    app.renderOtPostBar = function () {
      const totalHm = toHM(DRAFT ? DRAFT.totalOt : 0);
      document.getElementById('orPostBar').innerHTML =
        '<div class="table-container d-flex justify-content-between align-items-center flex-wrap gap-2">' +
          '<div class="text-muted small">Total OT in range: <b>' + totalHm + '</b>' +
            ' across ' + (DRAFT ? DRAFT.count : 0) + ' day-rows. ' +
            'Only ticked rows with OT &gt; 0 are posted.</div>' +
          '<button class="btn btn-success" onclick="app.postOt()">' +
            '<i class="bi bi-upload"></i> Post ticked to OT_Entries</button>' +
        '</div>';
    };

    app.postOt = async function () {
      const picks = [];
      document.querySelectorAll('#orTableWrap tr[data-i]').forEach(tr => {
        if (!tr.querySelector('.or-pick').checked) return;
        const r  = DRAFT.rows[+tr.getAttribute('data-i')];
        const ot = Number(tr.querySelector('.or-ot').value) || 0;
        if (ot > 0) picks.push({ empId: r.empId, name: r.name, date: r.date, ot, remark: 'Auto from attendance' });
      });
      if (!picks.length) { alert('No ticked rows with OT > 0 to post.'); return; }
      if (!confirm('Post ' + picks.length + ' OT row(s) to OT_Entries?')) return;
      const bar = document.getElementById('orPostBar');
      bar.innerHTML = '<div class="alert alert-info"><span class="spinner-border spinner-border-sm"></span> Posting…</div>';
      try {
        const d = await callPost('postOtToEntries', { rows: picks, by: adminEmail() });
        bar.innerHTML = '<div class="alert alert-success"><i class="bi bi-check-circle"></i> ' + d.message + '</div>';
      } catch (err) {
        bar.innerHTML = '<div class="alert alert-danger">' + err.message + '</div>';
        app.renderOtPostBar();
      }
    };

  })();
})();
