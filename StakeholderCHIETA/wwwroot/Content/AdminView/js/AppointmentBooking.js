// AppointmentBooking.js
// Replaces/overwrites existing logic to populate Provinces & Advisors (Firestore-backed APIs).
// Drop into ~/js/AppointmentBooking.js and ensure it's referenced in the view.

(function () {
    'use strict';

    // --- Element references ---
    const provinceSelect = document.getElementById('provinceSelect');
    const provinceField = document.getElementById('provinceField'); // hidden input that server expects
    const advisorSelect = document.getElementById('advisorSelect'); // select with name="advisor"
    const advisorOptionsContainer = document.getElementById('advisorOptions'); // card list
    const selectedAdvisorHidden = document.getElementById('selectedAdvisor'); // hidden input storing chosen advisor id (if used)
    const appointmentForm = document.getElementById('appointmentForm');
    const submitButton = document.getElementById('submitButton');
    const appointmentDate = document.getElementById('appointmentDate');
    const appointmentTimeHidden = document.getElementById('appointmentTime'); // optional time hidden input
    const appointmentTypeInput = document.getElementById('appointmentType'); // hidden appointment type set by UI
    const timeSlotsContainer = document.getElementById('timeSlots');

    // small on-page alert (create if missing)
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
        // type: info, success, warning, danger
        pageAlert.textContent = msg;
        pageAlert.className = `alert alert-${type}`;
        pageAlert.style.display = 'block';
        clearTimeout(pageAlert._hideTimeout);
        pageAlert._hideTimeout = setTimeout(() => {
            pageAlert.style.display = 'none';
        }, timeout);
    }

    // utility to create advisor card element (keep same classes as your razor markup)
    function createAdvisorCard(advisor) {
        // advisor: { id, name, province, role? }
        const card = document.createElement('div');
        card.className = 'advisor-option';
        card.setAttribute('data-advisor', advisor.id);

        // Avatar letter(s)
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

        // click selects this advisor
        card.addEventListener('click', function () {
            selectAdvisor(advisor.id);
            // scroll the selected card into view / give visual feedback
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        return card;
    }

    // mark selected advisor visually and set hidden fields
    function selectAdvisor(advisorId) {
        // set hidden inputs
        if (selectedAdvisorHidden) selectedAdvisorHidden.value = advisorId;
        // set advisorSelect value (maintain compatibility with server side forms)
        if (advisorSelect) {
            advisorSelect.value = advisorId;
        }

        // visual selection: remove .selected from all cards, add to chosen
        const all = advisorOptionsContainer.querySelectorAll('.advisor-option');
        all.forEach(el => el.classList.remove('selected'));
        const chosen = advisorOptionsContainer.querySelector(`.advisor-option[data-advisor="${advisorId}"]`);
        if (chosen) chosen.classList.add('selected');
    }

    // populate the advisorSelect <select> element (value => advisor id; text => advisor name)
    function fillAdvisorSelect(advisors) {
        if (!advisorSelect) return;
        advisorSelect.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '-- Select advisor --';
        advisorSelect.appendChild(placeholder);

        advisors.forEach(a => {
            const o = document.createElement('option');
            o.value = a.id;
            o.textContent = a.name || 'Advisor';
            advisorSelect.appendChild(o);
        });

        advisorSelect.disabled = advisors.length === 0;
    }

    // populate the advisorOptions cards area
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

        advisors.forEach(a => {
            const card = createAdvisorCard(a);
            advisorOptionsContainer.appendChild(card);
        });
    }

    // Fetch provinces from API and populate the select
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

            // Normalize and Deduplicate just in case (API already returns distinct but be safe)
            const normalized = provinces
                .map(p => (p || '').toString().trim())
                .filter(p => p.length > 0)
                .reduce((arr, p) => {
                    if (!arr.some(x => x.toLowerCase() === p.toLowerCase())) arr.push(p);
                    return arr;
                }, []);

            normalized.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                provinceSelect.appendChild(opt);
            });

            provinceSelect.disabled = false;

            // If there is a server-rendered selection in provinceField, pre-select it
            if (provinceField && provinceField.value) {
                const toSelect = provinceField.value.trim();
                if (toSelect) {
                    provinceSelect.value = toSelect;
                    // trigger load of advisors for this province
                    await loadAdvisorsForProvince(toSelect);
                }
            }
        } catch (err) {
            console.error('loadProvinces error', err);
            provinceSelect.innerHTML = '<option value="">Error loading provinces</option>';
            showAlert('Could not load provinces. Check console.', 'danger');
            provinceSelect.disabled = false;
        }
    }

    // Fetch advisors for a province and populate both select and cards
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

        // update hidden province field
        if (provinceField) provinceField.value = province;

        // show loading state
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

            // data expected: [{ id, name, province }, ...]
            const advisors = Array.isArray(data) ? data.map(d => ({
                id: d.id,
                name: d.name || (d.Name || 'Advisor'),
                province: d.province || (d.Province || '')
            })) : [];

            if (advisors.length === 0) {
                fillAdvisorSelect([]);
                fillAdvisorCards([]);
                showAlert('No advisors found for selected province.', 'warning');
                return;
            }

            fillAdvisorSelect(advisors);
            fillAdvisorCards(advisors);

            // if a previously-selected advisor matches one of these, re-select
            const prev = selectedAdvisorHidden ? selectedAdvisorHidden.value : '';
            if (prev) {
                const match = advisors.find(a => a.id === prev);
                if (match) selectAdvisor(prev);
            }
        } catch (err) {
            console.error('loadAdvisorsForProvince error', err);
            fillAdvisorSelect([]);
            fillAdvisorCards([]);
            showAlert('Failed to load advisors. See console for details.', 'danger');
        }
    }

    // Hook up the advisor <select> change to select the same advisor in cards (keeps both UI synced)
    function wireAdvisorSelect() {
        if (!advisorSelect) return;
        advisorSelect.addEventListener('change', function () {
            const id = this.value;
            if (id) {
                selectAdvisor(id);
                // highlight corresponding card if exists
                const card = advisorOptionsContainer.querySelector(`.advisor-option[data-advisor="${id}"]`);
                if (card) {
                    card.classList.add('selected');
                    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        });
    }

    // Setup appointment date min = today
    function initDateMin() {
        if (!appointmentDate) return;
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        appointmentDate.min = `${yyyy}-${mm}-${dd}`;
    }

    // Basic time-slot selection wiring (if your UI uses .time-slot elements)
    function wireTimeSlots() {
        if (!timeSlotsContainer) return;
        // if time slots already generated elsewhere, just bind clicks
        timeSlotsContainer.addEventListener('click', function (ev) {
            const slot = ev.target.closest('.time-slot');
            if (!slot) return;
            // remove selected from others
            const others = timeSlotsContainer.querySelectorAll('.time-slot.selected');
            others.forEach(s => s.classList.remove('selected'));
            slot.classList.add('selected');
            const ts = slot.getAttribute('data-time') || slot.textContent.trim();
            if (appointmentTimeHidden) appointmentTimeHidden.value = ts;
        });
    }

    // Submit handler: post to /api/appointment using FormData
    async function wireFormSubmit() {
        if (!appointmentForm) return;

        appointmentForm.addEventListener('submit', async function (ev) {
            ev.preventDefault();

            // determine advisor to send: prefer selectedAdvisorHidden, fallback to advisorSelect.value
            const advisorId = (selectedAdvisorHidden && selectedAdvisorHidden.value) ? selectedAdvisorHidden.value : (advisorSelect ? advisorSelect.value : '');
            const province = provinceField ? provinceField.value : (provinceSelect ? provinceSelect.value : '');
            const date = appointmentDate ? appointmentDate.value : '';
            const time = appointmentTimeHidden ? appointmentTimeHidden.value : '';
            const reasonEl = document.getElementById('appointmentReason');
            const reason = reasonEl ? reasonEl.value : '';
            const detailsEl = document.getElementById('appointmentDetails');
            const details = detailsEl ? detailsEl.value : '';
            const appointmentType = appointmentTypeInput ? appointmentTypeInput.value : 'online';

            // client side validation
            if (!advisorId) { showAlert('Please select an advisor.', 'warning'); return; }
            if (!province) { showAlert('Please choose a province.', 'warning'); return; }
            if (!date) { showAlert('Please choose a date.', 'warning'); return; }
            if (!time) { showAlert('Please choose a time slot.', 'warning'); return; }
            if (!reason) { showAlert('Please choose a reason.', 'warning'); return; }

            // disable button while posting
            submitButton.disabled = true;
            const origText = submitButton.textContent;
            submitButton.textContent = 'Booking...';

            try {
                const fd = new FormData();
                fd.append('advisor', advisorId); // controller expects "advisor"
                fd.append('province', province);
                fd.append('date', date);
                fd.append('time', time);
                fd.append('reason', reason);
                fd.append('appointmentType', appointmentType || 'online');
                fd.append('details', details || '');

                const res = await fetch('/api/appointment', {
                    method: 'POST',
                    body: fd,
                    credentials: 'same-origin'
                });

                const json = await res.json().catch(() => null);

                if (!res.ok) {
                    console.error('Booking failed', json);
                    const msg = (json && json.message) ? json.message : `Booking failed: HTTP ${res.status}`;
                    showAlert(msg, 'danger');
                    return;
                }

                // success
                showAlert((json && json.message) ? json.message : 'Appointment booked', 'success');

                // optionally show confirmation modal if exists
                const modal = document.getElementById('confirmationModal');
                const modalTitle = document.getElementById('modalTitle');
                const modalMessage = document.getElementById('modalMessage');
                if (modal && modalTitle && modalMessage) {
                    modalTitle.textContent = 'Appointment Scheduled';
                    modalMessage.textContent = (json && json.message) ? json.message : 'Your appointment has been scheduled.';
                    modal.style.display = 'block';
                }

                // reset form (keep province selected to enable user to book another)
                // Clear advisor selection and cards
                if (selectedAdvisorHidden) selectedAdvisorHidden.value = '';
                if (advisorSelect) { advisorSelect.value = ''; }
                const selectedCard = advisorOptionsContainer.querySelector('.advisor-option.selected');
                if (selectedCard) selectedCard.classList.remove('selected');

                // Optionally clear date/time/details (comment out if you want them kept)
                appointmentForm.reset();
                // re-set province hidden from the select (reset sets it to empty)
                if (provinceSelect && provinceField) provinceField.value = provinceSelect.value;
            } catch (err) {
                console.error('Booking error', err);
                showAlert('An error occurred while booking. Check console.', 'danger');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = origText;
            }
        });
    }

    // Initialize wiring
    function init() {
        initDateMin();
        wireAdvisorSelect();
        wireTimeSlots();
        wireFormSubmit();

        // when province selection changes, load advisors for that province
        if (provinceSelect) {
            provinceSelect.addEventListener('change', function () {
                const prov = this.value;
                if (!prov) {
                    // clear advisors
                    loadAdvisorsForProvince('');
                    return;
                }
                loadAdvisorsForProvince(prov);
            });
        }

        // Try to pick up server-rendered model advisors (the server passes Model to view)
        // If page contains advisor-option nodes already (server-side), keep them until user picks a province.
        // But if a province is already set in provinceField, we will call loadProvinces() which
        // will trigger loadAdvisorsForProvince for selected province.
        loadProvinces();
    }

    // Run when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();






































/*
// wwwroot/js/AppointmentBooking.js
document.addEventListener('DOMContentLoaded', () => {
    const provinceSelect = document.getElementById('provinceSelect');
    const advisorSelect = document.getElementById('advisorSelect');
    const provinceField = document.getElementById('provinceField'); // hidden input

    if (!provinceSelect || !advisorSelect || !provinceField) return;

    // Load provinces on page load
    loadProvinces();

    // When province changes, update hidden field and load advisors
    provinceSelect.addEventListener('change', () => {
        const province = provinceSelect.value;
        provinceField.value = province || "";
        advisorSelect.innerHTML = '<option value="">Loading advisors…</option>';

        if (!province) {
            advisorSelect.innerHTML = '<option value="">Select a province first</option>';
            advisorSelect.disabled = true;
            return;
        }

        advisorSelect.disabled = true;
        loadAdvisors(province);
    });

    async function loadProvinces() {
        try {
            provinceSelect.innerHTML = '<option value="">Loading provinces…</option>';
            const res = await fetch('/api/appointment/provinces', { credentials: 'include' });
            const provinces = await res.json();

            const data = Array.isArray(provinces) && provinces.length > 0
                ? provinces
                : ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Free State",
                    "Limpopo", "Mpumalanga", "North West", "Northern Cape"];

            provinceSelect.innerHTML = '<option value="">-- Choose Province --</option>';
            data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                provinceSelect.appendChild(opt);
            });
        } catch (err) {
            console.error('Failed to load provinces:', err);
            provinceSelect.innerHTML = '<option value="">Failed to load provinces</option>';
        }
    }

    async function loadAdvisors(province) {
        try {
            const res = await fetch(`/api/appointment/advisors?province=${encodeURIComponent(province)}`, { credentials: 'include' });
            const advisors = await res.json();

            advisorSelect.innerHTML = advisors.length
                ? '<option value="">-- Choose Advisor --</option>'
                : '<option value="">No advisors in this province</option>';

            advisors.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id;        // your controller expects advisor = advisorDocId
                opt.textContent = a.name;
                advisorSelect.appendChild(opt);
            });

            advisorSelect.disabled = advisors.length === 0;
        } catch (err) {
            console.error('Failed to load advisors:', err);
            advisorSelect.innerHTML = '<option value="">Failed to load advisors</option>';
            advisorSelect.disabled = true;
        }
    }
});
*/