// app.js - Complete Application with Integrated Data Fetching

class HRApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.employees = [];
        this.attendance = [];
        this.leaves = [];
        this.reviews = [];
        this.dataTables = {};
        this.user = null;
        this.init();
    }

    async init() {
        // Show login screen first
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        
        // Initialize Google Login
        await auth.initialize();
        auth.renderLoginButton('googleLoginButton');
        
        // Check if already authenticated
        if (auth.checkAuth()) {
            this.user = auth.getUser();
            this.onLoginSuccess();
        }
        
        // Set up login callback
        auth.onLogin((user) => {
            this.user = user;
            this.onLoginSuccess();
        });
        
        // Setup other event listeners
        this.setupEventListeners();
        this.setupSidebarToggle();
    }

    onLoginSuccess() {
        // Hide login, show main app
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        // Update user info in top bar
        const user = this.user;
        document.getElementById('userEmail').textContent = user.email;
        
        const avatarEl = document.getElementById('userAvatar');
        const placeholderEl = document.getElementById('userAvatarPlaceholder');
        
        if (user.picture) {
            avatarEl.src = user.picture;
            avatarEl.style.display = 'inline-block';
            placeholderEl.style.display = 'none';
        } else {
            const initials = (user.name || user.email).charAt(0).toUpperCase();
            placeholderEl.textContent = initials;
            placeholderEl.style.display = 'flex';
            avatarEl.style.display = 'none';
        }
        
        // Load data
        this.loadAllData();
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
            profile: 'Employee Profile',
            attendance: 'Attendance Log',
            leave: 'Leave Management',
            reviews: 'Performance Reviews'
        };
        document.getElementById('pageTitle').textContent = titles[page] || page;
        
        if (page === 'dashboard') {
            this.updateDashboard();
        }
        
        // Close sidebar on mobile
        if (window.innerWidth < 768) {
            document.getElementById('sidebar').classList.remove('active');
        }
    }

    // ==================== LOAD DATA - MODIFIED TO USE INTEGRATED DATA ====================
    async loadAllData() {
        try {
            // 🔥 NEW: Fetch integrated data from both sheets
            const result = await api.getIntegratedEmployees();
            this.employees = result.data || [];
            
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
            
            this.renderEmployees();
            this.renderAttendance();
            this.renderLeaves();
            this.renderReviews();
            
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback to regular employees if integrated fails
            try {
                const empResult = await api.getEmployees();
                this.employees = empResult.data || [];
                this.renderEmployees();
            } catch (e) {
                console.error('Fallback also failed:', e);
            }
        }
    }

    // ==================== DASHBOARD ====================
    updateDashboard() {
        const total = this.employees.length;
        document.getElementById('totalEmployees').textContent = total;
        
        const active = this.employees.filter(e => e.Status === 'Active').length;
        document.getElementById('activeEmployees').textContent = active;
        
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
                        <span>${a['Employee Name'] || a['Employee ID'] || 'N/A'} - ${a.Date || 'N/A'}</span>
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
                        <span>${l['Employee Name'] || l['Employee ID'] || 'N/A'} - ${l.Type || 'N/A'}</span>
                        <span class="badge bg-warning">Pending</span>
                    </li>
                `;
            });
        }
        leaveHtml += '</ul>';
        document.getElementById('pendingLeaveRequests').innerHTML = leaveHtml;
    }

    // ==================== EMPLOYEES ====================
    renderEmployees() {
        const tbody = document.getElementById('employeesTableBody');
        tbody.innerHTML = '';
        
        if (this.employees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">No employees found. Click "Add Employee" to get started.</td>
                </tr>
            `;
            return;
        }
        
        this.employees.forEach(emp => {
            const statusClass = emp.Status === 'Active' ? 'active' : 
                              emp.Status === 'On Leave' ? 'on-leave' : 'inactive';
            const remainingVacation = emp['Remaining Vacation'] || 0;
            const employeeId = emp['Employee ID'] || emp['Civil ID'] || 'N/A';
            
            tbody.innerHTML += `
                <tr>
                    <td>${employeeId}</td>
                    <td>${emp['Name (English)'] || 'N/A'}</td>
                    <td>${emp['Name (Arabic)'] || 'N/A'}</td>
                    <td>${emp.Designation || 'N/A'}</td>
                    <td>${emp.Salary || 0}</td>
                    <td>${remainingVacation}</td>
                    <td><span class="status-badge ${statusClass}">${emp.Status || 'Active'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="app.viewProfile('${emp['Employee ID'] || emp['Civil ID'] || ''}')" title="View Profile">
                            <i class="bi bi-person"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="app.editEmployee('${emp['Civil ID'] || ''}')" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteEmployee('${emp['Civil ID'] || ''}')" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        // Refresh DataTable
        if (this.dataTables.employees) {
            this.dataTables.employees.destroy();
        }
        this.dataTables.employees = $('#employeesTable').DataTable({
            pageLength: 10,
            responsive: true,
            order: [[0, 'desc']]
        });
    }

    // ==================== EMPLOYEE PROFILE ====================
    viewProfile(employeeId) {
        const emp = this.employees.find(e => 
            String(e['Employee ID']) === String(employeeId) || 
            String(e['Civil ID']) === String(employeeId)
        );
        if (!emp) {
            alert('Employee not found');
            return;
        }
        
        this.navigateTo('profile');
        const profileHtml = this.buildProfileHtml(emp);
        document.getElementById('profileContent').innerHTML = profileHtml;
    }

    buildProfileHtml(emp) {
        const statusClass = emp.Status === 'Active' ? 'active' : 
                          emp.Status === 'On Leave' ? 'on-leave' : 'inactive';
        
        const empAttendance = this.attendance.filter(a => 
            a['Employee ID'] === emp['Employee ID'] || 
            a['Civil ID'] === emp['Civil ID']
        );
        const empLeaves = this.leaves.filter(l => 
            l['Employee ID'] === emp['Employee ID'] || 
            l['Civil ID'] === emp['Civil ID']
        );
        const empReviews = this.reviews.filter(r => 
            r['Employee ID'] === emp['Employee ID'] || 
            r['Civil ID'] === emp['Civil ID']
        );
        
        const totalAttendance = empAttendance.length;
        const presentDays = empAttendance.filter(a => a.Status === 'Present').length;
        const attendanceRate = totalAttendance > 0 ? Math.round((presentDays / totalAttendance) * 100) : 0;
        
        let avgRating = 0;
        if (empReviews.length > 0) {
            const sum = empReviews.reduce((acc, r) => acc + parseFloat(r.Rating || 0), 0);
            avgRating = (sum / empReviews.length).toFixed(1);
        }
        
        const nameParts = (emp['Name (English)'] || '').split(' ');
        const initials = nameParts.map(n => n[0]).join('').toUpperCase() || '?';
        
        return `
            <div class="profile-header">
                <div class="row align-items-center">
                    <div class="col-md-2 text-center">
                        <div class="profile-avatar">${initials}</div>
                    </div>
                    <div class="col-md-7">
                        <h2>${emp['Name (English)'] || 'N/A'}</h2>
                        <h5 class="text-muted">${emp['Name (Arabic)'] || ''}</h5>
                        <p class="mb-1"><strong>${emp.Designation || 'N/A'}</strong></p>
                        <p class="mb-1"><strong>Employee ID:</strong> ${emp['Employee ID'] || 'N/A'}</p>
                        <span class="status-badge ${statusClass}">${emp.Status || 'Active'}</span>
                    </div>
                    <div class="col-md-3 text-end">
                        <button class="btn btn-primary btn-sm me-1" onclick="app.editEmployee('${emp['Civil ID']}')">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="app.navigateTo('employees')">
                            <i class="bi bi-arrow-left"></i> Back
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <div class="profile-stat">
                        <div class="profile-stat-number">${emp.Salary || 0}</div>
                        <div class="profile-stat-label">Salary</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="profile-stat">
                        <div class="profile-stat-number">${emp['Remaining Vacation'] || 0}</div>
                        <div class="profile-stat-label">Vacation Days Left</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="profile-stat">
                        <div class="profile-stat-number">${emp['Sick Days Taken'] || 0}</div>
                        <div class="profile-stat-label">Sick Days Taken</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="profile-stat">
                        <div class="profile-stat-number">${attendanceRate}%</div>
                        <div class="profile-stat-label">Attendance Rate</div>
                    </div>
                </div>
            </div>
            
            <div class="row g-3">
                <div class="col-md-6">
                    <div class="table-container">
                        <h6 class="mb-3"><i class="bi bi-person"></i> Personal Details</h6>
                        <div class="profile-info-item">
                            <span class="profile-info-label">Employee ID</span>
                            <span class="profile-info-value">${emp['Employee ID'] || 'N/A'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="profile-info-label">Civil ID</span>
                            <span class="profile-info-value">${emp['Civil ID'] || 'N/A'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="profile-info-label">Passport No</span>
                            <span class="profile-info-value">${emp['Passport No'] || 'N/A'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="profile-info-label">Nationality</span>
                            <span class="profile-info-value">${emp.Nationality || 'N/A'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="profile-info-label">Date of Join</span>
                            <span class="profile-info-value">${emp['Date of Join'] || 'N/A'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="profile-info-label">Contact (Kuwait)</span>
                            <span class="profile-info-value">${emp['Contact Kuwait'] || 'N/A'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="profile-info-label">Contact (Home)</span>
                            <span class="profile-info-value">${emp['Contact Home'] || 'N/A'}</span>
                        </div>
                        ${emp.Remarks ? `
                        <div class="profile-info-item">
                            <span class="profile-info-label">Remarks</span>
                            <span class="profile-info-value">${emp.Remarks}</span>
                        </div>` : ''}
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="table-container">
                        <h6 class="mb-3"><i class="bi bi-file-text"></i> Document Details</h6>
                        <div class="profile-info-item">
                            <span class="profile-info-label">Health Card Issued</span>
                            <span class="profile-info-value">${emp['Health Card Issued'] || 'N/A'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="profile-info-label">Health Card Expiry</span>
                            <span class="profile-info-value">${emp['Health Card Expiry'] || 'N/A'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="profile-info-label">CID Issued</span>
                            <span class="profile-info-value">${emp['CID Issued'] || 'N/A'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="profile-info-label">CID Expiry</span>
                            <span class="profile-info-value">${emp['CID Expiry'] || 'N/A'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="profile-info-label">Passport Issued</span>
                            <span class="profile-info-value">${emp['Passport Issued'] || 'N/A'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="profile-info-label">Passport Expiry</span>
                            <span class="profile-info-value">${emp['Passport Expiry'] || 'N/A'}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="profile-info-label">Total Vacation Days</span>
                            <span class="profile-info-value">${emp['Total Vacation Days'] || 0}</span>
                        </div>
                        <div class="profile-info-item">
                            <span class="profile-info-label">Vacation Taken</span>
                            <span class="profile-info-value">${emp['Vacation Taken'] || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            ${empLeaves.length > 0 ? `
            <div class="row g-3 mt-3">
                <div class="col-12">
                    <div class="table-container">
                        <h6 class="mb-3"><i class="bi bi-clock-history"></i> Leave History</h6>
                        <div class="table-responsive">
                            <table class="table table-sm table-striped">
                                <thead>
                                    <tr>
                                        <th>Start Date</th>
                                        <th>End Date</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${empLeaves.map(l => `
                                        <tr>
                                            <td>${l['Start Date'] || 'N/A'}</td>
                                            <td>${l['End Date'] || 'N/A'}</td>
                                            <td>${l.Type || 'N/A'}</td>
                                            <td><span class="badge bg-${l.Status === 'Approved' ? 'success' : l.Status === 'Rejected' ? 'danger' : 'warning'}">${l.Status || 'Pending'}</span></td>
                                            <td>${l.Reason || '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>` : ''}
            
            ${empReviews.length > 0 ? `
            <div class="row g-3 mt-3">
                <div class="col-12">
                    <div class="table-container">
                        <h6 class="mb-3"><i class="bi bi-star"></i> Performance Reviews (Avg: ${avgRating} ★)</h6>
                        <div class="table-responsive">
                            <table class="table table-sm table-striped">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Reviewer</th>
                                        <th>Rating</th>
                                        <th>Comments</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${empReviews.map(r => `
                                        <tr>
                                            <td>${r['Review Date'] || 'N/A'}</td>
                                            <td>${r.Reviewer || 'N/A'}</td>
                                            <td>${'★'.repeat(Math.round(r.Rating || 0))}${'☆'.repeat(5 - Math.round(r.Rating || 0))} (${r.Rating || 0})</td>
                                            <td>${r.Comments || '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>` : ''}
        `;
    }

    // ==================== ADD/EDIT EMPLOYEE ====================
    showAddEmployeeModal() {
        document.getElementById('employeeModalTitle').textContent = 'Add Employee';
        document.getElementById('employeeForm').reset();
        document.getElementById('employeeForm').dataset.editId = '';
        document.getElementById('empStatus').value = 'Active';
        document.getElementById('empTotalVacation').value = 0;
        document.getElementById('empVacationTaken').value = 0;
        document.getElementById('empRemainingVacation').value = 0;
        document.getElementById('empSickDays').value = 0;
        new bootstrap.Modal(document.getElementById('employeeModal')).show();
    }

    async saveEmployee() {
        const form = document.getElementById('employeeForm');
        const editId = form.dataset.editId;
        
        const data = {
            nameArabic: document.getElementById('empNameArabic').value,
            nameEnglish: document.getElementById('empNameEnglish').value,
            civilId: document.getElementById('empCivilId').value,
            passportNo: document.getElementById('empPassport').value,
            nationality: document.getElementById('empNationality').value,
            designation: document.getElementById('empDesignation').value,
            salary: parseFloat(document.getElementById('empSalary').value) || 0,
            dateOfJoin: document.getElementById('empDateOfJoin').value,
            status: document.getElementById('empStatus').value,
            healthCardIssued: document.getElementById('empHealthIssued').value,
            healthCardExpiry: document.getElementById('empHealthExpiry').value,
            cidIssued: document.getElementById('empCidIssued').value,
            cidExpiry: document.getElementById('empCidExpiry').value,
            passportIssued: document.getElementById('empPassportIssued').value,
            passportExpiry: document.getElementById('empPassportExpiry').value,
            contactKuwait: document.getElementById('empContactKuwait').value,
            contactHome: document.getElementById('empContactHome').value,
            totalVacationDays: parseFloat(document.getElementById('empTotalVacation').value) || 0,
            vacationTaken: parseFloat(document.getElementById('empVacationTaken').value) || 0,
            remainingVacation: parseFloat(document.getElementById('empRemainingVacation').value) || 0,
            sickDaysTaken: parseFloat(document.getElementById('empSickDays').value) || 0,
            lastVacationStart: document.getElementById('empLastVacationStart').value,
            lastVacationEnd: document.getElementById('empLastVacationEnd').value,
            remarks: document.getElementById('empRemarks').value
        };
        
        if (!data.nameEnglish || !data.nameArabic || !data.civilId || !data.salary) {
            alert('Please fill in all required fields (Name, Civil ID, and Salary)');
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
        const emp = this.employees.find(e => String(e['Civil ID']) === String(civilId));
        if (!emp) {
            alert('Employee not found');
            return;
        }
        
        document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
        document.getElementById('empNameEnglish').value = emp['Name (English)'] || '';
        document.getElementById('empNameArabic').value = emp['Name (Arabic)'] || '';
        document.getElementById('empCivilId').value = emp['Civil ID'] || '';
        document.getElementById('empPassport').value = emp['Passport No'] || '';
        document.getElementById('empNationality').value = emp.Nationality || '';
        document.getElementById('empDesignation').value = emp.Designation || '';
        document.getElementById('empSalary').value = emp.Salary || '';
        document.getElementById('empDateOfJoin').value = emp['Date of Join'] || '';
        document.getElementById('empStatus').value = emp.Status || 'Active';
        document.getElementById('empHealthIssued').value = emp['Health Card Issued'] || '';
        document.getElementById('empHealthExpiry').value = emp['Health Card Expiry'] || '';
        document.getElementById('empCidIssued').value = emp['CID Issued'] || '';
        document.getElementById('empCidExpiry').value = emp['CID Expiry'] || '';
        document.getElementById('empPassportIssued').value = emp['Passport Issued'] || '';
        document.getElementById('empPassportExpiry').value = emp['Passport Expiry'] || '';
        document.getElementById('empContactKuwait').value = emp['Contact Kuwait'] || '';
        document.getElementById('empContactHome').value = emp['Contact Home'] || '';
        document.getElementById('empTotalVacation').value = emp['Total Vacation Days'] || 0;
        document.getElementById('empVacationTaken').value = emp['Vacation Taken'] || 0;
        document.getElementById('empRemainingVacation').value = emp['Remaining Vacation'] || 0;
        document.getElementById('empSickDays').value = emp['Sick Days Taken'] || 0;
        document.getElementById('empLastVacationStart').value = emp['Last Vacation Start'] || '';
        document.getElementById('empLastVacationEnd').value = emp['Last Vacation End'] || '';
        document.getElementById('empRemarks').value = emp.Remarks || '';
        
        document.getElementById('employeeForm').dataset.editId = civilId;
        new bootstrap.Modal(document.getElementById('employeeModal')).show();
    }

    async deleteEmployee(civilId) {
        if (!civilId) {
            alert('Invalid employee ID');
            return;
        }
        if (!confirm('Are you sure you want to archive this employee?')) return;
        
        try {
            await api.deleteEmployee(civilId);
            await this.loadAllData();
            alert('Employee archived successfully!');
        } catch (error) {
            alert('Error archiving employee: ' + error.message);
        }
    }

    // ==================== ATTENDANCE ====================
    renderAttendance() {
        const tbody = document.getElementById('attendanceTableBody');
        tbody.innerHTML = '';
        
        if (this.attendance.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">No attendance records found.</td>
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
                    <td>${att['Employee ID'] || att['Civil ID'] || 'N/A'}</td>
                    <td>${att['Employee Name'] || 'N/A'}</td>
                    <td>${att['Check In'] || '-'}</td>
                    <td>${att['Check Out'] || '-'}</td>
                    <td>${att.Hours || '-'}</td>
                    <td><span class="badge bg-${statusClass}">${att.Status || 'N/A'}</span></td>
                </tr>
            `;
        });
        
        if (this.dataTables.attendance) {
            this.dataTables.attendance.destroy();
        }
        this.dataTables.attendance = $('#attendanceTable').DataTable({
            pageLength: 10,
            responsive: true,
            order: [[0, 'desc']]
        });
    }

    async markAttendance() {
        const date = document.getElementById('attendanceDate').value;
        if (!date) {
            alert('Please select a date');
            return;
        }
        
        const employeeId = prompt('Enter Employee ID (MT-XXXXX or Civil ID):');
        if (!employeeId) return;
        
        const employee = this.employees.find(e => 
            String(e['Employee ID']) === String(employeeId) || 
            String(e['Civil ID']) === String(employeeId)
        );
        if (!employee) {
            alert('Employee not found. Please check the Employee ID or Civil ID.');
            return;
        }
        
        const status = prompt('Status (Present/Absent/Leave):', 'Present');
        if (!status) return;
        
        try {
            await api.markAttendance({
                date: date,
                employeeId: employee['Employee ID'] || employee['Civil ID'],
                employeeName: employee['Name (English)'] || '',
                status: status,
                checkIn: new Date().toLocaleTimeString()
            });
            await this.loadAllData();
            alert('Attendance marked successfully!');
        } catch (error) {
            alert('Error marking attendance: ' + error.message);
        }
    }

    // ==================== LEAVE REQUESTS ====================
    renderLeaves() {
        const tbody = document.getElementById('leaveTableBody');
        tbody.innerHTML = '';
        
        if (this.leaves.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">No leave requests found.</td>
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
                    <td>${leave['Employee ID'] || leave['Civil ID'] || 'N/A'}</td>
                    <td>${leave['Employee Name'] || 'N/A'}</td>
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
        
        if (this.dataTables.leave) {
            this.dataTables.leave.destroy();
        }
        this.dataTables.leave = $('#leaveTable').DataTable({
            pageLength: 10,
            responsive: true,
            order: [[0, 'desc']]
        });
    }

    showLeaveRequestModal() {
        document.getElementById('leaveForm').reset();
        document.getElementById('leaveStart').value = new Date().toISOString().split('T')[0];
        document.getElementById('leaveEnd').value = new Date().toISOString().split('T')[0];
        new bootstrap.Modal(document.getElementById('leaveModal')).show();
    }

    async submitLeaveRequest() {
        const employeeId = document.getElementById('leaveEmpId').value;
        const employeeName = document.getElementById('leaveEmployeeName').value;
        const startDate = document.getElementById('leaveStart').value;
        const endDate = document.getElementById('leaveEnd').value;
        const type = document.getElementById('leaveType').value;
        const reason = document.getElementById('leaveReason').value;
        
        if (!employeeId || !employeeName || !startDate || !endDate) {
            alert('Please fill in all required fields');
            return;
        }
        
        try {
            await api.submitLeave({
                employeeId: employeeId,
                employeeName: employeeName,
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

    // ==================== REVIEWS ====================
    renderReviews() {
        const tbody = document.getElementById('reviewsTableBody');
        tbody.innerHTML = '';
        
        if (this.reviews.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">No performance reviews found.</td>
                </tr>
            `;
            return;
        }
        
        this.reviews.forEach(review => {
            const stars = '★'.repeat(Math.round(review.Rating || 0)) + '☆'.repeat(5 - Math.round(review.Rating || 0));
            tbody.innerHTML += `
                <tr>
                    <td>${review['Review ID'] || 'N/A'}</td>
                    <td>${review['Employee ID'] || review['Civil ID'] || 'N/A'}</td>
                    <td>${review['Employee Name'] || 'N/A'}</td>
                    <td>${review['Review Date'] || 'N/A'}</td>
                    <td>${review.Reviewer || 'N/A'}</td>
                    <td>${stars} (${review.Rating || 0})</td>
                    <td>${review.Comments || '-'}</td>
                </tr>
            `;
        });
        
        if (this.dataTables.reviews) {
            this.dataTables.reviews.destroy();
        }
        this.dataTables.reviews = $('#reviewsTable').DataTable({
            pageLength: 10,
            responsive: true,
            order: [[0, 'desc']]
        });
    }

    showReviewModal() {
        document.getElementById('reviewForm').reset();
        document.getElementById('reviewDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('reviewRating').value = 3;
        new bootstrap.Modal(document.getElementById('reviewModal')).show();
    }

    async submitReview() {
        const employeeId = document.getElementById('reviewEmpId').value;
        const employeeName = document.getElementById('reviewEmployeeName').value;
        const reviewDate = document.getElementById('reviewDate').value;
        const reviewer = document.getElementById('reviewer').value;
        const rating = document.getElementById('reviewRating').value;
        const comments = document.getElementById('reviewComments').value;
        const goals = document.getElementById('reviewGoals').value;
        
        if (!employeeId || !employeeName || !reviewDate || !reviewer || !rating) {
            alert('Please fill in all required fields');
            return;
        }
        
        try {
            await api.addReview({
                employeeId: employeeId,
                employeeName: employeeName,
                reviewDate: reviewDate,
                reviewer: reviewer,
                rating: parseFloat(rating) || 0,
                comments: comments || '',
                goals: goals || ''
            });
            bootstrap.Modal.getInstance(document.getElementById('reviewModal')).hide();
            await this.loadAllData();
            alert('Review added successfully!');
        } catch (error) {
            alert('Error adding review: ' + error.message);
        }
    }

    // ==================== DATA TABLES INIT ====================
    initDataTables() {
        setTimeout(() => {
            if ($.fn.DataTable) {
                try {
                    ['#employeesTable', '#attendanceTable', '#leaveTable', '#reviewsTable'].forEach(id => {
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
                } catch (error) {
                    console.warn('DataTables init error:', error);
                }
            }
        }, 500);
    }

    // ==================== SIGN OUT ====================
    async signOut() {
        await auth.signOut();
    }
}

// ============================================================
// GLOBAL APP INSTANCE
// ============================================================
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HRApp();
});

function handleSignOut() {
    if (app) {
        app.signOut();
    } else {
        auth.signOut();
    }
}
