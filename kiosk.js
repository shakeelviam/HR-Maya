// ============================================================
// kiosk.js - BRANCH TABLET LOGIC
// ============================================================

let currentEmpId = null;
let currentEmpPin = null;

// 1. Login Function
async function kioskLogin() {
    const empId = document.getElementById('kioskEmpId').value.trim();
    const pin = document.getElementById('kioskPin').value.trim();
    const errorEl = document.getElementById('kioskError');
    const loginBtn = document.getElementById('kioskLoginBtn');

    errorEl.innerText = '';
    if (!empId || !pin) {
        errorEl.innerText = 'Please enter both ID and PIN.';
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Verifying...';

    try {
        const result = await loginStaffKiosk(empId, pin);

        // 🟢 FIX: Guard clause to prevent the 'undefined' crash
        if (!result) {
            errorEl.innerText = 'Connection error. Please check your network.';
            return;
        }

        if (result.success) {
            currentEmpId = empId;
            currentEmpPin = pin;
            // Switch Screens
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('kioskDashboard').style.display = 'block';
            document.getElementById('kioskEmpName').innerText = result.name;
            document.getElementById('kioskEmpIdDisplay').innerText = `ID: ${result.id}`;
            updateButtons(result.currentStatus);
        } else {
            errorEl.innerText = result.error || 'Invalid credentials.';
        }
    } catch (error) {
        console.error(error);
        errorEl.innerText = 'Connection error. Please check your network.';
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Clock In / Out';
    }
}

// 2. Button Action
async function kioskAction(stage) {
    if (!currentEmpId) return;

    // Lock the single stage button + OT button during the request.
    const btn = document.getElementById('stageBtn');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

    try {
        // Capture location (best-effort). Backend flags "NO LOCATION" if unavailable/denied.
        const pos = await getKioskLocation();
        const result = await markKioskAttendance(currentEmpId, currentEmpPin, stage, pos.lat, pos.lng);

        if (result.success) {
            let msg = result.message;
            if (result.geoFlag && result.geoFlag !== 'OK') {
                msg += '\n\n⚠ Location: ' + result.geoFlag + (result.distance != null ? ' (' + result.distance + 'm from branch)' : '');
            }
            alert(msg);
            // Advance to the next step based on the stage just recorded.
            const nextByStage = {
                'Check In': 'checked_in',
                'Break Out': 'on_break',
                'Break In': 'break_done',
                'Check Out': 'done'
            };
            updateButtons(nextByStage[stage] || 'done');
        } else {
            alert(result.error || 'Action failed.');
            refreshDashboardState();
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        }
    } catch (error) {
        alert('Network error. Please try again.');
        console.error(error);
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    }
}

// 3. Button State Manager
// Single big button showing only the next valid action.
// Sequence: (none/checked_out) Check In -> (checked_in) Break Out ->
//           (on_break) Break In -> (break_done) Check Out -> (done) completed.
function updateButtons(currentStage) {
    const host = document.getElementById('stageHost');
    if (!host) return;
    const map = {
        'none':        { stage: 'Check In',  cls: 'btn-check-in',  icon: 'bi-play-circle',  label: 'Check In' },
        'checked_out': { stage: 'Check In',  cls: 'btn-check-in',  icon: 'bi-play-circle',  label: 'Check In' },
        'checked_in':  { stage: 'Break Out', cls: 'btn-break-out', icon: 'bi-pause-circle', label: 'Break Out' },
        'on_break':    { stage: 'Break In',  cls: 'btn-break-in',  icon: 'bi-play-circle',  label: 'Break In' },
        'break_done':  { stage: 'Check Out', cls: 'btn-check-out', icon: 'bi-stop-circle',  label: 'Check Out' },
        'checked_in_after_break': { stage: 'Check Out', cls: 'btn-check-out', icon: 'bi-stop-circle', label: 'Check Out' }
    };
    const step = map[currentStage];
    if (!step) {
        // Fully done for the day.
        host.innerHTML = '<div class="stage-done"><i class="bi bi-check-circle"></i><div>All done for today</div>' +
            '<div class="stage-done-sub">You have completed your attendance.</div></div>';
        return;
    }
    host.innerHTML = '<button class="stage-btn-single ' + step.cls + '" id="stageBtn" onclick="kioskAction(\'' + step.stage + '\')">' +
        '<i class="bi ' + step.icon + '"></i><span>' + step.label + '</span></button>';
}

// 4. Logout Function
function kioskLogout() {
    currentEmpId = null;
    currentEmpPin = null;
    document.getElementById('kioskDashboard').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('kioskEmpId').value = '';
    document.getElementById('kioskPin').value = '';
    document.getElementById('kioskError').innerText = '';
}

// 5. Auto-Refresh Sync (Helps if tablet goes idle)
async function refreshDashboardState() {
    if (!currentEmpId) return;
    try {
        const result = await getDailyKioskStatus(currentEmpId);
        if (result.success) {
            updateButtons(result.currentStage);
        }
    } catch (e) { /* Silent fail to avoid nagging users */ }
}

// Allow pressing "Enter" key on PIN field to trigger login
document.getElementById('kioskPin').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        kioskLogin();
    }
});

