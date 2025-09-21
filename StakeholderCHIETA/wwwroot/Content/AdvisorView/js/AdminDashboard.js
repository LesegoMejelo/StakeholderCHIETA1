/* ------------------ Real Data from Firestore API ------------------ */

// Data containers (will be populated from API)
let users = [];
let inquiries = [];
let appointments = []; // You'll need to implement this endpoint
const months12 = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];

// pagination + search state
let currentPage = 1;
const pageSize = 6;
let searchQuery = "";

/* ------------------ DOM Helpers ------------------ */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

/* ------------------ API Calls ------------------ */
async function fetchInquiries() {
    try {
        console.log('Fetching inquiries from API...');
        const response = await fetch('/api/inquiry/all');
        if (response.ok) {
            const data = await response.json();
            console.log(`Fetched ${data.length} inquiries`);
            return data;
        } else {
            console.error('Failed to fetch inquiries:', response.status);
            return [];
        }
    } catch (error) {
        console.error('Error fetching inquiries:', error);
        return [];
    }
}

async function fetchUsers() {
    try {
        console.log('User management endpoint not implemented yet, using demo data...');
        // Return demo data since user endpoint doesn't exist yet
        return [
            { id: 1, name: "Sipho Dlamini", email: "sipho@example.com", role: "User", status: "Active" },
            { id: 2, name: "Renee McKelvey", email: "renee@company.com", role: "Admin", status: "Active" },
            { id: 3, name: "Elianora Vasilov", email: "elianora@company.com", role: "Moderator", status: "Suspended" },
            { id: 4, name: "Alvis Daen", email: "alvis@company.com", role: "User", status: "Active" },
            { id: 5, name: "Lissa Shipsey", email: "lissa@company.com", role: "User", status: "Active" },
            { id: 6, name: "Jerry Mattedi", email: "jerry@company.com", role: "User", status: "Active" },
        ];
    } catch (error) {
        console.error('Error with users:', error);
        return [];
    }
}

async function fetchAppointments() {
    try {
        console.log('Appointments endpoint not implemented yet, using demo data...');
        // Return demo data since appointment endpoints don't exist
        return Array.from({ length: 12 }, (_, i) => ({
            month: months12[i],
            count: 80 + Math.random() * 100
        }));
    } catch (error) {
        console.error('Error with appointments:', error);
        return [];
    }
}

/* ------------------ Data Processing ------------------ */
function processInquiriesForChart(inquiriesData) {
    // Group inquiries by month
    const monthlyData = new Array(12).fill(0);

    inquiriesData.forEach(inquiry => {
        const date = new Date(inquiry.createdAt);
        const monthIndex = date.getMonth();
        // Adjust for your 12-month window starting from June
        const adjustedIndex = (monthIndex + 6) % 12;
        monthlyData[adjustedIndex]++;
    });

    return monthlyData;
}

function processAppointmentsForChart(appointmentsData) {
    // If you have real appointment data, process it similar to inquiries
    // For now, return processed data or fallback
    if (appointmentsData.length === 12 && appointmentsData[0].count !== undefined) {
        return appointmentsData.map(a => a.count);
    }

    // Fallback demo pattern
    return [80, 120, 95, 140, 110, 130, 160, 150, 170, 180, 175, 190];
}

