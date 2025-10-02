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
                    "X-Requested-With": "XMLHttpRequest"
                },
                credentials: "include"
            });

            console.log('Inquiries response status:', res.status);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const inquiries = await res.json();
            console.log('Received inquiries:', Array.isArray(inquiries) ? inquiries.length : '(not an array)');

            // Sort newest first using 'date' if present; otherwise leave order
            const sorted = (Array.isArray(inquiries) ? inquiries : [])
                .slice()
                .sort((a, b) => {
                    const ad = a.date ? new Date(a.date) : new Date(0);
                    const bd = b.date ? new Date(b.date) : new Date(0);
                    return bd - ad; // desc
                })
                .slice(0, 5); // Show only 5 most recent

            list.innerHTML = "";

            if (sorted.length === 0) {
                list.innerHTML = "<li class='muted'>No recent inquiries</li>";
                return;
            }

            sorted.forEach(inq => {
                const ref = inq.reference || inq.referenceNumber || generateReferenceNumber(inq.id || '');
                const subj = inq.subject || 'No Subject';

                const li = document.createElement("li");
                li.innerHTML = `
        <span>${escapeHTML(ref)}</span>
        <span>${escapeHTML(subj)}</span>
      `;
                list.appendChild(li);
            });
        } catch (err) {
            console.error("Error loading inquiries:", err);
            list.innerHTML = "<li class='muted'>Failed to load inquiries</li>";
        }
    }

    // Fallback (matches your existing logic) in case API doesn’t provide a reference number
    function generateReferenceNumber(docId) {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const shortId = (docId || '').slice(-4).toUpperCase();
        return `INQ-${yy}${mm}${dd}-${shortId}`;
    }

    // simple HTML escaper (reuse your existing if you already have one)
    function escapeHTML(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
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