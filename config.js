// config.js - Complete Configuration

const CONFIG = {
    // ===== APPS SCRIPT =====
    // Your deployed Apps Script Web App URL
    // After deploying your Apps Script, replace this with your actual URL
    API_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
    
    // ===== GOOGLE SHEETS =====
    // Your Google Sheet ID (the one with Employees Details, Vacation, Sick Leave)
    SPREADSHEET_ID: '1k5T2DfZqACaJLbwy16-XSfnGaLq4Vg0u1epGro94c_c',
    
    // ===== GOOGLE OAUTH =====
    // Your Google OAuth Client ID (from the JSON file)
    GOOGLE_CLIENT_ID: '323911089919-it1nrmlpmq2ojigs50g6hu11qur4r59n.apps.googleusercontent.com',
    
    // ===== AUTHORIZED ADMIN EMAILS =====
    // Only these email addresses can access the system
    AUTHORIZED_EMAILS: [
        'shakeelviram@gmail.com',  // Add your email
        // 'info@maya.com.kw',
        // 'hr@maya.com.kw',
        // 'operations@maya.com.kw',
    ],
    
    // ===== APP SETTINGS =====
    APP_NAME: 'Maya HR Management System',
    COMPANY_NAME: 'Maya',
    
    // ===== SHEET NAMES =====
    SHEETS: {
        EMPLOYEES: 'Employees',              // Master sheet (integrated)
        EMPLOYEES_SOURCE: 'Employees Details', // Source sheet
        VACATION: 'Vacation',                // Vacation data source
        SICK_LEAVE: 'Sick Leave',            // Sick leave data source
        ATTENDANCE: 'Attendance',            // Attendance records
        LEAVE_REQUESTS: 'Leave Requests',    // Leave requests
        PERFORMANCE_REVIEWS: 'Performance Reviews' // Reviews
    },
    
    // ===== MANAGEMENT EMPLOYEES (for ID assignment) =====
    MANAGEMENT_EMPLOYEES: [
        { name: 'Abdulrahman Al-Najjar', id: 'MT-00001' },
        { name: 'Mishari Al-Mutawaq', id: 'MT-00002' },
        { name: 'Abdulwahab Al-Najjar', id: 'MT-00003' },
        { name: 'Abdullah Al-Samhan', id: 'MT-00004' },
        { name: 'Mohamed Awda', id: 'MT-00005' },
        { name: 'Ayman Mandoub', id: 'MT-00006' }
    ],
    
    // ===== DEFAULTS =====
    DEFAULTS: {
        EMPLOYEE_STATUS: 'Active',
        LEAVE_STATUS: 'Pending',
        ATTENDANCE_STATUS: 'Present'
    }
};
