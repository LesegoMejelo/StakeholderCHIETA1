/* ------------------ Demo Data ------------------ */

// Users (initial seed)
let users = [
    { id: 1, name: "Sipho Dlamini", email: "sipho@example.com", role: "User", status: "Active" },
    { id: 2, name: "Renee McKelvey", email: "renee@company.com", role: "Admin", status: "Active" },
    { id: 3, name: "Elianora Vasilov", email: "elianora@company.com", role: "Moderator", status: "Suspended" },
    { id: 4, name: "Alvis Daen", email: "alvis@company.com", role: "User", status: "Active" },
    { id: 5, name: "Lissa Shipsey", email: "lissa@company.com", role: "User", status: "Active" },
    { id: 6, name: "Jerry Mattedi", email: "jerry@company.com", role: "User", status: "Active" },
];

// Engagement time-series (months aligned)
const months12 = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];
const appointments12 = [80, 120, 95, 140, 110, 130, 160, 150, 170, 180, 175, 190];
const inquiries12 = [60, 70, 90, 85, 95, 110, 120, 115, 130, 140, 135, 150];

// pagination + search state
let currentPage = 1;
const pageSize = 6;
let searchQuery = "";

/* ------------------ DOM Helpers ------------------ */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

/* ------------------ KPIs ------------------ */
function updateKPIs() {
    // Total users
    const totalUsers = users.length;
    $("#kpi-users").textContent = totalUsers.toLocaleString();
    // crude "growth": compare current to previous (fake)
    const lastMonthUsers = Math.max(0, totalUsers - 18);
    const growthRate = lastMonthUsers ? ((totalUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0;
    $("#kpi-growth").textContent = `${growthRate.toFixed(1)}%`;
    $("#kpi-users-delta").textContent = `+${Math.max(0, totalUsers - lastMonthUsers)} this month`;

    // Active appointments = latest month appointments
    const latestAppts = appointments12[appointments12.length - 1];
    $("#kpi-appointments").textContent = latestAppts.toLocaleString();
    $("#kpi-appointments-delta").textContent = `+${Math.max(0, latestAppts - appointments12[appointments12.length - 2])} vs prev`;

    // Open inquiries = latest month inquiries; delta negative means resolved
    const latestInq = inquiries12[inquiries12.length - 1];
    const diffInq = latestInq - inquiries12[inquiries12.length - 2];
    $("#kpi-inquiries").textContent = latestInq.toLocaleString();
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
    const series = [
        { color: "#6b5dd1", name: "Appointments", data: appointments12.slice(-range) },
        { color: "#e3b341", name: "Inquiries", data: inquiries12.slice(-range) },
    ];

    const cvs = $("#lineChart");
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

    // body
    $("#users-body").innerHTML = pageRows.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td>${u.status}</td>
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
    $("#pager").innerHTML = pagerButtons.join("");

    updateKPIs();
}

/* Events: table actions, pager, search */
$("#users-body").addEventListener("click", (e) => {
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

$("#pager").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-page]");
    if (!b) return;
    currentPage = Number(b.dataset.page);
    renderUsers();
});

$("#userSearch").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    currentPage = 1;
    renderUsers();
});

/* ------------------ Modal (Add/Edit) ------------------ */
const modal = $("#userModal");
const form = $("#userForm");
const modalTitle = $("#modalTitle");

function openModal(user) {
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
    $("#name").focus();
}
function closeModal() {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
}

$("#addUserBtn").addEventListener("click", () => openModal(null));
$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

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
        alert("Please fill in name and email."); return;
    }
    const existingIdx = users.findIndex(u => u.id === payload.id);
    if (existingIdx >= 0) users[existingIdx] = payload; else users.unshift(payload);
    closeModal();
    renderUsers();
});

/* ------------------ Range Picker (chart) ------------------ */
$("#rangeSelect").addEventListener("change", (e) => {
    const range = Number(e.target.value);
    drawLineChart(range);
});

// ---- Settings dropdown ----
const settingsBtn = document.getElementById('settings-btn');
const settingsMenu = document.getElementById('settings-menu');
const prefDark = document.getElementById('pref-dark');
const DARK_KEY = 'prefers-dark';

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


/* ------------------ Init ------------------ */
drawLineChart(5);
renderUsers();
updateKPIs();