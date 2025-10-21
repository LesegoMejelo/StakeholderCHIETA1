// Sample booking data - in a real app, this would come from a database
const sampleBookings = [
    {
        id: 'b-001',
        meetingTitle: 'Quarterly Review Meeting',
        spaceType: 'boardroom',
        spaceName: 'Executive Boardroom',
        spaceId: 'br-1',
        date: '2024-11-15',
        time: '10:00',
        duration: '2 hours',
        organizer: 'John Smith',
        attendeeCount: 8,
        description: 'Quarterly performance review with department heads',
        status: 'confirmed',
        createdAt: '2024-10-25',
        capacity: '12 people',
        amenities: 'Projector, Video Conferencing',
        location: 'Floor 3'
    },
    {
        id: 'b-002',
        meetingTitle: 'Project Planning Session',
        spaceType: 'office',
        spaceName: 'Focus Office 1',
        spaceId: 'os-1',
        date: '2024-11-18',
        time: '14:00',
        duration: '3 hours',
        organizer: 'Sarah Johnson',
        attendeeCount: 4,
        description: 'Initial planning for Q1 projects',
        status: 'pending',
        createdAt: '2024-10-26',
        capacity: '4 people',
        amenities: 'Desk, Monitor',
        location: 'Floor 2'
    },
    {
        id: 'b-003',
        meetingTitle: 'Team Workshop',
        spaceType: 'boardroom',
        spaceName: 'Innovation Room',
        spaceId: 'br-2',
        date: '2024-10-28',
        time: '09:00',
        duration: '4 hours',
        organizer: 'Mike Brown',
        attendeeCount: 6,
        description: 'Team building and skills development workshop',
        status: 'completed',
        createdAt: '2024-10-20',
        capacity: '8 people',
        amenities: 'Whiteboard, Screen',
        location: 'Floor 2'
    },
    {
        id: 'b-004',
        meetingTitle: 'Client Presentation',
        spaceType: 'boardroom',
        spaceName: 'Conference Room A',
        spaceId: 'br-3',
        date: '2024-12-01',
        time: '13:30',
        duration: '1.5 hours',
        organizer: 'Emily Davis',
        attendeeCount: 10,
        description: 'Quarterly results presentation to key clients',
        status: 'confirmed',
        createdAt: '2024-10-28',
        capacity: '15 people',
        amenities: 'Projector, Phone',
        location: 'Floor 1'
    },
    {
        id: 'b-005',
        meetingTitle: 'Budget Planning',
        spaceType: 'office',
        spaceName: 'Collaboration Space',
        spaceId: 'os-3',
        date: '2024-11-10',
        time: '11:00',
        duration: '2 hours',
        organizer: 'David Wilson',
        attendeeCount: 5,
        description: 'Annual budget planning meeting',
        status: 'cancelled',
        createdAt: '2024-10-22',
        capacity: '6 people',
        amenities: 'Flexible seating',
        location: 'Floor 3'
    }
];

// Initialize bookings in localStorage
function initializeBookings() {
    if (!localStorage.getItem('chietaSpaceBookings')) {
        localStorage.setItem('chietaSpaceBookings', JSON.stringify(sampleBookings));
    }
}

// Get bookings from localStorage
function getBookings() {
    return JSON.parse(localStorage.getItem('chietaSpaceBookings')) || [];
}

// Save bookings to localStorage
function saveBookings(bookings) {
    localStorage.setItem('chietaSpaceBookings', JSON.stringify(bookings));
}

// Format date for display
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-ZA', options);
}

