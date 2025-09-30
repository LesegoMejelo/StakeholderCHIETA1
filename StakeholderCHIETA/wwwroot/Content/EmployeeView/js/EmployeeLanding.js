/*document.addEventListener('DOMContentLoaded', () => {
    // ---- Demo data (replace with API) ----
    async function loadRecentInquiries() {
        const list = document.getElementById("inquiries-list");
        list.innerHTML = "<li class='muted'>Loading…</li>";

        try {
            // Fetch recent inquiries for the advisor
            const res = await fetch("/api/inquiry/recent", {
                method: "GET",
                headers: { "Accept": "application/json" }
            });

            if (!res.ok) throw new Error("Failed to load inquiries");

            const inquiries = await res.json();

            list.innerHTML = "";

            if (inquiries.length === 0) {
                list.innerHTML = "<li class='muted'>No recent inquiries</li>";
                return;
            }

            inquiries.forEach(q => {
                const li = document.createElement("li");
                li.textContent = `${q.customId} – ${q.name} (${q.inquiryType}) [${q.status}]`;
                list.appendChild(li);
            });

        } catch (err) {
            console.error("Error loading inquiries:", err);
            list.innerHTML = "<li class='muted'>Failed to load inquiries</li>";
        }
    }

    // Load when the page is ready
    document.addEventListener("DOMContentLoaded", loadRecentInquiries);


    // ---- Helpers ----
    const fmtDate = iso => new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
    const fmtTime = iso => new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // ---- Render summaries ----
 /*   const apptUL = document.getElementById('upcoming-list');
    if (apptUL) apptUL.innerHTML = demoAppointments.map(a => `
      <li><span>${fmtDate(a.date)} • ${fmtTime(a.date)}</span><span>${escapeHTML(a.title)}</span></li>
    `).join('');

    const inqUL = document.getElementById('inquiries-list');
    if (inqUL) inqUL.innerHTML = demoInquiries.map(i => `
      <li><span>${escapeHTML(i.ref)}</span><span>${escapeHTML(i.subject)}</span></li>
    `).join('');
    */
   /*
    // ---- Buttons navigate ----
    document.querySelectorAll('.btn[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => location.href = btn.dataset.nav);
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

});
*/
document.addEventListener('DOMContentLoaded', () => {
    // ---- Load Recent Inquiries from API ----
    async function loadRecentInquiries() {
        const list = document.getElementById("inquiries-list");
        list.innerHTML = "<li class='muted'>Loading…</li>";

        try {
            // Get advisor ID from window object (set in view)
            const advisorId = window.currentUser?.advisorId;

            if (!advisorId) {
                list.innerHTML = "<li class='muted'>Unable to load inquiries</li>";
                console.error("Advisor ID not found");
                return;
            }

            const res = await fetch(`/api/inquiry/advisor/${advisorId}`, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                credentials: "include"
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const inquiries = await res.json();

            list.innerHTML = "";

            if (inquiries.length === 0) {
                list.innerHTML = "<li class='muted'>No recent inquiries</li>";
                return;
            }

            // Show only the 5 most recent
            inquiries.slice(0, 5).forEach(inquiry => {
                const li = document.createElement("li");

                // If using the improved controller format
                if (inquiry.referenceNumber) {
                    li.innerHTML = `<span>${escapeHTML(inquiry.referenceNumber)}</span><span>${escapeHTML(inquiry.subject)}</span>`;
                }
                // If using the original controller format
                else {
                    const data = inquiry.data;
                    const refNum = generateReferenceNumber(inquiry.id);
                    li.innerHTML = `<span>${escapeHTML(refNum)}</span><span>${escapeHTML(data.subject || 'N/A')}</span>`;
                }

                list.appendChild(li);
            });
        } catch (err) {
            console.error("Error loading inquiries:", err);
            list.innerHTML = "<li class='muted'>Failed to load inquiries</li>";
        }
    }

    // Helper to generate reference number (matches your C# logic)
    function generateReferenceNumber(docId) {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const datePart = `${year}${month}${day}`;
        const shortId = docId.substring(Math.max(0, docId.length - 4)).toUpperCase();
        return `INQ-${datePart}-${shortId}`;
    }

    // ---- Load Upcoming Appointments (you'll need this too) ----
    async function loadUpcomingAppointments() {
        const list = document.getElementById("upcoming-list");
        list.innerHTML = "<li class='muted'>Loading…</li>";

        try {
            const advisorId = window.currentUser?.advisorId;

            if (!advisorId) {
                list.innerHTML = "<li class='muted'>Unable to load appointments</li>";
                return;
            }

            // Replace with your actual appointment endpoint
            const res = await fetch(`/api/appointment/advisor/${advisorId}`, {
                method: "GET",
                headers: { "Accept": "application/json" },
                credentials: "include"
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const appointments = await res.json();

            list.innerHTML = "";

            if (appointments.length === 0) {
                list.innerHTML = "<li class='muted'>No upcoming appointments</li>";
                return;
            }

            // Show only the 5 most recent/upcoming
            appointments.slice(0, 5).forEach(appt => {
                const li = document.createElement("li");
                const dateStr = fmtDate(appt.date);
                const timeStr = fmtTime(appt.date);
                li.innerHTML = `<span>${dateStr} • ${timeStr}</span><span>${escapeHTML(appt.title)}</span>`;
                list.appendChild(li);
            });
        } catch (err) {
            console.error("Error loading appointments:", err);
            list.innerHTML = "<li class='muted'>Failed to load appointments</li>";
        }
    }

    // Temporary test function
    async function testInquiries() {
        try {
            const res = await fetch('/api/inquiry/test-advisor', {
                method: "GET",
                headers: { "Accept": "application/json" },
                credentials: "include"
            });
            const data = await res.json();
            console.log("Test data:", data);
        } catch (err) {
            console.error("Test failed:", err);
        }
    }

    // Call it
    testInquiries();
    //---------
    // Load data when page is ready
    loadRecentInquiries();
    loadUpcomingAppointments();

    // ---- Helpers ----
    const fmtDate = iso => new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(new Date(iso));

    const fmtTime = iso => new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(iso));

    const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));

    // ---- Buttons navigate ----
    document.querySelectorAll('.btn[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => location.href = btn.dataset.nav);
    });

    // ---- Settings dropdown ----
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const closeMenu = () => {
        if (settingsMenu) {
            settingsMenu.hidden = true;
            settingsBtn?.setAttribute('aria-expanded', 'false');
        }
    };
    const openMenu = () => {
        if (settingsMenu) {
            settingsMenu.hidden = false;
            settingsBtn?.setAttribute('aria-expanded', 'true');
        }
    };

    settingsBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const expanded = settingsBtn.getAttribute('aria-expanded') === 'true';
        expanded ? closeMenu() : openMenu();
    });

    document.addEventListener('click', (e) => {
        if (!settingsMenu || settingsMenu.hidden) return;
        if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) closeMenu();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });
});