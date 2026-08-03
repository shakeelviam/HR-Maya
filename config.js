// config.js - Updated with both Sheet IDs

const CONFIG = {
    // ===== APPS SCRIPT =====
    API_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
    
    // ===== GOOGLE SHEETS =====
    // Sheet 1: Main employee data
    SPREADSHEET_ID: '1k5T2DfZqACaJLbwy16-XSfnGaLq4Vg0u1epGro94c_c',
    
    // Sheet 2: Payroll data
    PAYROLL_SPREADSHEET_ID: '1QMYgO6B8fciT6pObX9PB3Nmc8TvqOAAYsYQF4bve69M',
    
    // ===== GOOGLE OAUTH =====
    GOOGLE_CLIENT_ID: '323911089919-it1nrmlpmq2ojigs50g6hu11qur4r59n.apps.googleusercontent.com',
    
    // ===== AUTHORIZED ADMIN EMAILS =====
    AUTHORIZED_EMAILS: [
        'shakeelviam@gmail.com',
        'info@maya.com.kw',
        'operations@maya.com.kw,
        'hr@maya.com.kw',
        // Add more authorized emails as needed
    ],
    
    // ===== APP SETTINGS =====
    APP_NAME: 'Maya HR Management System',
    COMPANY_NAME: 'Maya',
    
    // ===== SHEET NAMES =====
    SHEETS: {
        EMPLOYEES_SOURCE: 'Employees Details',
        PAYROLL_SOURCE: 'Confirmed Names',
        VACATION: 'Vacation',
        SICK_LEAVE: 'Sick Leave',
        ATTENDANCE: 'Attendance',
        LEAVE_REQUESTS: 'Leave Requests',
        PERFORMANCE_REVIEWS: 'Performance Reviews'
    },
    
    // ===== MANAGEMENT EMPLOYEES =====
    MANAGEMENT_EMPLOYEES: [
        'Abdulrahman Al-Najjar',
        'Mishari Al-Mutawaq',
        'Abdulwahab Al-Najjar',
        'Abdullah Al-Samhan',
        'Mohamed Awda',
        'Ayman Mandoub'
    ],
    
    // ===== DEFAULTS =====
    DEFAULTS: {
        EMPLOYEE_STATUS: 'Active',
        LEAVE_STATUS: 'Pending',
        ATTENDANCE_STATUS: 'Present'
    }
};
