// auth.js
class AuthManager {
    constructor() {
        this.token = null;
        this.isAuthenticated = false;
        this.user = null;
    }

    async authenticate() {
        try {
            // For GitHub Pages, we'll use a simple token-based auth
            const storedToken = localStorage.getItem('hr_token');
            if (storedToken) {
                this.token = storedToken;
                this.isAuthenticated = true;
                return true;
            }
            
            // Simple password protection (Change this password)
            const password = prompt('Enter access password:');
            if (password === 'MayaHR2024!') {
                const token = btoa('hr_user:' + Date.now());
                localStorage.setItem('hr_token', token);
                this.token = token;
                this.isAuthenticated = true;
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Authentication failed:', error);
            return false;
        }
    }

    async signOut() {
        localStorage.removeItem('hr_token');
        this.token = null;
        this.isAuthenticated = false;
        location.reload();
    }

    getToken() {
        return this.token;
    }

    isAuthenticated() {
        return this.isAuthenticated;
    }
}

const auth = new AuthManager();
