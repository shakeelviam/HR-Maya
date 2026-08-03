const CONFIG = {
    // ✅ Your NEW correct Web App URL
    API_URL: 'https://script.google.com/macros/s/AKfycbyG5XLC79FnyLtSGGWunhJwU83SV0b0kz3y1FKdal-JBcTUM-X0ax134konYyTaKxYiiQ/exec',
    
    // ✅ Your Sheet 1 ID (Main employee data)
    SPREADSHEET_ID: '1k5T2DfZqACaJLbwy16-XSfnGaLq4Vg0u1epGro94c_c',
    
    // ✅ Your Sheet 2 ID (Payroll data)
    PAYROLL_SPREADSHEET_ID: '1QMYgO6B8fciT6pObX9PB3Nmc8TvqOAAYsYQF4bve69M',
    
    // ✅ Your Google OAuth Client ID
    GOOGLE_CLIENT_ID: '323911089919-it1nrmlpmq2ojigs50g6hu11qur4r59n.apps.googleusercontent.com',
    
    // ✅ Your Authorized Emails
    AUTHORIZED_EMAILS: [
        'shakeel.viam@gmail.com',
        'info@maya.com.kw',
        'operations@maya.com.kw',
        'hr@maya.com.kw'
    ],
    
    APP_NAME: 'Maya HR Management System',
    COMPANY_NAME: 'Maya',
    
    SHEETS: {
        EMPLOYEES_SOURCE: 'Employee Details',
        PAYROLL_SOURCE: 'Confirmed Names',
        VACATION: 'Vacation',
        SICK_LEAVE: 'Sick Leave',
        ATTENDANCE: 'Attendance',
        LEAVE_REQUESTS: 'Leave Requests',
        PERFORMANCE_REVIEWS: 'Performance Reviews'
    },
    
    MANAGEMENT_EMPLOYEES: [
        'Abdulrahman Al-Najjar',
        'Mishari Al-Mutawaq',
        'Abdulwahab Al-Najjar',
        'Abdullah Al-Samhan',
        'Mohamed Awda',
        'Ayman Mandoub'
    ],
    
    DEFAULTS: {
        EMPLOYEE_STATUS: 'Active',
        LEAVE_STATUS: 'Pending',
        ATTENDANCE_STATUS: 'Present'
    }
};
