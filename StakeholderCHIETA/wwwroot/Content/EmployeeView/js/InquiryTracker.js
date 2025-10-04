
// InquiryTracker.js - Fixed Version
(function () {
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    function toast(msg) {
        const box = $("#toast");
        if (!box) return;
        const msgEl = $("#toastMsg");
        if (msgEl) msgEl.textContent = msg;
        box.classList.add("show");
        clearTimeout(toast.t);
        toast.t = setTimeout(() => box.classList.remove("show"), 3000);
    }

    let inquiries = [];
    let advisors = []; // Store advisors for reassignment dropdown

    // Fetch advisors for reassignment dropdown
    async function fetchAdvisors() {
        try {
            console.log('Fetching advisors for reassignment...');
            const response = await fetch('/api/inquiry/advisors', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            advisors = await response.json();
            console.log('Advisors loaded:', advisors.length);

            // Populate the reassignment dropdown
            populateAdvisorDropdown();
        } catch (error) {
            console.error('Error fetching advisors:', error);
        }
    }

    // Populate advisor dropdown in the modal
    function populateAdvisorDropdown() {
        const assignedToSelect = $("#assignedTo");
        if (!assignedToSelect || advisors.length === 0) return;

        // Keep the first option (Keep current assignment)
        const firstOption = assignedToSelect.querySelector('option[value=""]');
        assignedToSelect.innerHTML = '';
        if (firstOption) {
            assignedToSelect.appendChild(firstOption);
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Keep current assignment';
            assignedToSelect.appendChild(defaultOption);
        }

        // Add all advisors
        advisors.forEach(advisor => {
            const option = document.createElement('option');
            option.value = advisor.id;
            option.textContent = advisor.name;
            assignedToSelect.appendChild(option);
        });
    }

    // Fetch only inquiries assigned to the logged-in advisor
    async function fetchInquiries() {
        try {
            console.log('Fetching inquiries assigned to current advisor...');
            const response = await fetch('/api/inquiry', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Received inquiry data:', data);
            console.log('Number of inquiries:', data.length);

            inquiries = data.map(inq => ({
                id: inq.id,
                ref: inq.reference,
                category: inq.category || 'N/A',
                subject: inq.subject || 'N/A',
                description: inq.description || '',
                desired: inq.desired || '',
                tags: Array.isArray(inq.tags) ? inq.tags : [],
                status: inq.status || 'Pending',
                date: inq.date,
                callback: inq.callback || false,
                attachments: Array.isArray(inq.attachments) ? inq.attachments : [],
                updates: Array.isArray(inq.updates) ? inq.updates : [],
                userName: inq.userName || 'Unknown',
                userEmail: inq.userEmail || 'No email',
                assignedTo: inq.assignedTo || 'You'
            }));

            console.log('Processed inquiries:', inquiries.length);
            renderInquiryTable();
        } catch (error) {
            console.error('Error fetching inquiries:', error);
            toast('Error loading inquiries: ' + error.message);

            // Show error in the table
            const tbody = $("#inquiryTableBody");
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 30px; color: #dc2626;">
                            Failed to load inquiries. Please refresh the page.<br>
                            <small>Error: ${error.message}</small>
                        </td>
                    </tr>
                `;
            }
        }
    }

    // Update inquiry status via API
    async function updateInquiry(inquiryRef, updateData) {
        try {
            console.log('Updating inquiry:', inquiryRef, updateData);
            const response = await fetch(`/api/inquiry/${inquiryRef}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Update result:', result);
            return result;
        } catch (error) {
            console.error('Error updating inquiry:', error);
            throw error;
        }
    }

    function renderInquiryTable() {
        const tbody = $("#inquiryTableBody");
        if (!tbody) return;

        tbody.innerHTML = "";

        const statusFilter = $("#statusFilter")?.value || 'all';
        const categoryFilter = $("#categoryFilter")?.value || 'all';
        const searchTerm = $("#searchInput")?.value?.toLowerCase() || '';

        console.log('Applying filters - Status:', statusFilter, 'Category:', categoryFilter, 'Search:', searchTerm);

        const filteredInquiries = inquiries.filter(inq => {
            const matchesStatus = statusFilter === 'all' || inq.status.toLowerCase() === statusFilter.toLowerCase();
            const matchesCategory = categoryFilter === 'all' || inq.category === categoryFilter;
            const matchesSearch = searchTerm === '' ||
                inq.ref.toLowerCase().includes(searchTerm) ||
                inq.subject.toLowerCase().includes(searchTerm) ||
                inq.description.toLowerCase().includes(searchTerm) ||
                inq.userName.toLowerCase().includes(searchTerm) ||
                inq.userEmail.toLowerCase().includes(searchTerm);

            return matchesStatus && matchesCategory && matchesSearch;
        });

        console.log('Filtered inquiries:', filteredInquiries.length);

        const inquiryCount = $("#inquiryCount");
        if (inquiryCount) {
            inquiryCount.textContent = `${filteredInquiries.length} inquir${filteredInquiries.length === 1 ? 'y' : 'ies'}`;
        }

        if (filteredInquiries.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: #6b7280;">
                        ${inquiries.length === 0 ? 'No inquiries assigned to you yet' : 'No inquiries match your filters'}
                    </td>
                </tr>
            `;
            return;
        }

        filteredInquiries.forEach(inq => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${escapeHtml(inq.ref)}</td>
                <td>${escapeHtml(inq.subject)}</td>
                <td>${escapeHtml(inq.category)}</td>
                <td><span class="status-badge status-${normalizeStatus(inq.status)}">${formatStatus(inq.status)}</span></td>
                <td>${formatDate(inq.date)}</td>
                <td>
                    <button class="btn small view-btn" data-id="${inq.id}">View</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Attach event listeners to view buttons
        $$(".view-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const inquiryId = btn.dataset.id;
                showInquiryDetails(inquiryId);
            });
        });
    }

    function normalizeStatus(status) {
        return status.toLowerCase().replace(/\s+/g, '-');
    }

    function formatStatus(status) {
        const statusMap = {
            'new': 'New',
            'pending': 'Pending',
            'in-progress': 'In Progress',
            'resolved': 'Resolved',
            'closed': 'Closed'
        };
        return statusMap[status.toLowerCase()] || status;
    }

    function formatDate(dateValue) {
        if (!dateValue) return 'N/A';

        try {
            // Handle Firestore Timestamp object
            if (dateValue._seconds) {
                const date = new Date(dateValue._seconds * 1000);
                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            }

            // Handle regular date string
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return 'Invalid date';
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (error) {
            console.error('Error formatting date:', error, dateValue);
            return 'N/A';
        }
    }

    function showInquiryDetails(inquiryId) {
        const inquiry = inquiries.find(i => i.id === inquiryId);
        if (!inquiry) {
            console.error('Inquiry not found:', inquiryId);
            return;
        }

        console.log('Showing details for inquiry:', inquiry);

        $("#modalTitle").textContent = `Inquiry: ${inquiry.ref}`;
        $("#modalSubtitle").textContent = `Submitted by: ${inquiry.userName} (${inquiry.userEmail}) on ${formatDate(inquiry.date)}`;
        $("#detailRef").textContent = inquiry.ref;
        $("#detailCategory").textContent = inquiry.category;
        $("#detailSubject").textContent = inquiry.subject;
        $("#detailStatus").textContent = formatStatus(inquiry.status);
        $("#detailDate").textContent = formatDate(inquiry.date);
        $("#detailTags").textContent = inquiry.tags.length > 0 ? inquiry.tags.join(", ") : "None";
        $("#detailDescription").textContent = inquiry.description;
        $("#detailOutcome").textContent = inquiry.desired || "Not specified";
        $("#detailCallback").textContent = inquiry.callback ? "Customer requested a follow-up call" : "No callback requested";

        const attachmentsList = $("#detailAttachments");
        if (attachmentsList) {
            attachmentsList.innerHTML = "";
            if (inquiry.attachments && inquiry.attachments.length > 0) {
                inquiry.attachments.forEach(att => {
                    const li = document.createElement("li");
                    li.textContent = `${att.name || 'File'} ${att.size ? '(' + formatFileSize(att.size) + ')' : ''}`;
                    attachmentsList.appendChild(li);
                });
            } else {
                const li = document.createElement("li");
                li.textContent = "No attachments";
                attachmentsList.appendChild(li);
            }
        }

        // Set current status
        const statusUpdate = $("#statusUpdate");
        if (statusUpdate) {
            statusUpdate.value = inquiry.status;
        }

        // Set assigned advisor (for reassignment)
        const assignedTo = $("#assignedTo");
        if (assignedTo) {
            assignedTo.value = "";
        }

        // Clear notes
        const internalNotes = $("#internalNotes");
        if (internalNotes) {
            internalNotes.value = "";
        }

        // Store inquiry reference for update
        const updateForm = $("#updateForm");
        if (updateForm) {
            updateForm.dataset.inquiryRef = inquiry.ref;
        }

        openModal("#detailModal");
    }

    function formatFileSize(bytes) {
        if (!bytes || bytes < 1024) return bytes + " bytes";
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        else return (bytes / 1048576).toFixed(1) + " MB";
    }

    function openModal(selector) {
        const modal = $(selector);
        if (!modal) return;
        modal.classList.add("show");
        trapFocus(modal);
    }

    function closeModal(selector) {
        const modal = $(selector);
        if (!modal) return;
        modal.classList.remove("show");
        releaseFocus();
    }

    let lastFocused = null;
    function trapFocus(container) {
        lastFocused = document.activeElement;
        const focusable = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
        const nodes = Array.from(container.querySelectorAll(focusable)).filter(n => !n.disabled);
        const first = nodes[0], last = nodes[nodes.length - 1];

        function onKey(ev) {
            if (ev.key === "Escape") {
                ev.preventDefault();
                closeModal("#detailModal");
            }
            if (ev.key === "Tab") {
                if (ev.shiftKey && document.activeElement === first) {
                    ev.preventDefault();
                    last.focus();
                } else if (!ev.shiftKey && document.activeElement === last) {
                    ev.preventDefault();
                    first.focus();
                }
            }
        }

        container.addEventListener("keydown", onKey);
    }

    function releaseFocus() {
        if (lastFocused && typeof lastFocused.focus === "function") {
            lastFocused.focus();
        }
    }

    function escapeHtml(unsafe) {
        if (unsafe == null) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Event listeners
    document.addEventListener("click", (e) => {
        const settingsBtn = e.target.closest("#settings-btn");
        if (settingsBtn) {
            const menu = $("#settings-menu");
            const expanded = settingsBtn.getAttribute("aria-expanded") === "true";
            settingsBtn.setAttribute("aria-expanded", String(!expanded));
            menu.hidden = expanded;
            return;
        }

        const closeBtn = e.target.closest("[data-close-modal]");
        if (closeBtn) {
            closeModal("#detailModal");
            return;
        }

        const outsideMenu = !$("#settings-menu")?.contains(e.target) && e.target !== $("#settings-btn");
        if (outsideMenu) {
            $("#settings-menu")?.setAttribute("hidden", "");
            $("#settings-btn")?.setAttribute("aria-expanded", "false");
        }
    });

    // Filter event listeners
    const statusFilter = $("#statusFilter");
    const categoryFilter = $("#categoryFilter");
    const searchInput = $("#searchInput");

    if (statusFilter) statusFilter.addEventListener("change", renderInquiryTable);
    if (categoryFilter) categoryFilter.addEventListener("change", renderInquiryTable);
    if (searchInput) searchInput.addEventListener("input", renderInquiryTable);

    // Form submission
    const updateForm = $("#updateForm");
    if (updateForm) {
        updateForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const inquiryRef = updateForm.dataset.inquiryRef;
            if (!inquiryRef) {
                toast("No inquiry selected");
                return;
            }

            const newStatus = $("#statusUpdate")?.value;
            const notes = $("#internalNotes")?.value.trim() || '';
            const assignedTo = $("#assignedTo")?.value || '';

            try {
                const updateData = {
                    status: newStatus,
                    internalNotes: notes
                };

                // Only include assignedTo if a new advisor was selected
                if (assignedTo) {
                    updateData.assignedTo = assignedTo;
                }

                console.log('Submitting update:', updateData);

                await updateInquiry(inquiryRef, updateData);
                await fetchInquiries();

                toast("Inquiry updated successfully");
                closeModal("#detailModal");
            } catch (error) {
                console.error('Update error:', error);
                toast("Failed to update inquiry: " + error.message);
            }
        });
    }

    function init() {
        console.log('Initializing InquiryTracker...');
        fetchAdvisors(); // Fetch advisors for dropdown
        fetchInquiries(); // Fetch inquiries

        // Auto-refresh every 30 seconds
        setInterval(() => {
            console.log('Auto-refreshing inquiries...');
            fetchInquiries();
        }, 30000);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

