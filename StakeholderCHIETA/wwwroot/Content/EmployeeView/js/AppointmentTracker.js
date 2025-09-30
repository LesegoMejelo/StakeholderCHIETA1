// AppointmentTracker.js
class AppointmentTracker {
    constructor() {
        this.appointments = [];
        this.filteredAppointments = [];
        this.currentAppointment = null;
        this.currentAction = null;
        this.isLoading = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.debounceTimer = null;
        this.cache = new Map();
        this.lastFetchTime = 0;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        this.escapeHandler = null;
    }

    async init() {
        try {
            this.setLoadingState(true);
            await this.loadAppointments();
            this.setupEventListeners();
            this.setupSearch();
            this.renderAll();
        } catch (error) {
            console.error('Error initializing appointment tracker:', error);
            this.showNotification('Failed to load appointments. Please refresh the page.', 'error', 5000);

            // Retry logic
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                setTimeout(() => this.init(), 2000 * this.retryCount);
            }
        } finally {
            this.setLoadingState(false);
        }
    }

    async loadAppointments(forceRefresh = false) {
        try {
            const now = Date.now();
            const shouldUseCache = !forceRefresh &&
                (now - this.lastFetchTime < this.CACHE_DURATION) &&
                this.cache.has('appointments');

            if (shouldUseCache) {
                this.appointments = this.cache.get('appointments');
                this.filteredAppointments = [...this.appointments];
                return;
            }

            console.log('Fetching appointments...');
            const response = await fetch('/AdvisorAppointment/AppointmentTrackerData', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Validate and filter appointments
            this.appointments = data.filter(apt => this.validateAppointmentData(apt));
            this.filteredAppointments = [...this.appointments];

            // Cache the results
            this.cache.set('appointments', this.appointments);
            this.lastFetchTime = now;

            if (data.length !== this.appointments.length) {
                console.warn(`Filtered out ${data.length - this.appointments.length} invalid appointments`);
            }

        } catch (error) {
            console.error('Error loading appointments:', error);

            // Try to use cached data if available
            if (this.cache.has('appointments')) {
                this.appointments = this.cache.get('appointments');
                this.filteredAppointments = [...this.appointments];
                this.showNotification('Using cached data - connection issue', 'warning', 5000);
            } else {
                throw error;
            }
        }
    }

    setupEventListeners() {
        // Filter event listeners with debouncing
        document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('typeFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());

        // Modal event listeners
        document.querySelectorAll('.close-modal, #closeInfoModal, #cancelDecision').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Submit decision button
        document.getElementById('submitDecision').addEventListener('click', () => this.submitDecision());

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });

        // Export functionality
        const exportBtn = document.createElement('button');
        exportBtn.textContent = 'Export CSV';
        exportBtn.className = 'action-btn btn-export';
        exportBtn.addEventListener('click', () => this.exportToCSV());
        document.querySelector('.filter-container').appendChild(exportBtn);
    }

    setupSearch() {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search appointments...';
        searchInput.className = 'search-input';
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        const filterContainer = document.querySelector('.filter-container');
        filterContainer.appendChild(searchInput);
    }

    handleSearch(query) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            if (!query.trim()) {
                this.filteredAppointments = [...this.appointments];
            } else {
                const normalizedQuery = this.normalizeString(query);
                this.filteredAppointments = this.appointments.filter(apt =>
                    this.normalizeString(apt.ClientName).includes(normalizedQuery) ||
                    this.normalizeString(apt.Reason || '').includes(normalizedQuery) ||
                    this.normalizeString(apt.AdvisorName || '').includes(normalizedQuery) ||
                    this.normalizeString(apt.Email || '').includes(normalizedQuery)
                );
            }
            this.scheduleRender();
        }, 300);
    }

    applyFilters() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this._applyFiltersImmediate();
        }, 300);
    }

    _applyFiltersImmediate() {
        const statusValue = document.getElementById('statusFilter').value;
        const typeValue = document.getElementById('typeFilter').value;
        const dateValue = document.getElementById('dateFilter').value;

        this.filteredAppointments = this.appointments.filter(appointment => {
            // Status filter
            if (statusValue !== 'all' &&
                !this.normalizeString(appointment.Status).includes(this.normalizeString(statusValue))) {
                return false;
            }

            // Type filter
            if (typeValue !== 'all') {
                const appointmentType = this.determineAppointmentType(appointment);
                if (this.normalizeString(appointmentType) !== this.normalizeString(typeValue)) {
                    return false;
                }
            }

            // Date filter
            if (dateValue !== 'all') {
                if (!this.matchesDateFilter(appointment.Date, dateValue)) {
                    return false;
                }
            }

            return true;
        });

        this.scheduleRender();
    }

    matchesDateFilter(appointmentDate, dateFilter) {
        const days = parseInt(dateFilter);
        const cutoffDate = new Date();
        const aptDate = this.parseDate(appointmentDate);

        if (aptDate < cutoffDate) {
            return false;
        }

        const diffTime = Math.abs(aptDate - cutoffDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays <= days;
    }

    renderAll() {
        this.renderUpcomingAppointments();
        this.renderAppointmentsTable();
        this.updateResultsCount();
    }

    scheduleRender() {
        requestAnimationFrame(() => {
            this.renderAppointmentsTable();
            this.updateResultsCount();
        });
    }

    renderUpcomingAppointments() {
        const container = document.getElementById('upcomingAppointments');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = this.appointments
            .filter(appointment => {
                const appointmentDate = this.parseDate(appointment.Date);
                return (appointment.Status === 'accepted' || appointment.Status === 'rescheduled') &&
                    appointmentDate >= today;
            })
            .sort((a, b) => this.parseDate(a.Date) - this.parseDate(b.Date));

        container.innerHTML = '';

        if (upcoming.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--muted)">
                    No upcoming appointments
                </div>
            `;
        } else {
            upcoming.forEach(appointment => {
                const card = document.createElement('div');
                card.className = `upcoming-card ${appointment.Status}`;

                const dateObj = this.parseDate(appointment.Date);
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                });

                card.innerHTML = `
                    <div class="upcoming-card-header">
                        <h3 class="upcoming-card-title">${appointment.ClientName}</h3>
                        <div class="upcoming-card-date">${formattedDate}</div>
                    </div>
                    <div class="upcoming-card-details">
                        <div class="upcoming-card-detail"><b>Time:</b> ${this.formatTime(appointment.Time)}</div>
                        <div class="upcoming-card-detail"><b>Type:</b> ${this.determineAppointmentType(appointment)}</div>
                        <div class="upcoming-card-detail"><b>Advisor:</b> ${appointment.AdvisorName}</div>
                        <div class="upcoming-card-detail"><b>Reason:</b> ${appointment.Reason}</div>
                    </div>
                `;

                container.appendChild(card);
            });
        }
    }

    renderAppointmentsTable() {
        const tbody = document.getElementById('appointmentsTableBody');

        if (this.filteredAppointments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: var(--muted)">
                        No appointments match your current filters
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredAppointments.map(appointment => {
            const statusBadge = this.getStatusBadge(appointment.Status);
            const dateObj = this.parseDate(appointment.Date);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
            });

            return `
                <tr>
                    <td>${appointment.ClientName}<br><small>${appointment.Email}</small></td>
                    <td>${formattedDate}<br>${this.formatTime(appointment.Time)}</td>
                    <td>${this.determineAppointmentType(appointment)}</td>
                    <td>${appointment.AdvisorName}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="action-group">
                            <button class="action-btn btn-info" data-action="info" data-id="${appointment.Id}">Info</button>
                            ${appointment.Status === 'pending' ? `
                                <button class="action-btn btn-accept" data-action="accept" data-id="${appointment.Id}">Accept</button>
                                <button class="action-btn btn-decline" data-action="decline" data-id="${appointment.Id}">Decline</button>
                                <button class="action-btn btn-reschedule" data-action="reschedule" data-id="${appointment.Id}">Reschedule</button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners to action buttons
        this.attachActionListeners();
    }

    attachActionListeners() {
        document.querySelectorAll('[data-action="info"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const appointmentId = e.target.dataset.id;
                this.showAppointmentInfo(appointmentId);
            });
        });

        document.querySelectorAll('[data-action="accept"], [data-action="decline"], [data-action="reschedule"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const appointmentId = e.target.dataset.id;
                this.showDecisionModal(action, appointmentId);
            });
        });
    }

    updateResultsCount() {
        const count = this.filteredAppointments.length;
        const total = this.appointments.length;
        document.getElementById('resultsCount').textContent =
            `Showing ${count} of ${total} appointment${total !== 1 ? 's' : ''}`;
    }

    clearFilters() {
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('typeFilter').value = 'all';
        document.getElementById('dateFilter').value = 'all';
        document.querySelector('.search-input').value = '';
        this.applyFilters();
    }

    showAppointmentInfo(appointmentId) {
        const appointment = this.appointments.find(a => a.Id === appointmentId);
        if (!appointment) return;

        document.getElementById('detail-stakeholder').textContent =
            `${appointment.ClientName} (${appointment.Email})`;

        const dateObj = this.parseDate(appointment.Date);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        document.getElementById('detail-date').textContent = formattedDate;
        document.getElementById('detail-time').textContent = this.formatTime(appointment.Time);
        document.getElementById('detail-type').textContent = this.determineAppointmentType(appointment);
        document.getElementById('detail-advisor').textContent = appointment.AdvisorName;

        let statusText = '';
        switch (appointment.Status.toLowerCase()) {
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
                statusText = `Rescheduled to ${appointment.RescheduledTo || 'new time'}`;
                break;
        }
        document.getElementById('detail-status').textContent = statusText;

        document.getElementById('detail-reason').textContent = appointment.Reason;
        document.getElementById('detail-details').textContent =
            appointment.Details || 'No additional details provided';

        this.showModal('infoModal');
    }

    showDecisionModal(action, appointmentId) {
        const appointment = this.appointments.find(a => a.Id === appointmentId);
        if (!appointment) return;

        this.currentAction = action;
        this.currentAppointment = appointment;

        let modalTitle = '';
        switch (action) {
            case 'accept':
                modalTitle = 'Accept Appointment';
                document.getElementById('submitDecision').textContent = 'Accept Appointment';
                document.getElementById('submitDecision').className = 'action-btn btn-accept';
                document.getElementById('acceptMessage').style.display = 'block';
                document.getElementById('reasonSection').style.display = 'none';
                document.getElementById('rescheduleSection').style.display = 'none';
                break;
            case 'decline':
                modalTitle = 'Decline Appointment';
                document.getElementById('submitDecision').textContent = 'Decline Appointment';
                document.getElementById('submitDecision').className = 'action-btn btn-decline';
                document.getElementById('acceptMessage').style.display = 'none';
                document.getElementById('reasonSection').style.display = 'block';
                document.getElementById('rescheduleSection').style.display = 'none';
                break;
            case 'reschedule':
                modalTitle = 'Reschedule Appointment';
                document.getElementById('submitDecision').textContent = 'Propose New Time';
                document.getElementById('submitDecision').className = 'action-btn btn-reschedule';
                document.getElementById('acceptMessage').style.display = 'none';
                document.getElementById('reasonSection').style.display = 'block';
                document.getElementById('rescheduleSection').style.display = 'block';
                break;
        }

        document.getElementById('decisionModalTitle').textContent = modalTitle;
        document.getElementById('decision-stakeholder').textContent =
            `${appointment.ClientName} (${appointment.Email})`;

        const dateObj = this.parseDate(appointment.Date);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        document.getElementById('decision-date').textContent = formattedDate;
        document.getElementById('decision-time').textContent = this.formatTime(appointment.Time);

        if (action === 'reschedule') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const yyyy = tomorrow.getFullYear();
            const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const dd = String(tomorrow.getDate()).padStart(2, '0');
            const tomorrowStr = `${yyyy}-${mm}-${dd}`;
            document.getElementById('newDate').min = tomorrowStr;
        }

        // Clear form fields
        document.getElementById('responseReason').value = '';
        document.getElementById('newDate').value = '';
        document.getElementById('newTime').value = '';

        this.showModal('decisionModal');
    }

    async submitDecision() {
        const submitBtn = document.getElementById('submitDecision');
        const originalText = submitBtn.textContent;

        try {
            this.setLoadingState(true);
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';

            const validationError = this.validateDecision(this.currentAction);
            if (validationError) {
                throw new Error(validationError);
            }

            const formData = this.buildDecisionFormData();

            const response = await fetch('/AdvisorAppointment/UpdateStatus', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showNotification(
                    `Appointment ${this.currentAction === 'accept' ? 'accepted' : this.currentAction + 'd'} successfully!`,
                    'success'
                );
                this.closeModals();
                await this.loadAppointments(true); // Force refresh
                this.renderAll();
            } else {
                throw new Error(result.message || 'Failed to update appointment');
            }

        } catch (error) {
            console.error('Error updating appointment:', error);
            this.showNotification(
                error.message || 'Failed to update appointment. Please try again.',
                'error',
                5000
            );
        } finally {
            this.setLoadingState(false);
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    validateDecision(action) {
        if (action === 'decline' || action === 'reschedule') {
            const reason = document.getElementById('responseReason').value.trim();
            if (!reason) {
                return 'Please provide a reason for your decision.';
            }
            if (reason.length < 10) {
                return 'Please provide a more detailed reason (at least 10 characters).';
            }
        }

        if (action === 'reschedule') {
            const newDate = document.getElementById('newDate').value;
            const newTime = document.getElementById('newTime').value;

            if (!newDate || !newTime) {
                return 'Please select both a date and time for the rescheduled appointment.';
            }
        }

        return null;
    }

    buildDecisionFormData() {
        const formData = new FormData();
        formData.append('appointmentId', this.currentAppointment.Id);
        formData.append('status', this.currentAction === 'accept' ? 'accepted' : this.currentAction + 'd');

        if (this.currentAction === 'decline' || this.currentAction === 'reschedule') {
            const reason = document.getElementById('responseReason').value.trim();
            formData.append('reason', reason);
        }

        if (this.currentAction === 'reschedule') {
            const newDate = document.getElementById('newDate').value;
            const newTime = document.getElementById('newTime').value;
            formData.append('newDate', newDate);
            formData.append('newTime', newTime);
        }

        return formData;
    }

    // Helper Methods
    validateAppointmentData(appointment) {
        const requiredFields = ['Id', 'ClientName', 'Date', 'Time', 'Status'];
        const missingFields = requiredFields.filter(field => !appointment[field]);

        if (missingFields.length > 0) {
            console.warn('Invalid appointment data - missing fields:', missingFields, appointment);
            return false;
        }

        // Validate date format
        if (isNaN(this.parseDate(appointment.Date))) {
            console.warn('Invalid date format:', appointment.Date);
            return false;
        }

        return true;
    }

    parseDate(dateString) {
        return new Date(dateString);
    }

    formatTime(timeString) {
        if (!timeString) return 'No time';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    determineAppointmentType(appointment) {
        if (appointment.AppointmentType) {
            return appointment.AppointmentType === 'online' ? 'Online' : 'In-Person';
        }
        return appointment.Type || 'Online';
    }

    getStatusBadge(status) {
        const statusLower = status.toLowerCase();
        switch (statusLower) {
            case 'pending':
                return `<span class="status-badge status-pending">Pending</span>`;
            case 'accepted':
                return `<span class="status-badge status-accepted">Accepted</span>`;
            case 'declined':
                return `<span class="status-badge status-declined">Declined</span>`;
            case 'rescheduled':
                return `<span class="status-badge status-rescheduled">Rescheduled</span>`;
            default:
                return `<span class="status-badge">${status}</span>`;
        }
    }

    normalizeString(str) {
        return String(str).toLowerCase().trim();
    }

    setLoadingState(loading) {
        this.isLoading = loading;
        document.body.classList.toggle('loading', loading);
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.disabled = loading;
        });
    }

    showModal(modalId) {
        this.closeModals();
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Focus management for accessibility
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        // Escape key to close
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') this.closeModals();
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        });
        document.body.style.overflow = 'auto';

        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
    }

    showNotification(message, type = 'success', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✓' : '⚠'}</span>
                <span class="notification-message">${this.escapeHtml(message)}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            padding: 0;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.animation = 'slideOutRight 0.3s ease-in';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }

        return notification;
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    exportToCSV() {
        const headers = ['Client Name', 'Email', 'Date', 'Time', 'Type', 'Advisor', 'Status', 'Reason'];
        const csvData = this.filteredAppointments.map(apt => [
            apt.ClientName,
            apt.Email,
            apt.Date,
            apt.Time,
            this.determineAppointmentType(apt),
            apt.AdvisorName,
            apt.Status,
            apt.Reason || ''
        ]);

        const csvContent = [headers, ...csvData]
            .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `appointments-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('Appointments exported successfully!', 'success');
    }
}

// Initialize when page loads
let appointmentTracker;
document.addEventListener('DOMContentLoaded', function () {
    appointmentTracker = new AppointmentTracker();
});

// Refresh appointments function (can be called externally)
async function refreshAppointments() {
    if (appointmentTracker) {
        try {
            await appointmentTracker.loadAppointments(true);
            appointmentTracker.renderAll();
        } catch (error) {
            console.error('Error refreshing appointments:', error);
        }
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .loading .action-btn {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .search-input {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-left: 10px;
        font-size: 14px;
    }
    
    .btn-export {
        background: #6c757d;
        margin-left: 10px;
    }
    
    .btn-export:hover {
        background: #5a6268;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        padding: 12px 16px;
    }
    
    .notification-icon {
        margin-right: 8px;
        font-weight: bold;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        margin-left: auto;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
`;
document.head.appendChild(style);