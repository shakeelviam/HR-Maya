// ============================================================
// api.js - BACKEND API COMMUNICATION (NO PROXY)
// ============================================================

// We connect directly to Version 23. No proxy required.
const PROXIED_API_URL = CONFIG.API_URL;

async function apiRequest(method, params = {}) {
    try {
        let url = PROXIED_API_URL;
        const queryParams = new URLSearchParams({ method, ...params }).toString();
        if (method) url += `?${queryParams}`;

        const response = await fetch(url, { method: 'GET' });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        
        if (!result.success) return result; // Return the error object safely
        return result.data; // Return the data on success
        
    } catch (error) {
        console.error(`API Error [${method}]:`, error.message);
        // Return a safe object so the frontend never crashes
        return { success: false, error: error.message || 'Connection error' };
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

// --- Kiosk API Calls ---

async function loginStaffKiosk(empId, pin) {
    return apiRequest('loginStaffKiosk', { empId: empId, pin: pin });
}

async function markKioskAttendance(empId, pin, stage) {
    return apiRequest('markKioskAttendance', { empId: empId, pin: pin, stage: stage });
}

async function getDailyKioskStatus(empId) {
    return apiRequest('getDailyKioskStatus', { empId: empId });
}
