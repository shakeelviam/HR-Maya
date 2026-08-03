// auth.js - Google OAuth 2.0 Login

class AuthManager {
    constructor() {
        this.token = null;
        this.isAuthenticated = false;
        this.user = null;
        this.clientId = CONFIG.GOOGLE_CLIENT_ID;
        this.authorizedEmails = CONFIG.AUTHORIZED_EMAILS;
        this._onLoginCallback = null;
    }

    // ===== INITIALIZE GOOGLE AUTH =====
    async initialize() {
        await this.loadGoogleLibrary();
        this.initializeGoogleAuth();
    }

    loadGoogleLibrary() {
        return new Promise((resolve) => {
            if (document.getElementById('google-library')) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.id = 'google-library';
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = resolve;
            script.onerror = () => {
                console.error('Failed to load Google Identity Services');
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    initializeGoogleAuth() {
        if (!window.google || !window.google.accounts) {
            console.warn('Google Identity Services not loaded yet');
            setTimeout(() => this.initializeGoogleAuth(), 500);
            return;
        }

        window.google.accounts.id.initialize({
            client_id: this.clientId,
            callback: (response) => this.handleCredentialResponse(response),
            cancel_on_tap_outside: false,
        });
    }

    renderLoginButton(containerId) {
        if (!window.google || !window.google.accounts) {
            console.warn('Google Identity Services not loaded yet');
            setTimeout(() => this.renderLoginButton(containerId), 500);
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) return;

        window.google.accounts.id.renderButton(
            container,
            {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                logo_alignment: 'left',
                width: '100%'
            }
        );
    }

    // ===== HANDLE LOGIN RESPONSE =====
    async handleCredentialResponse(response) {
        try {
            // Decode the ID token
            const payload = this.decodeJwtResponse(response.credential);
            
            // Check if email is authorized
            if (!this.authorizedEmails.includes(payload.email)) {
                alert('Access Denied.\nYou are not authorized to use this system.\n\nPlease contact your HR administrator.');
                this.signOut();
                return;
            }

            // Store user info
            this.user = {
                email: payload.email,
                name: payload.name || payload.email.split('@')[0],
                picture: payload.picture || '',
                emailVerified: payload.email_verified || false
            };
            
            this.token = response.credential;
            this.isAuthenticated = true;
            
            // Store in localStorage
            localStorage.setItem('hr_user', JSON.stringify(this.user));
            localStorage.setItem('hr_token', this.token);
            
            // Call the login callback
            if (this._onLoginCallback) {
                this._onLoginCallback(this.user);
            }
            
        } catch (error) {
            console.error('Authentication failed:', error);
            alert('Authentication failed. Please try again.');
        }
    }

    decodeJwtResponse(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(c => 
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
        );
        return JSON.parse(jsonPayload);
    }

    // ===== CHECK EXISTING AUTH =====
    checkAuth() {
        const storedUser = localStorage.getItem('hr_user');
        const storedToken = localStorage.getItem('hr_token');
        
        if (storedUser && storedToken) {
            try {
                this.user = JSON.parse(storedUser);
                this.token = storedToken;
                this.isAuthenticated = true;
                
                // Verify email is still authorized
                if (!this.authorizedEmails.includes(this.user.email)) {
                    this.signOut();
                    return false;
                }
                
                return true;
            } catch (e) {
                this.signOut();
                return false;
            }
        }
        return false;
    }

    // ===== LOGIN CALLBACK =====
    onLogin(callback) {
        this._onLoginCallback = callback;
    }

    // ===== SIGN OUT =====
    async signOut() {
        // Sign out from Google
        if (window.google && window.google.accounts) {
            try {
                window.google.accounts.id.disableAutoSelect();
                window.google.accounts.id.revoke(this.token, () => {});
            } catch (e) {
                // Ignore errors during sign out
            }
        }
        
        this.token = null;
        this.isAuthenticated = false;
        this.user = null;
        
        localStorage.removeItem('hr_user');
        localStorage.removeItem('hr_token');
        
        // Reload to show login page
        location.reload();
    }

    // ===== GETTERS =====
    getToken() {
        return this.token;
    }

    getUser() {
        return this.user;
    }

    isAuthorized() {
        return this.isAuthenticated && 
               this.user && 
               this.authorizedEmails.includes(this.user.email);
    }
}

// Create global auth instance
const auth = new AuthManager();