// Best-effort geolocation for kiosk punches. Resolves {lat,lng} or {lat:null,lng:null}.
function getKioskLocation() {
    return new Promise((resolve) => {
        if (!('geolocation' in navigator)) { resolve({ lat: null, lng: null }); return; }
        let done = false;
        const finish = (v) => { if (!done) { done = true; resolve(v); } };
        navigator.geolocation.getCurrentPosition(
            (p) => finish({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => finish({ lat: null, lng: null }),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
        // Hard fallback so a hung GPS never blocks the punch.
        setTimeout(() => finish({ lat: null, lng: null }), 9000);
    });
}

// ============================================================
// SUBMIT OVERTIME (kiosk add-on) — self-submit, goes to HR pending review
// ============================================================
function openOtSubmit() {
    if (!currentEmpId) return;
    const m = document.getElementById('otModal');
    document.getElementById('otDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('otHours').value = '';
    document.getElementById('otMsg').innerText = '';
    m.style.display = 'flex';
}
function closeOtSubmit() {
    document.getElementById('otModal').style.display = 'none';
}
async function submitOt() {
    const msg = document.getElementById('otMsg');
    const btn = document.getElementById('otSubmitBtn');
    const iso = document.getElementById('otDate').value;
    const hours = document.getElementById('otHours').value;
    if (!iso) { msg.style.color = '#c00'; msg.innerText = 'Pick a date.'; return; }
    if (!hours || Number(hours) <= 0) { msg.style.color = '#c00'; msg.innerText = 'Enter OT hours.'; return; }
    // dd-mm-yyyy for the backend
    const [y, mo, d] = iso.split('-');
    const dd = d + '-' + mo + '-' + y;

    btn.disabled = true; btn.innerText = 'Submitting…';
    msg.style.color = '#555'; msg.innerText = 'Getting location…';
    try {
        const pos = await getKioskLocation();
        msg.innerText = 'Please wait…';
        const result = await submitOtRequest(currentEmpId, currentEmpPin, dd, hours, pos.lat, pos.lng);
        if (result && result.success) {
            msg.style.color = '#198754';
            msg.innerText = result.message || 'Submitted — pending HR review.';
            setTimeout(closeOtSubmit, 1800);
        } else {
            msg.style.color = '#c00';
            msg.innerText = (result && result.error) ? result.error : 'Could not submit.';
        }
    } catch (e) {
        msg.style.color = '#c00'; msg.innerText = 'Network error. Try again.';
    } finally {
        btn.disabled = false; btn.innerText = 'Submit';
    }
}
