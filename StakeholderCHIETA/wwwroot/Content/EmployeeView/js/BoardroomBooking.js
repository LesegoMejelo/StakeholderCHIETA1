// ====== Utilities
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const fmt = (d) => d.toISOString().slice(0, 10);
const pad = (n) => `${n}`.padStart(2, '0');

// ====== Demo data (Replace with API calls)
/**
 * slotsByDate maps 'YYYY-MM-DD' -> array of slots
 * Each slot: { time: 'HH:MM', durationMins: number, room: string, booked?: boolean, bookedBy?: {...} }
 */
let slotsByDate = {
    // seed a few dates near "today" for demo
};

// Seed slots for the next 30 days (9am-4pm, hourly) for demo
(function seedDemoSlots() {
    const today = new Date();
    for (let offset = 0; offset < 30; offset++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
        const key = fmt(d);
        const slots = [];
        for (let h = 9; h <= 16; h++) {
            // small chance a slot is pre-booked
            const isBooked = Math.random() < 0.15;
            slots.push({ time: `${pad(h)}:00`, durationMins: 60, room: "Main Boardroom", booked: isBooked });
            if (Math.random() < 0.2) {
                slots.push({ time: `${pad(h)}:30`, durationMins: 30, room: "Huddle Room", booked: Math.random() < 0.1 });
            }
        }
        slotsByDate[key] = slots;
    }
})();

// Persist bookings in localStorage so refresh keeps state (demo only)
function saveState() {
    localStorage.setItem('slotsByDate', JSON.stringify(slotsByDate));
}
function loadState() {
    const raw = localStorage.getItem('slotsByDate');
    if (raw) {
        try { slotsByDate = JSON.parse(raw); } catch { }
    }
}
loadState();

// ====== Calendar
const monthLabel = $('#monthLabel');
const datesEl = $('#dates');
const prevBtn = $('#prevMonth');
const nextBtn = $('#nextMonth');
const todayBtn = $('#btnToday');
const showBookedToggle = $('#showBooked');

let current = new Date(); // current month in view
let selectedDate = null;

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

function renderCalendar() {
    const start = startOfMonth(current);
    const end = endOfMonth(current);
    monthLabel.textContent = start.toLocaleString(undefined, { month: 'long', year: 'numeric' });

    // First weekday offset (0 = Sun)
    const firstDay = new Date(start);
    const offset = firstDay.getDay();

    datesEl.innerHTML = '';

    // total cells = offset leading + days in month
    const totalDays = end.getDate();
    const totalCells = offset + totalDays;
    // fill a full grid of weeks
    const rows = Math.ceil(totalCells / 7);
    const cells = rows * 7;

    for (let i = 0; i < cells; i++) {
        const cell = document.createElement('button');
        cell.className = 'date-cell';
        cell.type = 'button';
        cell.setAttribute('role', 'gridcell');

        const dayNum = i - offset + 1;
        if (dayNum < 1 || dayNum > totalDays) {
            cell.classList.add('disabled');
            cell.tabIndex = -1;
            cell.setAttribute('aria-hidden', 'true');
        } else {
            const d = new Date(current.getFullYear(), current.getMonth(), dayNum);
            const key = fmt(d);
            cell.dataset.date = key;

            const num = document.createElement('div');
            num.className = 'num';
            num.textContent = String(dayNum);
            cell.appendChild(num);

            // dots indicator
            const dots = document.createElement('div');
            dots.className = 'dots';
            const slots = slotsByDate[key] || [];
            const anyAvailable = slots.some(s => !s.booked);
            const anyBooked = slots.some(s => s.booked);
            if (slots.length === 0) {
                const dot = document.createElement('span');
                dot.className = 'dot none';
                dots.appendChild(dot);
            } else {
                if (anyAvailable) {
                    const dot = document.createElement('span');
                    dot.className = 'dot available';
                    dots.appendChild(dot);
                }
                if (anyBooked) {
                    const dot = document.createElement('span');
                    dot.className = 'dot booked';
                    dots.appendChild(dot);
                }
            }
            cell.appendChild(dots);

            // today highlighting via title
            if (fmt(new Date()) === key) {
                cell.title = 'Today';
            }

            cell.addEventListener('click', () => selectDate(d));
        }
        datesEl.appendChild(cell);
    }
}

