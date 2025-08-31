/* ===========================
   Data (replace with real data)
   =========================== */
const requestItems = [
    { date: '2025-08-24', time: '10:00', reason: 'Skills roadmap session' },
    { date: '2025-08-26', time: '14:00', reason: 'Grant application review' },
    { date: '2025-08-29', time: '09:30', reason: 'Compliance onboarding' }
];

// Example appointments to show dots on the calendar
const appointments = [
    { date: '2025-08-01', title: 'Intro call' },
    { date: '2025-08-07', title: 'Site visit' },
    { date: '2025-08-13', title: 'Review' },
    { date: '2025-08-22', title: 'Workshop' },
    { date: '2025-08-30', title: 'Follow-up' }
];

/* ===========================
   Appointment Requests table
   =========================== */
const tbody = document.getElementById('requests-body');

function renderRequests() {
    tbody.innerHTML = '';
    requestItems.forEach((row, i) => {
        const tr = document.createElement('tr');

        const tdDate = document.createElement('td');
        tdDate.textContent = formatDate(row.date);
        const tdTime = document.createElement('td');
        tdTime.textContent = row.time;
        const tdReason = document.createElement('td');
        tdReason.textContent = row.reason;

        const tdAccept = document.createElement('td');
        const tdDecline = document.createElement('td');

        const actionsAccept = document.createElement('div');
        actionsAccept.className = 'cell-actions';
        const actionsDecline = document.createElement('div');
        actionsDecline.className = 'cell-actions';

        const btnA = button('Accept', 'btn btn-accept', () => setDecision(i, 'accepted'));
        const btnD = button('Decline', 'btn btn-decline', () => setDecision(i, 'declined'));

        actionsAccept.appendChild(btnA);
        actionsDecline.appendChild(btnD);

        tdAccept.appendChild(actionsAccept);
        tdDecline.appendChild(actionsDecline);

        tr.append(tdDate, tdTime, tdReason, tdAccept, tdDecline);
        tbody.appendChild(tr);
    });
}

function button(text, cls, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
}

function setDecision(index, decision) {
    const row = tbody.rows[index];
    // Clear existing badges in action cells
    row.cells[3].innerHTML = '';
    row.cells[4].innerHTML = '';

    const badge = document.createElement('span');
    badge.className = `badge ${decision}`;
    badge.textContent = decision === 'accepted' ? 'Accepted' : 'Declined';

    // Put badge into the matching column
    row.cells[decision === 'accepted' ? 3 : 4].appendChild(badge);
}

/* ===========================
   Calendar
   =========================== */
const calDaysEl = document.getElementById('cal-days');
const calTitleEl = document.getElementById('cal-title');
const prevBtn = document.getElementById('prev-month');
const nextBtn = document.getElementById('next-month');

let current = new Date(); // today
current.setDate(1);       // first of the month

prevBtn.addEventListener('click', () => {
    current.setMonth(current.getMonth() - 1);
    renderCalendar();
});
nextBtn.addEventListener('click', () => {
    current.setMonth(current.getMonth() + 1);
    renderCalendar();
});

function renderCalendar() {
    const year = current.getFullYear();
    const month = current.getMonth();

    const titleFmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
    calTitleEl.textContent = titleFmt.format(current);

    calDaysEl.innerHTML = '';

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    // leading blanks from previous month
    for (let i = 0; i < firstDayIndex; i++) {
        const d = daysInPrev - firstDayIndex + 1 + i;
        calDaysEl.appendChild(dayCell(d, true));
    }

    // this month
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = dayCell(d, false);

        // dot if an appointment exists
        const iso = isoDate(year, month + 1, d);
        if (appointments.some(a => a.date === iso)) {
            const dot = document.createElement('span');
            dot.className = 'dot';
            dot.title = 'Appointment';
            cell.appendChild(dot);
        }

        calDaysEl.appendChild(cell);
    }

    // trailing to fill 6 rows (optional – purely visual)
    const total = calDaysEl.children.length;
    const trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 1; i <= trailing; i++) {
        calDaysEl.appendChild(dayCell(i, true));
    }
}

function dayCell(n, muted) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (muted ? ' muted' : '');
    const label = document.createElement('div');
    label.className = 'date';
    label.textContent = n;
    cell.appendChild(label);
    return cell;
}

function isoDate(y, m, d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function formatDate(iso) {
    const dt = new Date(iso + 'T00:00:00');
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(dt);
}

/* Boot */
renderRequests();
renderCalendar();