// auth.js
class AuthManager {
    constructor() {
        this.token = null;
        this.isAuthenticated = false;
        this.user = null;
    }

    async authenticate() {
        try {
            // Check for stored token
            const storedToken = localStorage.getItem('hr_token');
            if (storedToken) {
                this.token = storedToken;
                this.isAuthenticated = true;
                return true;
            }
            
            // Simple password protection
            const password = prompt('Enter access password:');
            if (password === 'MayaHR2024!') {
                const token = btoa('hr_user:' + Date.now());
                localStorage.setItem('hr_token', token);
                this.token = token;
                this.isAuthenticated = true;
                return true;
            }
            
            alert('Invalid password. Please try again.');
            return false;
        } catch (error) {
            console.error('Authentication failed:', error);
            return false;
        }
    }

    async signOut() {
        if (confirm('Are you sure you want to sign out?')) {
            localStorage.removeItem('hr_token');
            this.token = null;
            this.isAuthenticated = false;
            location.reload();
        }
    }

    getToken() {
        return this.token;
    }

    isAuthenticated() {
        return this.isAuthenticated;
    }
}

const auth = new AuthManager();
