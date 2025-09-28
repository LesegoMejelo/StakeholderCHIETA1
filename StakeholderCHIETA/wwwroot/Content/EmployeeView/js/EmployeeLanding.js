document.addEventListener('DOMContentLoaded', () => {
    // ---- Demo data (replace with API) ----
    const demoAppointments = [
        { date: '2025-08-24T10:00:00', title: 'Skills roadmap', where: 'Boardroom A' },
        { date: '2025-08-26T14:00:00', title: 'Grant review', where: 'Online' },
        { date: '2025-08-29T09:30:00', title: 'Onboarding', where: 'Office 2' }
    ];
    async function getUsers() {
        const snapshot = await db.collection("users").get();
        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return users;
    }

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

/* ---------*/
document.addEventListener("DOMContentLoaded", async () => {
    const inquiriesList = document.getElementById("inquiries-list");

    // 🔑 Replace with actual user ID from your auth/session
    const userId = "@firebaseUid"; // or however you pass it to the view

    try {
        const response = await fetch(`/api/inquiry/user/${userId}`);
        const data = await response.json();

        // Clear loading placeholder
        inquiriesList.innerHTML = "";

        if (data.length === 0) {
            inquiriesList.innerHTML = `<li class="muted">No inquiries yet</li>`;
            return;
        }

        data.forEach(inquiry => {
            const li = document.createElement("li");
            li.textContent = `${inquiry.customId} — ${inquiry.inquiryType} (${inquiry.status})`;
            inquiriesList.appendChild(li);
        });

    /*} catch (error) {
        console.error("Error loading inquiries:", error);
        inquiriesList.innerHTML = `<li class="muted">Failed to load inquiries</li>`;
    }
});
*/
        import { getAuth } from "firebase/auth";

        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
            const uid = user.uid;

            const formData = new FormData();
            formData.append("name", "Lesego");
            formData.append("message", "Test message");
            formData.append("inquiryType", "General");
            formData.append("userId", uid);  // <-- pass UID here

            await fetch("/api/inquiry", {
                method: "POST",
                body: formData
            });
        }
        document.addEventListener("DOMContentLoaded", async () => {
            const inquiriesList = document.getElementById("inquiries-list");
            inquiriesList.innerHTML = "<li class='muted'>Loading…</li>";

            const auth = firebase.auth();
            const user = auth.currentUser;
            if (!user) {
                inquiriesList.innerHTML = "<li class='muted'>Not logged in</li>";
                return;
            }

            const uid = user.uid;

            try {
                const response = await fetch(`/api/inquiry/user/${uid}`);
                if (!response.ok) throw new Error("Failed to load inquiries");

                const data = await response.json();

                if (data.length === 0) {
                    inquiriesList.innerHTML = "<li class='muted'>No inquiries yet</li>";
                    return;
                }

                inquiriesList.innerHTML = "";
                data.forEach(inq => {
                    inquiriesList.innerHTML += `<li>${inq.customId} - ${inq.inquiryType} (${inq.status})</li>`;
                });
            } catch (err) {
                console.error(err);
                inquiriesList.innerHTML = "<li class='muted'>Error loading inquiries</li>";
            }
        });
