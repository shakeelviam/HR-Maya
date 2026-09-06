// ============================================================
// api.js - DIRECT FETCH TO APPS SCRIPT /exec (matches dashboard)
// ============================================================
// Why this replaces the old iframe/postMessage "CORS bypass":
//   - The old code targeted /dev, which only responds to the script
//     OWNER while logged in — an anonymous staff tablet just gets
//     Google's login page, never JSON.
//   - The appended gs_callback=... param was JSONP-style and Apps
//     Script never executes it, so the promise never resolved.
//   - script.google.com will not hand readable content to a
//     cross-origin iframe on github.io anyway.
//
// This version uses the EXACT pattern app.js (the dashboard) already
// uses successfully: a simple GET to /exec. Apps Script serves simple
// GET requests with permissive CORS, so this works from GitHub Pages
// with no backend change and no redeployment.
function gsRequest(method, params = {}) {
    // Force the deployed /exec endpoint. /exec works for anonymous
    // kiosk users; /dev never will. This coercion means the kiosk keeps
    // working even if config.js is ever toggled back to /dev by mistake.
    const url = CONFIG.API_URL.replace('/dev', '/exec');
    const query = new URLSearchParams({ method, ...params }).toString();
    return fetch(`${url}?${query}`)
        .then(res => res.json())
        .catch(err => ({
            success: false,
            error: (err && err.message) ? err.message : 'Connection error'
        }));
}
// --- Kiosk API calls -----------------------------------------
// These return the backend's raw JSON object directly (it already
// contains .success, .name, .id, .currentStatus, .stage, .error, etc.),
// which is exactly what kiosk.js expects. No wrapping.
function submitOtRequest(empId, pin, date, hours, lat, lng) {
    return gsRequest('submitOtRequest', { empId: empId, pin: pin, date: date, hours: hours, lat: (lat == null ? '' : lat), lng: (lng == null ? '' : lng) });
}
function loginStaffKiosk(empId, pin) {
    return gsRequest('loginStaffKiosk', { empId: empId, pin: pin });
}
function markKioskAttendance(empId, pin, stage, lat, lng) {
    return gsRequest('markKioskAttendance', {
        empId: empId, pin: pin, stage: stage,
        lat: (lat == null ? '' : lat),
        lng: (lng == null ? '' : lng)
    });
}
function getDailyKioskStatus(empId) {
    return gsRequest('getDailyKioskStatus', { empId: empId });
}

// Backdated Day Off — reuses the existing addAttendancePunch endpoint
// so NO new GAS method or redeployment is needed.
function markBackdatedDayOff(empId, pin, dateDd, lat, lng) {
    const url = CONFIG.API_URL.replace('/dev', '/exec');
    return fetch(url + '?method=addAttendancePunch', {
        method : 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body   : JSON.stringify({
            empId   : empId,
            date    : dateDd,   // dd-mm-yyyy — backend uses this date
            time    : '00:00',
            stage   : 'Day Off',
            location: '',
            by      : empId + ' (kiosk self-report)'
        })
    })
    .then(res => res.json())
    .catch(err => ({ success: false, error: err.message || 'Connection error' }));
}