/* ------------------ KPIs ------------------ */
function updateKPIs() {
    // Total users
    const totalUsers = users.length;
    $("#kpi-users").textContent = totalUsers.toLocaleString();

    // Calculate growth (compare to previous month if you have historical data)
    const lastMonthUsers = Math.max(0, totalUsers - 18); // Placeholder calculation
    const growthRate = lastMonthUsers ? ((totalUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0;
    $("#kpi-growth").textContent = `${growthRate.toFixed(1)}%`;
    $("#kpi-users-delta").textContent = `+${Math.max(0, totalUsers - lastMonthUsers)} this month`;

    // Active appointments from processed data
    const appointmentsData = processAppointmentsForChart(appointments);
    const latestAppts = appointmentsData[appointmentsData.length - 1];
    $("#kpi-appointments").textContent = Math.round(latestAppts).toLocaleString();
    const prevAppts = appointmentsData[appointmentsData.length - 2];
    $("#kpi-appointments-delta").textContent = `+${Math.max(0, Math.round(latestAppts - prevAppts))} vs prev`;

    // Open inquiries from real data
    const pendingInquiries = inquiries.filter(i => i.status === "Pending").length;
    const totalInquiries = inquiries.length;
    $("#kpi-inquiries").textContent = pendingInquiries.toLocaleString();

    // Calculate inquiry delta (you might want to track this over time)
    const inquiriesData = processInquiriesForChart(inquiries);
    const latestInq = inquiriesData[inquiriesData.length - 1];
    const prevInq = inquiriesData[inquiriesData.length - 2];
    const diffInq = latestInq - prevInq;
    const inquiriesDelta = diffInq >= 0 ? `+${diffInq} new` : `${Math.abs(diffInq)} resolved`;
    const deltaClass = diffInq >= 0 ? "up" : "down";
    const node = $("#kpi-inquiries-delta");
    node.classList.remove("up", "down");
    node.classList.add(deltaClass);
    node.textContent = inquiriesDelta;
}

/* ------------------ Chart (no libraries) ------------------ */
function drawLineChart(range = 5) {
    const labels = months12.slice(-range);
    const inquiriesData = processInquiriesForChart(inquiries);
    const appointmentsData = processAppointmentsForChart(appointments);

    const series = [
        { color: "#6b5dd1", name: "Appointments", data: appointmentsData.slice(-range) },
        { color: "#e3b341", name: "Inquiries", data: inquiriesData.slice(-range) },
    ];

    const cvs = $("#lineChart");
    if (!cvs) return;

    const ctx = cvs.getContext("2d");

    // clear
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    // area
    const P = { l: 50, r: 20, t: 20, b: 36 };
    const W = cvs.width - P.l - P.r;
    const H = cvs.height - P.t - P.b;

    // scales
    const allValues = series.flatMap(s => s.data);
    const maxY = Math.max(...allValues) * 1.15;
    const stepX = W / (labels.length - 1);

    // bg
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // grid
    ctx.strokeStyle = "#eceaf2"; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = P.t + (H / 5) * i;
        ctx.beginPath(); ctx.moveTo(P.l, y); ctx.lineTo(P.l + W, y); ctx.stroke();
    }

    // labels (x)
    ctx.fillStyle = "#8b86a1";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    labels.forEach((lab, i) => {
        const x = P.l + stepX * i;
        ctx.textAlign = "center";
        ctx.fillText(lab, x, P.t + H + 20);
    });

    const yScale = v => P.t + H - (v / maxY) * H;

    // lines + points
    series.forEach(s => {
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = s.color;
        s.data.forEach((v, i) => {
            const x = P.l + i * stepX;
            const y = yScale(v);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        s.data.forEach((v, i) => {
            const x = P.l + i * stepX;
            const y = yScale(v);
            ctx.fillStyle = s.color;
            ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        });
    });
}

/* ------------------ Users Table + CRUD ------------------ */
function getFilteredUsers() {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.status.toLowerCase().includes(q)
    );
}

function renderUsers() {
    const rows = getFilteredUsers();
    const start = (currentPage - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);

    const usersBody = $("#users-body");
    if (!usersBody) return;

    // body
    usersBody.innerHTML = pageRows.map(u => `
    <tr>
      <td>${u.name || 'N/A'}</td>
      <td>${u.email || 'N/A'}</td>
      <td>${u.role || 'User'}</td>
      <td>${u.status || 'Active'}</td>
      <td>
        <button class="btn-sm edit" data-action="edit" data-id="${u.id}">Edit</button>
        <button class="btn-sm delete" data-action="delete" data-id="${u.id}">Delete</button>
      </td>
    </tr>
  `).join("");

    // pager
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const pagerButtons = [];
    for (let i = 1; i <= totalPages; i++) {
        pagerButtons.push(`<button class="page-btn" ${i === currentPage ? 'aria-current="page"' : ""} data-page="${i}">${i}</button>`);
    }
    const pager = $("#pager");
    if (pager) {
        pager.innerHTML = pagerButtons.join("");
    }

    updateKPIs();
}

/* ------------------ Event Listeners ------------------ */
function setupEventListeners() {
    // Table actions
    const usersBody = $("#users-body");
    if (usersBody) {
        usersBody.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;
            const id = Number(btn.dataset.id);
            if (btn.dataset.action === "edit") {
                openModal(users.find(u => u.id === id));
            } else if (btn.dataset.action === "delete") {
                const u = users.find(x => x.id === id);
                if (confirm(`Delete user "${u.name}"?`)) {
                    users = users.filter(x => x.id !== id);
                    renderUsers();
                }
            }
        });
    }

    // Pager
    const pager = $("#pager");
    if (pager) {
        pager.addEventListener("click", (e) => {
            const b = e.target.closest("button[data-page]");
            if (!b) return;
            currentPage = Number(b.dataset.page);
            renderUsers();
        });
    }

    // Search
    const userSearch = $("#userSearch");
    if (userSearch) {
        userSearch.addEventListener("input", (e) => {
            searchQuery = e.target.value;
            currentPage = 1;
            renderUsers();
        });
    }

    // Range picker for chart
    const rangeSelect = $("#rangeSelect");
    if (rangeSelect) {
        rangeSelect.addEventListener("change", (e) => {
            const range = Number(e.target.value);
            drawLineChart(range);
        });
    }
}

/* ------------------ Modal (Add/Edit) ------------------ */
const modal = $("#userModal");
const form = $("#userForm");
const modalTitle = $("#modalTitle");

function openModal(user) {
    if (!modal) return;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    if (user) {
        modalTitle.textContent = "Edit User";
        $("#userId").value = user.id;
        $("#name").value = user.name;
        $("#email").value = user.email;
        $("#role").value = user.role;
        $("#status").value = user.status;
    } else {
        modalTitle.textContent = "Add User";
        $("#userId").value = "";
        $("#name").value = "";
        $("#email").value = "";
        $("#role").value = "User";
        $("#status").value = "Active";
    }
    const nameField = $("#name");
    if (nameField) nameField.focus();
}

