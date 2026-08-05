// ============================================================
// payroll-ui.js — Payroll page + "Run Payroll" button (drop-in)
// ------------------------------------------------------------
// Add this ONE line to index.html, right AFTER <script src="app.js"></script>:
//     <script src="payroll-ui.js"></script>
//
// It injects its own sidebar link and page — no other index.html edits.
// Requires the backend method computeMonthlyPayroll() to be live in Code.gs
// (and its case added to handleRequest), then a redeploy.
// ============================================================

(function () {
  // Same /exec base the dashboard already uses in app.js
  const EXEC_URL = 'https://script.google.com/macros/s/AKfycbyG5XLC79FnyLtSGGWunhJwU83SV0b0kz3y1FKdal-JBcTUM-X0ax134konYyTaKxYiiQ/exec';

  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];

  function monthOptions() {
    const cur = new Date().getMonth(); // 0-11
    return MONTHS.map((m, i) => `<option value="${i + 1}"${i === cur ? ' selected' : ''}>${m}</option>`).join('');
  }
  function yearOptions() {
    const y = new Date().getFullYear();
    let o = '';
    for (let yr = y; yr >= y - 3; yr--) o += `<option value="${yr}">${yr}</option>`;
    return o;
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

      // app.setupSidebarNavigation() has already run, so wire this link ourselves
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
          '<h5 class="mb-3"><i class="bi bi-cash-stack"></i> Monthly Payroll</h5>' +
          '<div class="row g-2 align-items-end mb-3">' +
            '<div class="col-auto"><label class="form-label small mb-1">Month</label>' +
              '<select id="payrollMonth" class="form-select form-select-sm">' + monthOptions() + '</select></div>' +
            '<div class="col-auto"><label class="form-label small mb-1">Year</label>' +
              '<select id="payrollYear" class="form-select form-select-sm">' + yearOptions() + '</select></div>' +
            '<div class="col-auto">' +
              '<button id="payrollRunBtn" class="btn btn-primary btn-sm" onclick="app.runPayroll()">' +
                '<i class="bi bi-calculator"></i> Run Payroll</button></div>' +
          '</div>' +
          '<div id="payrollStatus" class="mb-2"></div>' +
          '<div id="payrollFlags"></div>' +
          '<div class="text-muted small">Results are written to a dated tab (e.g. "Payroll 08-2026") in the HR sheet. ' +
            'Re-running a month rebuilds only that tab.</div>' +
        '</div>';
      anchor.parentElement.appendChild(section);
    }
  });

  // --- Attach the action to the existing global `app` object ---
  (function attach() {
    if (typeof app === 'undefined') return setTimeout(attach, 50);

    app.runPayroll = async function () {
      const month  = document.getElementById('payrollMonth').value;
      const year   = document.getElementById('payrollYear').value;
      const btn    = document.getElementById('payrollRunBtn');
      const status = document.getElementById('payrollStatus');
      const flags  = document.getElementById('payrollFlags');

      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Computing…';
      status.innerHTML = '<div class="text-muted small">Reading attendance and computing salaries…</div>';
      flags.innerHTML = '';

      try {
        const url = EXEC_URL + '?method=computeMonthlyPayroll&month=' +
                    encodeURIComponent(month) + '&year=' + encodeURIComponent(year);
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Unknown error');

        status.innerHTML =
          '<div class="alert alert-success mb-0"><i class="bi bi-check-circle"></i> ' +
          'Payroll written to tab <strong>' + data.tab + '</strong> — ' + data.employees + ' employees' +
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
            'Attendance issues — paid 0 OT for these days</h6>' +
            '<table class="table table-sm table-bordered"><thead><tr>' +
            '<th>Employee ID</th><th>Name</th><th>Problem day(s)</th></tr></thead><tbody>' +
            body + '</tbody></table>' +
            '<div class="text-muted small">Fix the punches, then run payroll again to pick up the changes.</div></div>';
        }
      } catch (err) {
        status.innerHTML = '<div class="alert alert-danger mb-0"><i class="bi bi-x-circle"></i> ' + err.message + '</div>';
      } finally {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    };
  })();
})();
