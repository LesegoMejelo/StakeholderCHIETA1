// StakeholderAppointmentTracker.js — Robust + Defensive (normalized fields, Timestamp-safe)

class StakeholderAppointments {
    constructor() {
        this.appointments = [];
        this.filteredAppointments = [];
        this.isLoading = false;
        this.debounceTimer = null;
        this.currentFilter = 'all';
        this.pendingCancelId = null;
    }

    // Init
    async init() {
        try {
            console.log('🚀 Initializing StakeholderAppointments...');
            const container = document.getElementById('appointmentsContainer');
            if (!container) {
                console.error('❌ CRITICAL: #appointmentsContainer not found in DOM');
                console.log('IDs on page:', Array.from(document.querySelectorAll('[id]')).map(e => e.id));
                return;
            }

            this.setLoadingState(true);
            await this.loadAppointments();

            console.log('📊 After loadAppointments:', {
                appointments: this.appointments.length,
                filtered: this.filteredAppointments.length
            });

            this.setupEventListeners();
            this.renderAll();
            console.log('✅ StakeholderAppointments initialized successfully');
        } catch (err) {
            console.error('❌ Failed to initialize appointments:', err);
            this.showEmptyState('Failed to load appointments. Please refresh the page.');
        } finally {
            this.setLoadingState(false);
        }
    }

    // Data Loading

