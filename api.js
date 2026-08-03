// api.js - Updated with new methods

class HRAPI {
    constructor() {
        this.baseUrl = CONFIG.API_URL;
        this.spreadsheetId = CONFIG.SPREADSHEET_ID;
        this.payrollSpreadsheetId = CONFIG.PAYROLL_SPREADSHEET_ID;
    }

    async request(method, params = {}) {
        try {
            const url = new URL(this.baseUrl);
            url.searchParams.append('method', method);
            
            const response = await fetch(url.toString(), {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...params,
                    spreadsheetId: this.spreadsheetId,
                    payrollSpreadsheetId: this.payrollSpreadsheetId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ===== INTEGRATED DATA (BOTH SHEETS) =====
    async getIntegratedEmployees() {
        return this.request('getIntegratedEmployees');
    }

    // ===== EMPLOYEE METHODS (Sheet 1) =====
    async getEmployees() {
        return this.request('getEmployees');
    }

    async getEmployeeById(employeeId) {
        return this.request('getEmployeeById', { employeeId });
    }

    async addEmployee(employeeData) {
        return this.request('addEmployee', employeeData);
    }

    async updateEmployee(employeeData) {
        return this.request('updateEmployee', employeeData);
    }

    async deleteEmployee(civilId) {
        return this.request('deleteEmployee', { civilId });
    }

    // ===== PAYROLL METHODS (Sheet 2) =====
    async getPayrollData() {
        return this.request('getPayrollData');
    }

    async getPayrollByCivilId(civilId) {
        return this.request('getPayrollByCivilId', { civilId });
    }

    // ===== VACATION METHODS (Sheet 1) =====
    async getVacationData() {
        return this.request('getVacationData');
    }

    async syncVacationData() {
        return this.request('syncVacationData');
    }

    // ===== SICK LEAVE METHODS (Sheet 1) =====
    async getSickLeaveData() {
        return this.request('getSickLeaveData');
    }

    async syncSickLeaveData() {
        return this.request('syncSickLeaveData');
    }

    // ===== ATTENDANCE =====
    async getAttendance(params) {
        return this.request('getAttendance', params);
    }

    async markAttendance(params) {
        return this.request('markAttendance', params);
    }

    // ===== LEAVE REQUESTS =====
    async getLeaveRequests() {
        return this.request('getLeaveRequests');
    }

    async submitLeave(params) {
        return this.request('submitLeave', params);
    }

    async updateLeaveStatus(params) {
        return this.request('updateLeaveStatus', params);
    }

    // ===== REVIEWS =====
    async getReviews() {
        return this.request('getReviews');
    }

    async addReview(params) {
        return this.request('addReview', params);
    }

    // ===== DASHBOARD =====
    async getDashboardStats() {
        return this.request('getDashboardStats');
    }
}

const api = new HRAPI();
