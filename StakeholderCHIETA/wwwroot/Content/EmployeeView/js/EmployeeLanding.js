/*document.addEventListener('DOMContentLoaded', () => {
    // ---- Demo data (replace with API) ----
    const demoAppointments = [
        { date: '2025-08-24T10:00:00', title: 'Skills roadmap', where: 'Boardroom A' },
        { date: '2025-08-26T14:00:00', title: 'Grant review', where: 'Online' },
        { date: '2025-08-29T09:30:00', title: 'Onboarding', where: 'Office 2' }
    ];
    const demoInquiries = [
        { ref: 'INQ-1051', subject: 'Reporting template', createdAt: '2025-08-20' },
        { ref: 'INQ-1047', subject: 'Site visit schedule', createdAt: '2025-08-19' },
        { ref: 'INQ-1042', subject: 'Funding criteria', createdAt: '2025-08-18' }
    ];

    // ---- Helpers ----
    const fmtDate = iso => new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
    const fmtTime = iso => new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // ---- Render summaries ----
    const apptUL = document.getElementById('upcoming-list');
    if (apptUL) apptUL.innerHTML = demoAppointments.map(a => `
      <li><span>${fmtDate(a.date)} • ${fmtTime(a.date)}</span><span>${escapeHTML(a.title)}</span></li>
    `).join('');

    const inqUL = document.getElementById('inquiries-list');
    if (inqUL) inqUL.innerHTML = demoInquiries.map(i => `
      <li><span>${escapeHTML(i.ref)}</span><span>${escapeHTML(i.subject)}</span></li>
    `).join('');

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

}); */
document.addEventListener('DOMContentLoaded', () => {
    // ---- Helpers ----
    const fmtDate = iso => new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
    const fmtTime = iso => new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // ---- Load Appointments ----
    const apptUL = document.getElementById('upcoming-list');
    if (apptUL) {
        fetch("/api/appointment/upcoming") // 🔹 you’ll need an endpoint like this
            .then(res => res.json())
            .then(data => {
                apptUL.innerHTML = "";
                if (!data || data.length === 0) {
                    apptUL.innerHTML = "<li class='muted'>No upcoming appointments</li>";
                    return;
                }
                apptUL.innerHTML = data.map(a => `
                    <li>
                        <span>${fmtDate(a.date)} • ${fmtTime(a.date)}</span>
                        <span>${escapeHTML(a.title)}</span>
                    </li>
                `).join('');
            })
            .catch(err => {
                console.error("Error loading appointments:", err);
                apptUL.innerHTML = "<li class='muted'>Error loading appointments</li>";
            });
    }

    // ---- Load Inquiries ----
    const inqUL = document.getElementById('inquiries-list');
    if (inqUL) {
        fetch("/api/inquiry/recent")
            .then(res => {
                if (!res.ok) throw new Error("Failed to load inquiries: " + res.status);
                return res.json();
            })
            .then(data => {
                if (!data || data.length === 0) {
                    inqUL.innerHTML = `<li class="muted">No recent inquiries</li>`;
                } else {
                    inqUL.innerHTML = data.map(i => `
                    <li>
                        <span>${i.customId}</span>
                        <span>${i.inquiryType} - ${i.status}</span>
                    </li>
                `).join('');
                }
            })
            .catch(err => {
                console.error(err);
                inqUL.innerHTML = `<li class="muted">Error loading inquiries</li>`;
            });
    }


    // ---- Buttons navigate ----
    document.querySelectorAll('.btn[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => location.href = btn.dataset.nav);
    });

    // ---- Settings dropdown ----
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
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
