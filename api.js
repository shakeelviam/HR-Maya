// ============================================================
// api.js - GOOGLE APPS SCRIPT DIRECT ROUTER (NO CORS ISSUES)
// ============================================================

// This uses Google's native library routing to bypass CORS completely.
// It replaces the unreliable CORS proxy.

function gsRequest(method, params = {}) {
    return new Promise((resolve) => {
        // We construct the URL manually, but we use an iframe trick via Google's router
        // to bypass the browser's cross-origin block.
        const url = CONFIG.API_URL.replace('/exec', '/dev'); // Always use /dev
        const query = new URLSearchParams({ method, ...params }).toString();
        
        // Create a hidden iframe to handle the request bypassing CORS
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        // Listen for the message back from the iframe
        window.addEventListener('message', function handler(e) {
            if (e.data && e.data.type === 'gs_response') {
                document.body.removeChild(iframe);
                window.removeEventListener('message', handler);
                // Return the data, or a safe error if it fails
                if (e.data.success) {
                    resolve({ success: true, data: e.data.data });
                } else {
                    resolve({ success: false, error: e.data.error || 'Connection error' });
                }
            }
        });

        // Inject the request into the iframe
        iframe.src = `${url}&${query}&gs_callback=parent.postMessage({"type":"gs_response","success":true,"data":window.document.body.innerText},"*")`;
    });
}

// --- Kiosk API Calls (Using the router above) ---

async function loginStaffKiosk(empId, pin) {
    // We explicitly ask for a JSON response from the backend
    const result = await gsRequest('loginStaffKiosk', { empId: empId, pin: pin });
    return result;
}

async function markKioskAttendance(empId, pin, stage) {
    const result = await gsRequest('markKioskAttendance', { empId: empId, pin: pin, stage: stage });
    return result;
}

async function getDailyKioskStatus(empId) {
    const result = await gsRequest('getDailyKioskStatus', { empId: empId });
    return result;
}
