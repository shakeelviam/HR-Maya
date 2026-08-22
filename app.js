// ============================================================
// app.js - FINAL COMPLETE FIX
// ============================================================

const app = {
    employeesData: [],
    employeesTable: null,
    filters: { status: '', branch: '' },
    _empFilterPushed: false,
    
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
            const url = 'https://script.google.com/macros/s/AKfycbyG5XLC79FnyLtSGGWunhJwU83SV0b0kz3y1FKdal-JBcTUM-X0ax134konYyTaKxYiiQ/exec?method=getEmployeesFull&_=' + Date.now();
            
            const response = await fetch(url, { cache: 'no-store' });
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
                    <td>${emp['Gross Salary'] || 0}</td>
                    <td>${emp['Remaining Vacation'] || 0}</td>
                    <td><span class="status-badge ${(emp.Status || 'active').toLowerCase()}">${emp.Status || 'Active'}</span></td>
                    <td><button class="btn btn-sm btn-outline-primary me-1" onclick="app.viewProfile('${emp['Employee ID'] || ''}')" title="View"><i class="bi bi-eye"></i></button><button class="btn btn-sm btn-outline-secondary" onclick="app.editEmployee('${emp['Employee ID'] || ''}')" title="Edit"><i class="bi bi-pencil"></i></button></td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

        if ($.fn.dataTable) {
            if (this.employeesTable) this.employeesTable.destroy();
            this.employeesTable = $('#employeesTable').DataTable({ pageLength: 10, responsive: true, order: [[0, 'asc']] });
        }
        try { this.setupEmployeeFilters(); } catch (e) { console.warn('Employee filter setup skipped:', e); }
    },

    // ---- EMPLOYEE LIST FILTERS (Status + Branch), on top of the built-in search ----
    setupEmployeeFilters() {
        const self = this;
        // Register the custom row filter once (persists across table rebuilds).
        if (!this._empFilterPushed && $.fn.dataTable) {
            $.fn.dataTable.ext.search.push(function (settings, rowData) {
                if (settings.nTable.id !== 'employeesTable') return true;
                const empId = String(rowData[0] || '').trim();
                const emp = self.employeesData.find(e => String(e['Employee ID'] || '').trim() === empId);
                if (!emp) return true;
                if (self.filters.status && String(emp.Status || 'Active') !== self.filters.status) return false;
                if (self.filters.branch && String(emp.Branch || '') !== self.filters.branch) return false;
                return true;
            });
            this._empFilterPushed = true;
        }
        // Inject the filter bar once, above the table's DataTables wrapper.
        const container = document.querySelector('#page-employees .table-container');
        if (container && !document.getElementById('empFilterBar')) {
            const bar = document.createElement('div');
            bar.id = 'empFilterBar';
            bar.className = 'row g-2 align-items-end mb-3';
            bar.innerHTML =
                '<div class="col-auto"><label class="form-label small mb-1">Status</label>' +
                    '<select id="empFilterStatus" class="form-select form-select-sm" onchange="app.applyEmployeeFilter()">' +
                        '<option value="">All</option><option>Active</option><option>Inactive</option><option>On Leave</option></select></div>' +
                '<div class="col-auto"><label class="form-label small mb-1">Branch</label>' +
                    '<select id="empFilterBranch" class="form-select form-select-sm" onchange="app.applyEmployeeFilter()">' +
                        '<option value="">All</option></select></div>' +
                '<div class="col-auto"><button class="btn btn-outline-secondary btn-sm" onclick="app.clearEmployeeFilter()"><i class="bi bi-x-circle"></i> Clear</button></div>';
            // Anchor to the DataTables wrapper if present, else the table, else the container top.
            const table = document.getElementById('employeesTable');
            const wrapper = document.getElementById('employeesTable_wrapper');
            const anchor = (wrapper && wrapper.parentNode === container) ? wrapper
                         : (table && table.parentNode === container) ? table : null;
            if (anchor) container.insertBefore(bar, anchor);
            else container.insertBefore(bar, container.firstChild);
        }
        // (Re)populate Branch options from current data, preserving selection.
        const bsel = document.getElementById('empFilterBranch');
        if (bsel) {
            const cur = bsel.value;
            const branches = Array.from(new Set(this.employeesData.map(e => String(e.Branch || '').trim()).filter(Boolean))).sort();
            bsel.innerHTML = '<option value="">All</option>' + branches.map(b => '<option>' + b + '</option>').join('');
            bsel.value = cur;
        }
    },

    applyEmployeeFilter() {
        this.filters.status = (document.getElementById('empFilterStatus') || {}).value || '';
        this.filters.branch = (document.getElementById('empFilterBranch') || {}).value || '';
        if (this.employeesTable) this.employeesTable.draw();
    },

    clearEmployeeFilter() {
        this.filters = { status: '', branch: '' };
        const s = document.getElementById('empFilterStatus'); if (s) s.value = '';
        const b = document.getElementById('empFilterBranch'); if (b) b.value = '';
        if (this.employeesTable) this.employeesTable.draw();
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
                // Reflect the latest sheet data whenever these pages are opened.
                if ((pageId === 'employees' || pageId === 'dashboard') && app.loadAllData) app.loadAllData();
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

    // ---- ADD / EDIT EMPLOYEE (auto ID + PIN) ----
    EXEC_URL: 'https://script.google.com/macros/s/AKfycbyG5XLC79FnyLtSGGWunhJwU83SV0b0kz3y1FKdal-JBcTUM-X0ax134konYyTaKxYiiQ/exec',
    editingEmployeeId: '',

    resetEmployeeForm() {
        this.editingEmployeeId = '';
        const f = document.getElementById('employeeForm');
        if (f) f.reset();
        const title = document.getElementById('employeeModalTitle');
        if (title) title.innerText = 'Add Employee';
    },

    showAddEmployeeModal() {
        this.resetEmployeeForm();
        $('#employeeModal').modal('show');
    },

    async editEmployee(employeeId) {
        if (!employeeId) return;
        try {
            const res = await fetch(this.EXEC_URL + '?method=getEmployeeById&employeeId=' + encodeURIComponent(employeeId) + '&_=' + Date.now(), { cache: 'no-store' });
            const d = await res.json();
            if (!d.success) throw new Error(d.error || 'Not found');
            const r = d.data || {};
            const g = (k) => (r[k] != null ? r[k] : '');
            this.resetEmployeeForm();
            document.getElementById('empNameEnglish').value = g('Name (English)');
            document.getElementById('empNameArabic').value = g('Name (Arabic)');
            document.getElementById('empCivilId').value = g('Civil ID');
            var ibanEl = document.getElementById('empIban'); if (ibanEl) ibanEl.value = g('IBAN');
            document.getElementById('empSalary').value = g('Basic Salary');
            const st = document.getElementById('empStatus'); if (st) st.value = g('Status') || 'Active';
            this.editingEmployeeId = employeeId;
            const title = document.getElementById('employeeModalTitle');
            if (title) title.innerText = 'Edit Employee — ' + employeeId + (r['PIN'] ? '  (PIN ' + r['PIN'] + ')' : '');
            $('#employeeModal').modal('show');
        } catch (err) { alert('Could not load ' + employeeId + ': ' + err.message); }
    },

    async saveEmployee() {
        const nameEng = (document.getElementById('empNameEnglish').value || '').trim();
        const basic = document.getElementById('empSalary').value;
        const eid = this.editingEmployeeId;
        if (!eid && !nameEng) { alert('Name (English) is required.'); return; }
        if (!eid && !basic && !confirm('No Basic Salary entered — this employee cannot be run in payroll until it is set. Save anyway?')) return;

        const payload = {
            nameEnglish: nameEng,
            nameArabic: (document.getElementById('empNameArabic').value || '').trim(),
            civilId: (document.getElementById('empCivilId').value || '').trim(),
            iban: (document.getElementById('empIban') ? document.getElementById('empIban').value : '').trim(),
            basic: basic,
            status: document.getElementById('empStatus') ? document.getElementById('empStatus').value : 'Active'
        };
        if (eid) payload.employeeId = eid;

        try {
            const res = await fetch(this.EXEC_URL + '?method=saveEmployee', {
                method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload)
            });
            const d = await res.json();
            if (!d.success) throw new Error(d.error || 'Save failed');
            if (d.edited) alert(d.message);
            else alert('Employee added.\n\nID: ' + d.employeeId + '\nPIN: ' + d.pin + '\n\n(Note the PIN \u2014 it is auto-generated.)');
            $('#employeeModal').modal('hide');
            this.resetEmployeeForm();
            await this.loadAllData();
        } catch (err) { alert('Save failed: ' + err.message); }
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