function closeModal() {
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
}

function setupModalListeners() {
    const addUserBtn = $("#addUserBtn");
    const closeModalBtn = $("#closeModal");
    const cancelModalBtn = $("#cancelModal");

    if (addUserBtn) addUserBtn.addEventListener("click", () => openModal(null));
    if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeModal);

    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });
    }

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const payload = {
                id: $("#userId").value ? Number($("#userId").value) : Date.now(),
                name: $("#name").value.trim(),
                email: $("#email").value.trim(),
                role: $("#role").value,
                status: $("#status").value
            };
            if (!payload.name || !payload.email) {
                alert("Please fill in name and email.");
                return;
            }
            const existingIdx = users.findIndex(u => u.id === payload.id);
            if (existingIdx >= 0) {
                users[existingIdx] = payload;
            } else {
                users.unshift(payload);
            }
            closeModal();
            renderUsers();
        });
    }
}

/* ------------------ Settings Dropdown ------------------ */
function setupSettings() {
    const settingsBtn = $("#settings-btn");
    const settingsMenu = $("#settings-menu");
    const prefDark = $("#pref-dark");
    const DARK_KEY = 'prefers-dark';

    if (!settingsBtn || !settingsMenu) return;

    const closeMenu = () => {
        settingsMenu.hidden = true;
        settingsBtn.setAttribute('aria-expanded', 'false');
    };
    const openMenu = () => {
        settingsMenu.hidden = false;
        settingsBtn.setAttribute('aria-expanded', 'true');
    };

    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const expanded = settingsBtn.getAttribute('aria-expanded') === 'true';
        expanded ? closeMenu() : openMenu();
    });

    document.addEventListener('click', (e) => {
        if (settingsMenu.hidden) return;
        if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) closeMenu();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });
}

/* ------------------ Loading State ------------------ */
function showLoading() {
    // You can add loading indicators here
    console.log('Loading dashboard data...');
}

function hideLoading() {
    // Hide loading indicators here
    console.log('Dashboard data loaded');
}

/* ------------------ Main Initialization ------------------ */
async function initDashboard() {
    try {
        showLoading();

        console.log('Initializing dashboard with real Firestore data...');

        // Fetch all data in parallel
        const [inquiriesData, usersData, appointmentsData] = await Promise.all([
            fetchInquiries(),
            fetchUsers(),
            fetchAppointments()
        ]);

        // Remove duplicates from inquiries (by document ID)
        inquiries = inquiriesData.reduce((acc, inquiry) => {
            if (!acc.find(existing => existing.id === inquiry.id)) {
                acc.push(inquiry);
            }
            return acc;
        }, []);

        users = usersData;
        appointments = appointmentsData;

        console.log(`Dashboard loaded: ${inquiries.length} inquiries, ${users.length} users`);

        // Setup all event listeners
        setupEventListeners();
        setupModalListeners();
        setupSettings();

        // Initial render
        drawLineChart(5);
        renderUsers();
        updateKPIs();

        hideLoading();

    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        hideLoading();

        // Fallback to demo data if API fails
        console.log('Falling back to demo data...');
        initWithDemoData();
    }
}

/* ------------------ Demo Data Fallback ------------------ */
function initWithDemoData() {
    // Only use this if API calls fail
    users = [
        { id: 1, name: "Sipho Dlamini", email: "sipho@example.com", role: "User", status: "Active" },
        { id: 2, name: "Renee McKelvey", email: "renee@company.com", role: "Admin", status: "Active" },
        { id: 3, name: "Elianora Vasilov", email: "elianora@company.com", role: "Moderator", status: "Suspended" },
        { id: 4, name: "Alvis Daen", email: "alvis@company.com", role: "User", status: "Active" },
        { id: 5, name: "Lissa Shipsey", email: "lissa@company.com", role: "User", status: "Active" },
        { id: 6, name: "Jerry Mattedi", email: "jerry@company.com", role: "User", status: "Active" },
    ];

    inquiries = [];
    appointments = Array.from({ length: 12 }, (_, i) => ({
        month: months12[i],
        count: 80 + Math.random() * 100
    }));

    setupEventListeners();
    setupModalListeners();
    setupSettings();
    drawLineChart(5);
    renderUsers();
    updateKPIs();
}

/* ------------------ Auto-refresh (optional) ------------------ */
function setupAutoRefresh() {
    // Refresh data every 5 minutes
    setInterval(async () => {
        console.log('Auto-refreshing dashboard data...');
        const newInquiries = await fetchInquiries();
        if (newInquiries.length !== inquiries.length) {
            inquiries = newInquiries.reduce((acc, inquiry) => {
                if (!acc.find(existing => existing.id === inquiry.id)) {
                    acc.push(inquiry);
                }
                return acc;
            }, []);
            updateKPIs();
            drawLineChart(5);
        }
    }, 5 * 60 * 1000); // 5 minutes
}

/* ------------------ Start the Application ------------------ */
// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// Optional: Enable auto-refresh
// setupAutoRefresh();