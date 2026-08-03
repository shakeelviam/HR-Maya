// config.js
const CONFIG = {
    // Your deployed Apps Script Web App URL
    API_URL: 'https://script.google.com/macros/s/AKfycbyG5XLC79FnyLtSGGWunhJwU83SV0b0kz3y1FKdal-JBcTUM-X0ax134konYyTaKxYiiQ/exec',
    
    // Your new Google Sheet ID
    SPREADSHEET_ID: '1FDEgm7v4fogW8Nqj7FN-CCIeiizdnbCYG4cpx6Lw0sM',
    
    // Sheet names - these will be created automatically
    SHEETS: {
        EMPLOYEES: 'Confirmed Names',
        ATTENDANCE: 'Attendance',
        LEAVE_REQUESTS: 'LeaveRequests',
        PERFORMANCE_REVIEWS: 'PerformanceReviews',
        NEEDS_CLARIFICATION: 'Needs Clarification'
    },
    
    // App settings
    APP_NAME: 'Maya HR Management System',
    COMPANY_NAME: 'Maya',
    
    // Default values
    DEFAULTS: {
        EMPLOYEE_STATUS: 'Active',
        LEAVE_STATUS: 'Pending',
        ATTENDANCE_STATUS: 'Present',
        FOOD_ALLOWANCE: 25
    },
    
    // Column mappings for your sheet
    COLUMNS: {
        EMPLOYEES: [
            'Full Name',
            'Name',
            'Civil ID Number',
            'Basic salary',
            'Food',
            'Accomodation Allowance',
            'Conveyance Allowance',
            'Bonus',
            'Gross Salary',
            'Loan',
            'Other Deductions',
            'Total Deduction',
            'Price Per Hour',
            'Price Per Day',
            'OT Hours',
            'OT Days',
            'Total OT Payable',
            'Total Payable Salary',
            'الفرع'
        ],
        ATTENDANCE: [
            'Date',
            'Employee ID',
            'Check In',
            'Check Out',
            'Hours',
            'Status'
        ],
        LEAVE_REQUESTS: [
            'Request ID',
            'Employee ID',
            'Start Date',
            'End Date',
            'Type',
            'Status',
            'Reason'
        ],
        PERFORMANCE_REVIEWS: [
            'Review ID',
            'Employee ID',
            'Review Date',
            'Reviewer',
            'Rating',
            'Comments',
            'Goals'
        ]
    }
};
