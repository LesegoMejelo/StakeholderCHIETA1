// TrackAnInquiry.js - Stakeholder View (Fixed to show advisor updates)
class InquiryHistory {
    constructor() {
        this.inquiries = [];
        this.filteredInquiries = [];
        this.isLoading = false;
        this.debounceTimer = null;
    }

    async init() {
        try {
            console.log('Initializing InquiryHistory...');
            this.setLoadingState(true);
            await this.loadInquiries();
            this.setupEventListeners();
            this.renderAll();
            console.log('InquiryHistory initialized successfully');
        } catch (error) {
            console.error('Error initializing inquiry history:', error);
            this.showEmptyState('Failed to load inquiries. Please refresh the page.');
        } finally {
            this.setLoadingState(false);
        }
    }

    async loadInquiries() {
        try {
            console.log('Fetching inquiries from server...');
            const response = await fetch('/api/inquiry/stakeholder', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Received data:', data);

            // FIXED: Map backend response with description and updates
            this.inquiries = data.map(inq => ({
                Id: inq.id,
                ReferenceNumber: inq.reference,
                Subject: inq.subject,
                Category: inq.inquiryType,
                Status: inq.status,
                Description: inq.description || '', // FIXED: Now included from backend
                SubmittedAt: inq.date,
                LastUpdated: inq.date,
                Updates: Array.isArray(inq.updates) ? inq.updates : [], // FIXED: Now included from backend
                AssignedTo: inq.assignedTo
            })).filter(inq => this.validateInquiryData(inq));

            this.filteredInquiries = [...this.inquiries];

            console.log('Valid inquiries loaded:', this.inquiries.length);
            console.log('Sample inquiry with updates:', this.inquiries[0]); // Debug log

        } catch (error) {
            console.error('Error loading inquiries:', error);
            throw error;
        }
    }

    setupEventListeners() {
        const statusFilter = document.getElementById('statusFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        const dateFilter = document.getElementById('dateFilter');
        const sortSelect = document.getElementById('sortSelect');
        const clearFilters = document.getElementById('clearFilters');

        if (statusFilter) statusFilter.addEventListener('change', () => this.applyFilters());
        if (categoryFilter) categoryFilter.addEventListener('change', () => this.applyFilters());
        if (dateFilter) dateFilter.addEventListener('change', () => this.applyFilters());
        if (sortSelect) sortSelect.addEventListener('change', () => this.applyFilters());
        if (clearFilters) clearFilters.addEventListener('click', () => this.clearAllFilters());
    }

    applyFilters() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this._applyFiltersImmediate();
        }, 100);
    }

    _applyFiltersImmediate() {
        const statusValue = document.getElementById('statusFilter')?.value || 'all';
        const categoryValue = document.getElementById('categoryFilter')?.value || 'all';
        const dateValue = document.getElementById('dateFilter')?.value || 'all';
        const sortValue = document.getElementById('sortSelect')?.value || 'newest';

        this.filteredInquiries = this.inquiries.filter(inquiry => {
            // Status filter
            if (statusValue !== 'all') {
                const inquiryStatus = this.normalizeString(inquiry.Status || '');
                if (inquiryStatus !== this.normalizeString(statusValue)) {
                    return false;
                }
            }

            // Category filter
            if (categoryValue !== 'all') {
                if (inquiry.Category !== categoryValue) {
                    return false;
                }
            }

            // Date filter
            if (dateValue !== 'all') {
                if (!this.matchesDateFilter(inquiry.SubmittedAt, parseInt(dateValue))) {
                    return false;
                }
            }

            return true;
        });

        // Sort inquiries
        this.sortInquiries(sortValue);
        this.renderAll();
    }

    sortInquiries(sortValue) {
        switch (sortValue) {
            case 'newest':
                this.filteredInquiries.sort((a, b) =>
                    this.getTimestamp(b.SubmittedAt) - this.getTimestamp(a.SubmittedAt)
                );
                break;
            case 'oldest':
                this.filteredInquiries.sort((a, b) =>
                    this.getTimestamp(a.SubmittedAt) - this.getTimestamp(b.SubmittedAt)
                );
                break;
            case 'recent-update':
                this.filteredInquiries.sort((a, b) =>
                    this.getTimestamp(b.LastUpdated) - this.getTimestamp(a.LastUpdated)
                );
                break;
        }
    }

    matchesDateFilter(timestamp, days) {
        if (!timestamp) return false;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        cutoffDate.setHours(0, 0, 0, 0);

        const inquiryDate = this.parseTimestamp(timestamp);
        return inquiryDate >= cutoffDate;
    }

    clearAllFilters() {
        const statusFilter = document.getElementById('statusFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        const dateFilter = document.getElementById('dateFilter');
        const sortSelect = document.getElementById('sortSelect');

        if (statusFilter) statusFilter.value = 'all';
        if (categoryFilter) categoryFilter.value = 'all';
        if (dateFilter) dateFilter.value = 'all';
        if (sortSelect) sortSelect.value = 'newest';

        this.applyFilters();
    }

    renderAll() {
        this.renderInquiries();
        this.updateResultsCount();
    }

    renderInquiries() {
        const container = document.getElementById('inquiryList');
        if (!container) return;

        container.innerHTML = '';

        if (this.filteredInquiries.length === 0) {
            this.showEmptyState('No inquiries found matching your filters.');
            return;
        }

        this.filteredInquiries.forEach(inquiry => {
            const card = this.createInquiryCard(inquiry);
            container.appendChild(card);
        });

        // Attach event listeners to response buttons
        this.attachResponseListeners();
    }

    createInquiryCard(inquiry) {
        const card = document.createElement('div');
        card.className = 'inquiry-card';

        const statusBadge = this.getStatusBadge(inquiry.Status);
        const hasUpdates = inquiry.Updates && Array.isArray(inquiry.Updates) && inquiry.Updates.length > 0;
        const submittedDate = this.formatDate(inquiry.SubmittedAt);

        console.log(`Inquiry ${inquiry.ReferenceNumber} has ${inquiry.Updates?.length || 0} updates`); // Debug

        card.innerHTML = `
            <div class="inquiry-header">
                <div>
                    <h2 class="inquiry-ref">${this.escapeHtml(inquiry.ReferenceNumber || 'N/A')}</h2>
                    <div class="inquiry-date">Submitted on ${submittedDate}</div>
                    <div class="inquiry-category">${this.escapeHtml(inquiry.Category || 'Other')}</div>
                    ${inquiry.AssignedTo ? `<div class="inquiry-advisor">Assigned to: ${this.escapeHtml(inquiry.AssignedTo)}</div>` : ''}
                </div>
                ${statusBadge}
            </div>
            
            <div class="inquiry-body">
                <h3 class="inquiry-subject">${this.escapeHtml(inquiry.Subject || 'No subject')}</h3>
                ${inquiry.Description ? `<p class="inquiry-description">${this.escapeHtml(inquiry.Description)}</p>` : ''}
            </div>
            
            ${hasUpdates ? `
                <button class="response-btn" data-id="${inquiry.Id}">
                    <span>See Response (${inquiry.Updates.length})</span>
                    <span class="icon">▼</span>
                </button>
            ` : '<div class="no-response-yet">No updates yet - your inquiry is being reviewed</div>'}
            
            ${hasUpdates ? `
                <div class="updates-section" id="updates-${inquiry.Id}">
                    <h3 class="updates-title">Updates from CHIETA</h3>
                    ${this.renderUpdates(inquiry.Updates)}
                </div>
            ` : ''}
        `;

        return card;
    }

    renderUpdates(updates) {
        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return '<div class="no-updates">No updates yet. Our team will respond soon.</div>';
        }

        // FIXED: Sort updates by timestamp (newest first)
        const sortedUpdates = [...updates].sort((a, b) => {
            const timeA = this.getTimestamp(a.Timestamp);
            const timeB = this.getTimestamp(b.Timestamp);
            return timeB - timeA; // Newest first
        });

        return sortedUpdates.map(update => {
            const updateDate = this.formatDate(update.Timestamp);
            const author = update.Author || 'CHIETA Support';
            const message = update.Message || 'No message';

            return `
                <div class="update update-employee">
                    <div class="update-header">
                        <div class="update-author">${this.escapeHtml(author)}</div>
                        <div class="update-date">${updateDate}</div>
                    </div>
                    <p class="update-content">${this.escapeHtml(message)}</p>
                    ${update.Status ? `<div class="update-status">Status updated to: <strong>${this.escapeHtml(update.Status)}</strong></div>` : ''}
                </div>
            `;
        }).join('');
    }

    attachResponseListeners() {
        document.querySelectorAll('.response-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const inquiryId = this.dataset.id;
                const updatesSection = document.getElementById(`updates-${inquiryId}`);

                this.classList.toggle('expanded');
                updatesSection.classList.toggle('expanded');

                const span = this.querySelector('span:first-child');
                const text = span.textContent;

                if (updatesSection.classList.contains('expanded')) {
                    span.textContent = text.replace('See Response', 'Hide Response');
                } else {
                    span.textContent = text.replace('Hide Response', 'See Response');
                }
            });
        });
    }

    updateResultsCount() {
        const countElement = document.getElementById('resultsCount');
        if (!countElement) return;

        const count = this.filteredInquiries.length;
        countElement.textContent = `${count} inquir${count !== 1 ? 'ies' : 'y'} found`;
    }

    showEmptyState(message) {
        const container = document.getElementById('inquiryList');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h2>No inquiries found</h2>
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
    }

    // Helper methods
    validateInquiryData(inquiry) {
        return inquiry && inquiry.Id && inquiry.ReferenceNumber;
    }

    parseTimestamp(timestamp) {
        if (!timestamp) return new Date(0);

        try {
            // Handle ISO string
            if (typeof timestamp === 'string') {
                return new Date(timestamp);
            }
            // Handle Firestore Timestamp
            if (timestamp._seconds) {
                return new Date(timestamp._seconds * 1000);
            }
            return new Date(timestamp);
        } catch (e) {
            return new Date(0);
        }
    }

    getTimestamp(timestamp) {
        return this.parseTimestamp(timestamp).getTime();
    }

    formatDate(timestamp) {
        if (!timestamp) return 'N/A';

        try {
            const date = this.parseTimestamp(timestamp);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Invalid date';
        }
    }

    getStatusBadge(status) {
        if (!status) return `<div class="status-badge">Unknown</div>`;

        const statusLower = this.normalizeString(status);
        const badges = {
            'new': '<div class="status-badge status-new">New</div>',
            'pending': '<div class="status-badge status-pending">Pending</div>',
            'in-progress': '<div class="status-badge status-in-progress">In Progress</div>',
            'resolved': '<div class="status-badge status-resolved">Resolved</div>',
            'closed': '<div class="status-badge status-closed">Closed</div>'
        };

        return badges[statusLower] || `<div class="status-badge">${this.escapeHtml(status)}</div>`;
    }

    normalizeString(str) {
        return String(str || '').toLowerCase().trim().replace(/\s+/g, '-');
    }

    setLoadingState(loading) {
        this.isLoading = loading;
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = loading ? 'Loading inquiries...' : '';
        }
    }

    escapeHtml(unsafe) {
        if (unsafe == null) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize when page loads
let inquiryHistory;
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Content Loaded - Initializing InquiryHistory');
    inquiryHistory = new InquiryHistory();
    inquiryHistory.init();
});