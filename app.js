// ============================================================
// app.js - UI LOGIC AND RENDERING
// ============================================================

const app = {
    employeesData: [],
    employeesTable: null,
    selectedLeaveEmpId: null,
    selectedAttendEmpId: null,
    selectedAttendStage: null,

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
                            <p class="mt-2 text-muted small">Branch: ${emp.Branch || 'N/A'}</p>
                        </div>
                        <div class="col-md-9">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <h6 class="text-primary"><i class="bi bi-person"></i> Personal Details</h6>
                                    <div class="profile-info-item"><span class="profile-info-label">Name (Arabic)</span><span class="profile-info-value">${emp['Name (Arabic)'] || '-'}</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Civil ID</span><span class="profile-info-value">${emp['Civil ID'] || '-'}</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Designation</span><span class="profile-info-value">${emp.Designation || 'Staff'}</span></div>
                                    <h6 class="text-primary mt-3"><i class="bi bi-currency-exchange"></i> Salary Details</h6>
                                    <div class="profile-info-item"><span class="profile-info-label">Basic Salary</span><span class="profile-info-value">${emp['Basic Salary'] || 0}</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Food Allowance</span><span class="profile-info-value">${emp['Food Allowance'] || 0}</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Accommodation</span><span class="profile-info-value">${emp.Accommodation || 0}</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Conveyance</span><span class="profile-info-value">${emp.Conveyance || 0}</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Gross Salary</span><span class="profile-info-value fw-bold">${emp['Gross Salary'] || 0}</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Total Payable</span><span class="profile-info-value text-success fw-bold">${emp['Total Payable'] || 0}</span></div>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-success"><i class="bi bi-calendar-check"></i> Leave & Vacation</h6>
                                    <div class="profile-info-item"><span class="profile-info-label">Vacation Taken</span><span class="profile-info-value text-danger">${emp['Vacation Taken'] || 0} days</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Remaining Vacation</span><span class="profile-info-value text-success fw-bold">${emp['Remaining Vacation'] || 0} days</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Sick Days Taken</span><span class="profile-info-value text-warning">${emp['Sick Days Taken'] || 0} days</span></div>
                                    <h6 class="text-success mt-3"><i class="bi bi-chat-text"></i> Remarks & History</h6>
                                    <div class="profile-info-item"><span class="profile-info-label">Vacation Remarks</span><span class="profile-info-value text-muted">${emp['Vacation Remarks'] || 'None'}</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Sick Remarks</span><span class="profile-info-value text-muted">${emp['Sick Remarks'] || 'None'}</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Price Per Day</span><span class="profile-info-value">${emp['Price Per Day'] || '0'}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('profileContent').innerHTML = profileHTML;
        } else {
            alert(`Employee with ID ${employeeId} not found.`);
        }
    },

    // ============================================================
    // MODALS - ADD EMPLOYEE
    // ============================================================
    showAddEmployeeModal() { 
        var modal = document.getElementById('employeeModal');
        var backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    },
    saveEmployee() { alert("Save Employee feature coming soon"); },

    // ============================================================
    // MODALS - REVIEW
    // ============================================================
    showReviewModal() { 
        var modal = document.getElementById('reviewModal');
        var backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    },
    submitReview() { alert("Submit review feature coming soon"); },

    // ============================================================
    // MODALS - ATTENDANCE (NEW)
    // ============================================================
    showAttendanceModal() {
        this.selectedAttendEmpId = null;
        this.selectedAttendStage = null;
        document.getElementById('attendanceEmployeeSelect').innerHTML = '<option value="" disabled selected>Select an employee...</option>';
        document.getElementById('attendanceEmployeeSearch').value = '';
        document.getElementById('attendanceEmployeeName').value = '';
        document.getElementById('attendanceStage').value = '';
        
        // Populate dropdown
        if (this.employeesData && this.employeesData.length > 0) {
            this.employeesData.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp['Employee ID'];
                opt.innerText = `${emp['Employee ID']} - ${emp['Name (English)']}`;
                document.getElementById('attendanceEmployeeSelect').appendChild(opt);
            });
        }

        var modal = document.getElementById('attendanceModal');
        var backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    },
    filterAttendanceEmployeeList() {
        const search = document.getElementById('attendanceEmployeeSearch').value.toLowerCase();
        const options = document.getElementById('attendanceEmployeeSelect').options;
        for(let i=0; i<options.length; i++){
            const txt = options[i].innerText.toLowerCase();
            options[i].style.display = txt.includes(search) ? 'block' : 'none';
        }
    },
    selectAttendanceEmployee() {
        const select = document.getElementById('attendanceEmployeeSelect');
        const empId = select.value;
        this.selectedAttendEmpId = empId;
        const emp = this.employeesData.find(e => e['Employee ID'] === empId);
        document.getElementById('attendanceEmployeeName').value = emp ? emp['Name (English)'] : '';
    },
    setAttendanceStage(stage) {
        this.selectedAttendStage = stage;
        document.getElementById('attendanceStage').value = stage;
    },
    submitAttendance() {
        if(!this.selectedAttendEmpId) return alert("Please select an employee.");
        if(!this.selectedAttendStage) return alert("Please select a stage (Check In, Break Out, etc.).");
        const date = document.getElementById('attendanceDate').value;
        if(!date) return alert("Please select a date.");
        
        const emp = this.employeesData.find(e => e['Employee ID'] === this.selectedAttendEmpId);
        alert(`Attendance Logged:\nEmployee: ${emp ? emp['Name (English)'] : this.selectedAttendEmpId}\nDate: ${date}\nStage: ${this.selectedAttendStage}`);
        $('#attendanceModal').modal('hide');
        document.querySelector('.modal-backdrop').remove();
    },

    // ============================================================
    // MODALS - LEAVE REQUEST (SEARCHABLE + BALANCE)
    // ============================================================
    showLeaveRequestModal() {
        this.selectedLeaveEmpId = null;
        document.getElementById('leaveEmployeeSelect').innerHTML = '<option value="" disabled selected>Select an employee...</option>';
        document.getElementById('leaveEmployeeSearch').value = '';
        document.getElementById('leaveEmployeeName').innerText = '-';
        document.getElementById('leaveBalanceDisplay').innerText = '0 days';
        document.getElementById('leaveBalanceDisplay').className = 'text-success fw-bold';
        document.getElementById('leaveErrorDisplay').innerText = '';
        document.getElementById('leaveForm').reset();
        
        if (this.employeesData && this.employeesData.length > 0) {
            this.employeesData.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp['Employee ID'];
                opt.innerText = `${emp['Employee ID']} - ${emp['Name (English)']}`;
                document.getElementById('leaveEmployeeSelect').appendChild(opt);
            });
        }

        var modal = document.getElementById('leaveModal');
        var backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    },
    filterLeaveEmployeeList() {
        const search = document.getElementById('leaveEmployeeSearch').value.toLowerCase();
        const options = document.getElementById('leaveEmployeeSelect').options;
        for(let i=0; i<options.length; i++){
            const txt = options[i].innerText.toLowerCase();
            options[i].style.display = txt.includes(search) ? 'block' : 'none';
        }
    },
    selectLeaveEmployee() {
        const select = document.getElementById('leaveEmployeeSelect');
        const empId = select.value;
        this.selectedLeaveEmpId = empId;
        const emp = this.employeesData.find(e => e['Employee ID'] === empId);
        if(emp) {
            document.getElementById('leaveEmployeeName').innerText = emp['Name (English)'];
            document.getElementById('leaveBalanceDisplay').innerText = `${emp['Remaining Vacation'] || 0} days`;
            if((emp['Remaining Vacation'] || 0) <= 0) {
                document.getElementById('leaveBalanceDisplay').className = 'text-danger fw-bold';
            } else {
                document.getElementById('leaveBalanceDisplay').className = 'text-success fw-bold';
            }
        }
    },
    submitLeaveRequest() {
        const empId = this.selectedLeaveEmpId;
        if(!empId) return alert("Please search and select an employee from the list.");
        const emp = this.employeesData.find(e => e['Employee ID'] === empId);
        const startDate = new Date(document.getElementById('leaveStart').value);
        const endDate = new Date(document.getElementById('leaveEnd').value);
        
        if (!document.getElementById('leaveStart').value || !document.getElementById('leaveEnd').value) {
            return alert("Please fill in start and end dates.");
        }
        if (endDate < startDate) {
            return alert("End date cannot be before start date.");
        }
        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysRequested = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        const remaining = emp['Remaining Vacation'] || 0;

        if (daysRequested > remaining) {
            document.getElementById('leaveErrorDisplay').innerText = `ERROR: You cannot apply for ${daysRequested} days. Only ${remaining} days available.`;
            return;
        }
        document.getElementById('leaveErrorDisplay').innerText = '';
        alert(`Leave Approved!\n${emp['Name (English)']} requested ${daysRequested} days.\nRemaining balance will be: ${remaining - daysRequested}`);
        $('#leaveModal').modal('hide');
        document.querySelector('.modal-backdrop').remove();
    }
};
