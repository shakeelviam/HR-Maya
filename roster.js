// ============================================================
// roster.js — Supervisor Roster Planner
// ============================================================

let supId = null, supPin = null, currentData = null;

function todayIso() { return new Date().toISOString().split('T')[0]; }
function isoToDd(iso) { const [y,m,d]=iso.split('-'); return d+'-'+m+'-'+y; }
function ddToIso(dd)  { const [d,m,y]=dd.split('-'); return y+'-'+m+'-'+d; }

async function api(method, params) {
  const url = CONFIG.API_URL.replace('/dev', '/exec');
  const qs = new URLSearchParams({ method, ...params }).toString();
  const r = await fetch(url + '?' + qs);
  return r.json();
}
async function apiPost(method, body) {
  const url = CONFIG.API_URL.replace('/dev', '/exec');
  const r = await fetch(url + '?method=' + method, {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  return r.json();
}

// ── Login ──────────────────────────────────────────────────
async function doLogin() {
  const id  = document.getElementById('supId').value.trim();
  const pin = document.getElementById('supPin').value.trim();
  const err = document.getElementById('loginErr');
  err.innerText = '';
  if (!id || !pin) { err.innerText = 'Enter ID and PIN.'; return; }

  try {
    const res = await api('voiceLogin', { supId: id, supPin: pin });
    if (!res.success) { err.innerText = res.error || 'Login failed.'; return; }
    supId = id; supPin = pin;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('locName').innerText = res.location + ' — Roster';
    document.getElementById('supName').innerText = res.name + ' · ' + res.teamCount + ' staff';

    const today = todayIso();
    document.getElementById('fromDate').value = today;
    const to = new Date(); to.setDate(to.getDate() + 6);
    document.getElementById('toDate').value = to.toISOString().split('T')[0];

    loadDiscrepancies();
  } catch (e) {
    err.innerText = 'Connection error.';
  }
}

function logout() {
  supId = null; supPin = null; currentData = null;
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('supId').value = '';
  document.getElementById('supPin').value = '';
}

// ── Discrepancies panel ───────────────────────────────────
async function loadDiscrepancies() {
  const res = await api('getDiscrepancies', { supId, supPin });
  const card = document.getElementById('discCard');
  const list = document.getElementById('discList');
  if (!res.success || !res.rows || !res.rows.length) { card.style.display = 'none'; return; }

  card.style.display = 'block';
  list.innerHTML = res.rows.map(r =>
    '<div class="disc-row">' +
      '<div>' +
        '<b>' + r.name + '</b> (' + r.empId + ') — ' + r.date + '<br>' +
        '<span class="disc-meta">Roster said: ' + r.rosterSaid + ' · Actual: ' + r.actual + '</span>' +
      '</div>' +
      '<button class="btn btn-outline" onclick="reviewDisc(' + r.rowNum + ')">Mark Reviewed</button>' +
    '</div>'
  ).join('');
}

async function reviewDisc(rowNum) {
  await api('markDiscrepancyReviewed', { supId, supPin, rowNum });
  loadDiscrepancies();
}

// ── Load roster grid ───────────────────────────────────────
async function loadRoster() {
  const from = isoToDd(document.getElementById('fromDate').value);
  const to   = isoToDd(document.getElementById('toDate').value);
  const wrap = document.getElementById('gridWrap');
  wrap.innerHTML = '<p style="color:var(--muted)">Loading…</p>';
  setStatus('');

  const res = await api('getRosterRange', { supId, supPin, from, to });
  if (!res.success) { wrap.innerHTML = '<p style="color:var(--red)">' + res.error + '</p>'; return; }

  currentData = res;
  renderGrid();
}

function renderGrid() {
  const { employees, dates, shifts, cells } = currentData;
  const wrap = document.getElementById('gridWrap');

  let head = '<tr><th class="emp-name-h">Employee</th>' +
    dates.map(d => '<th>' + d.slice(0,5) + '</th>').join('') + '</tr>';

  let body = employees.map(emp => {
    const rowCells = dates.map(date => {
      const c = (cells[emp.id] && cells[emp.id][date]) || {};
      if (c.locked) {
        return '<td><div class="cell-locked">' + c.lockReason + '</div></td>';
      }
      const shiftOpts = shifts.map(s =>
        '<option value="' + s + '"' + (c.shift===s?' selected':'') + '>' + s + '</option>'
      ).join('');
      const statusCls = c.status === 'Day Off' ? 'off' : c.status === 'Working' ? 'working' : '';
      const pubCls = c.published ? ' cell-published' : '';
      return '<td class="' + (c.status ? '' : 'cell-empty') + '">' +
        '<select class="cell-select ' + statusCls + pubCls + '" ' +
          'data-emp="' + emp.id + '" data-date="' + date + '" onchange="onCellChange(this)">' +
          '<option value="">—</option>' +
          '<option value="Working"' + (c.status==='Working'?' selected':'') + '>Working</option>' +
          '<option value="Day Off"' + (c.status==='Day Off'?' selected':'') + '>Day Off</option>' +
        '</select>' +
        (c.status === 'Working' ?
          '<select class="cell-select mt-1" data-shift-for="' + emp.id + '|' + date + '" style="margin-top:3px">' +
            shiftOpts +
          '</select>' : '') +
        (c.published ? '<div style="font-size:10px;color:var(--green);margin-top:2px">' +
          '<i class="bi bi-check-circle-fill"></i> <a href="#" onclick="openAmend(\'' + emp.id + '\',\'' + emp.name.replace(/'/g,"\\'") + '\',\'' + date + '\');return false;" style="color:var(--amber)">amend</a></div>' : '') +
      '</td>';
    }).join('');
    return '<tr><td class="emp-name">' + emp.name + '<br><span style="font-size:10px;color:var(--muted);font-weight:400">' + emp.id + '</span></td>' + rowCells + '</tr>';
  }).join('');

  wrap.innerHTML = '<table class="roster-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';
}

function onCellChange(sel) {
  const empId = sel.getAttribute('data-emp');
  const date  = sel.getAttribute('data-date');
  const val   = sel.value;
  if (!currentData.cells[empId]) currentData.cells[empId] = {};
  if (!currentData.cells[empId][date]) currentData.cells[empId][date] = {};
  currentData.cells[empId][date].status = val;
  renderGrid(); // re-render to show/hide shift dropdown
}

// ── Save / Publish ─────────────────────────────────────────
function collectCellsPayload() {
  const out = {};
  document.querySelectorAll('.cell-select[data-emp]').forEach(sel => {
    const empId = sel.getAttribute('data-emp');
    const date  = sel.getAttribute('data-date');
    const status = sel.value;
    if (!status) return;
    let shift = '';
    const shiftSel = document.querySelector('[data-shift-for="' + empId + '|' + date + '"]');
    if (shiftSel) shift = shiftSel.value;
    if (!out[empId]) out[empId] = {};
    out[empId][date] = { status, shift };
  });
  return out;
}

async function saveDraft() {
  if (!currentData) return;
  const from = isoToDd(document.getElementById('fromDate').value);
  const to   = isoToDd(document.getElementById('toDate').value);
  const cells = collectCellsPayload();
  setStatus('Saving…', '');
  const res = await apiPost('saveRosterDraft', { supId, supPin, from, to, cells: JSON.stringify(cells) });
  if (res.success) { setStatus(res.message, 'ok'); loadRoster(); }
  else setStatus(res.error, 'err');
}

async function publish() {
  const from = isoToDd(document.getElementById('fromDate').value);
  const to   = isoToDd(document.getElementById('toDate').value);
  if (!confirm('Publish the roster for ' + from + ' to ' + to + '? This makes it live for attendance compilation.')) return;
  setStatus('Publishing…', '');
  const res = await api('publishRoster', { supId, supPin, from, to });
  if (res.success) { setStatus(res.message, 'ok'); loadRoster(); }
  else setStatus(res.error, 'err');
}

async function copyPrevious() {
  const from = isoToDd(document.getElementById('fromDate').value);
  const to   = isoToDd(document.getElementById('toDate').value);
  setStatus('Copying previous range…', '');
  const res = await api('copyPreviousRange', { supId, supPin, from, to });
  if (!res.success) { setStatus(res.error, 'err'); return; }

  if (!currentData) await loadRoster();
  Object.keys(res.cells).forEach(empId => {
    if (!currentData.cells[empId]) currentData.cells[empId] = {};
    Object.keys(res.cells[empId]).forEach(date => {
      // Don't override a locked (on-leave) cell
      const existing = currentData.cells[empId][date] || {};
      if (existing.locked) return;
      currentData.cells[empId][date] = { ...existing, ...res.cells[empId][date] };
    });
  });
  renderGrid();
  setStatus('Copied from ' + res.sourceFrom + ' – ' + res.sourceTo + '. Review and Save Draft.', 'ok');
}

function setStatus(msg, cls) {
  const el = document.getElementById('statusMsg');
  el.innerText = msg;
  el.className = cls === 'ok' ? 'status-ok' : cls === 'err' ? 'status-err' : '';
}

// ── Amend modal ────────────────────────────────────────────
let amendTarget = null;

function openAmend(empId, empName, date) {
  amendTarget = { empId, empName, date };
  document.getElementById('amendWho').innerText = empName + ' (' + empId + ') — ' + date;
  document.getElementById('amendReason').value = '';
  document.getElementById('amendMsg').innerText = '';

  const shiftSel = document.getElementById('amendShift');
  shiftSel.innerHTML = (currentData.shifts || []).map(s => '<option value="' + s + '">' + s + '</option>').join('');

  document.getElementById('amendModal').style.display = 'flex';
}
function closeAmend() { document.getElementById('amendModal').style.display = 'none'; }

async function submitAmend() {
  const status = document.getElementById('amendStatus').value;
  const shift  = document.getElementById('amendShift').value;
  const reason = document.getElementById('amendReason').value.trim();
  const msgEl  = document.getElementById('amendMsg');
  if (!reason) { msgEl.innerText = 'Reason is required.'; msgEl.style.color = 'var(--red)'; return; }

  const res = await apiPost('amendRosterEntry', {
    supId, supPin,
    empId: amendTarget.empId, date: amendTarget.date,
    newStatus: status, newShift: shift, reason
  });
  if (res.success) {
    msgEl.style.color = 'var(--green)';
    msgEl.innerText = res.message;
    setTimeout(() => { closeAmend(); loadRoster(); }, 1000);
  } else {
    msgEl.style.color = 'var(--red)';
    msgEl.innerText = res.error;
  }
}

// Enter key on PIN
document.addEventListener('DOMContentLoaded', () => {
  const pin = document.getElementById('supPin');
  if (pin) pin.addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });
});
