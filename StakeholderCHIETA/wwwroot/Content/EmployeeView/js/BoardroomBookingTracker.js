// BoardroomBookingTracker.js — reads top-level /api/my/bookings and cancels via /api/bookings/{id}/cancel

(function () {
    const container = document.getElementById('bookingsContainer') || document.body;

    function formatDate(dateString) {
        const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-ZA', opts);
    }
    function formatTime(dateString) {
        const d = new Date(dateString);
        return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    }
    function calcDuration(start, end) {
        const ms = new Date(end) - new Date(start);
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        if (h > 0 && m > 0) return `${h} hour${h > 1 ? 's' : ''} ${m} min`;
        if (h > 0) return `${h} hour${h > 1 ? 's' : ''}`;
        return `${m} minutes`;
    }
    function canCancel(b) {
        const now = new Date();
        return (b.status === 'confirmed' || b.status === 'pending') && new Date(b.startTime) > now;
    }

    async function fetchMyBookings() {
        const res = await fetch('/api/my/bookings', { credentials: 'include' });
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
    }
    async function cancelBooking(bookingId) {
        const res = await fetch(`/api/bookings/${encodeURIComponent(Bun ?? bookingId)}/cancel`, {
            // ^ silly TS helpers sometimes suggest Bun. Use bookingId:
            method: 'POST', credentials: 'include'
        });
        // Corrected:
        // const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, { method: 'POST', credentials: 'include' });
    }

    async function render(filter = 'all') {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">Loading bookings…</div>';
        try {
            let bookings = await fetchMyBookings();

            // apply filter
            if (filter !== 'all') {
                const now = new Date();
                bookings = bookings.filter(b => {
                    const d = new Date(b.startTime);
                    if (filter === 'upcoming') return (b.status === 'pending' || b.status === 'confirmed') && d >= now;
                    if (filter === 'active') return b.status === 'confirmed' && d >= now;
                    if (filter === 'completed') return d < now;
                    if (filter === 'cancelled') return b.status === 'cancelled';
                    return b.status === filter;
                });
            }

            if (!bookings.length) {
                container.innerHTML = `
          <div class="empty-state">
            <i>🏢</i>
            <h3>No bookings found</h3>
            <p>There are no space bookings matching your selected filter.</p>
            <p><a href="BoardroomBooking" style="color:var(--purple-700);font-weight:600;">Book a new space</a></p>
          </div>`;
                return;
            }

            bookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

            container.innerHTML = bookings.map(b => {
                const duration = calcDuration(b.startTime, b.endTime);
                const when = formatTime(b.startTime);
                const isPast = new Date(b.startTime) < new Date();
                const statusDisplay = isPast && b.status === 'confirmed' ? 'completed' : b.status;

                return `
          <div class="booking-card" data-id="${b.id}">
            <div class="booking-header">
              <div>
                <h3 class="booking-title">${b.meetingTitle || 'Meeting'}</h3>
                <span class="space-type-badge">${b.spaceType || 'Space'}</span>
              </div>
              <div class="booking-status status-${statusDisplay}">
                ${statusDisplay.charAt(0).toUpperCase() + statusDisplay.slice(1)}
              </div>
            </div>
            <div class="booking-details">
              <div class="detail-item"><span class="detail-label">Space</span><span class="detail-value">${b.spaceName}</span></div>
              <div class="detail-item"><span class="detail-label">Date</span><span class="detail-value">${formatDate(b.startTime)}</span></div>
              <div class="detail-item"><span class="detail-label">Time</span><span class="detail-value">${when} (${duration})</span></div>
              <div class="detail-item"><span class="detail-label">Attendees</span><span class="detail-value">${b.attendeeCount} people</span></div>
            </div>
            <div class="booking-actions">
              <button class="btn btn-view" data-view="${b.id}">View Details</button>
              ${canCancel(b)
                        ? `<button class="btn btn-cancel" data-cancel="${b.id}">Cancel Booking</button>`
                        : `<button class="btn btn-cancel" disabled>${isPast ? 'Past Booking' : 'Cancel Booking'}</button>`}
            </div>
          </div>`;
            }).join('');
        } catch (e) {
            container.innerHTML = `
        <div class="empty-state">
          <i>⚠️</i>
          <h3>Error Loading Bookings</h3>
          <p>${e.message}</p>
          <p><button class="btn" id="retry">Retry</button></p>
        </div>`;
            document.getElementById('retry')?.addEventListener('click', () => render(filter));
        }
    }

    // click handlers
    document.addEventListener('click', async (e) => {
        const cBtn = e.target.closest('[data-cancel]');
        if (cBtn) {
            const id = cBtn.getAttribute('data-cancel');
            if (confirm('Cancel this booking?')) {
                const res = await fetch(`/api/bookings/${encodeURIComponent(id)}/cancel`, { method: 'POST', credentials: 'include' });
                if (!res.ok) alert(await res.text());
                await render(currentFilter);
            }
        }
    });

    // filters
    let currentFilter = 'all';
    window.renderBookings = async (f = 'all') => { currentFilter = f; await render(f); };

    // init
    render('all');
})();
