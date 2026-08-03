// config.js
const CONFIG = {
    // Your deployed Apps Script Web App URL
    API_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
    
    // Google Sheets
    SPREADSHEET_ID: '1k5T2DfZqACaJLbwy16-XSfnGaLq4Vg0u1epGro94c_c',
    
    // Google OAuth Client ID (Create in Google Cloud Console)
    GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    
    // Authorized Admin Emails
    AUTHORIZED_EMAILS: [
        'admin@maya.com',
        'hr@maya.com',
        // Add more authorized emails
    ],
    
    // App settings
    APP_NAME: 'Maya HR Management System',
    COMPANY_NAME: 'Maya',
    
    // Sheet names
    SHEETS: {
        EMPLOYEES: 'Employees',
        EMPLOYEES_SOURCE: 'Employees Details',
        VACATION: 'Vacation',
        SICK_LEAVE: 'Sick Leave',
        ATTENDANCE: 'Attendance',
        LEAVE_REQUESTS: 'Leave Requests',
        PERFORMANCE_REVIEWS: 'Performance Reviews'
    }
};
