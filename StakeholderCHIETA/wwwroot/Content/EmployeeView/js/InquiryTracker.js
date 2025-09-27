(function(){
    // -------- Utilities --------
    const $ = (s,r=document)=> r.querySelector(s);
    const $$ = (s,r=document)=> Array.from(r.querySelectorAll(s));
    
    function toast(msg){
      const box = $("#toast"); 
      const msgEl = $("#toastMsg");
      msgEl.textContent = msg; 
      box.classList.add("show");
      clearTimeout(toast.t); 
      toast.t = setTimeout(()=> box.classList.remove("show"), 3000);
    }
  
    // -------- Sample Data --------
    let inquiries = JSON.parse(localStorage.getItem('chieta_inquiries')) || [];
    
    // If no data exists, create sample data
    if (inquiries.length === 0) {
      inquiries = [
        {
          id: 'inq-1',
          ref: 'INQ-240215-A1B2',
          category: 'Grants',
          subject: 'Query about discretionary grant window',
          description: 'I would like to know when the next discretionary grant window will open and what documents are required for application.',
          desired: 'Confirmation of dates and required documents',
          tags: ['Eligibility', 'Documents'],
          status: 'new',
          date: '2024-02-15T10:30:00Z',
          callback: true,
          attachments: [],
          updates: []
        },
        {
          id: 'inq-2',
          ref: 'INQ-240216-B3C4',
          category: 'Bursaries',
          subject: 'Application status check',
          description: 'I applied for a bursary two weeks ago but haven\'t received any confirmation or update on my application status.',
          desired: 'Update on application status',
          tags: ['Portal access'],
          status: 'in-progress',
          date: '2024-02-16T14:45:00Z',
          callback: false,
          attachments: [{name: 'application.pdf', size: 1024}],
          updates: [
            {
              date: '2024-02-17T09:15:00Z',
              status: 'in-progress',
              notes: 'Application is being processed by the bursary committee',
              assignedTo: 'jane.smith'
            }
          ]
        },
        {
          id: 'inq-3',
          ref: 'INQ-240217-D5E6',
          category: 'Compliance',
          subject: 'Clarification on reporting requirements',
          description: 'We need clarification on the quarterly reporting requirements for our skills development program.',
          desired: 'Detailed explanation of reporting requirements',
          tags: ['Policy', 'Documents'],
          status: 'resolved',
          date: '2024-02-17T11:20:00Z',
          callback: true,
          attachments: [],
          updates: [
            {
              date: '2024-02-18T10:30:00Z',
              status: 'resolved',
              notes: 'Sent detailed requirements document via email',
              assignedTo: 'mike.johnson'
            }
          ]
        }
      ];
      saveInquiries();
    }
  
    function saveInquiries() {
      localStorage.setItem('chieta_inquiries', JSON.stringify(inquiries));
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
          inq.description.toLowerCase().includes(searchTerm);
        
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
      const date = new Date(dateString);
      return date.toLocaleDateString();
    }
    
    function showInquiryDetails(inquiryId) {
      const inquiry = inquiries.find(i => i.id === inquiryId);
      if (!inquiry) return;
      
      // Populate modal with inquiry details
      $("#modalTitle").textContent = `Inquiry: ${inquiry.ref}`;
      $("#modalSubtitle").textContent = `Submitted: ${formatDate(inquiry.date)}`;
      $("#detailRef").textContent = inquiry.ref;
      $("#detailCategory").textContent = inquiry.category;
      $("#detailSubject").textContent = inquiry.subject;
      $("#detailStatus").textContent = formatStatus(inquiry.status);
      $("#detailDate").textContent = formatDate(inquiry.date);
      $("#detailTags").textContent = inquiry.tags.join(", ") || "None";
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
      
      // Store current inquiry ID in form
      $("#updateForm").dataset.inquiryId = inquiryId;
      
      // Show modal
      openModal("#detailModal");
    }
    
    function formatFileSize(bytes) {
      if (bytes < 1024) return bytes + " bytes";
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
      const nodes = Array.from(container.querySelectorAll(focusable)).filter(n=>!n.disabled);
      const first = nodes[0], last = nodes[nodes.length-1];
      
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
        $("#settings-btn")?.setAttribute("aria-expanded","false"); 
      }
    });
    
    // Filter and search changes
    $("#statusFilter").addEventListener("change", renderInquiryTable);
    $("#categoryFilter").addEventListener("change", renderInquiryTable);
    $("#searchInput").addEventListener("input", renderInquiryTable);
    
    // Update form submission
    $("#updateForm").addEventListener("submit", (e) => {
      e.preventDefault();
      
      const inquiryId = $("#updateForm").dataset.inquiryId;
      const inquiry = inquiries.find(i => i.id === inquiryId);
      if (!inquiry) return;
      
      const newStatus = $("#statusUpdate").value;
      const notes = $("#internalNotes").value.trim();
      const assignedTo = $("#assignedTo").value;
      
      // Add update record
      inquiry.updates = inquiry.updates || [];
      inquiry.updates.push({
        date: new Date().toISOString(),
        status: newStatus,
        notes: notes,
        assignedTo: assignedTo || undefined
      });
      
      // Update inquiry status
      inquiry.status = newStatus;
      
      // Update assigned to if specified
      if (assignedTo) {
        inquiry.assignedTo = assignedTo;
      }
      
      // Save and refresh
      saveInquiries();
      renderInquiryTable();
      
      // Show success message and close modal
      toast("Inquiry updated successfully");
      closeModal("#detailModal");
    });
    
    // -------- Initialize --------
    function init() {
      renderInquiryTable();
      
      // Listen for new inquiries from customer form
      window.addEventListener('storage', (e) => {
        if (e.key === 'chieta_inquiries') {
          inquiries = JSON.parse(e.newValue) || [];
          renderInquiryTable();
        }
      });
      
      // Also check for new inquiries periodically
      setInterval(() => {
        const currentInquiries = JSON.parse(localStorage.getItem('chieta_inquiries')) || [];
        if (JSON.stringify(currentInquiries) !== JSON.stringify(inquiries)) {
          inquiries = currentInquiries;
          renderInquiryTable();
        }
      }, 2000);
    }
    
    // Start the application
    init();
  })();