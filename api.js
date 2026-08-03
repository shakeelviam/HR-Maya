// api.js
class HRAPI {
    constructor() {
        this.baseUrl = CONFIG.API_URL;
        this.spreadsheetId = CONFIG.SPREADSHEET_ID;
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
                    spreadsheetId: this.spreadsheetId
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

    // Employee methods
    async getEmployees() {
        return this.request('getEmployees');
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

    // Attendance methods
    async getAttendance(params) {
        return this.request('getAttendance', params);
    }

    async markAttendance(params) {
        return this.request('markAttendance', params);
    }

    // Leave methods
    async getLeaveRequests() {
        return this.request('getLeaveRequests');
    }

    async submitLeave(params) {
        return this.request('submitLeave', params);
    }

    async updateLeaveStatus(params) {
        return this.request('updateLeaveStatus', params);
    }

    // Performance Review methods
    async getReviews() {
        return this.request('getReviews');
    }

    async addReview(params) {
        return this.request('addReview', params);
    }

    // Sync methods
    async syncVacationData() {
        return this.request('syncVacationData');
    }

    async syncSickLeaveData() {
        return this.request('syncSickLeaveData');
    }
}

const api = new HRAPI();
