// app.js - Complete Version
class HRApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.employees = [];
        this.attendance = [];
        this.leaves = [];
        this.reviews = [];
        this.needsClarification = [];
        this.dataTables = {};
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupSidebarToggle();
        
        const authenticated = await auth.authenticate();
        if (!authenticated) {
            document.getElementById('authStatus').textContent = 'Authentication Failed';
            document.getElementById('statusDot').className = 'status-dot offline';
            return;
        }
        
        document.getElementById('authStatus').textContent = 'Connected';
        document.getElementById('statusDot').className = 'status-dot online';
        document.getElementById('authBtn').innerHTML = '<i class="bi bi-box-arrow-right"></i> Disconnect';
        document.getElementById('authBtn').onclick = () => auth.signOut();
        
        await this.loadAllData();
        this.updateDashboard();
        this.initDataTables();
    }

    setupEventListeners() {
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateTo(page);
            });
        });

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('attendanceDate').value = today;
        document.getElementById('reviewDate').value = today;
    }

    setupSidebarToggle() {
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }

    navigateTo(page) {
        this.currentPage = page;
        
        document.querySelectorAll('[data-page]').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
        
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`page-${page}`)?.classList.add('active');
        
        const titles = {
            dashboard: 'Dashboard',
            employees: 'Employee Management',
            attendance: 'Attendance Log',
            leave: 'Leave Management',
            reviews: 'Performance Reviews',
            clarification: 'Needs Clarification'
        };
        document.getElementById('pageTitle').textContent = titles[page] || page;
        
        if (page === 'dashboard') {
            this.updateDashboard();
        }
    }

    async loadAllData() {
        try {
            const empResult = await api.getEmployees();
            this.employees = empResult.data || [];
            
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const attResult = await api.getAttendance({
                startDate: firstDay.toISOString().split('T')[0],
                endDate: today.toISOString().split('T')[0]
            });
            this.attendance = attResult.data || [];
            
            const leaveResult = await api.getLeaveRequests();
            this.leaves = leaveResult.data || [];
            
            const reviewResult = await api.getReviews();
            this.reviews = reviewResult.data || [];
            
            const clarResult = await api.getNeedsClarification();
            this.needsClarification = clarResult.data || [];
            
            this.renderEmployees();
            this.renderAttendance();
            this.renderLeaves();
            this.renderReviews();
            this.renderClarification();
            
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    // DASHBOARD
    updateDashboard() {
        document.getElementById('totalEmployees').textContent = this.employees.length;
        
        const today = new Date().toISOString().split('T')[0];
        const present = this.attendance.filter(a => 
            a.Date === today && a.Status === 'Present'
        ).length;
        document.getElementById('presentToday').textContent = present;
        
        const pending = this.leaves.filter(l => l.Status === 'Pending').length;
        document.getElementById('pendingLeaves').textContent = pending;
        
        let avgRating = 0;
        if (this.reviews.length > 0) {
            const sum = this.reviews.reduce((acc, r) => acc + parseFloat(r.Rating || 0), 0);
            avgRating = (sum / this.reviews.length).toFixed(1);
        }
        document.getElementById('avgRating').textContent = avgRating;
        
        // Recent attendance
        const recentAtt = this.attendance.slice(-5).reverse();
        let attHtml = '<ul class="list-unstyled">';
        if (recentAtt.length === 0) {
            attHtml += '<li class="text-muted">No recent attendance records</li>';
        } else {
            recentAtt.forEach(a => {
                attHtml += `
                    <li class="mb-2 d-flex justify-content-between">
                        <span>${a['Employee ID'] || 'N/A'} - ${a.Date || 'N/A'}</span>
                        <span class="badge bg-${a.Status === 'Present' ? 'success' : 'warning'}">${a.Status || 'N/A'}</span>
                    </li>
                `;
            });
        }
        attHtml += '</ul>';
        document.getElementById('recentAttendance').innerHTML = attHtml;
        
        // Pending leave requests
        const pendingLeaves = this.leaves.filter(l => l.Status === 'Pending');
        let leaveHtml = '<ul class="list-unstyled">';
        if (pendingLeaves.length === 0) {
            leaveHtml += '<li class="text-muted">No pending leave requests</li>';
        } else {
            pendingLeaves.slice(0, 5).forEach(l => {
                leaveHtml += `
                    <li class="mb-2 d-flex justify-content-between">
                        <span>${l['Employee ID'] || 'N/A'} - ${l.Type || 'N/A'}</span>
                        <span class="badge bg-warning">Pending</span>
                    </li>
                `;
            });
        }
        leaveHtml += '</ul>';
        document.getElementById('pendingLeaveRequests').innerHTML = leaveHtml;
    }

    // EMPLOYEES
    renderEmployees() {
        const tbody = document.getElementById('employeesTableBody');
        tbody.innerHTML = '';
        
        if (this.employees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">No employees found. Click "Add Employee" to get started.</td>
                </tr>
            `;
            return;
        }
        
        this.employees.forEach(emp => {
            const statusClass = emp.Status === 'Active' ? 'success' : 
                              emp.Status === 'On Leave' ? 'warning' : 'secondary';
            const branch = emp['الفرع'] || 'N/A';
            const basicSalary = emp['Basic salary'] || 0;
            const totalPayable = emp['Total Payable Salary'] || 0;
            
            tbody.innerHTML += `
                <tr>
                    <td>${emp['Civil ID Number'] || 'N/A'}</td>
                    <td>${emp['Full Name'] || 'N/A'}</td>
                    <td>${branch}</td>
                    <td>${basicSalary}</td>
                    <td>${totalPayable}</td>
                    <td><span class="badge bg-${statusClass}">${emp.Status || 'Active'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="app.editEmployee('${emp['Civil ID Number'] || ''}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteEmployee('${emp['Civil ID Number'] || ''}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    showAddEmployeeModal() {
        document.getElementById('employeeModalTitle').textContent = 'Add Employee';
        document.getElementById('employeeForm').reset();
        document.getElementById('empFood').value = CONFIG.DEFAULTS.FOOD_ALLOWANCE;
        document.getElementById('empBonus').value = 0;
        document.getElementById('empOTHours').value = 0;
        document.getElementById('empOTDays').value = 0;
        document.getElementById('empStatus').value = 'Active';
        document.getElementById('employeeForm').dataset.editId = '';
        new bootstrap.Modal(document.getElementById('employeeModal')).show();
    }

    async saveEmployee() {
        const form = document.getElementById('employeeForm');
        const editId = form.dataset.editId;
        
        const data = {
            fullName: document.getElementById('empName').value,
            civilId: document.getElementById('empCivilId').value,
            basicSalary: parseFloat(document.getElementById('empBasicSalary').value) || 0,
            food: parseFloat(document.getElementById('empFood').value) || CONFIG.DEFAULTS.FOOD_ALLOWANCE,
            accommodation: parseFloat(document.getElementById('empAccommodation').value) || 0,
            conveyance: parseFloat(document.getElementById('empConveyance').value) || 0,
            bonus: parseFloat(document.getElementById('empBonus').value) || 0,
            loan: parseFloat(document.getElementById('empLoan').value) || 0,
            otherDeductions: parseFloat(document.getElementById('empOtherDeductions').value) || 0,
            otHours: parseFloat(document.getElementById('empOTHours').value) || 0,
            otDays: parseFloat(document.getElementById('empOTDays').value) || 0,
            branch: document.getElementById('empBranch').value || '',
            status: document.getElementById('empStatus').value || 'Active'
        };
        
        if (!data.fullName || !data.civilId || !data.basicSalary) {
            alert('Please fill in all required fields (Full Name, Civil ID, and Basic Salary)');
            return;
        }
        
        try {
            if (editId) {
                data.employeeId = editId;
                await api.updateEmployee(data);
            } else {
                await api.addEmployee(data);
            }
            bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
            await this.loadAllData();
            alert(editId ? 'Employee updated successfully!' : 'Employee added successfully!');
        } catch (error) {
            alert('Error saving employee: ' + error.message);
        }
    }

    async editEmployee(civilId) {
        const emp = this.employees.find(e => String(e['Civil ID Number']) === String(civilId));
        if (!emp) {
            alert('Employee not found');
            return;
        }
        
        document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
        document.getElementById('empName').value = emp['Full Name'] || '';
        document.getElementById('empCivilId').value = emp['Civil ID Number'] || '';
        document.getElementById('empBasicSalary').value = emp['Basic salary'] || '';
        document.getElementById('empFood').value = emp.Food || CONFIG.DEFAULTS.FOOD_ALLOWANCE;
        document.getElementById('empAccommodation').value = emp['Accomodation Allowance'] || 0;
        document.getElementById('empConveyance').value = emp['Conveyance Allowance'] || 0;
        document.getElementById('empBonus').value = emp.Bonus || 0;
        document.getElementById('empLoan').value = emp.Loan || 0;
        document.getElementById('empOtherDeductions').value = emp['Other Deductions'] || 0;
        document.getElementById('empOTHours').value = emp['OT Hours'] || 0;
        document.getElementById('empOTDays').value = emp['OT Days'] || 0;
        document.getElementById('empBranch').value = emp['الفرع'] || '';
        document.getElementById('empStatus').value = emp.Status || 'Active';
        
        document.getElementById('employeeForm').dataset.editId = civilId;
        new bootstrap.Modal(document.getElementById('employeeModal')).show();
    }

    async deleteEmployee(civilId) {
        if (!civilId) {
            alert('Invalid employee ID');
            return;
        }
        if (!confirm('Are you sure you want to delete this employee?')) return;
        
        try {
            await api.deleteEmployee(civilId);
            await this.loadAllData();
            alert('Employee deleted successfully!');
        } catch (error) {
            alert('Error deleting employee: ' + error.message);
        }
    }

    // ATTENDANCE
    renderAttendance() {
        const tbody = document.getElementById('attendanceTableBody');
        tbody.innerHTML = '';
        
        if (this.attendance.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">No attendance records found.</td>
                </tr>
            `;
            return;
        }
        
        this.attendance.forEach(att => {
            const statusClass = att.Status === 'Present' ? 'success' : 
                              att.Status === 'Leave' ? 'warning' : 'secondary';
            tbody.innerHTML += `
                <tr>
                    <td>${att.Date || 'N/A'}</td>
                    <td>${att['Employee ID'] || 'N/A'}</td>
                    <td>${att['Check In'] || '-'}</td>
                    <td>${att['Check Out'] || '-'}</td>
                    <td>${att.Hours || '-'}</td>
                    <td><span class="badge bg-${statusClass}">${att.Status || 'N/A'}</span></td>
                </tr>
            `;
        });
    }

    async markAttendance() {
        const date = document.getElementById('attendanceDate').value;
        if (!date) {
            alert('Please select a date');
            return;
        }
        
        const empId = prompt('Enter Employee ID (Civil ID Number):');
        if (!empId) return;
        
        const employee = this.employees.find(e => String(e['Civil ID Number']) === String(empId));
        if (!employee) {
            alert('Employee not found. Please check the Civil ID Number.');
            return;
        }
        
        const status = prompt('Status (Present/Absent/Leave):', 'Present');
        if (!status) return;
        
        try {
            await api.markAttendance({
                date: date,
                employeeId: empId,
                status: status,
                checkIn: new Date().toLocaleTimeString()
            });
            await this.loadAllData();
            alert('Attendance marked successfully!');
        } catch (error) {
            alert('Error marking attendance: ' + error.message);
        }
    }

    // LEAVE
    renderLeaves() {
        const tbody = document.getElementById('leaveTableBody');
        tbody.innerHTML = '';
        
        if (this.leaves.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">No leave requests found.</td>
                </tr>
            `;
            return;
        }
        
        this.leaves.forEach(leave => {
            const statusClass = leave.Status === 'Approved' ? 'success' : 
                              leave.Status === 'Rejected' ? 'danger' : 'warning';
            tbody.innerHTML += `
                <tr>
                    <td>${leave['Request ID'] || 'N/A'}</td>
                    <td>${leave['Employee ID'] || 'N/A'}</td>
                    <td>${leave['Start Date'] || 'N/A'}</td>
                    <td>${leave['End Date'] || 'N/A'}</td>
                    <td>${leave.Type || 'N/A'}</td>
                    <td><span class="badge bg-${statusClass}">${leave.Status || 'Pending'}</span></td>
                    <td>
                        ${leave.Status === 'Pending' ? `
                            <button class="btn btn-sm btn-success" onclick="app.updateLeave('${leave['Request ID']}', 'Approved')">
                                <i class="bi bi-check"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.updateLeave('${leave['Request ID']}', 'Rejected')">
                                <i class="bi bi-x"></i>
                            </button>
                        ` : '-'}
                    </td>
                </tr>
            `;
        });
    }

    showLeaveRequestModal() {
        document.getElementById('leaveForm').reset();
        document.getElementById('leaveStart').value = new Date().toISOString().split('T')[0];
        document.getElementById('leaveEnd').value = new Date().toISOString().split('T')[0];
        new bootstrap.Modal(document.getElementById('leaveModal')).show();
    }

    async submitLeaveRequest() {
        const empId = document.getElementById('leaveEmpId').value;
        const startDate = document.getElementById('leaveStart').value;
        const endDate = document.getElementById('leaveEnd').value;
        const type = document.getElementById('leaveType').value;
        const reason = document.getElementById('leaveReason').value;
        
        if (!empId || !startDate || !endDate) {
            alert('Please fill in all required fields');
            return;
        }
        
        const employee = this.employees.find(e => String(e['Civil ID Number']) === String(empId));
        if (!employee) {
            alert('Employee not found. Please check the Civil ID Number.');
            return;
        }
        
        try {
            await api.submitLeave({
                employeeId: empId,
                startDate: startDate,
                endDate: endDate,
                type: type,
                reason: reason || ''
            });
            bootstrap.Modal.getInstance(document.getElementById('leaveModal')).hide();
            await this.loadAllData();
            alert('Leave request submitted successfully!');
        } catch (error) {
            alert('Error submitting leave: ' + error.message);
        }
    }

    async updateLeave(requestId, status) {
        if (!confirm(`Are you sure you want to ${status} this leave request?`)) return;
        
        try {
            await api.updateLeaveStatus({ requestId, status });
            await this.loadAllData();
            alert(`Leave request ${status}!`);
        } catch (error) {
            alert('Error updating leave: ' + error.message);
        }
    }

    // REVIEWS
    renderReviews() {
        const tbody = document.getElementById('reviewsTableBody');
        tbody.innerHTML = '';
        
        if (this.reviews.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">No performance reviews found.</td>
                </tr>
            `;
            return;
        }
        
        this.reviews.forEach(review => {
            const stars = '★'.repeat(Math.round(review.Rating || 0)) + '☆'.repeat(5 - Math.round(review.Rating || 0));
            tbody.innerHTML += `
                <tr>
                    <td>${review['Review ID'] || 'N/A'}</td>
                    <td>${review['Employee ID'] || 'N/A'}</td>
                    <td>${review['Review Date'] || 'N/A'}</td>
                    <td>${review.Reviewer || 'N/A'}</td>
                    <td>${stars} (${review.Rating || 0})</td>
                    <td>${review.Comments || '-'}</td>
                </tr>
            `;
        });
    }

    showReviewModal() {
        document.getElementById('reviewForm').reset();
        document.getElementById('reviewDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('reviewRating').value = 3;
        new bootstrap.Modal(document.getElementById('reviewModal')).show();
    }

    async submitReview() {
        const empId = document.getElementById('reviewEmpId').value;
        const reviewDate = document.getElementById('reviewDate').value;
        const reviewer = document.getElementById('reviewer').value;
        const rating = document.getElementById('reviewRating').value;
        const comments = document.getElementById('reviewComments').value;
        
        if (!empId || !reviewDate || !reviewer || !rating) {
            alert('Please fill in all required fields');
            return;
        }
        
        const employee = this.employees.find(e => String(e['Civil ID Number']) === String(empId));
        if (!employee) {
            alert('Employee not found. Please check the Civil ID Number.');
            return;
        }
        
        try {
            await api.addReview({
                employeeId: empId,
                reviewDate: reviewDate,
                reviewer: reviewer,
                rating: parseFloat(rating) || 0,
                comments: comments || ''
            });
            bootstrap.Modal.getInstance(document.getElementById('reviewModal')).hide();
            await this.loadAllData();
            alert('Review added successfully!');
        } catch (error) {
            alert('Error adding review: ' + error.message);
        }
    }

    // NEEDS CLARIFICATION
    renderClarification() {
        const tbody = document.getElementById('clarificationTableBody');
        tbody.innerHTML = '';
        
        if (this.needsClarification.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">No records needing clarification.</td>
                </tr>
            `;
            return;
        }
        
        this.needsClarification.forEach(record => {
            tbody.innerHTML += `
                <tr>
                    <td>${record['Name (Column A)'] || 'N/A'}</td>
                    <td>${record['Suggested Full Name'] || '-'}</td>
                    <td>${record['Other Possible Matches'] || '-'}</td>
                    <td>${record['Reason'] || 'N/A'}</td>
                    <td>${record['Basic salary'] || 0}</td>
                    <td>${record['Total'] || 0}</td>
                    <td>${record['الفرع'] || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="app.suggestName('${record['Name (Column A)']}')">
                            <i class="bi bi-pencil"></i> Suggest
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    suggestName(name) {
        const suggested = prompt('Enter suggested full name for: ' + name);
        if (suggested && suggested.trim()) {
            this.updateClarification(name, suggested.trim());
        }
    }

    async updateClarification(name, suggestedName) {
        try {
            await api.updateNeedsClarification({ name, suggestedName });
            await this.loadAllData();
            alert('Clarification updated successfully!');
        } catch (error) {
            alert('Error updating clarification: ' + error.message);
        }
    }

    // DATATABLES
    initDataTables() {
        setTimeout(() => {
            if ($.fn.DataTable) {
                try {
                    ['#employeesTable', '#attendanceTable', '#leaveTable', '#reviewsTable', '#clarificationTable'].forEach(id => {
                        if ($.fn.DataTable.isDataTable(id)) {
                            $(id).DataTable().destroy();
                        }
                    });
                    
                    this.dataTables.employees = $('#employeesTable').DataTable({
                        pageLength: 10,
                        responsive: true,
                        order: [[0, 'desc']]
                    });
                    
                    this.dataTables.attendance = $('#attendanceTable').DataTable({
                        pageLength: 10,
                        responsive: true,
                        order: [[0, 'desc']]
                    });
                    
                    this.dataTables.leave = $('#leaveTable').DataTable({
                        pageLength: 10,
                        responsive: true,
                        order: [[0, 'desc']]
                    });
                    
                    this.dataTables.reviews = $('#reviewsTable').DataTable({
                        pageLength: 10,
                        responsive: true,
                        order: [[0, 'desc']]
                    });
                    
                    this.dataTables.clarification = $('#clarificationTable').DataTable({
                        pageLength: 10,
                        responsive: true,
                        order: [[0, 'desc']]
                    });
                } catch (error) {
                    console.warn('DataTables init error:', error);
                }
            }
        }, 500);
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HRApp();
});

function handleAuthClick() {
    if (auth.isAuthenticated) {
        auth.signOut();
    } else {
        auth.authenticate();
    }
}
