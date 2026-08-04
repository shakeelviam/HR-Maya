// ============================================================
// app.js - UI LOGIC AND RENDERING (LAST WORKING VERSION)
// ============================================================

const app = {
    employeesData: [],
    employeesTable: null,

    async init() {
        console.log("Initializing App...");
        this.setupSidebarNavigation();
        await this.loadAllData();
    },

    async loadAllData() {
        console.log("Fetching data from API...");
        const tbody = document.getElementById('employeesTableBody');
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Loading data...</td></tr>';

        try {
            // THIS LINE MAKES IT WORK - calling the global function
            this.employeesData = await getIntegratedEmployees();
            console.log(`Received ${this.employeesData.length} employees`);
            this.renderEmployees();
            this.updateDashboardStats();
        } catch (error) {
            console.error("Failed to load data:", error);
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error loading data: ${error.message}</td></tr>`;
        }
    },

    renderEmployees() {
        const tbody = document.getElementById('employeesTableBody');
        tbody.innerHTML = '';
        if (!this.employeesData || this.employeesData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No employees found.</td></tr>';
            return;
        }
        this.employeesData.forEach(emp => {
            const row = `
                <tr>
                    <td>${emp['Employee ID'] || '-'}</td>
                    <td>${emp['Name (English)'] || 'Unknown'}</td>
                    <td>${emp['Name (Arabic)'] || '-'}</td>
                    <td>${emp['Civil ID'] || '-'}</td>
                    <td>${emp['Total Payable'] || 0}</td>
                    <td>${emp['Remaining Vacation'] || 0}</td>
                    <td><span class="status-badge ${(emp.Status || 'active').toLowerCase()}">${emp.Status || 'Active'}</span></td>
                    <td><button class="btn btn-sm btn-outline-primary" onclick="app.viewProfile('${emp['Employee ID'] || ''}')"><i class="bi bi-eye"></i></button></td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
        if ($.fn.dataTable) {
            if (this.employeesTable) this.employeesTable.destroy();
            this.employeesTable = $('#employeesTable').DataTable({ pageLength: 10, responsive: true, order: [[0, 'asc']] });
        }
    },

    updateDashboardStats() {
        const total = this.employeesData.length;
        const active = this.employeesData.filter(e => e.Status === 'Active').length;
        document.getElementById('totalEmployees').innerText = total;
        document.getElementById('activeEmployees').innerText = active;
        document.getElementById('pendingLeaves').innerText = '0';
        document.getElementById('avgRating').innerText = '0.0';
    },

    setupSidebarNavigation() {
        document.querySelectorAll('#sidebar .nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('#sidebar .nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                const pageId = this.dataset.page;
                document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
                const targetSection = document.getElementById(`page-${pageId}`);
                if(targetSection) targetSection.classList.add('active');
                document.getElementById('pageTitle').innerText = pageId.charAt(0).toUpperCase() + pageId.slice(1);
            });
        });
    },

    // Basic Profile Viewer
    viewProfile(employeeId) {
        if (!employeeId) return;
        const emp = this.employeesData.find(e => e['Employee ID'] === employeeId);
        if (emp) {
            document.querySelectorAll('#sidebar .nav-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
            document.getElementById('page-profile').classList.add('active');
            document.getElementById('pageTitle').innerText = 'Employee Profile';

            const profileHTML = `
                <div class="profile-header">
                    <div class="row">
                        <div class="col-md-3 text-center border-end">
                            <div class="profile-avatar">${(emp['Name (English)'] || '?').charAt(0)}</div>
                            <h5 class="mt-3">${emp['Name (English)'] || 'Unknown'}</h5>
                            <p class="text-muted">${emp['Employee ID'] || '-'}</p>
                            <span class="status-badge ${(emp.Status || 'active').toLowerCase()}">${emp.Status || 'Active'}</span>
                        </div>
                        <div class="col-md-9">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <h6 class="text-primary"><i class="bi bi-person"></i> Personal Details</h6>
                                    <div class="profile-info-item"><span class="profile-info-label">Name (Arabic)</span><span class="profile-info-value">${emp['Name (Arabic)'] || '-'}</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Civil ID</span><span class="profile-info-value">${emp['Civil ID'] || '-'}</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Total Payable</span><span class="profile-info-value">${emp['Total Payable'] || 0}</span></div>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-success"><i class="bi bi-calendar-check"></i> Leave</h6>
                                    <div class="profile-info-item"><span class="profile-info-label">Remaining Vacation</span><span class="profile-info-value text-success fw-bold">${emp['Remaining Vacation'] || 0} days</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Remarks</span><span class="profile-info-value text-muted">${emp['Vacation Remarks'] || 'None'}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('profileContent').innerHTML = profileHTML;
        }
    },

    // Modals - Restored to working state
    showAddEmployeeModal() { 
        $('#employeeModal').modal('show'); 
    },
    saveEmployee() { 
        alert("Save Employee feature coming soon"); 
    },
    showReviewModal() { 
        $('#reviewModal').modal('show'); 
    },
    submitReview() { 
        alert("Submit review feature coming soon"); 
    },
    showLeaveRequestModal() { 
        $('#leaveModal').modal('show'); 
    },
    submitLeaveRequest() { 
        alert("Submit leave feature coming soon"); 
    },
    markAttendance() { 
        const dateInput = document.getElementById('attendanceDate');
        if (!dateInput || !dateInput.value) {
            alert("Please select a date first.");
            return;
        }
        alert(`Attendance marked for date: ${dateInput.value}`);
    }
};
