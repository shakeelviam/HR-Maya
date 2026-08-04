// ============================================================
// app.js - UI LOGIC AND RENDERING (FINAL VERSION)
// ============================================================

const app = {
    employeesData: [],
    employeesTable: null,

    // 1. Init function called by auth.js on login
    async init() {
        console.log("Initializing App...");
        this.setupSidebarNavigation();
        await this.loadAllData();
    },

    // 2. Fetch data and render
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

    // 3. Render Employee Table
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
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="app.viewProfile('${emp['Employee ID'] || ''}')">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

        if ($.fn.dataTable) {
            if (this.employeesTable) this.employeesTable.destroy();
            this.employeesTable = $('#employeesTable').DataTable({
                pageLength: 10,
                responsive: true,
                order: [[0, 'asc']]
            });
        }
    },

    // 4. Update Dashboard Stats
    updateDashboardStats() {
        const total = this.employeesData.length;
        const active = this.employeesData.filter(e => e.Status === 'Active').length;
        document.getElementById('totalEmployees').innerText = total;
        document.getElementById('activeEmployees').innerText = active;
        document.getElementById('pendingLeaves').innerText = '0';
        document.getElementById('avgRating').innerText = '0.0';
    },

    // 5. Sidebar Navigation Handler
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
                
                document.getElementById('pageTitle').innerText = 
                    pageId.charAt(0).toUpperCase() + pageId.slice(1);
            });
        });
    },

    // ============================================================
    // 6. EMPLOYEE PROFILE - SHOWS ALL DATA
    // ============================================================
    viewProfile(employeeId) {
        if (!employeeId) return;
        const emp = this.employeesData.find(e => e['Employee ID'] === employeeId);
        
        if (emp) {
            document.querySelectorAll('#sidebar .nav-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
            document.getElementById('page-profile').classList.add('active');
            document.getElementById('pageTitle').innerText = 'Employee Profile';

            // Render all available data into a detailed profile
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
                                    <div class="profile-info-item"><span class="profile-info-label">Total Vacation Allowed</span><span class="profile-info-value">30 Days (Standard)</span></div>
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
    // 7. MODALS & LEAVE VALIDATION LOGIC
    // ============================================================

    // Open Leave Request Modal
    showLeaveRequestModal() { 
        var modal = document.getElementById('leaveModal');
        var backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Reset the form when opening
        document.getElementById('leaveForm').reset();
        document.getElementById('leaveBalanceDisplay').innerText = '';
        document.getElementById('leaveErrorDisplay').innerText = '';
    },

    // Submit Leave Request with VALIDATION
    submitLeaveRequest() { 
        const empId = document.getElementById('leaveEmpId').value.trim();
        const empName = document.getElementById('leaveEmployeeName').value.trim();
        const startDate = new Date(document.getElementById('leaveStart').value);
        const endDate = new Date(document.getElementById('leaveEnd').value);
        const reason = document.getElementById('leaveReason').value.trim();

        if (!empId || !empName || !startDate || !endDate) {
            alert("Please fill in all required fields.");
            return;
        }

        if (endDate < startDate) {
            alert("End date cannot be before start date.");
            return;
        }

        // Calculate days requested
        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysRequested = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // inclusive count

        // Find employee data
        const emp = this.employeesData.find(e => e['Employee ID'] === empId);
        if (!emp) {
            alert("Invalid Employee ID.");
            return;
        }

        const remaining = emp['Remaining Vacation'] || 0;

        // LOGIC: Validate against available balance
        if (daysRequested > remaining) {
            document.getElementById('leaveErrorDisplay').innerText = 
                `ERROR: You cannot apply for ${daysRequested} days. Only ${remaining} days available.`;
            document.getElementById('leaveErrorDisplay').style.color = 'red';
            return;
        }

        // Success: Proceed with submission
        alert(`Leave Approved!\n${empName} requested ${daysRequested} days.\nRemaining balance will be: ${remaining - daysRequested}`);
        document.getElementById('leaveErrorDisplay').innerText = '';
        
        // Add logic here to call API.submitLeave() in the future.
        // To close modal manually:
        // document.getElementById('leaveModal').classList.remove('show');
        // document.getElementById('leaveModal').style.display = 'none';
        // document.body.classList.remove('modal-open');
    },

    // Open Add Employee Modal
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

    // Open Review Modal
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

    // Mark Attendance (Placeholder)
    markAttendance() { 
        const dateInput = document.getElementById('attendanceDate');
        if (!dateInput || !dateInput.value) {
            alert("Please select a date first.");
            return;
        }
        alert(`Attendance marked for date: ${dateInput.value}`);
    }
};
