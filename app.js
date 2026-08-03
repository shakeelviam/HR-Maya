// app.js
class HRApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.employees = [];
        this.attendance = [];
        this.leaves = [];
        this.reviews = [];
        this.dataTables = {};
        this.init();
    }

    async init() {
        // Initialize UI
        this.setupEventListeners();
        this.setupSidebarToggle();
        
        // Check authentication
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
        
        // Load initial data
        await this.loadAllData();
        this.updateDashboard();
        
        // Initialize DataTables
        this.initDataTables();
    }

    setupEventListeners() {
        // Page navigation
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateTo(page);
            });
        });

        // Setup date inputs
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('attendanceDate').value = today;
        document.getElementById('empHireDate').value = today;
        document.getElementById('reviewDate').value = today;
    }

    setupSidebarToggle() {
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }

    navigateTo(page) {
        this.currentPage = page;
        
        // Update sidebar
        document.querySelectorAll('[data-page]').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
        
        // Update content
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`page-${page}`)?.classList.add('active');
        
        // Update title
        const titles = {
            dashboard: 'Dashboard',
            employees: 'Employee Management',
            attendance: 'Attendance Log',
            leave: 'Leave Management',
            reviews: 'Performance Reviews'
        };
        document.getElementById('pageTitle').textContent = titles[page] || page;
        
        // Refresh data if needed
        if (page === 'dashboard') {
            this.updateDashboard();
        }
    }

    async loadAllData() {
        try {
            // Load employees from "Confirmed Names"
            const empResult = await api.getEmployees();
            this.employees = empResult.data || [];
            
            // Load attendance for current month
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const attResult = await api.getAttendance({
                startDate: firstDay.toISOString().split('T')[0],
                endDate: today.toISOString().split('T')[0]
            });
            this.attendance = attResult.data || [];
            
            // Load leaves
            const leaveResult = await api.getLeaveRequests();
            this.leaves = leaveResult.data || [];
            
            // Load reviews
            const reviewResult = await api.getReviews();
            this.reviews = reviewResult.data || [];
            
            // Update tables
            this.renderEmployees();
            this.renderAttendance();
            this.renderLeaves();
            this.renderReviews();
            
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load data. Please check your connection and try again.');
        }
    }

    // DASHBOARD METHODS
    updateDashboard() {
        // Total employees
        document.getElementById('totalEmployees').textContent = this.employees.length;
        
        // Present today
        const today = new Date().toISOString().split('T')[0];
        const present = this.attendance.filter(a => 
            a.Date === today && a.Status === 'Present'
        ).length;
        document.getElementById('presentToday').textContent = present;
        
        // Pending leaves
        const pending = this.leaves.filter(l => l.Status === 'Pending').length;
        document.getElementById('pendingLeaves').textContent = pending;
        
        // Average rating
        let avgRating = 0;
        if (this.reviews.length > 0) {
            const sum = this.reviews.reduce((acc, r) => acc + parseFloat(r.Rating || 0), 0);
            avgRating = (sum / this.reviews.length).toFixed(1);
        }
        document.getElementById('avgRating').textContent = avgRating;
        
        // Recent attendance
        const recentAtt = this.attendance.slice(-5).reverse();
        let attHtml = '<ul class="list-unstyled">';
        recentAtt.forEach(a => {
            attHtml += `
                <li class="mb-2 d-flex justify-content-between">
                    <span>${a['Employee ID']} - ${a.Date}</span>
                    <span class="badge bg-${a.Status === 'Present' ? 'success' : 'warning'}">${a.Status}</span>
                </li>
            `;
        });
        attHtml += '</ul>';
        document.getElementById('recentAttendance').innerHTML = attHtml || '<p>No recent attendance</p>';
        
        // Pending leave requests
        const pendingLeaves = this.leaves.filter(l => l.Status === 'Pending');
        let leaveHtml = '<ul class="list-unstyled">';
        pendingLeaves.slice(0, 5).forEach(l => {
            leaveHtml += `
                <li class="mb-2 d-flex justify-content-between">
                    <span>${l['Employee ID']} - ${l.Type}</span>
                    <span class="badge bg-warning">${l.Status}</span>
                </li>
            `;
        });
        leaveHtml += '</ul>';
        document.getElementById('pendingLeaveRequests').innerHTML = leaveHtml || '<p>No pending requests</p>';
    }

    // EMPLOYEE METHODS (Customized for your sheet structure)
    renderEmployees() {
        const tbody = document.getElementById('employeesTableBody');
        tbody.innerHTML = '';
        
        this.employees.forEach(emp => {
            const statusClass = emp.Status === 'Active' ? 'success' : 
                              emp.Status === 'On Leave' ? 'warning' : 'secondary';
            const branch = emp['الفرع'] || 'N/A';
            tbody.innerHTML += `
                <tr>
                    <td>${emp['Civil ID Number'] || emp['Employee ID']}</td>
                    <td>${emp['Full Name']}</td>
                    <td>${emp['Civil ID Number'] || ''}</td>
                    <td>${emp.Branch || branch}</td>
                    <td>${emp['Basic salary'] || ''}</td>
                    <td><span class="badge bg-${statusClass}">${emp.Status || 'Active'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="app.editEmployee('${emp['Civil ID Number'] || emp['Employee ID']}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteEmployee('${emp['Civil ID Number'] || emp['Employee ID']}')">
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
        document.getElementById('empHireDate').value = new Date().toISOString().split('T')[0];
        // Set default values for your sheet
        document.getElementById('empFood').value = 25;
        document.getElementById('empBranch').value = '';
        new bootstrap.Modal(document.getElementById('employeeModal')).show();
    }

    async saveEmployee() {
        const data = {
            fullName: document.getElementById('empName').value,
            civilId: document.getElementById('empCivilId').value,
            basicSalary: document.getElementById('empBasicSalary').value,
            food: document.getElementById('empFood').value,
            accommodation: document.getElementById('empAccommodation').value || '',
            conveyance: document.getElementById('empConveyance').value || '',
            bonus: document.getElementById('empBonus').value || 0,
            loan: document.getElementById('empLoan').value || '',
            otherDeductions: document.getElementById('empOtherDeductions').value || '',
            branch: document.getElementById('empBranch').value || '',
            status: document.getElementById('empStatus').value || 'Active'
        };
        
        try {
            await api.addEmployee(data);
            bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
            await this.loadAllData();
            alert('Employee added successfully!');
        } catch (error) {
            alert('Error adding employee: ' + error.message);
        }
    }

    async editEmployee(civilId) {
        const emp = this.employees.find(e => e['Civil ID Number'] == civilId || e['Employee ID'] == civilId);
        if (!emp) {
            alert('Employee not found');
            return;
        }
        
        document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
        document.getElementById('empName').value = emp['Full Name'] || '';
        document.getElementById('empCivilId').value = emp['Civil ID Number'] || '';
        document.getElementById('empBasicSalary').value = emp['Basic salary'] || '';
        document.getElementById('empFood').value = emp.Food || 25;
        document.getElementById('empAccommodation').value = emp['Accomodation Allowance'] || '';
        document.getElementById('empConveyance').value = emp['Conveyance Allowance'] || '';
        document.getElementById('empBonus').value = emp.Bonus || 0;
        document.getElementById('empLoan').value = emp.Loan || '';
        document.getElementById('empOtherDeductions').value = emp['Other Deductions'] || '';
        document.getElementById('empBranch').value = emp['الفرع'] || '';
        document.getElementById('empStatus').value = emp.Status || 'Active';
        
        // Store employee ID for update
        document.getElementById('employeeForm').dataset.editId = civilId;
        new bootstrap.Modal(document.getElementById('employeeModal')).show();
    }

    async deleteEmployee(civilId) {
        if (!confirm('Are you sure you want to delete this employee?')) return;
        
        try {
            await api.deleteEmployee(civilId);
            await this.loadAllData();
            alert('Employee deleted successfully!');
        } catch (error) {
            alert('Error deleting employee: ' + error.message);
        }
    }

    // ATTENDANCE METHODS
    renderAttendance() {
        const tbody = document.getElementById('attendanceTableBody');
        tbody.innerHTML = '';
        
        this.attendance.forEach(att => {
            const statusClass = att.Status === 'Present' ? 'success' : 
                              att.Status === 'Leave' ? 'warning' : 'secondary';
            tbody.innerHTML += `
                <tr>
                    <td>${att.Date}</td>
                    <td>${att['Employee ID']}</td>
                    <td>${att['Check In'] || '-'}</td>
                    <td>${att['Check Out'] || '-'}</td>
                    <td>${att.Hours || '-'}</td>
                    <td><span class="badge bg-${statusClass}">${att.Status}</span></td>
                </tr>
            `;
        });
    }

    async markAttendance() {
        const date = document.getElementById('attendanceDate').value;
        const empId = prompt('Enter Employee ID (Civil ID Number):');
        if (!empId) return;
        
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

    // LEAVE METHODS
    renderLeaves() {
        const tbody = document.getElementById('leaveTableBody');
        tbody.innerHTML = '';
        
        this.leaves.forEach(leave => {
            const statusClass = leave.Status === 'Approved' ? 'success' : 
                              leave.Status === 'Rejected' ? 'danger' : 'warning';
            tbody.innerHTML += `
                <tr>
                    <td>${leave['Request ID']}</td>
                    <td>${leave['Employee ID']}</td>
                    <td>${leave['Start Date']}</td>
                    <td>${leave['End Date']}</td>
                    <td>${leave.Type}</td>
                    <td><span class="badge bg-${statusClass}">${leave.Status}</span></td>
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
        new bootstrap.Modal(document.getElementById('leaveModal')).show();
    }

    async submitLeaveRequest() {
        const data = {
            employeeId: document.getElementById('leaveEmpId').value,
            startDate: document.getElementById('leaveStart').value,
            endDate: document.getElementById('leaveEnd').value,
            type: document.getElementById('leaveType').value,
            reason: document.getElementById('leaveReason').value
        };
        
        try {
            await api.submitLeave(data);
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

    // REVIEW METHODS
    renderReviews() {
        const tbody = document.getElementById('reviewsTableBody');
        tbody.innerHTML = '';
        
        this.reviews.forEach(review => {
            const stars = '★'.repeat(Math.round(review.Rating)) + '☆'.repeat(5 - Math.round(review.Rating));
            tbody.innerHTML += `
                <tr>
                    <td>${review['Review ID']}</td>
                    <td>${review['Employee ID']}</td>
                    <td>${review['Review Date']}</td>
                    <td>${review.Reviewer}</td>
                    <td>${stars} (${review.Rating})</td>
                    <td>${review.Comments || '-'}</td>
                </tr>
            `;
        });
    }

    showReviewModal() {
        document.getElementById('reviewForm').reset();
        document.getElementById('reviewDate').value = new Date().toISOString().split('T')[0];
        new bootstrap.Modal(document.getElementById('reviewModal')).show();
    }

    async submitReview() {
        const data = {
            employeeId: document.getElementById('reviewEmpId').value,
            reviewDate: document.getElementById('reviewDate').value,
            reviewer: document.getElementById('reviewer').value,
            rating: document.getElementById('reviewRating').value,
            comments: document.getElementById('reviewComments').value
        };
        
        try {
            await api.addReview(data);
            bootstrap.Modal.getInstance(document.getElementById('reviewModal')).hide();
            await this.loadAllData();
            alert('Review added successfully!');
        } catch (error) {
            alert('Error adding review: ' + error.message);
        }
    }

    // DATATABLES INITIALIZATION
    initDataTables() {
        // Wait for tables to be rendered
        setTimeout(() => {
            if ($.fn.DataTable) {
                try {
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
                } catch (error) {
                    console.warn('DataTables init error:', error);
                }
            }
        }, 500);
    }
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HRApp();
});