// Check if booking can be cancelled
function canCancel(booking) {
    const bookingDate = new Date(booking.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (booking.status === 'confirmed' || booking.status === 'pending') &&
        bookingDate >= today;
}

// Get space type display name
function getSpaceTypeDisplay(type) {
    return type === 'boardroom' ? 'Boardroom' : 'Office Space';
}

// Render bookings based on filter
function renderBookings(filter = 'all') {
    const container = document.getElementById('bookingsContainer');
    const bookings = getBookings();

    let filteredBookings = bookings;

    if (filter !== 'all') {
        filteredBookings = bookings.filter(booking => {
            if (filter === 'upcoming') {
                return (booking.status === 'confirmed' || booking.status === 'pending') &&
                    new Date(booking.date) >= new Date().setHours(0, 0, 0, 0);
            }
            if (filter === 'active') {
                return booking.status === 'confirmed' && new Date(booking.date) >= new Date().setHours(0, 0, 0, 0);
            }
            return booking.status === filter;
        });
    }

    if (filteredBookings.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <i>🏢</i>
        <h3>No bookings found</h3>
        <p>There are no space bookings matching your selected filter.</p>
        <p><a href="index.html" style="color: var(--purple-700); font-weight: 600;">Book a new space</a></p>
      </div>
    `;
        return;
    }

    // Sort bookings by date (soonest first)
    filteredBookings.sort((a, b) => new Date(a.date) - new Date(b.date));

    container.innerHTML = filteredBookings.map(booking => `
    <div class="booking-card" data-id="${booking.id}">
      <div class="booking-header">
        <div>
          <h3 class="booking-title">${booking.meetingTitle}</h3>
          <span class="space-type-badge">${getSpaceTypeDisplay(booking.spaceType)}</span>
        </div>
        <div class="booking-status status-${booking.status}">
          ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </div>
      </div>
      
      <div class="booking-details">
        <div class="detail-item">
          <span class="detail-label">Space</span>
          <span class="detail-value">${booking.spaceName}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Date</span>
          <span class="detail-value">${formatDate(booking.date)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Time</span>
          <span class="detail-value">${booking.time} (${booking.duration})</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Organizer</span>
          <span class="detail-value">${booking.organizer}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Attendees</span>
          <span class="detail-value">${booking.attendeeCount} people</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Location</span>
          <span class="detail-value">${booking.location}</span>
        </div>
      </div>
      
      ${booking.description ? `
        <div class="detail-item">
          <span class="detail-label">Description</span>
          <span class="detail-value">${booking.description}</span>
        </div>
      ` : ''}
      
      <div class="detail-item">
        <span class="detail-label">Amenities</span>
        <span class="detail-value">${booking.amenities}</span>
      </div>
      
      <div class="booking-actions">
        <button class="btn btn-view">View Details</button>
        ${canCancel(booking) ? `
          <button class="btn btn-cancel" onclick="openCancelModal('${booking.id}')">
            Cancel Booking
          </button>
        ` : `
          <button class="btn btn-cancel" disabled>
            Cancel Booking
          </button>
        `}
      </div>
    </div>
  `).join('');
}

// Modal functionality
let currentBookingId = null;

function openCancelModal(bookingId) {
    currentBookingId = bookingId;
    const bookings = getBookings();
    const booking = bookings.find(b => b.id === bookingId);

    if (booking) {
        document.getElementById('modalMessage').textContent =
            `Are you sure you want to cancel your booking for "${booking.meetingTitle}" in ${booking.spaceName} on ${formatDate(booking.date)} at ${booking.time}? This action cannot be undone.`;
    }

    document.getElementById('cancelModal').classList.add('active');
}

function closeCancelModal() {
    document.getElementById('cancelModal').classList.remove('active');
    currentBookingId = null;
}

function confirmCancellation() {
    if (!currentBookingId) return;

    const bookings = getBookings();
    const bookingIndex = bookings.findIndex(b => b.id === currentBookingId);

    if (bookingIndex !== -1) {
        bookings[bookingIndex].status = 'cancelled';
        saveBookings(bookings);

        // Re-render with current filter
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        renderBookings(activeFilter);
    }

    closeCancelModal();

    // Show success message
    alert('Booking cancelled successfully.');
}

// Filter functionality
function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderBookings(btn.dataset.filter);
        });
    });
}

// Settings menu functionality
function setupSettingsMenu() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');

    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = settingsBtn.getAttribute('aria-expanded') === 'true';
        settingsBtn.setAttribute('aria-expanded', !isExpanded);
        settingsMenu.hidden = isExpanded;
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
        settingsBtn.setAttribute('aria-expanded', 'false');
        settingsMenu.hidden = true;
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeBookings();
    renderBookings();
    setupFilters();
    setupSettingsMenu();

    // Modal event listeners
    document.getElementById('closeModal').addEventListener('click', closeCancelModal);
    document.getElementById('confirmCancel').addEventListener('click', confirmCancellation);

    // Close modal when clicking outside
    document.getElementById('cancelModal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeCancelModal();
        }
    });
});