function selectDate(d) {
    selectedDate = new Date(d);
    const label = selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    $('#slotsTitle').textContent = `Available for ${label}`;
    renderSlots();
    // focus corresponding cell
    const key = fmt(selectedDate);
    const cell = $(`.date-cell[data-date="${key}"]`);
    if (cell) cell.focus();
}

prevBtn.addEventListener('click', () => { current = new Date(current.getFullYear(), current.getMonth() - 1, 1); renderCalendar(); });
nextBtn.addEventListener('click', () => { current = new Date(current.getFullYear(), current.getMonth() + 1, 1); renderCalendar(); });
todayBtn.addEventListener('click', () => { current = new Date(); renderCalendar(); selectDate(new Date()); });

// ====== Slots List & Booking
const slotList = $('#slotList');
const bookingDialog = $('#bookingDialog');
const bookingForm = $('#bookingForm');
const cancelDialog = $('#cancelDialog');
const confirmBooking = $('#confirmBooking');
const slotSummary = $('#slotSummary');
const nameInput = $('#nameInput');
const emailInput = $('#emailInput');
const purposeInput = $('#purposeInput');
const toast = $('#toast');

let pending = null; // { dateKey, index }

function renderSlots() {
    slotList.innerHTML = '';
    if (!selectedDate) {
        slotList.innerHTML = `<p class="muted">Pick a date on the calendar to see available times.</p>`;
        return;
    }
    const key = fmt(selectedDate);
    const showBooked = showBookedToggle.checked;
    const slots = (slotsByDate[key] || []).filter(s => showBooked || !s.booked);

    if (slots.length === 0) {
        slotList.innerHTML = `<p class="muted">No slots for this day.</p>`;
        return;
    }

    slots.forEach((s, i) => {
        const card = document.createElement('div');
        card.className = 'slot';

        const when = document.createElement('div');
        when.className = 'when';
        when.textContent = `${s.time} • ${s.durationMins} min`;
        card.appendChild(when);

        const actions = document.createElement('div');
        if (s.booked) {
            const status = document.createElement('span');
            status.className = 'status is-booked';
            status.textContent = 'Booked';
            actions.appendChild(status);
        } else {
            const btn = document.createElement('button');
            btn.className = 'btn small primary';
            btn.textContent = 'Book';
            btn.addEventListener('click', () => openBooking(key, i));
            actions.appendChild(btn);
        }
        card.appendChild(actions);

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = s.room || 'Boardroom';
        card.appendChild(meta);

        slotList.appendChild(card);
    });
}

function openBooking(dateKey, slotIndex) {
    pending = { dateKey, index: slotIndex };
    const s = slotsByDate[dateKey][slotIndex];
    $('#dialogTitle').textContent = 'Confirm Booking';
    slotSummary.textContent = `${new Date(dateKey).toDateString()} at ${s.time} • ${s.durationMins} min • ${s.room}`;
    nameInput.value = '';
    emailInput.value = '';
    purposeInput.value = '';
    bookingDialog.showModal();
    nameInput.focus();
}

cancelDialog.addEventListener('click', () => bookingDialog.close());

bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!pending) return bookingDialog.close();
    const s = slotsByDate[pending.dateKey][pending.index];
    s.booked = true;
    s.bookedBy = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        purpose: purposeInput.value.trim(),
        timestamp: new Date().toISOString()
    };
    saveState();
    bookingDialog.close();
    toastMessage('Booking confirmed ✅');
    renderCalendar();
    renderSlots();
});

showBookedToggle.addEventListener('change', renderSlots);

function toastMessage(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
}

// ====== Init
renderCalendar();
selectDate(new Date());

// ====== Public API (for future integration)
// Example: addSlotsForDate('2025-09-15', [{time:'11:00', durationMins:60, room:'Main'}]);
window.addSlotsForDate = function (dateKey, newSlots) {
    slotsByDate[dateKey] = (slotsByDate[dateKey] || []).concat(newSlots);
    saveState();
    renderCalendar();
    if (selectedDate && fmt(selectedDate) === dateKey) renderSlots();
}


// Popup close functionality
document.addEventListener("DOMContentLoaded", () => {
    const closeBtn = document.getElementById("popupClose");
    const popup = document.getElementById("popup");
    if (closeBtn && popup) {
        closeBtn.addEventListener("click", () => {
            popup.style.display = "none";
        });
    }
});