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
                    <td><button class="btn btn-sm btn-outline-primary"><i class="bi bi-eye"></i></button></td>
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

    // --- Placeholders for UI Actions (to prevent console errors) ---
    showAddEmployeeModal() { alert("Add Employee modal coming soon"); },
    saveEmployee() { alert("Save feature coming soon"); },
    showLeaveRequestModal() { alert("Leave modal coming soon"); },
    submitLeaveRequest() { alert("Submit leave coming soon"); },
    showReviewModal() { alert("Review modal coming soon"); },
    submitReview() { alert("Submit review coming soon"); },
    markAttendance() { alert("Mark attendance coming soon"); }
};
