// AppointmentBooking.js
// Complete appointment booking system with province filtering and advisor selection

(function () {
    'use strict';

    // --- Element references ---
    const provinceSelect = document.getElementById('provinceSelect');
    const provinceField = document.getElementById('provinceField');
    const advisorSelect = document.getElementById('advisorSelect');
    const advisorOptionsContainer = document.getElementById('advisorOptions');
    const selectedAdvisorHidden = document.getElementById('selectedAdvisor');
    const appointmentForm = document.getElementById('appointmentForm');
    const submitButton = document.getElementById('submitButton');
    const appointmentDate = document.getElementById('appointmentDate');
    const appointmentTimeHidden = document.getElementById('appointmentTime');
    const appointmentTypeInput = document.getElementById('appointmentType');
    const timeSlotsContainer = document.getElementById('timeSlots');
    const appointmentReasonSelect = document.getElementById('appointmentReason');
    const appointmentDetailsTextarea = document.getElementById('appointmentDetails');

    // Available time slots
    const timeSlots = [
        '09:00', '09:30', '10:00', '10:30',
        '11:00', '11:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30'
    ];

    // Store booked slots for current advisor and date
    let bookedSlots = [];

    // --- Alert notification system ---
    let pageAlert = document.getElementById('pageAlert');
    if (!pageAlert) {
        pageAlert = document.createElement('div');
        pageAlert.id = 'pageAlert';
        pageAlert.style.position = 'fixed';
        pageAlert.style.right = '20px';
        pageAlert.style.top = '20px';
        pageAlert.style.zIndex = '9999';
        pageAlert.style.minWidth = '220px';
        pageAlert.style.display = 'none';
        document.body.appendChild(pageAlert);
    }

    function showAlert(msg, type = 'info', timeout = 3500) {
        pageAlert.textContent = msg;
        pageAlert.className = `alert alert-${type}`;
        pageAlert.style.display = 'block';
        clearTimeout(pageAlert._hideTimeout);
        pageAlert._hideTimeout = setTimeout(() => {
            pageAlert.style.display = 'none';
        }, timeout);
    }

    // --- Utility Functions ---
    function formatTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    // --- Advisor Card Creation ---
    function createAdvisorCard(advisor) {
        const card = document.createElement('div');
        card.className = 'advisor-option';
        card.setAttribute('data-advisor', advisor.id);

        // Avatar with initials
        const avatar = document.createElement('div');
        avatar.className = 'advisor-avatar';
        const initials = advisor.name
            ? advisor.name.split(' ').map(n => (n && n[0] ? n[0] : '')).slice(0, 2).join('')
            : '';
        avatar.textContent = initials.toUpperCase();

        // Info wrapper
        const info = document.createElement('div');
        info.className = 'advisor-info';

        const nameEl = document.createElement('div');
        nameEl.className = 'advisor-name';
        nameEl.textContent = advisor.name || 'Advisor';

        const roleEl = document.createElement('div');
        roleEl.className = 'advisor-role';
        roleEl.textContent = advisor.role || 'CHIETA Advisor';

        const specialties = document.createElement('div');
        specialties.className = 'advisor-specialties';
        specialties.innerHTML = '<span class="specialty-tag">General</span> <span class="specialty-tag">Support</span>';

        info.appendChild(nameEl);
        info.appendChild(roleEl);
        info.appendChild(specialties);

        card.appendChild(avatar);
        card.appendChild(info);

        // Click handler for selection
        card.addEventListener('click', function () {
            selectAdvisor(advisor.id);
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        return card;
    }

    // --- Advisor Selection ---
    function selectAdvisor(advisorId) {
        // Set hidden inputs
        if (selectedAdvisorHidden) selectedAdvisorHidden.value = advisorId;
        if (advisorSelect) advisorSelect.value = advisorId;

        // Visual selection: remove .selected from all cards, add to chosen
        const allCards = advisorOptionsContainer.querySelectorAll('.advisor-option');
        allCards.forEach(el => el.classList.remove('selected'));

        const chosenCard = advisorOptionsContainer.querySelector(`.advisor-option[data-advisor="${advisorId}"]`);
        if (chosenCard) chosenCard.classList.add('selected');

        // Reload time slots for this advisor
        const currentDate = appointmentDate ? appointmentDate.value : '';
        if (currentDate) {
            loadAvailableTimeSlots(advisorId, currentDate);
        }

        validateForm();
    }

    // --- Populate Advisor Select Dropdown ---
    function fillAdvisorSelect(advisors) {
        if (!advisorSelect) return;
        advisorSelect.innerHTML = '';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '-- Select advisor --';
        advisorSelect.appendChild(placeholder);

        advisors.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = a.name || 'Advisor';
            advisorSelect.appendChild(opt);
        });

        advisorSelect.disabled = advisors.length === 0;
    }

    // --- Populate Advisor Cards ---
    function fillAdvisorCards(advisors) {
        if (!advisorOptionsContainer) return;
        advisorOptionsContainer.innerHTML = '';

        if (!advisors || advisors.length === 0) {
            const noEl = document.createElement('div');
            noEl.className = 'no-advisors';
            noEl.innerHTML = '<p>No advisors available for the selected province.</p>';
            advisorOptionsContainer.appendChild(noEl);
            return;
        }

        advisors.forEach(advisor => {
            const card = createAdvisorCard(advisor);
            advisorOptionsContainer.appendChild(card);
        });

        // Auto-select first advisor after a short delay
        setTimeout(() => {
            if (advisors.length > 0) {
                selectAdvisor(advisors[0].id);
            }
        }, 100);
    }

    // --- Load Provinces from API ---
    async function loadProvinces() {
        if (!provinceSelect) return;

        provinceSelect.innerHTML = '<option value="">-- Loading provinces... --</option>';
        provinceSelect.disabled = true;

        try {
            const res = await fetch('/api/appointment/provinces', { credentials: 'same-origin' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const provinces = await res.json();

            provinceSelect.innerHTML = '<option value="">-- Choose Province --</option>';

            if (!Array.isArray(provinces) || provinces.length === 0) {
                provinceSelect.innerHTML = '<option value="">No provinces available</option>';
                showAlert('No provinces found.', 'warning');
                return;
            }

            // Normalize and deduplicate provinces
            const normalized = provinces
                .map(p => (p || '').toString().trim())
                .filter(p => p.length > 0)
                .reduce((arr, p) => {
                    if (!arr.some(x => x.toLowerCase() === p.toLowerCase())) arr.push(p);
                    return arr;
                }, []);

            normalized.forEach(province => {
                const opt = document.createElement('option');
                opt.value = province;
                opt.textContent = province;
                provinceSelect.appendChild(opt);
            });

            provinceSelect.disabled = false;

            // If there's a pre-selected province, load advisors for it
            if (provinceField && provinceField.value) {
                const preSelected = provinceField.value.trim();
                if (preSelected) {
                    provinceSelect.value = preSelected;
                    await loadAdvisorsForProvince(preSelected);
                }
            }
        } catch (err) {
            console.error('loadProvinces error:', err);
            provinceSelect.innerHTML = '<option value="">Error loading provinces</option>';
            showAlert('Could not load provinces. Check console.', 'danger');
            provinceSelect.disabled = false;
        }
    }

    // --- Load Advisors for Selected Province ---
    async function loadAdvisorsForProvince(province) {
        if (!province) {
            fillAdvisorSelect([]);
            fillAdvisorCards([]);
            if (advisorSelect) {
                advisorSelect.disabled = true;
                advisorSelect.innerHTML = '<option value="">Select a province first</option>';
            }
            if (provinceField) provinceField.value = '';
            return;
        }

        // Update hidden province field
        if (provinceField) provinceField.value = province;

        // Show loading state
        if (advisorSelect) {
            advisorSelect.innerHTML = '<option value="">-- Loading advisors... --</option>';
            advisorSelect.disabled = true;
        }
        advisorOptionsContainer.innerHTML = '<div class="loading">Loading advisors…</div>';

        try {
            const url = '/api/appointment/advisors?province=' + encodeURIComponent(province);
            const res = await fetch(url, { credentials: 'same-origin' });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();

            // Normalize advisor data
            const advisors = Array.isArray(data) ? data.map(d => ({
                id: d.id,
                name: d.name || d.Name || 'Advisor',
                province: d.province || d.Province || '',
                role: d.role || d.Role || 'CHIETA Advisor'
            })) : [];

            if (advisors.length === 0) {
                fillAdvisorSelect([]);
                fillAdvisorCards([]);
                showAlert('No advisors found for selected province.', 'warning');
                return;
            }

            fillAdvisorSelect(advisors);
            fillAdvisorCards(advisors);

            // If a previously-selected advisor is in this list, re-select
            const previousSelection = selectedAdvisorHidden ? selectedAdvisorHidden.value : '';
            if (previousSelection) {
                const match = advisors.find(a => a.id === previousSelection);
                if (match) {
                    selectAdvisor(previousSelection);
                }
            }
        } catch (err) {
            console.error('loadAdvisorsForProvince error:', err);
            fillAdvisorSelect([]);
            fillAdvisorCards([]);
            showAlert('Failed to load advisors. See console for details.', 'danger');
        }
    }

    // --- Load Available Time Slots for Advisor and Date ---
    async function loadAvailableTimeSlots(advisorId, date) {
        if (!advisorId || !date) {
            generateTimeSlots([]);
            return;
        }

        try {
            const url = `/api/appointment/available-slots?advisorId=${encodeURIComponent(advisorId)}&date=${encodeURIComponent(date)}`;
            const res = await fetch(url, { credentials: 'same-origin' });

            if (!res.ok) {
                console.warn('Failed to fetch booked slots, showing all slots as available');
                generateTimeSlots([]);
                return;
            }

            const data = await res.json();
            // Expect: { bookedTimes: ["09:00", "10:30", ...] }
            const booked = Array.isArray(data.bookedTimes) ? data.bookedTimes : (Array.isArray(data) ? data : []);

            generateTimeSlots(booked);
        } catch (err) {
            console.error('Error loading available slots:', err);
            generateTimeSlots([]);
        }
    }

    // --- Time Slots Generation ---
    function generateTimeSlots(bookedTimes = []) {
        if (!timeSlotsContainer) return;

        bookedSlots = bookedTimes;
        timeSlotsContainer.innerHTML = '';

        timeSlots.forEach(time => {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.textContent = formatTime(time);
            slot.dataset.time = time;

            // Mark as unavailable if already booked
            if (bookedTimes.includes(time)) {
                slot.classList.add('unavailable');
                slot.title = 'This time slot is already booked';
            }

            timeSlotsContainer.appendChild(slot);
        });

        // Auto-select first available time slot
        setTimeout(() => {
            const firstAvailable = timeSlotsContainer.querySelector('.time-slot:not(.unavailable)');
            if (firstAvailable) {
                firstAvailable.click();
            }
        }, 100);
    }

    // --- Initialize Date Field ---
    function initDateMin() {
        if (!appointmentDate) return;

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        appointmentDate.min = todayStr;
        appointmentDate.value = todayStr;
    }

    // --- Form Validation ---
    function validateForm() {
        const type = appointmentTypeInput ? appointmentTypeInput.value : '';
        const advisor = selectedAdvisorHidden ? selectedAdvisorHidden.value : '';
        const date = appointmentDate ? appointmentDate.value : '';
        const time = appointmentTimeHidden ? appointmentTimeHidden.value : '';
        const reason = appointmentReasonSelect ? appointmentReasonSelect.value : '';

        const isValid = type && advisor && date && time && reason;

        if (submitButton) {
            submitButton.disabled = !isValid;
        }

        return isValid;
    }

    // --- Modal Functions ---
    function showModal(message, title, isSuccess) {
        const modal = document.getElementById('confirmationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');

        if (modal && modalTitle && modalMessage) {
            modalTitle.textContent = title;
            modalMessage.innerHTML = message;
            modal.classList.add('active');
            modal.style.display = 'block';

            setTimeout(() => {
                const confirmBtn = document.getElementById('modalConfirm');
                if (confirmBtn) confirmBtn.focus();
            }, 100);
        }
    }

    function closeModal() {
        const modal = document.getElementById('confirmationModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    function handleModalConfirm() {
        const modalTitle = document.getElementById('modalTitle');
        const wasSuccess = modalTitle && modalTitle.textContent === 'Appointment Confirmed';

        closeModal();

        if (wasSuccess) {
            resetForm();
        }
    }

    // --- Reset Form ---
    function resetForm() {
        if (appointmentForm) appointmentForm.reset();

        // Clear selections
        document.querySelectorAll('.type-option, .time-slot, .advisor-option').forEach(el => {
            el.classList.remove('selected');
        });

        if (appointmentTypeInput) appointmentTypeInput.value = '';
        if (appointmentTimeHidden) appointmentTimeHidden.value = '';
        if (selectedAdvisorHidden) selectedAdvisorHidden.value = '';
        if (submitButton) submitButton.disabled = true;

        // Reset date to today
        initDateMin();

        // Re-select defaults
        setTimeout(() => {
            const onlineOpt = document.querySelector('.type-option[data-type="online"]');
            if (onlineOpt) onlineOpt.click();

            const firstAvailable = document.querySelector('.time-slot:not(.unavailable)');
            if (firstAvailable) firstAvailable.click();
        }, 100);
    }

    // --- Form Submission Handler ---
    async function handleFormSubmission(e) {
        e.preventDefault();

        if (!validateForm()) {
            showModal('Please complete all required fields', 'Validation Error', false);
            return;
        }

        const advisorId = selectedAdvisorHidden ? selectedAdvisorHidden.value : '';
        const province = provinceField ? provinceField.value : (provinceSelect ? provinceSelect.value : '');
        const date = appointmentDate ? appointmentDate.value : '';
        const time = appointmentTimeHidden ? appointmentTimeHidden.value : '';
        const reason = appointmentReasonSelect ? appointmentReasonSelect.value : '';
        const details = appointmentDetailsTextarea ? appointmentDetailsTextarea.value : '';
        const appointmentType = appointmentTypeInput ? appointmentTypeInput.value : 'online';

        // Client-side validation
        if (!advisorId) { showAlert('Please select an advisor.', 'warning'); return; }
        if (!province) { showAlert('Please choose a province.', 'warning'); return; }
        if (!date) { showAlert('Please choose a date.', 'warning'); return; }
        if (!time) { showAlert('Please choose a time slot.', 'warning'); return; }
        if (!reason) { showAlert('Please choose a reason.', 'warning'); return; }

        const originalText = submitButton.textContent;
        submitButton.textContent = 'Booking...';
        submitButton.disabled = true;

        try {
            const formData = new FormData();
            formData.append('advisor', advisorId);
            formData.append('province', province);
            formData.append('date', date);
            formData.append('time', time);
            formData.append('reason', reason);
            formData.append('appointmentType', appointmentType);
            if (details) formData.append('details', details);

            const response = await fetch('/api/appointment', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });

            const result = await response.json().catch(() => null);

            if (!response.ok) {
                const msg = (result && result.message) ? result.message : `Booking failed: HTTP ${response.status}`;
                showAlert(msg, 'danger');
                showModal(msg, 'Booking Failed', false);
                return;
            }

            // Success - prepare confirmation message
            const advisorCard = document.querySelector(`.advisor-option[data-advisor="${advisorId}"]`);
            const advisorName = advisorCard ? advisorCard.querySelector('.advisor-name').textContent : 'Unknown';
            const typeText = appointmentType === 'online' ? 'Online Meeting' : 'In-Person';
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            const message = `
                Your ${typeText} appointment has been scheduled for:<br><br>
                <strong>${formattedDate} at ${formatTime(time)}</strong><br><br>
                <strong>With Advisor:</strong> ${advisorName}<br>
                <strong>Reason:</strong> ${reason}<br><br>
                <em>You will receive a confirmation email shortly.</em>
            `;

            showAlert((result && result.message) ? result.message : 'Appointment booked', 'success');
            showModal(message, 'Appointment Confirmed', true);

        } catch (err) {
            console.error('Booking error:', err);
            showAlert('An error occurred while booking. Check console.', 'danger');
            showModal('An error occurred while booking the appointment. Please try again.', 'Booking Failed', false);
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Province selection
        if (provinceSelect) {
            provinceSelect.addEventListener('change', function () {
                const province = this.value;
                if (!province) {
                    loadAdvisorsForProvince('');
                } else {
                    loadAdvisorsForProvince(province);
                }
            });
        }

        // Advisor select dropdown (keeps UI in sync)
        if (advisorSelect) {
            advisorSelect.addEventListener('change', function () {
                const id = this.value;
                if (id) {
                    selectAdvisor(id);
                    const card = advisorOptionsContainer.querySelector(`.advisor-option[data-advisor="${id}"]`);
                    if (card) {
                        card.classList.add('selected');
                        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
            });
        }

        // Appointment type selection
        document.querySelectorAll('.type-option').forEach(option => {
            option.addEventListener('click', function () {
                document.querySelectorAll('.type-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.classList.add('selected');
                if (appointmentTypeInput) {
                    appointmentTypeInput.value = this.dataset.type;
                }
                validateForm();
            });
        });

        // Date change - reload time slots for selected advisor
        if (appointmentDate) {
            appointmentDate.addEventListener('change', function () {
                const advisorId = selectedAdvisorHidden ? selectedAdvisorHidden.value : '';
                const date = this.value;
                if (advisorId && date) {
                    loadAvailableTimeSlots(advisorId, date);
                }
                validateForm();
            });
        }

        // Time slot selection
        if (timeSlotsContainer) {
            timeSlotsContainer.addEventListener('click', function (e) {
                const slot = e.target.closest('.time-slot');
                if (!slot || slot.classList.contains('unavailable')) return;

                document.querySelectorAll('.time-slot:not(.unavailable)').forEach(s => {
                    s.classList.remove('selected');
                });
                slot.classList.add('selected');

                if (appointmentTimeHidden) {
                    appointmentTimeHidden.value = slot.dataset.time;
                }
                validateForm();
            });
        }

        // Form field changes
        if (appointmentReasonSelect) {
            appointmentReasonSelect.addEventListener('change', validateForm);
        }

        // Form submission
        if (appointmentForm) {
            appointmentForm.addEventListener('submit', handleFormSubmission);
        }

        // Modal controls
        const modalClose = document.getElementById('modalClose');
        const modalConfirm = document.getElementById('modalConfirm');

        if (modalClose) {
            modalClose.addEventListener('click', closeModal);
        }
        if (modalConfirm) {
            modalConfirm.addEventListener('click', handleModalConfirm);
        }

        // Auto-select online meeting by default
        setTimeout(() => {
            const onlineOpt = document.querySelector('.type-option[data-type="online"]');
            if (onlineOpt) onlineOpt.click();
        }, 100);
    }

    // --- Initialization ---
    function init() {
        initDateMin();
        generateTimeSlots([]); // Initially show all slots as available
        setupEventListeners();
        loadProvinces();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();