    async loadAppointments() {
        const url = '/api/appointment/my-appointments';
        console.log('📡 GET', url);

        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            console.log('📥 Status:', res.status);
            if (!res.ok) {
                const text = await res.text();
                console.error('💥 Error payload:', text);
                throw new Error(`Failed to load appointments (HTTP ${res.status})`);
            }

            const ct = res.headers.get('content-type') || '';
            if (!ct.includes('application/json')) {
                const text = await res.text();
                console.error('⚠️ Non-JSON response:', text.slice(0, 500));
                throw new Error('Server returned non-JSON. Are you on the right page?');
            }

            const data = await res.json();
            console.log('📦 Raw response (truncated preview):', Array.isArray(data) ? `Array[${data.length}]` : data);

            if (!Array.isArray(data)) {
                console.error('❌ Response is not an array:', data);
                throw new Error('Invalid response format from server');
            }

            if (data.length === 0) {
                console.warn('⚠️ No appointments for this user.');
                this.appointments = [];
                this.filteredAppointments = [];
                return;
            }

            // Normalize -> Validate -> Store
            const normalized = data.map((raw, i) => {
                const m = this.normalizeAppointment(raw);
                console.log(`🔄 Normalized [${i + 1}/${data.length}]`, m);
                return m;
            });

            this.appointments = normalized.filter(a => this.validateAppointment(a));
            console.log('✨ Valid after filter:', this.appointments.length);

            if (this.appointments.length === 0 && data.length > 0) {
                console.error('❌ ALL APPOINTMENTS WERE FILTERED OUT!');
                console.log('🔎 Example raw item:', data[0]);
            }

            this.filteredAppointments = [...this.appointments];
        } catch (err) {
            console.error('❌ Error in loadAppointments:', err);
            throw err;
        }
    }

    async refresh() {
        console.log('🔄 Refreshing appointments...');
        await this.loadAppointments();
        this.applyFilter(this.currentFilter);
    }

    // Event Listeners
    setupEventListeners() {
        // Filter buttons
        const filterBtns = document.querySelectorAll('[data-filter]');
        console.log(`🎛️ Found ${filterBtns.length} filter buttons`);
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const value = btn.getAttribute('data-filter') || 'all';
                this.currentFilter = value;
                console.log('🔍 Filter set to:', value);
                this.applyFilter(value);
            });
        });

        // Cancel buttons (event delegation)
        document.addEventListener('click', (e) => {
            const cancelBtn = e.target.closest('[data-cancel-id]');
            if (cancelBtn) {
                e.preventDefault();
                const appointmentId = cancelBtn.getAttribute('data-cancel-id');
                console.log('🚫 Cancel pressed for:', appointmentId);
                this.showCancelModal(appointmentId);
            }
        });

        // Modal controls
        const closeModalBtn = document.getElementById('closeModal');
        const confirmCancelBtn = document.getElementById('confirmCancel');
        const cancelModal = document.getElementById('cancelModal');

        if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.hideCancelModal());
        if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', () => this.confirmCancelAppointment());
        if (cancelModal) {
            cancelModal.addEventListener('click', (e) => {
                if (e.target === cancelModal) this.hideCancelModal();
            });
        }

        // Settings menu (if present)
        const settingsBtn = document.getElementById('settings-btn');
        const settingsMenu = document.getElementById('settings-menu');
        if (settingsBtn && settingsMenu) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const hidden = settingsMenu.hasAttribute('hidden');
                if (hidden) {
                    settingsMenu.removeAttribute('hidden');
                    settingsBtn.setAttribute('aria-expanded', 'true');
                } else {
                    settingsMenu.setAttribute('hidden', '');
                    settingsBtn.setAttribute('aria-expanded', 'false');
                }
            });
            document.addEventListener('click', () => {
                settingsMenu.setAttribute('hidden', '');
                settingsBtn.setAttribute('aria-expanded', 'false');
            });
        }
    }

    // Filtering
    applyFilter(filterValue) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            this.filteredAppointments = this.appointments.filter(a => {
                const status = (a.Status || '').toLowerCase();

                if (filterValue === 'all') return true;

                if (filterValue === 'upcoming') {
                    const d = this.parseDate(a.Date);
                    return d >= today && ['pending', 'accepted', 'rescheduled'].includes(status);
                }

                if (['pending', 'completed', 'cancelled', 'accepted', 'declined', 'rescheduled'].includes(filterValue)) {
                    return status === filterValue;
                }

                return true;
            });

            // Sort by soonest first
            this.filteredAppointments.sort((x, y) => this.dateTimeMs(x) - this.dateTimeMs(y));

            console.log(`📋 Filtered -> ${this.filteredAppointments.length} items (filter=${filterValue})`);
            this.renderAll();
        }, 100);
    }

    // Rendering
    renderAll() {
        this.renderList();
        this.updateResultsCount();
    }

    renderList() {
        const container = document.getElementById('appointmentsContainer');
        if (!container) {
            console.error('❌ #appointmentsContainer not found');
            return;
        }

        container.innerHTML = '';

        if (this.filteredAppointments.length === 0) {
            this.showEmptyState('No appointments match your selected filter.');
            return;
        }

        console.log(`🎨 Rendering ${this.filteredAppointments.length} cards`);
        this.filteredAppointments.forEach(apt => {
            const card = this.createCard(apt);
            container.appendChild(card);
        });
    }

    createCard(apt) {
        const card = document.createElement('div');
        card.className = 'appointment-card';

        const badge = this.getStatusBadge(apt.Status);
        const fDate = this.formatLongDate(apt.Date);
        const fTime = this.formatTime(apt.Time);
        const duration = apt.Duration ? ` (${apt.Duration})` : '';
        const location = apt.Location ? this.escapeHtml(apt.Location) : '';

        const reschedNote = (apt.Status === 'rescheduled' && (apt.ProposedNewDate || apt.ProposedNewTime))
            ? `<div class="apt-note" style="margin-top: 12px; padding: 8px; background: #fff3cd; border-radius: 4px; font-size: 0.9em;">
                 <strong>Proposed reschedule:</strong> ${this.escapeHtml(apt.ProposedNewDate || '')} ${this.escapeHtml(this.formatTime(apt.ProposedNewTime || ''))}
               </div>`
            : '';

        const declineNote = (apt.Status === 'declined' && apt.DeclineReason)
            ? `<div class="apt-note" style="margin-top: 12px; padding: 8px; background: #f8d7da; border-radius: 4px; font-size: 0.9em;">
                 <strong>Decline reason:</strong> ${this.escapeHtml(apt.DeclineReason)}
               </div>`
            : '';

        const canCancel = ['pending', 'accepted'].includes((apt.Status || '').toLowerCase()) && this.isInFuture(apt.Date);

        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px;">
                <h3 style="margin:0;font-size:1.25rem;color:#1a1a1a;">${this.escapeHtml(apt.Title)}</h3>
                ${badge}
            </div>

            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
                <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:1.1rem;">
                    ${this.getInitials(apt.AdvisorName)}
                </div>
                <div>
                    <div style="font-weight:600;color:#1a1a1a;">${this.escapeHtml(apt.AdvisorName)}</div>
                    ${apt.AdvisorRole ? `<div style="font-size:.875rem;color:#6b7280;">${this.escapeHtml(apt.AdvisorRole)}</div>` : ''}
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;margin-bottom:16px;">
                <div>
                    <div style="font-size:.75rem;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Date</div>
                    <div style="font-weight:500;color:#1a1a1a;">${this.escapeHtml(fDate)}</div>
                </div>
                <div>
                    <div style="font-size:.75rem;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Time</div>
                    <div style="font-weight:500;color:#1a1a1a;">${this.escapeHtml(fTime + duration)}</div>
                </div>
                <div>
                    <div style="font-size:.75rem;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Location</div>
                    <div style="font-weight:500;color:#1a1a1a;">${location || '—'}</div>
                </div>
            </div>

            ${apt.Details ? `<div style="margin:16px 0;padding:12px;background:#f9fafb;border-radius:6px;font-size:.9em;color:#4b5563;">${this.escapeHtml(apt.Details)}</div>` : ''}
            ${reschedNote}
            ${declineNote}

            <div style="display:flex;gap:8px;margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;">
                <button class="btn-primary" style="flex:1;padding:10px 16px;background:#667eea;color:white;border:none;border-radius:6px;font-weight:500;cursor:pointer;transition:background .2s;"
                        onmouseover="this.style.background='#5568d3'" onmouseout="this.style.background='#667eea'">
                    View Details
                </button>
                ${canCancel
                ? `<button class="btn-secondary" data-cancel-id="${this.escapeHtml(apt.Id)}"
                               style="padding:10px 16px;background:white;color:#374151;border:1px solid #d1d5db;border-radius:6px;font-weight:500;cursor:pointer;transition:all .2s;"
                               onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">Cancel</button>`
                : `<button class="btn-secondary" disabled
                               style="padding:10px 16px;background:#f3f4f6;color:#9ca3af;border:1px solid #e5e7eb;border-radius:6px;font-weight:500;cursor:not-allowed;">Cancel</button>`}
            </div>
        `;

        return card;
    }

    showEmptyState(msg) {
        const container = document.getElementById('appointmentsContainer');
        if (!container) return;
        container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:#6b7280;">
                <div style="font-size:4rem;margin-bottom:16px;">📅</div>
                <h3 style="font-size:1.5rem;color:#1a1a1a;margin-bottom:8px;">No appointments found</h3>
                <p style="font-size:1rem;color:#6b7280;">${this.escapeHtml(msg)}</p>
            </div>
        `;
    }

    updateResultsCount() {
        const el = document.getElementById('resultsCount');
        if (!el) return;
        const count = this.filteredAppointments.length;
        el.textContent = `${count} appointment${count !== 1 ? 's' : ''} found`;
    }


    // Modal Actions

    showCancelModal(appointmentId) {
        this.pendingCancelId = appointmentId;
        const modal = document.getElementById('cancelModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            console.error('❌ #cancelModal not found');
        }
    }

    hideCancelModal() {
        this.pendingCancelId = null;
        const modal = document.getElementById('cancelModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    async confirmCancelAppointment() {
        if (!this.pendingCancelId) {
            console.warn('⚠️ No appointment ID to cancel');
            return;
        }
        try {
            console.log('🚫 Cancelling appointment:', this.pendingCancelId);
            const res = await fetch('/api/appointment/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                // If your API expects raw string, change to JSON.stringify(this.pendingCancelId)
                body: JSON.stringify({ id: this.pendingCancelId })
            });

            if (!res.ok) {
                const text = await res.text();
                console.error('❌ Cancel failed:', text);
                throw new Error(`Failed to cancel (HTTP ${res.status})`);
            }

            const result = await res.json().catch(() => ({}));
            console.log('✅ Cancel result:', result);

            this.hideCancelModal();
            await this.refresh();
        } catch (err) {
            console.error('❌ Error cancelling:', err);
            alert(err.message || 'Failed to cancel appointment. Please try again.');
            this.hideCancelModal();
        }
    }

    // Normalization & Validation

    // Convert raw API/Firebase doc into a consistent shape the UI expects.
    normalizeAppointment(raw) {
        // ID candidates
        const id =
            raw?.Id ?? raw?.id ?? raw?.ID ??
            raw?.AppointmentId ?? raw?.appointmentId ?? raw?.appointmentID ??
            raw?.DocumentId ?? raw?.documentId ?? raw?.docId;

        // Date candidates (string, ISO, or Firestore Timestamp)
        const rawDate =
            raw?.Date ?? raw?.date ?? raw?.AppointmentDate ?? raw?.appointmentDate ??
            raw?.ScheduledDate ?? raw?.scheduledDate ?? raw?.DateOnly ?? raw?.dateOnly ?? raw?.StartDate ?? raw?.startDate;

        // Time candidates
        const rawTime =
            raw?.Time ?? raw?.time ?? raw?.AppointmentTime ?? raw?.appointmentTime ??
            raw?.ScheduledTime ?? raw?.scheduledTime ?? raw?.TimeOnly ?? raw?.timeOnly ?? raw?.StartTime ?? raw?.startTime;

        const toDateString = (d) => {
            try {
                if (!d) return undefined;

                // Firestore Timestamp (has toDate())
                if (typeof d === 'object' && d.toDate) {
                    return d.toDate().toISOString().slice(0, 10);
                }
                // Timestamp-like object with seconds/_seconds
                if (typeof d === 'object' && (d._seconds || d.seconds)) {
                    const secs = d._seconds ?? d.seconds;
                    return new Date(secs * 1000).toISOString().slice(0, 10);
                }
                if (typeof d === 'string') {
                    // dd/mm/yyyy -> yyyy-mm-dd
                    const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
                    // ISO with time -> keep date part
                    if (d.length > 10 && d.includes('T')) return d.slice(0, 10);
                    // assume yyyy-mm-dd
                    return d;
                }
                return undefined;
            } catch {
                return undefined;
            }
        };

        const toTimeString = (t) => {
            if (!t) return undefined;
            if (typeof t === 'string') {
                // "14:30", "14:30:00", "2:30 PM", "2024-01-01T14:30:00Z"
                const hhmm = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(\s?[AP]M)?$/i);
                if (hhmm) {
                    let h = parseInt(hhmm[1], 10);
                    const m = hhmm[2];
                    const ampm = (hhmm[3] || '').trim().toUpperCase();
                    if (ampm === 'PM' && h < 12) h += 12;
                    if (ampm === 'AM' && h === 12) h = 0;
                    return `${String(h).padStart(2, '0')}:${m}`;
                }
                if (t.includes('T')) {
                    const m = t.match(/T(\d{2}):(\d{2})/);
                    if (m) return `${m[1]}:${m[2]}`;
                }
            }
            return undefined;
        };

        const dateStr = toDateString(rawDate);
        const timeStr = toTimeString(rawTime);

        const status = (raw?.Status ?? raw?.status ?? raw?.AppointmentStatus ?? raw?.appointmentStatus ?? 'pending')
            .toString()
            .toLowerCase();

        return {
            Id: id,
            Title: raw?.Reason ?? raw?.reason ?? raw?.Title ?? raw?.title ?? 'Appointment',
            AdvisorName: raw?.AdvisorName ?? raw?.advisorName ?? raw?.Advisor ?? raw?.advisor ?? 'Advisor',
            AdvisorRole: raw?.AdvisorRole ?? raw?.advisorRole ?? '',
            Date: dateStr,        // yyyy-mm-dd
            Time: timeStr,        // HH:MM (optional)
            Duration: raw?.Duration ?? raw?.duration ?? '30 mins',
            Location: raw?.Location ?? raw?.location ?? (raw?.AppointmentType === 'online' ? 'Online Meeting' : ''),
            Status: status,
            Details: raw?.Details ?? raw?.details ?? '',
            ProposedNewDate: raw?.ProposedNewDate ?? raw?.proposedNewDate ?? '',
            ProposedNewTime: raw?.ProposedNewTime ?? raw?.proposedNewTime ?? '',
            DeclineReason: raw?.DeclineReason ?? raw?.declineReason ?? ''
        };
    }

    validateAppointment(a) {
        const ok = !!(a && a.Id && a.Date);
        if (!ok) {
            console.warn('⚠️ Invalid appointment (needs Id & Date):', { Id: a?.Id, Date: a?.Date, item: a });
        }
        return ok;
    }


    // Date/Time Helpers
    parseDate(dateStr) {
        if (!dateStr) return new Date(NaN);
        try {
            // normalized to yyyy-mm-dd; still accept full ISO
            if (dateStr.length > 10 && dateStr.includes('T')) return new Date(dateStr);
            return new Date(`${dateStr}T00:00:00`);
        } catch {
            return new Date(NaN);
        }
    }

    parseTimeMs(timeStr) {
        if (!timeStr) return 0;
        const [hh, mm] = String(timeStr).split(':').map(v => parseInt(v, 10));
        if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
        return (hh * 60 + mm) * 60 * 1000;
    }

    dateTimeMs(a) {
        const d = this.parseDate(a.Date);
        if (isNaN(d)) return Number.MAX_SAFE_INTEGER;
        const timeMs = this.parseTimeMs(a.Time);
        return d.setHours(0, 0, 0, 0) + timeMs;
    }

    isInFuture(dateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = this.parseDate(dateStr);
        d.setHours(0, 0, 0, 0);
        return d >= today;
    }

    formatLongDate(dateStr) {
        const d = this.parseDate(dateStr);
        if (isNaN(d)) return 'Invalid date';
        return d.toLocaleDateString('en-ZA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        // If you prefer yyyy-mm-dd: return dateStr;
    }

    formatTime(timeStr) {
        if (!timeStr) return '—';
        const [hh, mm] = String(timeStr).split(':');
        const h = parseInt(hh, 10);
        if (Number.isNaN(h)) return timeStr;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = (h % 12) || 12;
        return `${h12}:${mm} ${ampm}`;
    }

    // UI Helpers    
    getStatusBadge(status) {
        const s = (status || '').toLowerCase();
        const base = 'padding:6px 12px;border-radius:20px;font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px;';
        const map = {
            pending: `<span style="${base}background:#fef3c7;color:#92400e;">Pending</span>`,
            accepted: `<span style="${base}background:#d1fae5;color:#065f46;">Accepted</span>`,
            declined: `<span style="${base}background:#fee2e2;color:#991b1b;">Declined</span>`,
            rescheduled: `<span style="${base}background:#e0e7ff;color:#3730a3;">Rescheduled</span>`,
            completed: `<span style="${base}background:#d1fae5;color:#065f46;">Completed</span>`,
            cancelled: `<span style="${base}background:#f3f4f6;color:#374151;">Cancelled</span>`
        };
        return map[s] || `<span style="${base}background:#f3f4f6;color:#6b7280;">Unknown</span>`;
    }

    getInitials(name) {
        if (!name) return 'NA';
        const parts = name.trim().split(/\s+/);
        const first = parts[0]?.[0] || '';
        const last = parts[parts.length - 1]?.[0] || '';
        return (first + last).toUpperCase();
    }

    setLoadingState(loading) {
        this.isLoading = loading;
        const container = document.getElementById('appointmentsContainer');
        const resultsCount = document.getElementById('resultsCount');

        if (resultsCount) {
            resultsCount.textContent = loading ? 'Loading appointments...' : '';
        }

        if (container && loading) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:#6b7280;">
                    <div style="font-size:3rem;margin-bottom:16px;">⏳</div>
                    <p style="font-size:1.1rem;">Loading appointments...</p>
                </div>
            `;
        }
    }

    escapeHtml(unsafe) {
        if (unsafe == null) return '';
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}


// Auto-initialize
let stakeholderApt;
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('appointmentsContainer');
    if (!container) {
        console.warn('⚠️ No #appointmentsContainer found — not initializing StakeholderAppointments.');
        return;
    }
    stakeholderApt = new StakeholderAppointments();
    stakeholderApt.init();
});
