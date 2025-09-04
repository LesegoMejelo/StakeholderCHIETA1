document.addEventListener('DOMContentLoaded', () => {
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

});