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
            // 🔥 FIXED: Added onclick="app.viewProfile('...')" to the eye button
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

    // 🔥 NEW: Actual View Profile function
    viewProfile(employeeId) {
        if (!employeeId) {
            console.warn("No Employee ID provided to viewProfile");
            return;
        }
        // Find the employee in the data
        const emp = this.employeesData.find(e => e['Employee ID'] === employeeId);
        
        if (emp) {
            // Instead of an alert, it logs to the console so you can build a real modal later
            console.log("Viewing profile for:", emp);
            alert(`Viewing Profile for:\n\nID: ${emp['Employee ID']}\nName: ${emp['Name (English)']}\nCivil ID: ${emp['Civil ID']}\nSalary: ${emp['Total Payable']}`);
        } else {
            alert(`Employee with ID ${employeeId} not found.`);
        }
    },

    // --- UI Actions (Changed to console.log so they don't spam pop-ups) ---
    showAddEmployeeModal() { console.log("Add Employee modal triggered"); },
    saveEmployee() { console.log("Save Employee triggered"); },
    showLeaveRequestModal() { console.log("Leave modal triggered"); },
    submitLeaveRequest() { console.log("Submit leave triggered"); },
    showReviewModal() { console.log("Review modal triggered"); },
    submitReview() { console.log("Submit review triggered"); },
    markAttendance() { console.log("Mark attendance triggered"); }
};
