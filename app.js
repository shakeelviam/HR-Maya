// ============================================================
// app.js - FINAL COMPLETE FIX
// ============================================================

const app = {
    employeesData: [],
    employeesTable: null,
    
    // ============================================================
    // CORE DATA FUNCTIONS
    // ============================================================

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
            // ✅ FIXED: Manually appending the URL to bypass proxy issues
            const url = 'https://script.google.com/macros/s/AKfycbyG5XLC79FnyLtSGGWunhJwU83SV0b0kz3y1FKdal-JBcTUM-X0ax134konYyTaKxYiiQ/exec?method=getIntegratedEmployees';
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Unknown API error');
            
            this.employeesData = result.data;
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

    // ============================================================
    // ✅ REQUESTED CHANGES: VIEW PROFILE (ALL DETAILS)
    // ============================================================

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
    // ✅ REQUESTED CHANGES: ADD EMPLOYEE MODAL
    // ============================================================

    showAddEmployeeModal() { 
        $('#employeeModal').modal('show'); 
    },
    saveEmployee() { 
        alert("Save Employee feature coming soon"); 
    },

    // ============================================================
    // ✅ REQUESTED CHANGES: 4-STAGE ATTENDANCE MODAL
    // ============================================================

    showAttendanceModal() {
        // Reset fields
        document.getElementById('attendanceEmployeeSelect').innerHTML = '<option value="" disabled selected>Select an employee...</option>';
        document.getElementById('attendanceEmployeeSearch').value = '';
        document.getElementById('attendanceEmployeeName').value = '';
        document.getElementById('attendanceDate').value = '';
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
        $('#attendanceModal').modal('show'); 
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
        const emp = this.employeesData.find(e => e['Employee ID'] === empId);
        document.getElementById('attendanceEmployeeName').value = emp ? emp['Name (English)'] : '';
    },

    setAttendanceStage(stage) {
        document.getElementById('attendanceStage').value = stage;
    },

    submitAttendance() {
        const empId = document.getElementById('attendanceEmployeeSelect').value;
        if(!empId) return alert("Please select an employee.");
        
        const stage = document.getElementById('attendanceStage').value;
        if(!stage) return alert("Please select a stage (Check In, Break Out, etc.).");
        
        const date = document.getElementById('attendanceDate').value;
        if(!date) return alert("Please select a date.");
        
        const emp = this.employeesData.find(e => e['Employee ID'] === empId);
        alert(`Attendance Logged:\nEmployee: ${emp ? emp['Name (English)'] : empId}\nDate: ${date}\nStage: ${stage}`);
        $('#attendanceModal').modal('hide');
    },

    // ============================================================
    // ✅ REQUESTED CHANGES: SEARCHABLE LEAVE + BALANCE
    // ============================================================

    showLeaveRequestModal() {
        document.getElementById('leaveEmployeeSelect').innerHTML = '<option value="" disabled selected>Select an employee...</option>';
        document.getElementById('leaveEmployeeSearch').value = '';
        document.getElementById('leaveEmployeeName').innerText = '-';
        document.getElementById('leaveBalanceDisplay').innerText = '0 days';
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
        $('#leaveModal').modal('show'); 
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
        const emp = this.employeesData.find(e => e['Employee ID'] === empId);
        if(emp) {
            document.getElementById('leaveEmployeeName').innerText = emp['Name (English)'];
            document.getElementById('leaveBalanceDisplay').innerText = `${emp['Remaining Vacation'] || 0} days`;
        }
    },

    submitLeaveRequest() {
        const empId = document.getElementById('leaveEmployeeSelect').value;
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
    },

    // ============================================================
    // PERFORMANCE REVIEW
    // ============================================================

    showReviewModal() { 
        $('#reviewModal').modal('show'); 
    },
    submitReview() { 
        alert("Submit review feature coming soon"); 
    }
};
