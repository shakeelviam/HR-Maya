// ============================================================
// payroll-ui.js — Payroll page + "Run Payroll" button (drop-in)
// ------------------------------------------------------------
// Add this ONE line to index.html, right AFTER <script src="app.js"></script>:
//     <script src="payroll-ui.js"></script>
//
// It injects its own sidebar link and page — no other index.html edits.
// Requires computeMonthlyPayroll() (rolling-period version) live in
// Code.gs/Payroll.gs, already deployed as of Version 29.
//
// CHANGED FROM YOUR PREVIOUS VERSION: month/year dropdowns replaced
// with a Period End date picker, matching the new rolling-period
// system in Payroll.gs. Period Start is only needed for the very
// first run ever (Payroll.gs looks up every run after that
// automatically from Payroll_Control) — so it's a collapsed,
// optional field that only matters the first time.
// ============================================================

(function () {
  // Same /exec base the dashboard already uses in app.js
  const EXEC_URL = 'https://script.google.com/macros/s/AKfycbyG5XLC79FnyLtSGGWunhJwU83SV0b0kz3y1FKdal-JBcTUM-X0ax134konYyTaKxYiiQ/exec';

  // yyyy-mm-dd (HTML date input) -> dd-mm-yyyy (what Payroll.gs expects)
  function toDdMmYyyy(isoDate) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}-${m}-${y}`;
  }

  function todayIso() {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  // --- Inject the nav link + page section once the DOM is ready ---
  document.addEventListener('DOMContentLoaded', function () {
    // 1) Sidebar link, placed just after "Attendance"
    const navList = document.querySelector('#sidebar ul.nav');
    if (navList && !document.querySelector('[data-page="payroll"]')) {
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.innerHTML = '<a class="nav-link" data-page="payroll"><i class="bi bi-cash-stack"></i> Payroll</a>';
      const att = document.querySelector('[data-page="attendance"]');
      if (att && att.closest('li')) att.closest('li').insertAdjacentElement('afterend', li);
      else navList.appendChild(li);

      li.querySelector('.nav-link').addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('#sidebar .nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
        const pg = document.getElementById('page-payroll');
        if (pg) pg.classList.add('active');
        document.getElementById('pageTitle').innerText = 'Payroll';
      });
    }

    // 2) Payroll page section, appended alongside the other pages
    const anchor = document.getElementById('page-dashboard');
    if (anchor && anchor.parentElement && !document.getElementById('page-payroll')) {
      const section = document.createElement('div');
      section.className = 'page-section';
      section.id = 'page-payroll';
      section.innerHTML =
        '<div class="table-container">' +
          '<h5 class="mb-3"><i class="bi bi-cash-stack"></i> Run Payroll</h5>' +
          '<div class="row g-2 align-items-end mb-2">' +
            '<div class="col-auto"><label class="form-label small mb-1">Period End</label>' +
              '<input type="date" id="payrollPeriodEnd" class="form-control form-control-sm" value="' + todayIso() + '"></div>' +
            '<div class="col-auto">' +
              '<button id="payrollRunBtn" class="btn btn-primary btn-sm" onclick="app.runPayroll()">' +
                '<i class="bi bi-calculator"></i> Run Payroll</button></div>' +
          '</div>' +
          '<div class="mb-3">' +
            '<a href="#" id="payrollFirstRunToggle" class="small text-muted">First payroll run ever? Click here to set a start date</a>' +
            '<div id="payrollFirstRunRow" class="row g-2 align-items-end mt-2" style="display:none;">' +
              '<div class="col-auto"><label class="form-label small mb-1">Period Start (first run only)</label>' +
                '<input type="date" id="payrollPeriodStart" class="form-control form-control-sm"></div>' +
            '</div>' +
          '</div>' +
          '<div id="payrollStatus" class="mb-2"></div>' +
          '<div id="payrollFlags"></div>' +
          '<div class="text-muted small">Every run after the first only needs Period End — the start date ' +
            'is picked up automatically from where the last run left off (see the Payroll_Control tab). ' +
            'Results are written to a dated tab (e.g. "Payroll 21Jul-20Aug").</div>' +
        '</div>';
      anchor.parentElement.appendChild(section);

      document.getElementById('payrollFirstRunToggle').addEventListener('click', function (e) {
        e.preventDefault();
        const row = document.getElementById('payrollFirstRunRow');
        row.style.display = row.style.display === 'none' ? 'flex' : 'none';
      });
    }
  });

  // --- Attach the action to the existing global `app` object ---
  (function attach() {
    if (typeof app === 'undefined') return setTimeout(attach, 50);

    app.runPayroll = async function () {
      const periodEndIso = document.getElementById('payrollPeriodEnd').value;
      const periodStartIso = document.getElementById('payrollPeriodStart').value;
      const btn    = document.getElementById('payrollRunBtn');
      const status = document.getElementById('payrollStatus');
      const flags  = document.getElementById('payrollFlags');

      if (!periodEndIso) {
        status.innerHTML = '<div class="alert alert-warning mb-0">Please pick a Period End date.</div>';
        return;
      }

      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Computing…';
      status.innerHTML = '<div class="text-muted small">Reading attendance and computing salaries…</div>';
      flags.innerHTML = '';

      try {
        let url = EXEC_URL + '?method=computeMonthlyPayroll&periodEnd=' + encodeURIComponent(toDdMmYyyy(periodEndIso));
        if (periodStartIso) {
          url += '&periodStart=' + encodeURIComponent(toDdMmYyyy(periodStartIso));
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Unknown error');

        status.innerHTML =
          '<div class="alert alert-success mb-0"><i class="bi bi-check-circle"></i> ' +
          'Payroll written to tab <strong>' + data.tab + '</strong> (' + data.periodStart + ' to ' + data.periodEnd + ') — ' +
          data.employees + ' employees' +
          (data.flaggedEmployees
            ? ', <strong>' + data.flaggedEmployees + '</strong> with attendance issues.'
            : ', no attendance issues.') +
          '</div>';

        if (data.flags && data.flags.length) {
          const body = data.flags.map(f =>
            '<tr><td>' + f.id + '</td><td>' + f.name +
            '</td><td class="text-danger small">' + f.detail + '</td></tr>').join('');
          flags.innerHTML =
            '<div class="mt-3"><h6 class="text-danger"><i class="bi bi-exclamation-triangle"></i> ' +
            'Attendance issues — paid 0 OT for these shifts</h6>' +
            '<table class="table table-sm table-bordered"><thead><tr>' +
            '<th>Employee ID</th><th>Name</th><th>Problem</th></tr></thead><tbody>' +
            body + '</tbody></table>' +
            '<div class="text-muted small">Fix the punches (Attendance_Log or amendAttendance), then run payroll again to pick up the changes.</div></div>';
        }
      } catch (err) {
        // Surface the "provide periodStart" first-run error clearly, pointing at the field.
        if (err.message && err.message.toLowerCase().includes('periodstart')) {
          status.innerHTML = '<div class="alert alert-danger mb-0"><i class="bi bi-x-circle"></i> ' + err.message +
            ' Use "First payroll run ever?" above to set one.</div>';
          document.getElementById('payrollFirstRunRow').style.display = 'flex';
        } else {
          status.innerHTML = '<div class="alert alert-danger mb-0"><i class="bi bi-x-circle"></i> ' + err.message + '</div>';
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    };
  })();
})();
