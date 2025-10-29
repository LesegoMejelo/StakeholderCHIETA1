document.addEventListener('DOMContentLoaded', () => {
    console.log('=== Stakeholder Landing Page Initialized ===');

    // ---- Load Stakeholder's Upcoming Appointments ----
    async function loadUpcomingAppointments() {
        const list = document.getElementById("upcoming-list");
        if (!list) return;

        list.innerHTML = "<li class='muted'>Loading…</li>";

        try {
            console.log('Fetching stakeholder appointments...');

            // Fetch stakeholder's own appointments
            const res = await fetch('/api/appointment/my-appointments', {
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

            // Filter for accepted appointments that are upcoming and belong to this stakeholder
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const upcomingAccepted = appointments
                .filter(apt => {
                    const status = (apt.Status || '').toLowerCase().trim();
                    const appointmentDate = new Date(apt.Date);
                    appointmentDate.setHours(0, 0, 0, 0);
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
                const advisorName = appt.AdvisorName || 'Advisor';

                li.innerHTML = `
                    <span>${escapeHTML(dateStr)} • ${escapeHTML(timeStr)}</span>
                    <span>with ${escapeHTML(advisorName)}</span>
                `;
                list.appendChild(li);
            });
        } catch (err) {
            console.error("Error loading appointments:", err);
            list.innerHTML = "<li class='muted'>Failed to load appointments</li>";
        }
    }

    // ---- Load Stakeholder's Recent Inquiries ----
    async function loadMyStakeholderInquiries() {
        const list = document.getElementById("inquiries-list");
        if (!list) return;

        list.innerHTML = "<li class='muted'>Loading…</li>";

        try {
            console.log('Fetching stakeholder inquiries...');
            const res = await fetch('/api/inquiry/stakeholder', {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                credentials: "include"
            });

            console.log('Stakeholder inquiries response status:', res.status);
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

            const inquiries = await res.json();
            console.log('Received stakeholder inquiries:', Array.isArray(inquiries) ? inquiries.length : '(not an array)');

            // Sort newest first if server didn't already (safe either way)
            const sorted = (Array.isArray(inquiries) ? inquiries : [])
                .slice()
                .sort((a, b) => {
                    const ad = a.date ? new Date(a.date) : new Date(0);
                    const bd = b.date ? new Date(b.date) : new Date(0);
                    return bd - ad;
                })
                .slice(0, 5);

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
            console.error("Error loading stakeholder inquiries:", err);
            list.innerHTML = "<li class='muted'>Failed to load inquiries</li>";
        }
    }

    // Fallback reference if server didn't include one
    function generateReferenceNumber(docId) {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const shortId = (docId || '').slice(-4).toUpperCase();
        return `INQ-${yy}${mm}${dd}-${shortId}`;
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

    // ---- Navigation Functionality ----
    function initializeNavigation() {
        console.log('Initializing navigation...');

        // Get all navigation buttons and menus
        const navButtons = [
            { btn: 'appointments-btn', menu: 'appointments-menu' },
            { btn: 'inquiries-btn', menu: 'inquiries-menu' },
            { btn: 'spaces-btn', menu: 'spaces-menu' },
            { btn: 'settings-btn', menu: 'settings-menu' }
        ];

        // Initialize each navigation menu
        navButtons.forEach(({ btn, menu }) => {
            const button = document.getElementById(btn);
            const menuElement = document.getElementById(menu);

            if (button && menuElement) {
                console.log(`Found: ${btn} and ${menu}`);

                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`Clicked ${btn}`);

                    // Toggle current menu
                    const isHidden = menuElement.hidden;

                    // Close all other menus first
                    navButtons.forEach(({ menu: otherMenu }) => {
                        const otherMenuElement = document.getElementById(otherMenu);
                        const otherButton = document.getElementById(otherMenu.replace('-menu', '-btn'));
                        if (otherMenuElement && otherMenuElement !== menuElement) {
                            otherMenuElement.hidden = true;
                        }
                        if (otherButton && otherButton !== button) {
                            otherButton.setAttribute('aria-expanded', 'false');
                        }
                    });

                    // Toggle current menu
                    menuElement.hidden = !isHidden;
                    button.setAttribute('aria-expanded', !isHidden);

                    // Position menu below button
                    if (!isHidden) {
                        const rect = button.getBoundingClientRect();
                        menuElement.style.top = `${rect.bottom}px`;
                        menuElement.style.left = `${rect.left}px`;
                    }
                });
            } else {
                console.log(`NOT FOUND: ${btn} or ${menu}`, { button, menuElement });
            }
        });

        // Close menus when clicking outside
        document.addEventListener('click', () => {
            navButtons.forEach(({ btn, menu }) => {
                const button = document.getElementById(btn);
                const menuElement = document.getElementById(menu);
                if (button && menuElement) {
                    button.setAttribute('aria-expanded', 'false');
                    menuElement.hidden = true;
                }
            });
        });

        // Prevent menus from closing when clicking inside them
        navButtons.forEach(({ menu }) => {
            const menuElement = document.getElementById(menu);
            if (menuElement) {
                menuElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        });

        // Action card buttons navigation
        document.querySelectorAll('.action-card .btn').forEach(button => {
            button.addEventListener('click', function () {
                const target = this.getAttribute('data-nav');
                if (target) {
                    window.location.href = target;
                }
            });
        });

        console.log('Navigation initialization complete');
    }

    // ---- Load data when page is ready ----
    loadUpcomingAppointments();
    loadMyStakeholderInquiries();
    initializeNavigation(); // Make sure this is called!

    // Auto-refresh every 60 seconds
    setInterval(() => {
        console.log('Auto-refreshing dashboard data...');
        loadUpcomingAppointments();
        loadMyStakeholderInquiries();
    }, 60000);
});