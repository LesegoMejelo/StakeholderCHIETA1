/* ADMIN DASHBOARD JS — Live metrics + User CRUD*/

/* SETTINGS MENU */
const settingsBtn = document.getElementById('settings-btn');
const settingsMenu = document.getElementById('settings-menu');
const closeMenu = () => { if (settingsMenu) { settingsMenu.hidden = true; settingsBtn?.setAttribute('aria-expanded', 'false'); } };
const openMenu = () => { if (settingsMenu) { settingsMenu.hidden = false; settingsBtn?.setAttribute('aria-expanded', 'true'); } };
settingsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = settingsBtn.getAttribute('aria-expanded') === 'true';
    expanded ? closeMenu() : openMenu();
});
document.addEventListener('click', (e) => {
    if (!settingsMenu || settingsMenu.hidden) return;
    if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) closeMenu();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

/* METRICS (LIVE) */
async function loadMetrics() {
    try {
        const res = await fetch('/admin/metrics', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const m = await res.json();

        // KPIs
        document.getElementById('kpi-users').textContent = (m.totalUsers ?? 0).toLocaleString();
        const activeAppts = (m.appointmentsUpcoming ?? 0) + (m.appointmentsToday ?? 0);
        document.getElementById('kpi-appointments').textContent = activeAppts.toLocaleString();
        document.getElementById('kpi-appointments-delta').textContent = `Today: ${m.appointmentsToday ?? 0}`;

        const inqOpen = (m.inquiriesOpen ?? 0);
        const inqOpenedThisMonth = (m.inquiriesOpenedThisMonth ?? 0);
        const inqResolvedThisMonth = (m.inquiriesResolvedThisMonth ?? 0);
        document.getElementById('kpi-inquiries').textContent = inqOpen.toLocaleString();

        const inqDelta = document.getElementById('kpi-inquiries-delta');
        inqDelta.classList.remove('up', 'down');
        if (inqResolvedThisMonth >= inqOpenedThisMonth) {
            inqDelta.classList.add('down');
            inqDelta.textContent = `${inqResolvedThisMonth} resolved`;
        } else {
            inqDelta.classList.add('up');
            inqDelta.textContent = `+${inqOpenedThisMonth} new`;
        }

        // Chart
        drawLineChartFromMetrics(m.labels || [], m.appointmentsByMonth || [], m.inquiriesByMonth || [], 5);
    } catch (err) {
        console.error('❌ Failed to load metrics', err);
    }
}

// Chart Drawer (Canvas, no libs)
function drawLineChartFromMetrics(labels, appts, inqs, range = 5) {
    const slice = Math.max(1, Math.min(range, labels.length || 1));
    labels = labels.slice(-slice);
    appts = appts.slice(-slice);
    inqs = inqs.slice(-slice);

    const cvs = document.getElementById('lineChart');
    if (!cvs) return;
    
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    const P = { l: 50, r: 20, t: 20, b: 36 };
    const W = cvs.width - P.l - P.r;
    const H = cvs.height - P.t - P.b;

    const maxY = Math.max(1, Math.max(...appts, ...inqs, 1) * 1.15);
    const stepX = W / (labels.length - 1 || 1);
    const yScale = v => P.t + H - (v / maxY) * H;

    ctx.fillStyle = "#fff"; 
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    ctx.strokeStyle = "#eceaf2"; 
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
        const y = P.t + (H / 5) * i;
        ctx.beginPath(); 
        ctx.moveTo(P.l, y); 
        ctx.lineTo(P.l + W, y); 
        ctx.stroke();
    }

    ctx.fillStyle = "#8b86a1"; 
    ctx.font = "12px system-ui";
    labels.forEach((lab, i) => {
        const x = P.l + stepX * i;
        ctx.textAlign = "center";
        ctx.fillText(lab, x, P.t + H + 20);
    });

    const series = [
        { color: "#6b5dd1", data: appts },
        { color: "#e3b341", data: inqs },
    ];

    series.forEach(s => {
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.5;
        s.data.forEach((v, i) => {
            const x = P.l + i * stepX, y = yScale(v);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        s.data.forEach((v, i) => {
            const x = P.l + i * stepX, y = yScale(v);
            ctx.beginPath(); 
            ctx.fillStyle = s.color; 
            ctx.arc(x, y, 3, 0, Math.PI * 2); 
            ctx.fill();
        });
    });
}

document.getElementById('rangeSelect')?.addEventListener('change', async (e) => {
    try {
        const res = await fetch('/admin/metrics', { credentials: 'include' });
        const m = await res.json();
        drawLineChartFromMetrics(m.labels || [], m.appointmentsByMonth || [], m.inquiriesByMonth || [], Number(e.target.value));
    } catch (err) {
        console.error('range change failed', err);
    }
});

/* USER LIST (CRUD) - FIXED VERSION */
let usersCache = [];
let currentPage = 1;
const pageSize = 6;
let searchQuery = "";
const $ = sel => document.querySelector(sel);

async function loadUsers() {
    try {
        const res = await fetch("/Auth/GetUsers", { 
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        usersCache = await res.json();
        console.log('Users loaded:', usersCache);
        currentPage = 1;
        renderUsers();
    } catch (err) {
        console.error("Failed to fetch users", err);
        alert("Failed to load users");
    }
}

function filteredUsers() {
    if (!searchQuery.trim()) return usersCache;
    const q = searchQuery.toLowerCase();
    return usersCache.filter(u =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q)
    );
}

function renderUsers() {
    const rows = filteredUsers();
    const start = (currentPage - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);

    const bodyHtml = pageRows.map(u => `
        <tr>
            <td>${escapeHtml(u.name || '')}</td>
            <td>${escapeHtml(u.email || '')}</td>
            <td>${escapeHtml(u.role || '')}</td>
            <td style="text-align:right;">
                <button class="btn-sm" data-action="edit" data-id="${u.id}">Edit</button>
                <button class="btn-sm delete" data-action="delete" data-id="${u.id}">Delete</button>
            </td>
        </tr>`).join("");
    
    $("#users-body").innerHTML = bodyHtml;

    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    
    const pagerButtons = [];
    for (let i = 1; i <= totalPages; i++) {
        pagerButtons.push(`<button class="page-btn" ${i === currentPage ? 'aria-current="page"' : ''} data-page="${i}">${i}</button>`);
    }
    $("#pager").innerHTML = pagerButtons.join("");
}

// FIXED: Event delegation for user actions
document.getElementById("users-body").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    
    if (action === "edit") {
        const user = usersCache.find(x => String(x.id) === String(id));
        if (user) {
            openModal(user);
        }
    } else if (action === "delete") {
        deleteUser(id);
    }
});

// FIXED: Pagination event listener
document.getElementById("pager").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn) return;
    currentPage = Number(btn.dataset.page);
    renderUsers();
});

