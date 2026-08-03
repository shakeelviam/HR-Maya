// auth.js - Google OAuth 2.0 Login

class AuthManager {
    constructor() {
        this.token = null;
        this.isAuthenticated = false;
        this.user = null;
        this.authorizedEmails = [
            'admin@maya.com',        // Add your admin emails here
            'hr@maya.com',
            // Add more authorized emails
        ];
        this.clientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // Replace with your Client ID
    }

    async initialize() {
        // Load Google Identity Services
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
            document.head.appendChild(script);
        });
    }

    initializeGoogleAuth() {
        window.google.accounts.id.initialize({
            client_id: this.clientId,
            callback: (response) => this.handleCredentialResponse(response),
            cancel_on_tap_outside: false,
        });
    }

    renderLoginButton(containerId) {
        window.google.accounts.id.renderButton(
            document.getElementById(containerId),
            {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                logo_alignment: 'left'
            }
        );
    }

    async handleCredentialResponse(response) {
        try {
            // Decode the ID token
            const payload = this.decodeJwtResponse(response.credential);
            
            // Check if email is authorized
            if (!this.authorizedEmails.includes(payload.email)) {
                alert('Access Denied. You are not authorized to use this system.');
                this.signOut();
                return;
            }

            // Store user info
            this.user = {
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                emailVerified: payload.email_verified
            };
            
            this.token = response.credential;
            this.isAuthenticated = true;
            
            // Store in localStorage
            localStorage.setItem('hr_user', JSON.stringify(this.user));
            localStorage.setItem('hr_token', this.token);
            
            // Update UI and reload app
            this.onLoginSuccess();
            
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

    checkAuth() {
        // Check if user is already authenticated
        const storedUser = localStorage.getItem('hr_user');
        const storedToken = localStorage.getItem('hr_token');
        
        if (storedUser && storedToken) {
            try {
                this.user = JSON.parse(storedUser);
                this.token = storedToken;
                this.isAuthenticated = true;
                return true;
            } catch (e) {
                this.signOut();
                return false;
            }
        }
        return false;
    }

    onLoginSuccess() {
        // This will be called by the main app
        if (this._onLoginCallback) {
            this._onLoginCallback(this.user);
        }
    }

    onLogin(callback) {
        this._onLoginCallback = callback;
    }

    async signOut() {
        // Sign out from Google
        if (window.google) {
            window.google.accounts.id.disableAutoSelect();
        }
        
        this.token = null;
        this.isAuthenticated = false;
        this.user = null;
        
        localStorage.removeItem('hr_user');
        localStorage.removeItem('hr_token');
        
        // Reload to show login page
        location.reload();
    }

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

const auth = new AuthManager();
