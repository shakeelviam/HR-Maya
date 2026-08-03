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
            // Don't show alert for empty sheets - just show empty tables
            if (!error.message.includes('404') && !error.message.includes('not found')) {
                alert('Failed to load data. Please check your connection and try again.');
            }
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

    // EMPLOYEE METHODS
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
            tbody.innerHTML += `
                <tr>
                    <td>${emp['Civil ID Number'] || 'N/A'}</td>
                    <td>${emp['Full Name'] || 'N/A'}</td>
                    <td>${emp['Civil ID Number'] || 'N/A'}</td>
                    <td>${branch}</td>
                    <td>${emp['Basic salary'] || '0'}</td>
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
            branch: document.getElementById('empBranch').value || '',
            status: document.getElementById('empStatus').value || 'Active'
        };
        
        // Validate required fields
        if (!data.fullName || !data.civilId || !data.basicSalary) {
            alert('Please fill in all required fields (Full Name, Civil ID, and Basic Salary)');
            return;
        }
        
        try {
            if (editId) {
                // Update existing employee
                data.employeeId = editId;
                await api.updateEmployee(data);
            } else {
                // Add new employee
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
        const emp = this.employees.find(e => e['Civil ID Number'] == civilId);
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

    // ATTENDANCE METHODS
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
        
        // Check if employee exists
        const employee = this.employees.find(e => e['Civil ID Number'] == empId);
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

    // LEAVE METHODS
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
        
        // Check if employee exists
        const employee = this.employees.find(e => e['Civil ID Number'] == empId);
        if (!employee) {
            alert('Employee not found. Please check the Civil ID Number.');
            return;
        }
        
        const data = {
            employeeId: empId,
            startDate: startDate,
            endDate: endDate,
            type: type,
            reason: reason || ''
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
        
        // Check if employee exists
        const employee = this.employees.find(e => e['Civil ID Number'] == empId);
        if (!employee) {
            alert('Employee not found. Please check the Civil ID Number.');
            return;
        }
        
        const data = {
            employeeId: empId,
            reviewDate: reviewDate,
            reviewer: reviewer,
            rating: parseFloat(rating) || 0,
            comments: comments || ''
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
                    // Destroy existing DataTables if they exist
                    if ($.fn.DataTable.isDataTable('#employeesTable')) {
                        $('#employeesTable').DataTable().destroy();
                    }
                    if ($.fn.DataTable.isDataTable('#attendanceTable')) {
                        $('#attendanceTable').DataTable().destroy();
                    }
                    if ($.fn.DataTable.isDataTable('#leaveTable')) {
                        $('#leaveTable').DataTable().destroy();
                    }
                    if ($.fn.DataTable.isDataTable('#reviewsTable')) {
                        $('#reviewsTable').DataTable().destroy();
                    }
                    
                    this.dataTables.employees = $('#employeesTable').DataTable({
                        pageLength: 10,
                        responsive: true,
                        order: [[0, 'desc']],
                        language: {
                            emptyTable: "No employees found"
                        }
                    });
                    
                    this.dataTables.attendance = $('#attendanceTable').DataTable({
                        pageLength: 10,
                        responsive: true,
                        order: [[0, 'desc']],
                        language: {
                            emptyTable: "No attendance records found"
                        }
                    });
                    
                    this.dataTables.leave = $('#leaveTable').DataTable({
                        pageLength: 10,
                        responsive: true,
                        order: [[0, 'desc']],
                        language: {
                            emptyTable: "No leave requests found"
                        }
                    });
                    
                    this.dataTables.reviews = $('#reviewsTable').DataTable({
                        pageLength: 10,
                        responsive: true,
                        order: [[0, 'desc']],
                        language: {
                            emptyTable: "No reviews found"
                        }
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

// Global function for auth button
function handleAuthClick() {
    if (auth.isAuthenticated) {
        auth.signOut();
    } else {
        auth.authenticate();
    }
}
