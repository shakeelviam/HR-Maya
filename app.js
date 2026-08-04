// ============================================================
// app.js - UI LOGIC AND RENDERING
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
        
        // Show loading state
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

        // Generate rows based on your exact data structure
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

        // Init/Refresh DataTables
        if ($.fn.dataTable) {
            if (this.employeesTable) {
                this.employeesTable.destroy();
            }
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
        // Leave placeholders for data not yet fetched via the Dashboard API
        document.getElementById('pendingLeaves').innerText = '0';
        document.getElementById('avgRating').innerText = '0.0';
    },

    // 5. Sidebar Navigation Handler
    setupSidebarNavigation() {
        document.querySelectorAll('#sidebar .nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                // Toggle active class on sidebar
                document.querySelectorAll('#sidebar .nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                // Show the correct page section
                const pageId = this.dataset.page;
                document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
                const targetSection = document.getElementById(`page-${pageId}`);
                if(targetSection) targetSection.classList.add('active');
                
                // Update title
                document.getElementById('pageTitle').innerText = 
                    pageId.charAt(0).toUpperCase() + pageId.slice(1);
            });
        });
    },

    // 6. View Profile - Opens dedicated profile page
    viewProfile(employeeId) {
        if (!employeeId) {
            console.warn("No Employee ID provided to viewProfile");
            return;
        }
        // Find the employee in the data
        const emp = this.employeesData.find(e => e['Employee ID'] === employeeId);
        
        if (emp) {
            console.log("Viewing profile for:", emp);

            // 1. Switch Sidebar to Profile section
            document.querySelectorAll('#sidebar .nav-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
            document.getElementById('page-profile').classList.add('active');
            document.getElementById('pageTitle').innerText = 'Employee Profile';

            // 2. Generate HTML for the profile
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
                                    <div class="profile-info-item"><span class="profile-info-label">Salary</span><span class="profile-info-value">${emp['Total Payable'] || 0}</span></div>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-success"><i class="bi bi-calendar-check"></i> Leave & Vacation</h6>
                                    <div class="profile-info-item"><span class="profile-info-label">Vacation Taken</span><span class="profile-info-value text-danger">${emp['Vacation Taken'] || 0} days</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Remaining Vacation</span><span class="profile-info-value text-success fw-bold">${emp['Remaining Vacation'] || 0} days</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Sick Days Taken</span><span class="profile-info-value text-warning">${emp['Sick Days Taken'] || 0} days</span></div>
                                    <div class="profile-info-item"><span class="profile-info-label">Remarks</span><span class="profile-info-value text-muted">${emp['Vacation Remarks'] || 'None'}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 3. Inject it into the profile page
            document.getElementById('profileContent').innerHTML = profileHTML;

        } else {
            alert(`Employee with ID ${employeeId} not found.`);
        }
    },

    // --- MODALS & ACTIONS (RESTORED TO WORKING STATE) ---
    
    // Add Employee Modal
    showAddEmployeeModal() { 
        $('#employeeModal').modal('show'); 
    },
    saveEmployee() { 
        console.log("Save Employee triggered");
        // You can add the actual save logic here later
    },

    // Leave Request Modal
    showLeaveRequestModal() { 
        $('#leaveModal').modal('show'); 
    },
    submitLeaveRequest() { 
        console.log("Submit leave triggered"); 
        // You can add the actual submit logic here later
    },

    // Performance Review Modal
    showReviewModal() { 
        $('#reviewModal').modal('show'); 
    },
    submitReview() { 
        console.log("Submit review triggered"); 
        // You can add the actual submit logic here later
    },

    // Mark Attendance Action
    markAttendance() { 
        const dateInput = document.getElementById('attendanceDate');
        if (!dateInput || !dateInput.value) {
            alert("Please select a date first.");
            return;
        }
        console.log(`Marking attendance for date: ${dateInput.value}`);
        // You can add the actual API call here later
    }
};
