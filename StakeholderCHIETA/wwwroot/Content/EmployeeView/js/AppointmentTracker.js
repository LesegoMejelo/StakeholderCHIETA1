// AppointmentTracker.js
class AppointmentTracker {
    constructor() {
        this.appointments = [];
        this.filteredAppointments = [];
        this.currentAppointment = null;
        this.init();
    }

    async init() {
        try {
            await this.loadAppointments();
            this.setupEventListeners();
            this.renderUpcomingAppointments();
            this.renderAppointmentsTable();
            this.updateResultsCount();
        } catch (error) {
            console.error('Error initializing appointment tracker:', error);
            this.showError('Failed to load appointments');
        }
    }

    async loadAppointments() {
        try {
            console.log('Fetching appointments...');
            const response = await fetch('/AdvisorAppointment/AppointmentTrackerData', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.appointments = await response.json();
            this.filteredAppointments = [...this.appointments];
            console.log('Appointments loaded:', this.appointments);

        } catch (error) {
            console.error('Error loading appointments:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Filter event listeners
        document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('typeFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());

        // Modal event listeners
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        document.getElementById('closeInfoModal').addEventListener('click', () => this.closeModal('infoModal'));
        document.getElementById('cancelDecision').addEventListener('click', () => this.closeModal('decisionModal'));
        document.getElementById('submitDecision').addEventListener('click', () => this.submitDecision());

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    }

    renderUpcomingAppointments() {
        const container = document.getElementById('upcomingAppointments');

        // Get upcoming appointments (next 7 days, accepted status)
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const upcomingAppointments = this.appointments
            .filter(apt => {
                if (apt.Status !== 'Accepted') return false;

                const aptDate = this.parseDate(apt.Date);
                return aptDate >= today && aptDate <= nextWeek;
            })
            .sort((a, b) => {
                const dateA = this.parseDate(a.Date);
                const dateB = this.parseDate(b.Date);
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA - dateB;
                }
                return a.Time.localeCompare(b.Time);
            })
            .slice(0, 3); // Show only next 3

        if (upcomingAppointments.length === 0) {
            container.innerHTML = '<div class="no-upcoming">No upcoming appointments in the next 7 days</div>';
            return;
        }

        container.innerHTML = upcomingAppointments.map(apt => `
            <div class="upcoming-card">
                <div class="upcoming-header">
                    <div class="upcoming-client">${apt.ClientName}</div>
                    <div class="upcoming-time">${this.formatTime(apt.Time)}</div>
                </div>
                <div class="upcoming-date">${this.formatDate(apt.Date)}</div>
                <div class="upcoming-reason">${apt.Reason || 'No reason specified'}</div>
            </div>
        `).join('');
    }

    renderAppointmentsTable() {
        const tbody = document.getElementById('appointmentsTableBody');

        if (this.filteredAppointments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-appointments">No appointments found matching your filters</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredAppointments.map(apt => `
            <tr>
                <td>
                    <div class="stakeholder-info">
                        <div class="stakeholder-name">${apt.ClientName}</div>
                        <div class="stakeholder-id">ID: ${apt.Id.substring(0, 8)}...</div>
                    </div>
                </td>
                <td>
                    <div class="datetime-info">
                        <div class="appointment-date">${this.formatDate(apt.Date)}</div>
                        <div class="appointment-time">${this.formatTime(apt.Time)}</div>
                    </div>
                </td>
                <td>
                    <span class="appointment-type">${this.determineAppointmentType(apt)}</span>
                </td>
                <td>
                    <div class="advisor-name">${apt.AdvisorName || 'Not assigned'}</div>
                </td>
                <td>
                    <span class="status-badge status-${apt.Status.toLowerCase()}">${apt.Status}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-info" onclick="appointmentTracker.showInfo('${apt.Id}')">
                            Info
                        </button>
                        ${apt.Status === 'Pending' ? `
                            <button class="action-btn btn-success" onclick="appointmentTracker.showDecision('${apt.Id}', 'accept')">
                                Accept
                            </button>
                            <button class="action-btn btn-danger" onclick="appointmentTracker.showDecision('${apt.Id}', 'decline')">
                                Decline
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    applyFilters() {
        const statusFilter = document.getElementById('statusFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;

        this.filteredAppointments = this.appointments.filter(apt => {
            // Status filter
            if (statusFilter !== 'all' && apt.Status.toLowerCase() !== statusFilter.toLowerCase()) {
                return false;
            }

            // Type filter (this is a placeholder - you might need to add type field to your appointments)
            if (typeFilter !== 'all') {
                const appointmentType = this.determineAppointmentType(apt).toLowerCase();
                if (appointmentType !== typeFilter) {
                    return false;
                }
            }

            // Date filter
            if (dateFilter !== 'all') {
                const aptDate = this.parseDate(apt.Date);
                const today = new Date();
                const filterDate = new Date();
                filterDate.setDate(today.getDate() + parseInt(dateFilter));

                if (aptDate > filterDate) {
                    return false;
                }
            }

            return true;
        });

        this.renderAppointmentsTable();
        this.updateResultsCount();
    }

    clearFilters() {
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('typeFilter').value = 'all';
        document.getElementById('dateFilter').value = 'all';
        this.applyFilters();
    }

    updateResultsCount() {
        const count = this.filteredAppointments.length;
        const total = this.appointments.length;
        document.getElementById('resultsCount').textContent =
            `Showing ${count} of ${total} appointment${total !== 1 ? 's' : ''}`;
    }

    showInfo(appointmentId) {
        const appointment = this.appointments.find(apt => apt.Id === appointmentId);
        if (!appointment) return;

        // Populate modal with appointment details
        document.getElementById('detail-stakeholder').textContent = appointment.ClientName;
        document.getElementById('detail-date').textContent = this.formatDate(appointment.Date);
        document.getElementById('detail-time').textContent = this.formatTime(appointment.Time);
        document.getElementById('detail-type').textContent = this.determineAppointmentType(appointment);
        document.getElementById('detail-advisor').textContent = appointment.AdvisorName || 'Not assigned';
        document.getElementById('detail-status').innerHTML = `<span class="status-badge status-${appointment.Status.toLowerCase()}">${appointment.Status}</span>`;
        document.getElementById('detail-reason').textContent = appointment.Reason || 'No reason specified';
        document.getElementById('detail-details').textContent = appointment.Details || 'No additional details provided';

        this.showModal('infoModal');
    }

    showDecision(appointmentId, decision) {
        this.currentAppointment = this.appointments.find(apt => apt.Id === appointmentId);
        if (!this.currentAppointment) return;

        // Populate decision modal
        document.getElementById('decision-stakeholder').textContent = this.currentAppointment.ClientName;
        document.getElementById('decision-date').textContent = this.formatDate(this.currentAppointment.Date);
        document.getElementById('decision-time').textContent = this.formatTime(this.currentAppointment.Time);

        const isAccepting = decision === 'accept';
        document.getElementById('decisionModalTitle').textContent = isAccepting ? 'Accept Appointment' : 'Decline Appointment';

        // Show/hide sections based on decision
        document.getElementById('acceptMessage').style.display = isAccepting ? 'block' : 'none';
        document.getElementById('reasonSection').style.display = isAccepting ? 'none' : 'block';
        document.getElementById('rescheduleSection').style.display = 'none';

        // Set minimum date for rescheduling
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('newDate').min = tomorrow.toISOString().split('T')[0];

        // Store decision type
        document.getElementById('submitDecision').dataset.decision = decision;

        this.showModal('decisionModal');
    }

    async submitDecision() {
        const decision = document.getElementById('submitDecision').dataset.decision;
        const appointmentId = this.currentAppointment.Id;

        let requestData = {
            appointmentId: appointmentId,
            status: decision === 'accept' ? 'accepted' : 'declined'
        };

        if (decision === 'decline') {
            const reason = document.getElementById('responseReason').value.trim();
            if (!reason) {
                alert('Please provide a reason for declining the appointment.');
                return;
            }
            requestData.declineReason = reason;

            const newDate = document.getElementById('newDate').value;
            const newTime = document.getElementById('newTime').value;
            if (newDate && newTime) {
                requestData.newDate = newDate;
                requestData.newTime = newTime;
            }
        }

        try {
            const formData = new FormData();
            Object.keys(requestData).forEach(key => {
                formData.append(key, requestData[key]);
            });

            const response = await fetch('/AdvisorAppointment/UpdateStatus', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess(`Appointment ${decision === 'accept' ? 'accepted' : 'declined'} successfully!`);
                this.closeModal('decisionModal');
                await this.loadAppointments();
                this.renderUpcomingAppointments();
                this.renderAppointmentsTable();
                this.updateResultsCount();
            } else {
                throw new Error(result.message || 'Failed to update appointment');
            }
        } catch (error) {
            console.error('Error updating appointment:', error);
            alert('Failed to update appointment. Please try again.');
        }
    }

    // Helper methods
    parseDate(dateString) {
        // Assuming date format is YYYY-MM-DD or similar
        return new Date(dateString);
    }

    formatDate(dateString) {
        if (!dateString) return 'No date';
        const date = this.parseDate(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTime(timeString) {
        if (!timeString) return 'No time';
        // Convert 24-hour format to 12-hour format if needed
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    determineAppointmentType(appointment) {
        // Check if AppointmentType field exists, otherwise default to 'Online'
        if (appointment.AppointmentType) {
            return appointment.AppointmentType === 'online' ? 'Online' : 'In-Person';
        }
        return appointment.Type || 'Online'; // Fallback for older appointments
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        document.body.style.overflow = 'auto';

        // Clear form fields
        if (modalId === 'decisionModal') {
            document.getElementById('responseReason').value = '';
            document.getElementById('newDate').value = '';
            document.getElementById('newTime').value = '';
        }
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
    }

    showSuccess(message) {
        // You can replace this with a proper toast/notification system
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        // You can replace this with a proper toast/notification system
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
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
            await appointmentTracker.loadAppointments();
            appointmentTracker.renderUpcomingAppointments();
            appointmentTracker.renderAppointmentsTable();
            appointmentTracker.updateResultsCount();
        } catch (error) {
            console.error('Error refreshing appointments:', error);
        }
    }
}