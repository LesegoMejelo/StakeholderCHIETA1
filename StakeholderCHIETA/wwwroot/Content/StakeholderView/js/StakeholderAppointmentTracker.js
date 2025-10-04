
    // Sample appointment data - in a real app, this would come from a database
    const sampleAppointments = [
      {
        id: 1,
        type: "Career Guidance Session",
        date: "2024-11-15",
        time: "10:30",
        duration: "60 minutes",
        advisor: {
          id: "jsmith",
          name: "Jane Smith",
          role: "Grants Specialist",
          avatar: "JS"
        },
        location: "Johannesburg Main Center",
        meetingLink: "",
        status: "confirmed",
        reason: "Grant Application",
        details: "Discussion about upcoming grant opportunities for skills development programs.",
        createdAt: "2024-10-25"
      },
      {
        id: 2,
        type: "Skills Assessment",
        date: "2024-11-20",
        time: "14:00",
        duration: "90 minutes",
        advisor: {
          id: "tbrown",
          name: "Thomas Brown",
          role: "Skills Development",
          avatar: "TB"
        },
        location: "Virtual Meeting",
        meetingLink: "https://meet.chieta.org/skills-assessment-123",
        status: "pending",
        reason: "Skills Program",
        details: "Initial assessment for new skills development program eligibility.",
        createdAt: "2024-10-26"
      },
      {
        id: 3,
        type: "TVET Application Assistance",
        date: "2024-10-25",
        time: "09:00",
        duration: "45 minutes",
        advisor: {
          id: "mjohnson",
          name: "Mike Johnson",
          role: "Bursary Coordinator",
          avatar: "MJ"
        },
        location: "Cape Town Center",
        meetingLink: "",
        status: "completed",
        reason: "Bursary Inquiry",
        details: "Assistance with TVET college application process and bursary options.",
        createdAt: "2024-10-20"
      },
      {
        id: 4,
        type: "Workplace Readiness Workshop",
        date: "2024-12-01",
        time: "13:30",
        duration: "120 minutes",
        advisor: {
          id: "swilliams",
          name: "Sarah Williams",
          role: "Compliance Officer",
          avatar: "SW"
        },
        location: "Durban Center",
        meetingLink: "",
        status: "confirmed",
        reason: "Compliance Issue",
        details: "Group session on workplace readiness and compliance requirements.",
        createdAt: "2024-10-28"
      },
      {
        id: 5,
        type: "Funding Strategy Consultation",
        date: "2024-11-10",
        time: "11:00",
        duration: "45 minutes",
        advisor: {
          id: "jsmith",
          name: "Jane Smith",
          role: "Grants Specialist",
          avatar: "JS"
        },
        location: "Virtual Meeting",
        meetingLink: "https://meet.chieta.org/funding-456",
        status: "cancelled",
        reason: "Grant Application",
        details: "Cancelled due to scheduling conflict.",
        createdAt: "2024-10-22"
      }
    ];

    // Initialize appointments in localStorage
    function initializeAppointments() {
      if (!localStorage.getItem('chietaAppointments')) {
        localStorage.setItem('chietaAppointments', JSON.stringify(sampleAppointments));
      }
    }

    // Get appointments from localStorage
    function getAppointments() {
      return JSON.parse(localStorage.getItem('chietaAppointments')) || [];
    }

    // Save appointments to localStorage
    function saveAppointments(appointments) {
      localStorage.setItem('chietaAppointments', JSON.stringify(appointments));
    }

    // Format date for display
    function formatDate(dateString) {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('en-ZA', options);
    }

    // Check if appointment can be cancelled
    function canCancel(appointment) {
      const appointmentDate = new Date(appointment.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return (appointment.status === 'confirmed' || appointment.status === 'pending') && 
             appointmentDate >= today;
    }

    // Render appointments based on filter
    function renderAppointments(filter = 'all') {
      const container = document.getElementById('appointmentsContainer');
      const appointments = getAppointments();
      
      let filteredAppointments = appointments;
      
      if (filter !== 'all') {
        filteredAppointments = appointments.filter(apt => {
          if (filter === 'upcoming') {
            return (apt.status === 'confirmed' || apt.status === 'pending') && 
                   new Date(apt.date) >= new Date().setHours(0,0,0,0);
          }
          return apt.status === filter;
        });
      }

      if (filteredAppointments.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i>📅</i>
            <h3>No appointments found</h3>
            <p>There are no appointments matching your selected filter.</p>
            <p><a href="index.html" style="color: var(--purple-700); font-weight: 600;">Book a new appointment</a></p>
          </div>
        `;
        return;
      }

      // Sort appointments by date (soonest first)
      filteredAppointments.sort((a, b) => new Date(a.date) - new Date(b.date));

      container.innerHTML = filteredAppointments.map(apt => `
        <div class="appointment-card" data-id="${apt.id}">
          <div class="appointment-header">
            <div class="appointment-type">${apt.type}</div>
            <div class="appointment-status status-${apt.status}">
              ${apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
            </div>
          </div>
          
          <div class="advisor-info">
            <div class="advisor-avatar">${apt.advisor.avatar}</div>
            <div>
              <div style="font-weight: 600;">${apt.advisor.name}</div>
              <div style="font-size: 0.9rem; color: var(--muted);">${apt.advisor.role}</div>
            </div>
          </div>
          
          <div class="appointment-details">
            <div class="detail-item">
              <span class="detail-label">Date</span>
              <span class="detail-value">${formatDate(apt.date)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Time</span>
              <span class="detail-value">${apt.time} (${apt.duration})</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Location</span>
              <span class="detail-value">${apt.location}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Reason</span>
              <span class="detail-value">${apt.reason}</span>
            </div>
          </div>
          
          ${apt.details ? `
            <div class="detail-item">
              <span class="detail-label">Details</span>
              <span class="detail-value">${apt.details}</span>
            </div>
          ` : ''}
          
          ${apt.meetingLink && apt.status !== 'cancelled' && apt.status !== 'completed' ? `
            <div class="detail-item">
              <span class="detail-label">Meeting Link</span>
              <span class="detail-value">
                <a href="${apt.meetingLink}" target="_blank" style="color: var(--purple-700);">Join Meeting</a>
              </span>
            </div>
          ` : ''}
          
          <div class="appointment-actions">
            <button class="btn btn-view">View Details</button>
            ${canCancel(apt) ? `
              <button class="btn btn-cancel" onclick="openCancelModal(${apt.id})">
                Cancel Appointment
              </button>
            ` : `
              <button class="btn btn-cancel" disabled>
                Cancel Appointment
              </button>
            `}
          </div>
        </div>
      `).join('');
    }

    // Modal functionality
    let currentAppointmentId = null;

    function openCancelModal(appointmentId) {
      currentAppointmentId = appointmentId;
      const appointments = getAppointments();
      const appointment = appointments.find(apt => apt.id === appointmentId);
      
      if (appointment) {
        document.getElementById('modalMessage').textContent = 
          `Are you sure you want to cancel your ${appointment.type} with ${appointment.advisor.name} on ${formatDate(appointment.date)} at ${appointment.time}? This action cannot be undone.`;
      }
      
      document.getElementById('cancelModal').classList.add('active');
    }

    function closeCancelModal() {
      document.getElementById('cancelModal').classList.remove('active');
      currentAppointmentId = null;
    }

    function confirmCancellation() {
      if (!currentAppointmentId) return;

      const appointments = getAppointments();
      const appointmentIndex = appointments.findIndex(apt => apt.id === currentAppointmentId);
      
      if (appointmentIndex !== -1) {
        appointments[appointmentIndex].status = 'cancelled';
        saveAppointments(appointments);
        
        // Re-render with current filter
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        renderAppointments(activeFilter);
      }

      closeCancelModal();
      
      // Show success message
      alert('Appointment cancelled successfully.');
    }

    // Filter functionality
    function setupFilters() {
      const filterBtns = document.querySelectorAll('.filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderAppointments(btn.dataset.filter);
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
    document.addEventListener('DOMContentLoaded', function() {
      initializeAppointments();
      renderAppointments();
      setupFilters();
      setupSettingsMenu();
      
      // Modal event listeners
      document.getElementById('closeModal').addEventListener('click', closeCancelModal);
      document.getElementById('confirmCancel').addEventListener('click', confirmCancellation);
      
      // Close modal when clicking outside
      document.getElementById('cancelModal').addEventListener('click', function(e) {
        if (e.target === this) {
          closeCancelModal();
        }
      });
    });
