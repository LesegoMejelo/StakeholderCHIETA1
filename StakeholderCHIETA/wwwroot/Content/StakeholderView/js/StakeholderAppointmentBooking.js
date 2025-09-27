document.addEventListener('DOMContentLoaded', function() {
    // Set minimum date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    document.getElementById('appointmentDate').min = todayStr;
    
    // Available time slots
    const timeSlots = [
      '09:00', '09:30', '10:00', '10:30', 
      '11:00', '11:30', '14:00', '14:30', 
      '15:00', '15:30', '16:00', '16:30'
    ];
    
    // Generate time slots
    const timeSlotsContainer = document.getElementById('timeSlots');
    timeSlots.forEach(time => {
      const slot = document.createElement('div');
      slot.className = 'time-slot';
      slot.textContent = time;
      slot.dataset.time = time;
      
      // Randomly mark some slots as unavailable for demo purposes
      if (Math.random() > 0.7) {
        slot.classList.add('unavailable');
      } else {
        slot.addEventListener('click', function() {
          document.querySelectorAll('.time-slot:not(.unavailable)').forEach(s => {
            s.classList.remove('selected');
          });
          this.classList.add('selected');
          document.getElementById('appointmentTime').value = this.dataset.time;
          validateForm();
        });
      }
      
      timeSlotsContainer.appendChild(slot);
    });
    
    // Appointment type selection
    document.querySelectorAll('.type-option').forEach(option => {
      option.addEventListener('click', function() {
        document.querySelectorAll('.type-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        this.classList.add('selected');
        document.getElementById('appointmentType').value = this.dataset.type;
        validateForm();
      });
    });
    
    // Advisor selection
    document.querySelectorAll('.advisor-option').forEach(option => {
      option.addEventListener('click', function() {
        document.querySelectorAll('.advisor-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        this.classList.add('selected');
        document.getElementById('selectedAdvisor').value = this.dataset.advisor;
        validateForm();
      });
    });
    
    // Form validation
    function validateForm() {
      const type = document.getElementById('appointmentType').value;
      const advisor = document.getElementById('selectedAdvisor').value;
      const date = document.getElementById('appointmentDate').value;
      const time = document.getElementById('appointmentTime').value;
      const reason = document.getElementById('appointmentReason').value;
      
      const isValid = type && advisor && date && time && reason;
      document.getElementById('submitButton').disabled = !isValid;
      
      return isValid;
    }
    
    // Form submission
    document.getElementById('appointmentForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      if (!validateForm()) {
        showModal('Please complete all required fields', 'Validation Error', false);
        return;
      }
      
      // Get advisor name from selected option
      const advisorId = document.getElementById('selectedAdvisor').value;
      const advisorOption = document.querySelector(`.advisor-option[data-advisor="${advisorId}"]`);
      const advisorName = advisorOption.querySelector('.advisor-name').textContent;
      
      // Prepare confirmation message
      const type = document.getElementById('appointmentType').value;
      const typeText = type === 'online' ? 'Online Meeting' : 'In-Person';
      const date = document.getElementById('appointmentDate').value;
      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
      const time = document.getElementById('appointmentTime').value;
      const reason = document.getElementById('appointmentReason').value;
      
      const message = `
        Your ${typeText} appointment has been scheduled for:<br><br>
        <strong>${formattedDate} at ${time}</strong><br><br>
        <strong>With Advisor:</strong> ${advisorName}<br>
        <strong>Reason:</strong> ${reason}
      `;
      
      showModal(message, 'Appointment Confirmed', true);
    });
    
    // Input validation as user fills the form
    document.getElementById('appointmentDate').addEventListener('change', validateForm);
    document.getElementById('appointmentReason').addEventListener('change', validateForm);
    
    // Modal functionality
    const modal = document.getElementById('confirmationModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    
    document.getElementById('modalClose').addEventListener('click', function() {
      modal.classList.remove('active');
    });
    
    document.getElementById('modalConfirm').addEventListener('click', function() {
      modal.classList.remove('active');
      // In a real application, you would submit the form data to a server here
      document.getElementById('appointmentForm').reset();
      document.querySelectorAll('.type-option, .time-slot, .advisor-option').forEach(el => {
        el.classList.remove('selected');
      });
      document.getElementById('appointmentType').value = '';
      document.getElementById('appointmentTime').value = '';
      document.getElementById('selectedAdvisor').value = '';
      document.getElementById('submitButton').disabled = true;
    });
    
    function showModal(message, title, isSuccess) {
      modalTitle.textContent = title;
      modalMessage.innerHTML = message;
      modal.classList.add('active');
      
      // Focus on the confirm button for accessibility
      setTimeout(() => {
        document.getElementById('modalConfirm').focus();
      }, 100);
    }
    
    // Set today's date as default
    document.getElementById('appointmentDate').value = todayStr;
    
    // Auto-select first available time slot
    setTimeout(() => {
      const firstAvailable = document.querySelector('.time-slot:not(.unavailable)');
      if (firstAvailable) {
        firstAvailable.click();
      }
      
      // Auto-select first advisor
      const firstAdvisor = document.querySelector('.advisor-option');
      if (firstAdvisor) {
        firstAdvisor.click();
      }
      
      // Auto-select online meeting by default
      const onlineOpt = document.querySelector('.type-option[data-type="online"]');
      if (onlineOpt) onlineOpt.click();
    }, 100);
  });
  