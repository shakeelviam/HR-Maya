// ============================================================
// api.js - BACKEND API COMMUNICATION WITH CORS PROXY
// ============================================================

// ℹ️ We prepend a public CORS proxy here so GitHub Pages can talk to Google Scripts
const PROXIED_API_URL = 'https://corsproxy.io/?' + CONFIG.API_URL;

async function apiRequest(method, params = {}) {
    try {
        let url = PROXIED_API_URL;
        const queryParams = new URLSearchParams({ method, ...params }).toString();
        if (method) url += `?${queryParams}`;

        const response = await fetch(url, { method: 'GET' });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        
        if (!result.success) throw new Error(result.error || 'Unknown API error');
        return result.data;
        
    } catch (error) {
        console.error(`API Error [${method}]:`, error.message);
        throw error; // Re-throw so app.js can catch it
    }
}

// --- Specific API Calls ---

async function getIntegratedEmployees() {
    return apiRequest('getIntegratedEmployees');
}

async function markAttendance(data) {
    const response = await fetch(PROXIED_API_URL, {
        method: 'POST',
        body: JSON.stringify({ method: 'markAttendance', ...data })
    });
    return (await response.json()).data;
}

async function submitLeave(data) {
    const response = await fetch(PROXIED_API_URL, {
        method: 'POST',
        body: JSON.stringify({ method: 'submitLeave', ...data })
    });
    return (await response.json()).data;
}

async function addReview(data) {
    const response = await fetch(PROXIED_API_URL, {
        method: 'POST',
        body: JSON.stringify({ method: 'addReview', ...data })
    });
    return (await response.json()).data;
}

// ============================================================
// 🟢 ADDED 3 NEW KIOSK API FUNCTIONS HERE
// ============================================================

async function loginStaffKiosk(empId, pin) {
    return apiRequest('loginStaffKiosk', { empId: empId, pin: pin });
}

async function markKioskAttendance(empId, pin, stage) {
    return apiRequest('markKioskAttendance', { empId: empId, pin: pin, stage: stage });
}

async function getDailyKioskStatus(empId) {
    return apiRequest('getDailyKioskStatus', { empId: empId });
}
