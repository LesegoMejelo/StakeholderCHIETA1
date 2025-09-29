document.addEventListener('DOMContentLoaded', function () {
    // Set minimum date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    document.getElementById('appointmentDate').min = todayStr;
    document.getElementById('appointmentDate').value = todayStr;

    // Available time slots
    const timeSlots = [
        '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30'
    ];

    // Load advisors from server and generate advisor options
    loadAdvisors();

    // Generate time slots
    generateTimeSlots();

    // Setup event listeners
    setupEventListeners();

    function loadAdvisors() {
        // Advisors are already rendered server-side by Razor
        // Just check if we have any advisors
        const advisorContainer = document.getElementById('advisorOptions');
        const advisorOptions = advisorContainer.querySelectorAll('.advisor-option');

        if (advisorOptions.length === 0) {
            // No advisors found, check if there's a no-advisors message
            const noAdvisorsMessage = advisorContainer.querySelector('.no-advisors');
            if (!noAdvisorsMessage) {
                advisorContainer.innerHTML = '<div class="error-message">No advisors available. Please contact support.</div>';
            }
        } else {
            // Auto-select first advisor
            setTimeout(() => {
                const firstAdvisor = advisorOptions[0];
                if (firstAdvisor) {
                    firstAdvisor.click();
                }
            }, 100);
        }
    }

    function generateTimeSlots() {
        const timeSlotsContainer = document.getElementById('timeSlots');
        timeSlotsContainer.innerHTML = '';

        timeSlots.forEach(time => {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.textContent = formatTime(time);
            slot.dataset.time = time;

            // Randomly mark some slots as unavailable for demo purposes
            if (Math.random() > 0.8) {
                slot.classList.add('unavailable');
            } else {
                slot.addEventListener('click', function () {
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

        // Auto-select first available time slot
        setTimeout(() => {
            const firstAvailable = document.querySelector('.time-slot:not(.unavailable)');
            if (firstAvailable) {
                firstAvailable.click();
            }
        }, 100);
    }

    function setupEventListeners() {
        // Appointment type selection
        document.querySelectorAll('.type-option').forEach(option => {
            option.addEventListener('click', function () {
                document.querySelectorAll('.type-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.classList.add('selected');
                document.getElementById('appointmentType').value = this.dataset.type;
                validateForm();
            });
        });

        // Advisor selection - use event delegation since advisors are loaded dynamically
        document.getElementById('advisorOptions').addEventListener('click', function (e) {
            const advisorOption = e.target.closest('.advisor-option');
            if (advisorOption) {
                document.querySelectorAll('.advisor-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                advisorOption.classList.add('selected');
                document.getElementById('selectedAdvisor').value = advisorOption.dataset.advisor;
                validateForm();
            }
        });

        // Form validation on input changes
        document.getElementById('appointmentDate').addEventListener('change', validateForm);
        document.getElementById('appointmentReason').addEventListener('change', validateForm);

        // Form submission
        document.getElementById('appointmentForm').addEventListener('submit', handleFormSubmission);

        // Modal event listeners
        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('modalConfirm').addEventListener('click', handleModalConfirm);

        // Auto-select online meeting by default
        setTimeout(() => {
            const onlineOpt = document.querySelector('.type-option[data-type="online"]');
            if (onlineOpt) onlineOpt.click();
        }, 100);
    }

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
    async function handleFormSubmission(e) {
        e.preventDefault();

        if (!validateForm()) {
            showModal('Please complete all required fields', 'Validation Error', false);
            return;
        }

        const submitButton = document.getElementById('submitButton');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Booking...';
        submitButton.disabled = true;

        try {
            // Prepare form data
            const formData = new FormData();
            formData.append('advisor', document.getElementById('selectedAdvisor').value);
            formData.append('reason', document.getElementById('appointmentReason').value);
            formData.append('date', document.getElementById('appointmentDate').value);
            formData.append('time', document.getElementById('appointmentTime').value);
            formData.append('appointmentType', document.getElementById('appointmentType').value); // Add appointment type

            // Add additional details if provided
            const details = document.getElementById('appointmentDetails').value.trim();
            if (details) {
                formData.append('details', details);
            }

            // Submit the appointment
            const response = await fetch('/api/appointment', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                // Get appointment details for confirmation
                const advisorId = document.getElementById('selectedAdvisor').value;
                const advisorOption = document.querySelector(`.advisor-option[data-advisor="${advisorId}"]`);
                const advisorName = advisorOption ? advisorOption.querySelector('.advisor-name').textContent : 'Unknown';

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
                    <strong>${formattedDate} at ${formatTime(time)}</strong><br><br>
                    <strong>With Advisor:</strong> ${advisorName}<br>
                    <strong>Reason:</strong> ${reason}<br><br>
                    <em>You will receive a confirmation email shortly.</em>
                `;

                showModal(message, 'Appointment Confirmed', true);
            } else {
                showModal(result.message || 'Failed to book appointment', 'Booking Failed', false);
            }
        } catch (error) {
            console.error('Error booking appointment:', error);
            showModal('An error occurred while booking the appointment. Please try again.', 'Booking Failed', false);
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    function formatTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    // Modal functionality
    function showModal(message, title, isSuccess) {
        const modal = document.getElementById('confirmationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');

        modalTitle.textContent = title;
        modalMessage.innerHTML = message;
        modal.classList.add('active');

        // Focus on the confirm button for accessibility
        setTimeout(() => {
            document.getElementById('modalConfirm').focus();
        }, 100);
    }

    function closeModal() {
        const modal = document.getElementById('confirmationModal');
        modal.classList.remove('active');
    }

    function handleModalConfirm() {
        closeModal();
        // Reset the form after successful booking
        if (document.getElementById('modalTitle').textContent === 'Appointment Confirmed') {
            resetForm();
        }
    }

    function resetForm() {
        document.getElementById('appointmentForm').reset();
        document.querySelectorAll('.type-option, .time-slot, .advisor-option').forEach(el => {
            el.classList.remove('selected');
        });
        document.getElementById('appointmentType').value = '';
        document.getElementById('appointmentTime').value = '';
        document.getElementById('selectedAdvisor').value = '';
        document.getElementById('submitButton').disabled = true;

        // Reset to today's date
        document.getElementById('appointmentDate').value = todayStr;

        // Re-select defaults
        setTimeout(() => {
            const onlineOpt = document.querySelector('.type-option[data-type="online"]');
            if (onlineOpt) onlineOpt.click();

            const firstAvailable = document.querySelector('.time-slot:not(.unavailable)');
            if (firstAvailable) firstAvailable.click();
        }, 100);
    }
});