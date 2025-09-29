(function () {
    // -------- Utilities --------
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    function toast(msg) {
        const box = $("#toast");
        const msgEl = $("#toastMsg");
        msgEl.textContent = msg;
        box.classList.add("show");
        clearTimeout(toast.t);
        toast.t = setTimeout(() => box.classList.remove("show"), 3000);
    }

    // -------- Data Management --------
    let inquiries = [];

    // Fetch inquiries from the backend API
    async function fetchInquiries() {
        try {
            const response = await fetch('/api/inquiry', {
                method: 'GET',
                credentials: 'include' // Include authentication cookies
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            inquiries = data.map(inq => ({
                id: inq.id,
                ref: inq.reference,
                category: inq.category,
                subject: inq.subject,
                description: inq.description,
                desired: inq.desired,
                tags: inq.tags || [],
                status: inq.status,
                date: inq.date,
                callback: inq.callback,
                attachments: inq.attachments || [],
                updates: inq.updates || [],
                userName: inq.userName,
                userEmail: inq.userEmail,
                assignedTo: inq.assignedTo
            }));

            renderInquiryTable();
        } catch (error) {
            console.error('Error fetching inquiries:', error);
            toast('Error loading inquiries: ' + error.message);
        }
    }

    // Update inquiry status via API
    async function updateInquiry(inquiryRef, updateData) {
        try {
            const response = await fetch(`/api/inquiry/${inquiryRef}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error updating inquiry:', error);
            throw error;
        }
    }

    // -------- Render Functions --------
    function renderInquiryTable() {
        const tbody = $("#inquiryTableBody");
        if (!tbody) return;

        tbody.innerHTML = "";

        // Get filter values
        const statusFilter = $("#statusFilter").value;
        const categoryFilter = $("#categoryFilter").value;
        const searchTerm = $("#searchInput").value.toLowerCase();

        // Filter inquiries
        const filteredInquiries = inquiries.filter(inq => {
            const matchesStatus = statusFilter === 'all' || inq.status === statusFilter;
            const matchesCategory = categoryFilter === 'all' || inq.category === categoryFilter;
            const matchesSearch = searchTerm === '' ||
                inq.ref.toLowerCase().includes(searchTerm) ||
                inq.subject.toLowerCase().includes(searchTerm) ||
                inq.description.toLowerCase().includes(searchTerm) ||
                inq.userName.toLowerCase().includes(searchTerm) ||
                inq.userEmail.toLowerCase().includes(searchTerm);

            return matchesStatus && matchesCategory && matchesSearch;
        });

        // Update count
        $("#inquiryCount").textContent = `${filteredInquiries.length} inquiries`;

        // Render table rows
        filteredInquiries.forEach(inq => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
          <td>${inq.ref}</td>
          <td>${inq.subject}</td>
          <td>${inq.category}</td>
          <td><span class="status-badge status-${inq.status}">${formatStatus(inq.status)}</span></td>
          <td>${formatDate(inq.date)}</td>
          <td>
            <button class="btn small view-btn" data-id="${inq.id}">View</button>
          </td>
        `;
            tbody.appendChild(tr);
        });

        // Add event listeners to view buttons
        $$(".view-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const inquiryId = btn.dataset.id;
                showInquiryDetails(inquiryId);
            });
        });
    }

    function formatStatus(status) {
        const statusMap = {
            'new': 'New',
            'in-progress': 'In Progress',
            'resolved': 'Resolved',
            'closed': 'Closed'
        };
        return statusMap[status] || status;
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    function showInquiryDetails(inquiryId) {
        const inquiry = inquiries.find(i => i.id === inquiryId);
        if (!inquiry) return;

        // Populate modal with inquiry details
        $("#modalTitle").textContent = `Inquiry: ${inquiry.ref}`;
        $("#modalSubtitle").textContent = `Submitted by: ${inquiry.userName} (${inquiry.userEmail}) on ${formatDate(inquiry.date)}`;
        $("#detailRef").textContent = inquiry.ref;
        $("#detailCategory").textContent = inquiry.category;
        $("#detailSubject").textContent = inquiry.subject;
        $("#detailStatus").textContent = formatStatus(inquiry.status);
        $("#detailDate").textContent = formatDate(inquiry.date);
        $("#detailTags").textContent = Array.isArray(inquiry.tags) ? inquiry.tags.join(", ") : (inquiry.tags || "None");
        $("#detailDescription").textContent = inquiry.description;
        $("#detailOutcome").textContent = inquiry.desired || "Not specified";
        $("#detailCallback").textContent = inquiry.callback ? "Customer requested a follow-up call" : "No callback requested";

        // Populate attachments
        const attachmentsList = $("#detailAttachments");
        attachmentsList.innerHTML = "";
        if (inquiry.attachments && inquiry.attachments.length > 0) {
            inquiry.attachments.forEach(att => {
                const li = document.createElement("li");
                li.textContent = `${att.name} (${formatFileSize(att.size)})`;
                attachmentsList.appendChild(li);
            });
        } else {
            const li = document.createElement("li");
            li.textContent = "No attachments";
            attachmentsList.appendChild(li);
        }

        // Set current status in update form
        $("#statusUpdate").value = inquiry.status;

        // Set assigned to if exists
        if (inquiry.assignedTo) {
            $("#assignedTo").value = inquiry.assignedTo;
        } else {
            $("#assignedTo").value = "";
        }

        // Clear notes
        $("#internalNotes").value = "";

        // Store current inquiry reference in form
        $("#updateForm").dataset.inquiryRef = inquiry.ref;

        // Show modal
        openModal("#detailModal");
    }

    function formatFileSize(bytes) {
        if (!bytes || bytes < 1024) return bytes + " bytes";
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        else return (bytes / 1048576).toFixed(1) + " MB";
    }

    // -------- Modal Functions --------
    function openModal(selector) {
        const modal = $(selector);
        modal.classList.add("show");
        trapFocus(modal);
    }

    function closeModal(selector) {
        const modal = $(selector);
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

    // -------- Event Listeners --------
    document.addEventListener("click", (e) => {
        // Settings menu
        const settingsBtn = e.target.closest("#settings-btn");
        if (settingsBtn) {
            const menu = $("#settings-menu");
            const expanded = settingsBtn.getAttribute("aria-expanded") === "true";
            settingsBtn.setAttribute("aria-expanded", String(!expanded));
            menu.hidden = expanded;
            return;
        }

        // Close modal buttons
        const closeBtn = e.target.closest("[data-close-modal]");
        if (closeBtn) {
            closeModal("#detailModal");
            return;
        }

        // Outside menu click
        const outsideMenu = !$("#settings-menu")?.contains(e.target) && e.target !== $("#settings-btn");
        if (outsideMenu) {
            $("#settings-menu")?.setAttribute("hidden", "");
            $("#settings-btn")?.setAttribute("aria-expanded", "false");
        }
    });

    // Filter and search changes
    $("#statusFilter").addEventListener("change", renderInquiryTable);
    $("#categoryFilter").addEventListener("change", renderInquiryTable);
    $("#searchInput").addEventListener("input", renderInquiryTable);

    // Update form submission
    $("#updateForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const inquiryRef = $("#updateForm").dataset.inquiryRef;
        if (!inquiryRef) return;

        const newStatus = $("#statusUpdate").value;
        const notes = $("#internalNotes").value.trim();
        const assignedTo = $("#assignedTo").value;

        try {
            const updateData = {
                status: newStatus,
                internalNotes: notes,
                assignedTo: assignedTo
            };

            await updateInquiry(inquiryRef, updateData);

            // Refresh the inquiry list
            await fetchInquiries();

            // Show success message and close modal
            toast("Inquiry updated successfully");
            closeModal("#detailModal");
        } catch (error) {
            toast("Failed to update inquiry: " + error.message);
        }
    });

    // -------- Initialize --------
    function init() {
        fetchInquiries();

        // Refresh inquiries periodically (every 30 seconds)
        setInterval(() => {
            fetchInquiries();
        }, 30000);
    }

    // Start the application
    init();
})();