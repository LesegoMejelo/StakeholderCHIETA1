//BoardroomBooking.js 

document.addEventListener('DOMContentLoaded', function () {
    // Time slots to render on each card
    const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    // State
    let currentDate = new Date();
    let selectedDate = null;          // Date object
    let selectedSpaceType = null;     // "boardroom" | "officeSpace" | null
    let selectedSpace = null;         // spaceId
    let selectedTime = null;          // "HH:mm"
    let availableSpaces = [];         // [{id,...}] from /api/spaces/available
    let allSpaces = [];               // [{id,name,type,capacity,location}]

    // Elements
    const spaceTypeInput = document.getElementById('spaceType');
    const spaceOptions = document.querySelectorAll('.space-option');
    const currentMonthEl = document.getElementById('currentMonth');
    const calendarBody = document.getElementById('calendarBody');
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    const spacesGrid = document.getElementById('spacesGrid');
    const submitBtn = document.getElementById('submitBooking');

    const confirmationModal = document.getElementById('confirmationModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');

    const meetingTitleInput = document.getElementById('meetingTitle');
    const organizerNameInput = document.getElementById('organizerName');
    const attendeeCountInput = document.getElementById('attendeeCount');

    // Space Type Selection Handler 
    spaceOptions.forEach(option => {
        option.addEventListener('click', async function () {
            // Remove selected class from all options
            spaceOptions.forEach(opt => opt.classList.remove('selected'));

            // Add selected class to clicked option
            this.classList.add('selected');

            // Update hidden input value AND state variable
            const type = this.dataset.type;
            spaceTypeInput.value = type;
            selectedSpaceType = type;

            console.log('Space type selected:', type);

            // Reset selections
            selectedSpace = null;
            selectedTime = null;

            // Reload spaces with new filter
            await loadSpaces();
            updateSubmitButton();
        });
    });

    // API helpers 
    async function apiGetSpaces(type = null, minCapacity = null) {
        const qs = new URLSearchParams();
        if (type) qs.set('type', type);
        if (minCapacity) qs.set('minCapacity', String(minCapacity));
        const url = `/api/spaces${qs.toString() ? `?${qs.toString()}` : ''}`;

        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
    }

    async function apiAvailable(startISO, endISO, attendeeCount, type = null) {
        const body = { startTime: startISO, endTime: endISO, attendeeCount };
        if (type) body.type = type;

        const res = await fetch(`/api/spaces/available`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
    }

    async function apiBook(spaceId, payload) {
        const res = await fetch(`/api/spaces/${encodeURIComponent(spaceId)}/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
    }

    // Helpers 
    const pad = n => n.toString().padStart(2, '0');
    const toISOString = (dateStr, hhmm) => `${dateStr}T${hhmm}:00+02:00`;
    function toEndTime(startTime, minutes = 60) {
        const [h, m] = startTime.split(':').map(Number);
        const d = new Date(); d.setHours(h, m, 0, 0); d.setMinutes(d.getMinutes() + minutes);
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    function updateSubmitButton() {
        const ok = selectedDate && selectedSpace && selectedTime && selectedSpaceType &&
            meetingTitleInput?.value?.trim() && organizerNameInput?.value?.trim();
        submitBtn.disabled = !ok;
        console.log('Submit button check:', { selectedDate, selectedSpace, selectedTime, selectedSpaceType, ok });
    }

    // Calendar 
    function renderCalendar() {
        currentMonthEl.textContent = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        calendarBody.innerHTML = '';

        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        const first = new Date(y, m, 1);
        const last = new Date(y, m + 1, 0);
        const start = first.getDay();

        const today = new Date(); today.setHours(0, 0, 0, 0);
        let day = 1;

        for (let i = 0; i < 6; i++) {
            const row = document.createElement('tr');
            for (let j = 0; j < 7; j++) {
                const td = document.createElement('td');

                if (i === 0 && j < start) {
                    td.classList.add('unavailable');
                } else if (day > last.getDate()) {
                    td.classList.add('unavailable');
                } else {
                    const d = new Date(y, m, day);
                    td.textContent = String(day);

                    if (d.toDateString() === today.toDateString()) td.classList.add('today');
                    if (d < today) td.classList.add('unavailable');
                    else {
                        td.classList.add('calendar-day');
                        if (selectedDate && d.toDateString() === selectedDate.toDateString()) td.classList.add('selected');
                        td.addEventListener('click', () => {
                            selectedDate = d;
                            selectedSpace = null;
                            selectedTime = null;
                            selectedDateDisplay.textContent = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                            renderCalendar();
                            renderSpacesCards();
                            updateSubmitButton();
                        });
                    }
                    day++;
                }
                row.appendChild(td);
            }
            calendarBody.appendChild(row);
        }
    }

    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar();
    });
    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar();
    });

    // Spaces UI 
    async function loadSpaces() {
        try {
            const minCap = Number(attendeeCountInput?.value || 1);
            console.log('Loading spaces with type:', selectedSpaceType);
            allSpaces = await apiGetSpaces(selectedSpaceType || undefined, minCap || undefined);
            console.log('Loaded spaces:', allSpaces.length);
            renderSpacesCards();
        } catch (e) {
            spacesGrid.innerHTML = `<p class="error">Could not load spaces.</p>`;
            console.error(e);
            allSpaces = [];
        }
    }

    function renderSpacesCards() {
        spacesGrid.innerHTML = '';

        if (!selectedDate) {
            spacesGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--muted)">Pick a date to see spaces.</div>`;
            return;
        }

        if (!allSpaces.length) {
            spacesGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--muted)">No spaces available${selectedSpaceType ? ' for ' + selectedSpaceType : ''}.</div>`;
            return;
        }

        const dateStr = selectedDate.toISOString().split('T')[0];

        allSpaces.forEach(space => {
            const card = document.createElement('div');
            card.className = 'space-card';
            card.dataset.spaceId = space.id;

            let chips = '';
            timeSlots.forEach(t => {
                chips += `<div class="time-slot" data-time="${t}">${t}</div>`;
            });

            card.innerHTML = `
        <div class="space-card-header">
          <h4 class="space-card-title">${space.name}</h4>
          <div class="space-card-capacity">${space.capacity} people</div>
        </div>
        <div class="space-card-details">
          <div class="space-card-detail"><b>Type:</b> ${space.type}</div>
          <div class="space-card-detail"><b>Location:</b> ${space.location || 'N/A'}</div>
        </div>
        <div class="time-slots">${chips}</div>
      `;

            spacesGrid.appendChild(card);
        });

        spacesGrid.querySelectorAll('.space-card').forEach(card => {
            const spaceId = card.dataset.spaceId;
            card.querySelectorAll('.time-slot').forEach(slot => {
                slot.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    card.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
                    slot.classList.add('selected');

                    selectedSpace = spaceId;
                    selectedTime = slot.dataset.time;
                    console.log('Selected space:', spaceId, 'time:', selectedTime);

                    spacesGrid.querySelectorAll('.space-card').forEach(c => c.classList.remove('selected-space'));
                    card.classList.add('selected-space');

                    await paintAvailability();
                    updateSubmitButton();
                });
            });
        });
    }

    async function paintAvailability() {
        if (!selectedDate || !selectedTime) return;

        const dateStr = selectedDate.toISOString().split('T')[0];
        const attendees = Number(attendeeCountInput?.value || 1);
        const startISO = toISOString(dateStr, selectedTime);
        const endISO = toISOString(dateStr, toEndTime(selectedTime, 60));

        try {
            availableSpaces = await apiAvailable(startISO, endISO, attendees, selectedSpaceType);
            const availableIds = new Set(availableSpaces.map(s => s.id));

            spacesGrid.querySelectorAll('.space-card').forEach(card => {
                const id = card.dataset.spaceId;
                const ok = availableIds.has(id);
                card.style.opacity = ok ? '1' : '0.5';
                card.style.cursor = ok ? 'pointer' : 'not-allowed';

                if (!ok && selectedSpace === id) {
                    selectedSpace = null;
                    selectedTime = null;
                    card.classList.remove('selected-space');
                    card.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
                    updateSubmitButton();
                }
            });

            if (selectedSpace && selectedTime) {
                const chosenCard = spacesGrid.querySelector(`.space-card[data-space-id="${selectedSpace}"]`);
                if (chosenCard) {
                    chosenCard.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
                    const chip = chosenCard.querySelector(`.time-slot[data-time="${selectedTime}"]`);
                    if (chip) chip.classList.add('selected');
                }
            }
        } catch (e) {
            console.error('availability error', e);
            const old = spacesGrid.querySelector('.error');
            if (!old) spacesGrid.insertAdjacentHTML('beforeend',
                `<p class="error" style="grid-column:1/-1">Could not load availability. Try another time.</p>`);
        }
    }

    // Booking 
    function pad2(n) { return n.toString().padStart(2, '0'); }
    function toISOFromDate(dateObj) {
        const y = dateObj.getFullYear(), m = pad2(dateObj.getMonth() + 1), d = pad2(dateObj.getDate());
        return `${y}-${m}-${d}`;
    }

    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!(selectedDate && selectedSpace && selectedTime)) return;

        const dateStr = toISOFromDate(selectedDate);
        const attendees = Number(attendeeCountInput?.value || 1);
        const startISO = toISOString(dateStr, selectedTime);
        const endISO = toISOString(dateStr, toEndTime(selectedTime, 60));

        const payload = {
            meetingTitle: meetingTitleInput?.value?.trim() || 'Meeting',
            startTime: startISO,
            endTime: endISO,
            attendeeCount: attendees,
            organizerUserId: 'current-user-id',
            organizerName: organizerNameInput?.value?.trim() || '',
            notes: document.getElementById('meetingDescription')?.value || ''
        };

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Booking...';
            const res = await apiBook(selectedSpace, payload);

            modalTitle.textContent = 'Booking Confirmed';
            modalMessage.innerHTML = `Your booking is confirmed for <b>${dateStr}</b> at <b>${selectedTime}</b>.`;
            confirmationModal.classList.add('active');

            selectedSpace = null;
            selectedTime = null;
            await loadSpaces();
            renderSpacesCards();
        } catch (err) {
            modalTitle.textContent = "Couldn't book";
            modalMessage.textContent = ('' + err).includes('Conflict')
                ? "Someone just booked that time. Please choose another slot."
                : "Failed to book the room. Please try again.";
            confirmationModal.classList.add('active');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Book Space';
        }
    });

    document.getElementById('modalConfirm')?.addEventListener('click', () => {
        confirmationModal.classList.remove('active');
    });

    // Filters / init 
    attendeeCountInput?.addEventListener('change', async () => {
        await loadSpaces();
        if (selectedDate && selectedTime) await paintAvailability();
        updateSubmitButton();
    });

    meetingTitleInput?.addEventListener('input', updateSubmitButton);
    organizerNameInput?.addEventListener('input', updateSubmitButton);

    renderCalendar();
    selectedDateDisplay.textContent = 'Select a date';
    loadSpaces();
});