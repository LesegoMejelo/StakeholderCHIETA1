document.addEventListener('DOMContentLoaded', function() {
  // Sample appointment data
  const appointments = [
    {
      id: 'apt-1',
      stakeholder: 'John Smith',
      email: 'john.smith@example.com',
      date: '2024-04-15',
      time: '10:00',
      type: 'online',
      advisor: 'Jane Smith',
      status: 'pending',
      reason: 'Grant Application Assistance',
      details: 'Need help with completing the mandatory grant application for Q2. Specifically questions about eligible expenses.',
      timestamp: '2024-04-10T14:30:00'
    },
    {
      id: 'apt-2',
      stakeholder: 'Sarah Johnson',
      email: 'sarahj@example.com',
      date: '2024-04-16',
      time: '14:30',
      type: 'physical',
      advisor: 'Mike Johnson',
      status: 'pending',
      reason: 'Bursary Application Review',
      details: 'Would like to review my bursary application before submission to ensure all documents are in order.',
      timestamp: '2024-04-11T09:15:00'
    },
    {
      id: 'apt-3',
      stakeholder: 'Robert Williams',
      email: 'r.williams@example.com',
      date: '2024-04-18',
      time: '11:00',
      type: 'online',
      advisor: 'Sarah Williams',
      status: 'accepted',
      reason: 'Compliance Query',
      details: 'Questions about new compliance requirements for skills development programs.',
      timestamp: '2024-04-05T11:45:00'
    },
    {
      id: 'apt-4',
      stakeholder: 'Lisa Brown',
      email: 'lisa.brown@example.com',
      date: '2024-04-20',
      time: '15:30',
      type: 'physical',
      advisor: 'Thomas Brown',
      status: 'declined',
      reason: 'Skills Program Registration',
      details: 'Need assistance with registering our employees for the electrical engineering learnership program.',
      timestamp: '2024-04-07T16:20:00'
    },
    {
      id: 'apt-5',
      stakeholder: 'David Wilson',
      email: 'dwilson@example.com',
      date: '2024-04-22',
      time: '09:30',
      type: 'online',
      advisor: 'Jane Smith',
      status: 'rescheduled',
      reason: 'Site Visit Request',
      details: 'Would like to request a site visit to assess our training facilities for accreditation purposes.',
      timestamp: '2024-04-08T13:10:00',
      rescheduledTo: '2024-04-25 at 10:00'
    }
  ];

  const appointmentsTable = document.getElementById('appointmentsTableBody');
  const upcomingAppointments = document.getElementById('upcomingAppointments');
  const statusFilter = document.getElementById('statusFilter');
  const typeFilter = document.getElementById('typeFilter');
  const dateFilter = document.getElementById('dateFilter');
  const clearFiltersBtn = document.getElementById('clearFilters');
  const resultsCount = document.getElementById('resultsCount');
  
  const infoModal = document.getElementById('infoModal');
  const decisionModal = document.getElementById('decisionModal');
  
  let filteredAppointments = [...appointments];
  let currentAction = null;
  let currentAppointmentId = null;
  
  // Initial render
  renderAppointments();
  renderUpcomingAppointments();
  
  // Add event listeners for filters
  statusFilter.addEventListener('change', filterAppointments);
  typeFilter.addEventListener('change', filterAppointments);
  dateFilter.addEventListener('change', filterAppointments);
  clearFiltersBtn.addEventListener('click', clearAllFilters);
  
  // Modal close buttons
  document.querySelectorAll('.close-modal, #closeInfoModal, #cancelDecision').forEach(btn => {
    btn.addEventListener('click', function() {
      infoModal.classList.remove('active');
      decisionModal.classList.remove('active');
    });
  });
  
  // Submit decision button
  document.getElementById('submitDecision').addEventListener('click', function() {
    if (currentAction === 'accept') {
      // No reason needed for acceptance
      handleAppointmentAcceptance();
    } else {
      const reason = document.getElementById('responseReason').value.trim();
      
      if (!reason) {
        alert('Please provide a reason for your decision');
        return;
      }
      
      if (currentAction === 'reschedule') {
        const newDate = document.getElementById('newDate').value;
        const newTime = document.getElementById('newTime').value;
        
        if (!newDate || !newTime) {
          alert('Please select both a date and time for the rescheduled appointment');
          return;
        }
      }
      
      handleAppointmentDecision(reason);
    }
  });
  
  function handleAppointmentAcceptance() {
    // Update appointment status (in a real app, this would call an API)
    const appointmentIndex = appointments.findIndex(a => a.id === currentAppointmentId);
    if (appointmentIndex !== -1) {
      appointments[appointmentIndex].status = 'accepted';
    }
    
    // Show success message
    alert('Appointment accepted successfully!');
    
    // Refresh the tables
    filterAppointments();
    renderUpcomingAppointments(); // This line was missing - FIXED
    
    // Close modal
    decisionModal.classList.remove('active');
  }
  
  function handleAppointmentDecision(reason) {
    // Update appointment status (in a real app, this would call an API)
    const appointmentIndex = appointments.findIndex(a => a.id === currentAppointmentId);
    if (appointmentIndex !== -1) {
      if (currentAction === 'decline') {
        appointments[appointmentIndex].status = 'declined';
      } else if (currentAction === 'reschedule') {
        appointments[appointmentIndex].status = 'rescheduled';
        const newDate = document.getElementById('newDate').value;
        const newTime = document.getElementById('newTime').value;
        appointments[appointmentIndex].rescheduledTo = `${newDate} at ${newTime}`;
      }
    }
    
    // Show success message
    alert(`Appointment ${currentAction}ed successfully!`);
    
    // Refresh the table
    filterAppointments();
    renderUpcomingAppointments(); // Also update upcoming appointments for rescheduled ones
    
    // Close modal
    decisionModal.classList.remove('active');
  }
  
  function filterAppointments() {
    const statusValue = statusFilter.value;
    const typeValue = typeFilter.value;
    const dateValue = dateFilter.value;
    
    filteredAppointments = appointments.filter(appointment => {
      // Status filter
      if (statusValue !== 'all' && appointment.status !== statusValue) {
        return false;
      }
      
      // Type filter
      if (typeValue !== 'all' && appointment.type !== typeValue) {
        return false;
      }
      
      // Date filter
      if (dateValue !== 'all') {
        const days = parseInt(dateValue);
        const cutoffDate = new Date();
        const appointmentDate = new Date(appointment.date);
        
        // For future appointments
        if (appointmentDate < cutoffDate) {
          return false;
        }
        
        const diffTime = Math.abs(appointmentDate - cutoffDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > days) {
          return false;
        }
      }
      
      return true;
    });
    
    renderAppointments();
  }
  
  function renderUpcomingAppointments() {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter accepted and rescheduled appointments that are in the future
    const upcoming = appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return (appointment.status === 'accepted' || appointment.status === 'rescheduled') && 
             appointmentDate >= today;
    });
    
    // Sort by date
    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Clear current upcoming appointments
    upcomingAppointments.innerHTML = '';
    
    if (upcoming.length === 0) {
      upcomingAppointments.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--muted)">
          No upcoming appointments
        </div>
      `;
    } else {
      upcoming.forEach(appointment => {
        const card = document.createElement('div');
        card.className = `upcoming-card ${appointment.status}`;
        
        const dateObj = new Date(appointment.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
        });
        
        card.innerHTML = `
          <div class="upcoming-card-header">
            <h3 class="upcoming-card-title">${appointment.stakeholder}</h3>
            <div class="upcoming-card-date">${formattedDate}</div>
          </div>
          <div class="upcoming-card-details">
            <div class="upcoming-card-detail"><b>Time:</b> ${appointment.time}</div>
            <div class="upcoming-card-detail"><b>Type:</b> ${appointment.type === 'online' ? 'Online' : 'In-Person'}</div>
            <div class="upcoming-card-detail"><b>Advisor:</b> ${appointment.advisor}</div>
            <div class="upcoming-card-detail"><b>Reason:</b> ${appointment.reason}</div>
          </div>
        `;
        
        upcomingAppointments.appendChild(card);
      });
    }
  }
  
  function clearAllFilters() {
    statusFilter.value = 'all';
    typeFilter.value = 'all';
    dateFilter.value = 'all';
    filterAppointments();
  }
  
  function renderAppointments() {
    appointmentsTable.innerHTML = '';
    
    // Update results count
    resultsCount.textContent = `${filteredAppointments.length} ${filteredAppointments.length === 1 ? 'appointment' : 'appointments'} found`;
    
    if (filteredAppointments.length === 0) {
      appointmentsTable.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 30px; color: var(--muted)">
            No appointments match your current filters
          </td>
        </tr>
      `;
    } else {
      filteredAppointments.forEach(appointment => {
        const row = document.createElement('tr');
        
        // Format status badge
        let statusBadge = '';
        switch(appointment.status) {
          case 'pending':
            statusBadge = `<span class="status-badge status-pending">Pending</span>`;
            break;
          case 'accepted':
            statusBadge = `<span class="status-badge status-accepted">Accepted</span>`;
            break;
          case 'declined':
            statusBadge = `<span class="status-badge status-declined">Declined</span>`;
            break;
          case 'rescheduled':
            statusBadge = `<span class="status-badge status-rescheduled">Rescheduled</span>`;
            break;
        }
        
        // Format date
        const dateObj = new Date(appointment.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
        });
        
        row.innerHTML = `
          <td>${appointment.stakeholder}<br><small>${appointment.email}</small></td>
          <td>${formattedDate}<br>${appointment.time}</td>
          <td>${appointment.type === 'online' ? 'Online' : 'In-Person'}</td>
          <td>${appointment.advisor}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="action-group">
              <button class="action-btn btn-info" data-action="info" data-id="${appointment.id}">Info</button>
              ${appointment.status === 'pending' ? `
                <button class="action-btn btn-accept" data-action="accept" data-id="${appointment.id}">Accept</button>
                <button class="action-btn btn-decline" data-action="decline" data-id="${appointment.id}">Decline</button>
                <button class="action-btn btn-reschedule" data-action="reschedule" data-id="${appointment.id}">Reschedule</button>
              ` : ''}
            </div>
          </td>
        `;
        
        appointmentsTable.appendChild(row);
      });
      
      // Add event listeners to action buttons
      document.querySelectorAll('[data-action="info"]').forEach(btn => {
        btn.addEventListener('click', function() {
          const appointmentId = this.dataset.id;
          showAppointmentInfo(appointmentId);
        });
      });
      
      document.querySelectorAll('[data-action="accept"], [data-action="decline"], [data-action="reschedule"]').forEach(btn => {
        btn.addEventListener('click', function() {
          const action = this.dataset.action;
          const appointmentId = this.dataset.id;
          showDecisionModal(action, appointmentId);
        });
      });
    }
  }
  
  function showAppointmentInfo(appointmentId) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    // Populate info modal
    document.getElementById('detail-stakeholder').textContent = `${appointment.stakeholder} (${appointment.email})`;
    
    const dateObj = new Date(appointment.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    document.getElementById('detail-date').textContent = formattedDate;
    document.getElementById('detail-time').textContent = appointment.time;
    document.getElementById('detail-type').textContent = appointment.type === 'online' ? 'Online Meeting' : 'In-Person';
    document.getElementById('detail-advisor').textContent = appointment.advisor;
    
    let statusText = '';
    switch(appointment.status) {
      case 'pending':
        statusText = 'Pending Review';
        break;
      case 'accepted':
        statusText = 'Accepted';
        break;
      case 'declined':
        statusText = 'Declined';
        break;
      case 'rescheduled':
        statusText = `Rescheduled to ${appointment.rescheduledTo}`;
        break;
    }
    document.getElementById('detail-status').textContent = statusText;
    
    document.getElementById('detail-reason').textContent = appointment.reason;
    document.getElementById('detail-details').textContent = appointment.details || 'No additional details provided';
    
    // Show modal
    infoModal.classList.add('active');
  }
  
  function showDecisionModal(action, appointmentId) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    currentAction = action;
    currentAppointmentId = appointmentId;
    
    // Set modal title based on action
    let modalTitle = '';
    switch(action) {
      case 'accept':
        modalTitle = 'Accept Appointment';
        document.getElementById('submitDecision').textContent = 'Accept Appointment';
        document.getElementById('submitDecision').className = 'action-btn btn-accept';
        document.getElementById('acceptMessage').style.display = 'block';
        document.getElementById('reasonSection').style.display = 'none';
        break;
      case 'decline':
        modalTitle = 'Decline Appointment';
        document.getElementById('submitDecision').textContent = 'Decline Appointment';
        document.getElementById('submitDecision').className = 'action-btn btn-decline';
        document.getElementById('acceptMessage').style.display = 'none';
        document.getElementById('reasonSection').style.display = 'block';
        break;
      case 'reschedule':
        modalTitle = 'Reschedule Appointment';
        document.getElementById('submitDecision').textContent = 'Propose New Time';
        document.getElementById('submitDecision').className = 'action-btn btn-reschedule';
        document.getElementById('acceptMessage').style.display = 'none';
        document.getElementById('reasonSection').style.display = 'block';
        break;
    }
    document.getElementById('decisionModalTitle').textContent = modalTitle;
    
    // Populate appointment details
    document.getElementById('decision-stakeholder').textContent = `${appointment.stakeholder} (${appointment.email})`;
    
    const dateObj = new Date(appointment.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    document.getElementById('decision-date').textContent = formattedDate;
    document.getElementById('decision-time').textContent = appointment.time;
    
    // Show/hide reschedule section
    if (action === 'reschedule') {
      document.getElementById('rescheduleSection').style.display = 'block';
      
      // Set minimum date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      const tomorrowStr = `${yyyy}-${mm}-${dd}`;
      document.getElementById('newDate').min = tomorrowStr;
    } else {
      document.getElementById('rescheduleSection').style.display = 'none';
    }
    
    // Clear previous inputs
    document.getElementById('responseReason').value = '';
    document.getElementById('newDate').value = '';
    document.getElementById('newTime').value = '';
    
    // Show modal
    decisionModal.classList.add('active');
  }
});