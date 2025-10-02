document.addEventListener('DOMContentLoaded', () => {
    console.log('=== Employee Landing Page Initialized ===');

    // ---- Load Upcoming Appointments ----
    async function loadUpcomingAppointments() {
        const list = document.getElementById("upcoming-list");
        if (!list) return;

        list.innerHTML = "<li class='muted'>Loading…</li>";

        try {
            console.log('Fetching upcoming appointments...');
            const res = await fetch('/AdvisorAppointment/AppointmentTrackerData', {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: "include"
            });

            console.log('Appointments response status:', res.status);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const appointments = await res.json();
            console.log('Received appointments:', appointments.length);

            // Filter for accepted appointments that are upcoming
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const upcomingAccepted = appointments
                .filter(apt => {
                    const status = (apt.Status || '').toLowerCase();
                    const appointmentDate = new Date(apt.Date);
                    return (status === 'accepted' || status === 'rescheduled') && appointmentDate >= now;
                })
                .sort((a, b) => new Date(a.Date) - new Date(b.Date))
                .slice(0, 5); // Show only 5 most recent

            console.log('Filtered upcoming accepted appointments:', upcomingAccepted.length);

            list.innerHTML = "";

            if (upcomingAccepted.length === 0) {
                list.innerHTML = "<li class='muted'>No upcoming appointments</li>";
                return;
            }

            upcomingAccepted.forEach(appt => {
                const li = document.createElement("li");
                const dateObj = new Date(appt.Date);
                const dateStr = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                const timeStr = formatTime(appt.Time);
                const clientName = appt.ClientName || 'Unknown';

                li.innerHTML = `
                    <span>${escapeHTML(dateStr)} • ${escapeHTML(timeStr)}</span>
                    <span>${escapeHTML(clientName)}</span>
                `;
                list.appendChild(li);
            });
        } catch (err) {
            console.error("Error loading appointments:", err);
            list.innerHTML = "<li class='muted'>Failed to load appointments</li>";
        }
    }

    // ---- Load Recent Inquiries ----
    async function loadRecentInquiries() {
        const list = document.getElementById("inquiries-list");
        if (!list) return;

        list.innerHTML = "<li class='muted'>Loading…</li>";

        try {
            console.log('Fetching recent inquiries...');
            const res = await fetch('/api/inquiry', {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: "include"
            });

            console.log('Inquiries response status:', res.status);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const inquiries = await res.json();
            console.log('Received inquiries:', inquiries.length);

            list.innerHTML = "";

            if (inquiries.length === 0) {
                list.innerHTML = "<li class='muted'>No recent inquiries</li>";
                return;
            }

            // Show only the 5 most recent
            inquiries.slice(0, 5).forEach(inquiry => {
                const li = document.createElement("li");
                const ref = inquiry.reference || 'N/A';
                const subject = inquiry.subject || 'No subject';
                const status = inquiry.status || 'Pending';

                li.innerHTML = `
                    <span>${escapeHTML(ref)}</span>
                    <span>${escapeHTML(subject)} <small class="status-${status.toLowerCase()}">(${escapeHTML(status)})</small></span>
                `;
                list.appendChild(li);
            });
        } catch (err) {
            console.error("Error loading inquiries:", err);
            list.innerHTML = "<li class='muted'>Failed to load inquiries</li>";
        }
    }

    // ---- Helper Functions ----
    function formatTime(timeString) {
        if (!timeString) return 'No time';
        const parts = timeString.split(':');
        if (parts.length < 2) return timeString;

        const hours = parseInt(parts[0]);
        const minutes = parts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    function escapeHTML(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }

    // ---- Load data when page is ready ----
    loadUpcomingAppointments();
    loadRecentInquiries();

    // Auto-refresh every 60 seconds
    setInterval(() => {
        console.log('Auto-refreshing dashboard data...');
        loadUpcomingAppointments();
        loadRecentInquiries();
    }, 60000);

    // ---- Buttons navigate ----
    document.querySelectorAll('.btn[data-nav]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const nav = btn.dataset.nav;
            if (nav) location.href = nav;
        });
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

    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const expanded = settingsBtn.getAttribute('aria-expanded') === 'true';
            expanded ? closeMenu() : openMenu();
        });
    }

    document.addEventListener('click', (e) => {
        if (!settingsMenu || settingsMenu.hidden) return;
        if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });
});