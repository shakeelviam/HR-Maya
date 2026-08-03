// app.js - Updated with Google Login

class HRApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.employees = [];
        this.attendance = [];
        this.leaves = [];
        this.reviews = [];
        this.dataTables = {};
        this.user = null;
        this.init();
    }

    async init() {
        // Show login screen first
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
        
        // Initialize Google Login
        await auth.initialize();
        auth.renderLoginButton('googleLoginButton');
        
        // Check if already authenticated
        if (auth.checkAuth()) {
            this.user = auth.getUser();
            this.onLoginSuccess();
        }
        
        // Set up login callback
        auth.onLogin((user) => {
            this.user = user;
            this.onLoginSuccess();
        });
        
        // Setup other event listeners
        this.setupEventListeners();
        this.setupSidebarToggle();
    }

    onLoginSuccess() {
        // Hide login, show main app
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        // Update user info in top bar
        document.getElementById('userEmail').textContent = this.user.email;
        document.getElementById('userName').textContent = this.user.name || 'Admin';
        if (this.user.picture) {
            document.getElementById('userAvatar').src = this.user.picture;
        }
        
        // Load data
        this.loadAllData();
        this.updateDashboard();
        this.initDataTables();
    }

    // ... rest of the app remains the same ...
    
    async signOut() {
        await auth.signOut();
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HRApp();
});

function handleSignOut() {
    app.signOut();
}
