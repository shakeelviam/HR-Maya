// ============================================================
// api.js - BACKEND API COMMUNICATION
// ============================================================

async function apiRequest(method, params = {}) {
    try {
        let url = CONFIG.API_BASE_URL;
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
    const response = await fetch(CONFIG.API_BASE_URL, {
        method: 'POST',
        body: JSON.stringify({ method: 'markAttendance', ...data })
    });
    return (await response.json()).data;
}

async function submitLeave(data) {
    const response = await fetch(CONFIG.API_BASE_URL, {
        method: 'POST',
        body: JSON.stringify({ method: 'submitLeave', ...data })
    });
    return (await response.json()).data;
}

async function addReview(data) {
    const response = await fetch(CONFIG.API_BASE_URL, {
        method: 'POST',
        body: JSON.stringify({ method: 'addReview', ...data })
    });
    return (await response.json()).data;
}
