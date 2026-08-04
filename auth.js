// ============================================================
// auth.js - GOOGLE AUTHENTICATION & AUTHORIZATION
// ============================================================

// Google Identity Services (GIS) Callback
function handleCredentialResponse(response) {
    const responsePayload = decodeJwtResponse(response.credential);
    const userEmail = responsePayload.email;

    // 🔒 SECURITY CHECK: Is this email authorized?
    if (!CONFIG.AUTHORIZED_EMAILS.includes(userEmail)) {
        alert(`Access Denied.\n"${userEmail}" is not an authorized email for ${CONFIG.APP_NAME}.`);
        handleSignOut();
        return;
    }

    // ✅ Authorized: Switch UI from Login to Main App
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    // Set user info in top bar
    document.getElementById('userEmail').innerText = userEmail;
    if (responsePayload.picture) {
        document.getElementById('userAvatar').src = responsePayload.picture;
        document.getElementById('userAvatar').style.display = 'inline-block';
        document.getElementById('userAvatarPlaceholder').style.display = 'none';
    } else {
        document.getElementById('userAvatarPlaceholder').innerText = responsePayload.name.charAt(0);
    }

    // 🟢 Initialize the App after successful login
    app.init();
}

function decodeJwtResponse(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function handleSignOut() {
    // Reset UI to Login Screen
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('userAvatar').style.display = 'none';
    document.getElementById('userAvatarPlaceholder').style.display = 'flex';
    document.getElementById('userEmail').innerText = 'Loading...';
}

// Initialize Google Sign-In on page load
window.onload = function () {
    google.accounts.id.initialize({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById("googleLoginButton"),
        { theme: "outline", size: "large" }
    );
    google.accounts.id.prompt(); 
};
