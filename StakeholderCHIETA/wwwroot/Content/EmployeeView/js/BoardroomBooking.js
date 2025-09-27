document.addEventListener('DOMContentLoaded', function() {
    // Available spaces data
    const boardrooms = [
      { id: 'br-1', name: 'Executive Boardroom', capacity: '12 people', amenities: 'Projector, Video Conferencing', location: 'Floor 3' },
      { id: 'br-2', name: 'Innovation Room', capacity: '8 people', amenities: 'Whiteboard, Screen', location: 'Floor 2' },
      { id: 'br-3', name: 'Conference Room A', capacity: '15 people', amenities: 'Projector, Phone', location: 'Floor 1' },
      { id: 'br-4', name: 'Conference Room B', capacity: '10 people', amenities: 'Screen, Video Call', location: 'Floor 1' }
    ];
    
    const officeSpaces = [
      { id: 'os-1', name: 'Focus Office 1', capacity: '4 people', amenities: 'Desk, Monitor', location: 'Floor 2' },
      { id: 'os-2', name: 'Focus Office 2', capacity: '4 people', amenities: 'Desk, Whiteboard', location: 'Floor 2' },
      { id: 'os-3', name: 'Collaboration Space', capacity: '6 people', amenities: 'Flexible seating', location: 'Floor 3' }
    ];
    
    // Time slots
    const timeSlots = [
      '08:00', '09:00', '10:00', '11:00', 
      '12:00', '13:00', '14:00', '15:00', 
      '16:00', '17:00'
    ];
    
    // Existing bookings (simulated data)
    const existingBookings = [
      { date: '2024-04-15', spaceId: 'br-1', time: '10:00' },
      { date: '2024-04-15', spaceId: 'br-2', time: '14:00' },
      { date: '2024-04-16', spaceId: 'os-1', time: '09:00' },
      { date: '2024-04-16', spaceId: 'br-3', time: '11:00' },
      { date: '2024-04-18', spaceId: 'br-1', time: '15:00' }
    ];
    
    // Current state
    let currentDate = new Date();
    let selectedDate = null;
    let selectedSpaceType = null;
    let selectedSpace = null;
    let selectedTime = null;
    
    // DOM elements
    const spaceTypeInput = document.getElementById('spaceType');
    const currentMonthEl = document.getElementById('currentMonth');
    const calendarBody = document.getElementById('calendarBody');
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    const spacesGrid = document.getElementById('spacesGrid');
    const submitBtn = document.getElementById('submitBooking');
    const confirmationModal = document.getElementById('confirmationModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    
    // Initialize calendar
    renderCalendar();
    
    // Space type selection
    document.querySelectorAll('.space-option').forEach(option => {
      option.addEventListener('click', function() {
        document.querySelectorAll('.space-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        this.classList.add('selected');
        selectedSpaceType = this.dataset.type;
        spaceTypeInput.value = selectedSpaceType;
        
        // If a date is already selected, show available spaces
        if (selectedDate) {
          renderAvailableSpaces();
        }
      });
    });
    
    // Calendar navigation
    document.getElementById('prevMonth').addEventListener('click', function() {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', function() {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
    });
    
    // Modal confirmation
    document.getElementById('modalConfirm').addEventListener('click', function() {
      confirmationModal.classList.remove('active');
      resetForm();
    });
    
    // Submit booking
    submitBtn.addEventListener('click', function() {
      if (validateBooking()) {
        showConfirmation();
      }
    });
    
    function renderCalendar() {
      // Set current month display
      currentMonthEl.textContent = currentDate.toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long' 
      });
      
      // Clear previous calendar
      calendarBody.innerHTML = '';
      
      // Get first day of month and number of days
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDay = firstDay.getDay();
      
      // Create calendar rows
      let date = 1;
      for (let i = 0; i < 6; i++) {
        const row = document.createElement('tr');
        
        for (let j = 0; j < 7; j++) {
          const cell = document.createElement('td');
          
          if (i === 0 && j < startingDay) {
            // Empty cells before first day of month
            cell.textContent = '';
            cell.classList.add('unavailable');
          } else if (date > daysInMonth) {
            // Empty cells after last day of month
            cell.textContent = '';
            cell.classList.add('unavailable');
          } else {
            // Date cells
            const cellDate = new Date(year, month, date);
            cell.textContent = date;
            
            // Check if today
            const today = new Date();
            if (cellDate.toDateString() === today.toDateString()) {
              cell.classList.add('today');
            }
            
            // Check if date is in the past
            if (cellDate < new Date().setHours(0, 0, 0, 0)) {
              cell.classList.add('unavailable');
            } else {
              cell.addEventListener('click', function() {
                selectDate(cellDate);
              });
            }
            
            date++;
          }
          
          row.appendChild(cell);
        }
        
        calendarBody.appendChild(row);
      }
    }
    
    function selectDate(date) {
      selectedDate = date;
      
      // Update UI
      document.querySelectorAll('.calendar td').forEach(cell => {
        cell.classList.remove('selected');
      });
      
      // Find and select the clicked date cell
      const dateString = date.getDate().toString();
      const cells = document.querySelectorAll('.calendar td');
      for (let cell of cells) {
        if (cell.textContent === dateString) {
          cell.classList.add('selected');
          break;
        }
      }
      
      // Update selected date display
      selectedDateDisplay.textContent = date.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
      
      // Show available spaces if space type is selected
      if (selectedSpaceType) {
        renderAvailableSpaces();
      }
      
      updateSubmitButton();
    }
    
    function renderAvailableSpaces() {
      // Clear previous spaces
      spacesGrid.innerHTML = '';
      
      // Get available spaces based on type
      const spaces = selectedSpaceType === 'boardroom' ? boardrooms : officeSpaces;
      
      if (spaces.length === 0) {
        spacesGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--muted)">
            No ${selectedSpaceType === 'boardroom' ? 'boardrooms' : 'office spaces'} available
          </div>
        `;
        return;
      }
      
      // Format date for comparison
      const dateString = selectedDate.toISOString().split('T')[0];
      
      spaces.forEach(space => {
        const spaceCard = document.createElement('div');
        spaceCard.className = 'space-card';
        spaceCard.dataset.spaceId = space.id;
        
        // Generate time slots HTML
        let timeSlotsHTML = '';
        timeSlots.forEach(time => {
          // Check if this space/time is already booked
          const isBooked = existingBookings.some(booking => 
            booking.date === dateString && 
            booking.spaceId === space.id && 
            booking.time === time
          );
          
          timeSlotsHTML += `
            <div class="time-slot ${isBooked ? 'unavailable' : ''}" data-time="${time}">
              ${time}
            </div>
          `;
        });
        
        spaceCard.innerHTML = `
          <div class="space-card-header">
            <h4 class="space-card-title">${space.name}</h4>
            <div class="space-card-capacity">${space.capacity}</div>
          </div>
          <div class="space-card-details">
            <div class="space-card-detail"><b>Amenities:</b> ${space.amenities}</div>
            <div class="space-card-detail"><b>Location:</b> ${space.location}</div>
          </div>
          <div class="time-slots">
            ${timeSlotsHTML}
          </div>
        `;
        
        spacesGrid.appendChild(spaceCard);
      });
      
      // Add event listeners to time slots
      document.querySelectorAll('.time-slot:not(.unavailable)').forEach(slot => {
        slot.addEventListener('click', function() {
          // Deselect all time slots
          document.querySelectorAll('.time-slot').forEach(s => {
            s.classList.remove('selected');
          });
          
          // Select this time slot
          this.classList.add('selected');
          
          // Update selected space and time
          selectedSpace = this.closest('.space-card').dataset.spaceId;
          selectedTime = this.dataset.time;
          
          updateSubmitButton();
        });
      });
    }
    
    function updateSubmitButton() {
      const isReady = selectedDate && selectedSpaceType && selectedSpace && selectedTime;
      submitBtn.disabled = !isReady;
    }
    
    function validateBooking() {
      const meetingTitle = document.getElementById('meetingTitle').value.trim();
      const organizerName = document.getElementById('organizerName').value.trim();
      const attendeeCount = document.getElementById('attendeeCount').value;
      
      if (!meetingTitle || !organizerName || !attendeeCount) {
        alert('Please complete all required fields');
        return false;
      }
      
      return true;
    }
    
    function showConfirmation() {
      const meetingTitle = document.getElementById('meetingTitle').value;
      const spaceType = selectedSpaceType === 'boardroom' ? 'Boardroom' : 'Office Space';
      const spaceName = (selectedSpaceType === 'boardroom' ? boardrooms : officeSpaces)
        .find(space => space.id === selectedSpace).name;
      
      const dateString = selectedDate.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
      
      modalTitle.textContent = 'Booking Confirmed';
      modalMessage.innerHTML = `
        Your ${spaceType.toLowerCase()} has been successfully booked.<br><br>
        <strong>Meeting:</strong> ${meetingTitle}<br>
        <strong>Space:</strong> ${spaceName}<br>
        <strong>Date:</strong> ${dateString}<br>
        <strong>Time:</strong> ${selectedTime}
      `;
      
      confirmationModal.classList.add('active');
    }
    
    function resetForm() {
      // Reset form
      document.getElementById('bookingForm').reset();
      document.querySelectorAll('.space-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      
      // Reset selections
      selectedDate = null;
      selectedSpaceType = null;
      selectedSpace = null;
      selectedTime = null;
      
      // Reset UI
      document.querySelectorAll('.calendar td').forEach(cell => {
        cell.classList.remove('selected');
      });
      
      selectedDateDisplay.textContent = 'Select a date';
      spacesGrid.innerHTML = '';
      submitBtn.disabled = true;
    }
  });