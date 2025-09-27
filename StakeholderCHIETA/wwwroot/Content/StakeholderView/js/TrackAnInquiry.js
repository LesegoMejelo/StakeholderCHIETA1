document.addEventListener('DOMContentLoaded', function() {
    // Sample data - in a real application, this would come from a database
    const inquiries = [
      {
        id: 'inq-1',
        ref: 'INQ-240215-A1B2',
        category: 'Grants',
        subject: 'Query about discretionary grant window',
        description: 'I would like to know when the next discretionary grant window will open and what documents are required for application.',
        status: 'resolved',
        date: '2024-02-15',
        lastUpdated: '2024-02-17',
        updates: [
          {
            date: '2024-02-16',
            author: 'Jane Smith (CHIETA Support)',
            content: 'Thank you for your inquiry. The next discretionary grant window will open on March 1, 2024. Required documents include your organization\'s registration certificate, tax clearance, and a detailed project proposal.'
          },
          {
            date: '2024-02-17',
            author: 'Jane Smith (CHIETA Support)',
            content: 'I\'ve emailed you the complete documentation checklist and application form. Please let me know if you need any further assistance.'
          }
        ]
      },
      {
        id: 'inq-2',
        ref: 'INQ-240216-B3C4',
        category: 'Bursaries',
        subject: 'Application status check',
        description: 'I applied for a bursary two weeks ago but haven\'t received any confirmation or update on my application status.',
        status: 'in-progress',
        date: '2024-02-16',
        lastUpdated: '2024-02-17',
        updates: [
          {
            date: '2024-02-17',
            author: 'Mike Johnson (Bursary Committee)',
            content: 'We\'ve received your application and it\'s currently being reviewed by our committee. The review process typically takes 3-4 weeks.'
          }
        ]
      },
      {
        id: 'inq-3',
        ref: 'INQ-240217-D5E6',
        category: 'Compliance',
        subject: 'Clarification on reporting requirements',
        description: 'We need clarification on the quarterly reporting requirements for our skills development program.',
        status: 'closed',
        date: '2024-02-17',
        lastUpdated: '2024-02-20',
        updates: [
          {
            date: '2024-02-18',
            author: 'Sarah Williams (Compliance Department)',
            content: 'I\'ve attached the detailed reporting requirements document to this response. The key deadlines are the 15th of January, April, July, and October each year.'
          }
        ]
      },
      {
        id: 'inq-4',
        ref: 'INQ-240218-E7F8',
        category: 'Site Visit',
        subject: 'Request for training facility assessment',
        description: 'We would like to request a site visit to assess our training facilities for accreditation.',
        status: 'new',
        date: '2024-02-18',
        lastUpdated: '2024-02-18',
        updates: []
      },
      {
        id: 'inq-5',
        ref: 'INQ-240301-F9G0',
        category: 'Skills Development',
        subject: 'Request for learnership program information',
        description: 'Interested in information about available learnership programs for electrical engineering.',
        status: 'resolved',
        date: '2024-03-01',
        lastUpdated: '2024-03-03',
        updates: [
          {
            date: '2024-03-02',
            author: 'Thomas Brown (Skills Development)',
            content: 'Thanks for your interest. I\'ve sent you our current learnership program catalog. The electrical engineering program begins on April 15th.'
          }
        ]
      },
      {
        id: 'inq-6',
        ref: 'INQ-240310-H1I2',
        category: 'Grants',
        subject: 'Follow-up on Mandatory Grant submission',
        description: 'Following up on our Mandatory Grant submission from last month. Need confirmation of receipt.',
        status: 'in-progress',
        date: '2024-03-10',
        lastUpdated: '2024-03-11',
        updates: [
          {
            date: '2024-03-11',
            author: 'Lisa Green (Grants Department)',
            content: 'I can confirm we received your submission on February 28th. It\'s currently being processed and you should receive confirmation within 10 business days.'
          }
        ]
      },
      {
        id: 'inq-7',
        ref: 'INQ-240315-J3K4',
        category: 'Other',
        subject: 'Workshop registration problem',
        description: 'Having technical issues registering for the upcoming workshop on grant writing.',
        status: 'closed',
        date: '2024-03-15',
        lastUpdated: '2024-03-15',
        updates: [
          {
            date: '2024-03-15',
            author: 'David Wilson (Workshop Coordinator)',
            content: 'We\'ve identified the issue with our registration system and have fixed it. Please try again now.'
          }
        ]
      },
      {
        id: 'inq-8',
        ref: 'INQ-240320-L5M6',
        category: 'Bursaries',
        subject: 'Appeal for bursary application',
        description: 'Would like to appeal the decision on my bursary application that was declined.',
        status: 'new',
        date: '2024-03-20',
        lastUpdated: '2024-03-20',
        updates: []
      }
    ];

    const inquiryList = document.getElementById('inquiryList');
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const dateFilter = document.getElementById('dateFilter');
    const sortSelect = document.getElementById('sortSelect');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const resultsCount = document.getElementById('resultsCount');
    
    let filteredInquiries = [...inquiries];
    
    // Initial render
    renderInquiries();
    
    // Add event listeners for filters
    statusFilter.addEventListener('change', filterInquiries);
    categoryFilter.addEventListener('change', filterInquiries);
    dateFilter.addEventListener('change', filterInquiries);
    sortSelect.addEventListener('change', filterInquiries);
    clearFiltersBtn.addEventListener('click', clearAllFilters);
    
    function filterInquiries() {
      const statusValue = statusFilter.value;
      const categoryValue = categoryFilter.value;
      const dateValue = dateFilter.value;
      const sortValue = sortSelect.value;
      
      filteredInquiries = inquiries.filter(inquiry => {
        // Status filter
        if (statusValue !== 'all' && inquiry.status !== statusValue) {
          return false;
        }
        
        // Category filter
        if (categoryValue !== 'all' && inquiry.category !== categoryValue) {
          return false;
        }
        
        // Date filter
        if (dateValue !== 'all') {
          const days = parseInt(dateValue);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          const inquiryDate = new Date(inquiry.date);
          
          if (inquiryDate < cutoffDate) {
            return false;
          }
        }
        
        return true;
      });
      
      // Sort inquiries
      switch(sortValue) {
        case 'newest':
          filteredInquiries.sort((a, b) => new Date(b.date) - new Date(a.date));
          break;
        case 'oldest':
          filteredInquiries.sort((a, b) => new Date(a.date) - new Date(b.date));
          break;
        case 'recent-update':
          filteredInquiries.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
          break;
      }
      
      renderInquiries();
    }
    
    function clearAllFilters() {
      statusFilter.value = 'all';
      categoryFilter.value = 'all';
      dateFilter.value = 'all';
      sortSelect.value = 'newest';
      filterInquiries();
    }
    
    function renderInquiries() {
      inquiryList.innerHTML = '';
      
      // Update results count
      resultsCount.textContent = `${filteredInquiries.length} ${filteredInquiries.length === 1 ? 'inquiry' : 'inquiries'} found`;
      
      if (filteredInquiries.length === 0) {
        // Show empty state if no inquiries match filters
        inquiryList.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h2>No inquiries found</h2>
            <p>Try adjusting your filters to see more results.</p>
          </div>
        `;
      } else {
        // Render filtered inquiries
        filteredInquiries.forEach(inquiry => {
          const inquiryElement = document.createElement('div');
          inquiryElement.className = 'inquiry-card';
          
          // Format status text
          let statusText = '';
          let statusClass = '';
          switch(inquiry.status) {
            case 'new':
              statusText = 'New';
              statusClass = 'status-new';
              break;
            case 'in-progress':
              statusText = 'In Progress';
              statusClass = 'status-in-progress';
              break;
            case 'resolved':
              statusText = 'Resolved';
              statusClass = 'status-resolved';
              break;
            case 'closed':
              statusText = 'Closed';
              statusClass = 'status-closed';
              break;
          }
          
          // Check if there are responses
          const hasResponses = inquiry.updates && inquiry.updates.length > 0;
          
          inquiryElement.innerHTML = `
            <div class="inquiry-header">
              <div>
                <h2 class="inquiry-ref">${inquiry.ref}</h2>
                <div class="inquiry-date">Submitted on ${formatDate(inquiry.date)}</div>
                <div class="inquiry-category">${inquiry.category}</div>
              </div>
              <div class="status-badge ${statusClass}">${statusText}</div>
            </div>
            
            <div class="inquiry-body">
              <h3 class="inquiry-subject">${inquiry.subject}</h3>
              <p class="inquiry-description">${inquiry.description}</p>
            </div>
            
            ${hasResponses ? `
              <button class="response-btn" data-id="${inquiry.id}">
                <span>See Response</span>
                <span class="icon">▼</span>
              </button>
            ` : ''}
            
            <div class="updates-section" id="updates-${inquiry.id}">
              <h3 class="updates-title">Response from CHIETA</h3>
              ${renderUpdates(inquiry.updates)}
            </div>
          `;
          
          inquiryList.appendChild(inquiryElement);
        });
        
        // Add event listeners to response buttons
        document.querySelectorAll('.response-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const inquiryId = this.dataset.id;
            const updatesSection = document.getElementById(`updates-${inquiryId}`);
            
            this.classList.toggle('expanded');
            updatesSection.classList.toggle('expanded');
            
            if (updatesSection.classList.contains('expanded')) {
              this.querySelector('span').textContent = 'Hide Response';
            } else {
              this.querySelector('span').textContent = 'See Response';
            }
          });
        });
      }
    }
    
    function renderUpdates(updates) {
      if (!updates || updates.length === 0) {
        return '<div class="no-updates">No responses yet. Our team will respond soon.</div>';
      }
      
      return updates.map(update => {
        const isEmployee = update.author.includes('CHIETA') || 
                           update.author.includes('Committee') || 
                           update.author.includes('Department') ||
                           update.author.includes('Support') ||
                           update.author.includes('Coordinator');
        
        return `
          <div class="update ${isEmployee ? 'update-employee' : ''}">
            <div class="update-header">
              <div class="update-author">${update.author}</div>
              <div class="update-date">${formatDate(update.date)}</div>
            </div>
            <p class="update-content">${update.content}</p>
          </div>
        `;
      }).join('');
    }
    
    function formatDate(dateString) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    }
  });