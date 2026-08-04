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
        const url = `${CONFIG.API_URL}?method=loginStaffKiosk&empId=${encodeURIComponent(empId)}&pin=${encodeURIComponent(pin)}`;
        const response = await fetch(url);
        const result = await response.json();

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
        errorEl.innerText = 'Connection error. Please check your network.';
        console.error(error);
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Clock In / Out';
    }
}

// 2. Button Action
async function kioskAction(stage) {
    const errorEl = document.getElementById('kioskError');
    if (!currentEmpId) return;

    // Simple client-side locking to prevent double clicking
    const allBtns = document.querySelectorAll('.stage-btn');
    allBtns.forEach(b => b.disabled = true);

    try {
        const url = `${CONFIG.API_URL}?method=markKioskAttendance&empId=${encodeURIComponent(currentEmpId)}&pin=${encodeURIComponent(currentEmpPin)}&stage=${encodeURIComponent(stage)}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            // Show a quick success alert / toast
            alert(result.message);
            // Refresh the button states
            updateButtons(result.stage);
        } else {
            alert(result.error || 'Action failed.');
            // Refresh just in case to sync with server state
            refreshDashboardState();
        }
    } catch (error) {
        alert('Network error. Please try again.');
        console.error(error);
    } finally {
        allBtns.forEach(b => b.disabled = false);
    }
}

// 3. Button State Manager
function updateButtons(currentStage) {
    const btnCI = document.getElementById('btnCheckIn');
    const btnBO = document.getElementById('btnBreakOut');
    const btnBI = document.getElementById('btnBreakIn');
    const btnCO = document.getElementById('btnCheckOut');

    // Reset all to disabled
    [btnCI, btnBO, btnBI, btnCO].forEach(b => b.disabled = true);

    if (currentStage === 'none' || currentStage === 'checked_out') {
        btnCI.disabled = false;
    } else if (currentStage === 'checked_in') {
        btnBO.disabled = false;
    } else if (currentStage === 'on_break') {
        btnBI.disabled = false;
    }
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
        const url = `${CONFIG.API_URL}?method=getDailyKioskStatus&empId=${encodeURIComponent(currentEmpId)}`;
        const response = await fetch(url);
        const result = await response.json();
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