document.getElementById("userSearch").addEventListener("input", (e) => {
    searchQuery = e.target.value || "";
    currentPage = 1;
    renderUsers();
});

// FIXED: Delete function
async function deleteUser(id) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    try {
        const res = await fetch(`/Auth/DeleteUser/${encodeURIComponent(id)}`, {
            method: "DELETE",
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        const data = await res.json().catch(() => ({}));
        
        if (res.ok) {
            alert(data.message || "User deleted successfully");
            await loadUsers(); // Reload the user list
        } else {
            alert(data.message || `Error: ${res.status}`);
        }
    } catch (err) {
        console.error("Error deleting user:", err);
        alert("Failed to delete user - network error");
    }
}

function escapeHtml(v) {
    if (v === null || v === undefined) return '';
    return String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* MODAL */
const modal = document.getElementById("userModal");
const userForm = document.getElementById("userForm");
const addBtn = document.getElementById("addUserBtn");
const closeBtn = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelModal");
const modalTitle = document.getElementById("modalTitle");

function showModal() {
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("open");
}

function hideModal() {
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("open");
}

function openModal(user) {
    if (user) {
        modalTitle.textContent = "Edit User";
        document.getElementById("userId").value = user.id ?? "";
        document.getElementById("Name").value = user.name ?? "";
        document.getElementById("email").value = user.email ?? "";
        document.getElementById("password").value = "";
        document.getElementById("Role").value = user.role ?? "Client";
    } else {
        modalTitle.textContent = "Add User";
        document.getElementById("userId").value = "";
        document.getElementById("Name").value = "";
        document.getElementById("email").value = "";
        document.getElementById("password").value = "";
        document.getElementById("Role").value = "Client";
    }
    showModal();
    document.getElementById("Name").focus();
}

addBtn.addEventListener("click", () => openModal(null));
closeBtn.addEventListener("click", hideModal);
cancelBtn.addEventListener("click", hideModal);
modal.addEventListener("click", (e) => { 
    if (e.target === modal) hideModal(); 
});

// FIXED: Form submission with better error handling
userForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById("userId").value;
    const payload = {
        Name: document.getElementById("Name").value.trim(),
        Email: document.getElementById("email").value.trim(),
        Password: document.getElementById("password").value,
        Role: document.getElementById("Role").value
    };
    
    // Only include ID if we're editing
    if (userId) {
        payload.Id = userId;
    }
    
    // Validation
    if (!payload.Name || !payload.Email) {
        alert("Please fill in name and email.");
        return;
    }
    
    // If creating new user, require password
    if (!userId && !payload.Password) {
        alert("Please enter a password for new user.");
        return;
    }
    
    try {
        const res = await fetch("/Auth/RegisterUser", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(payload)
        });
        
        const data = await res.json().catch(() => ({}));
        
        if (res.ok) {
            alert("✅ " + (data.message || "User saved successfully"));
            hideModal();
            await loadUsers(); // Reload the list
        } else {
            alert("❌ " + (data.message || `Error: ${res.status}`));
        }
    } catch (err) {
        console.error("Error saving user:", err);
        alert("❌ Failed to save user - network error");
    }
});

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
    loadMetrics();
    loadUsers();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N to add new user
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openModal(null);
        }
        
        // Escape to close modal if open
        if (e.key === 'Escape' && modal?.classList.contains('open')) {
            hideModal();
        }
    });
});