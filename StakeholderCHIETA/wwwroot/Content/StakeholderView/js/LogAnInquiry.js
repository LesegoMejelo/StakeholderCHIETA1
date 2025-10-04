// LogAnInquiry.js - Stakeholder Submit Inquiry
class InquiryForm {
    constructor() {
        this.currentStep = 1;
        this.formData = {};
        this.availableTags = ['Urgent', 'Documentation', 'Deadline', 'Follow-up', 'Technical'];
        this.selectedTags = [];
        this.advisors = [];
    }

    async init() {
        console.log('Initializing InquiryForm...');
        this.setupEventListeners();
        this.renderTagChips();
        await this.loadAdvisors();
        this.updateProgress();
    }

    async loadAdvisors() {
        try {
            // This would be an API call to get available advisors
            // For now, using placeholder data
            this.advisors = [
                { id: 'advisor1', name: 'John Doe' },
                { id: 'advisor2', name: 'Jane Smith' },
                { id: 'advisor3', name: 'Mike Johnson' },
                { id: 'advisor4', name: 'Sarah Williams' }
            ];

            const select = document.getElementById('advisorSelect');
            if (select) {
                this.advisors.forEach(advisor => {
                    const option = document.createElement('option');
                    option.value = advisor.id;
                    option.textContent = advisor.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading advisors:', error);
        }
    }

    setupEventListeners() {
        // Navigation buttons
        document.querySelectorAll('[data-next]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nextStep = parseInt(e.target.dataset.next);
                this.goToStep(nextStep);
            });
        });

        document.querySelectorAll('[data-prev]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prevStep = parseInt(e.target.dataset.prev);
                this.goToStep(prevStep);
            });
        });

        // Subject character counter
        const subjectInput = document.getElementById('subject');
        if (subjectInput) {
            subjectInput.addEventListener('input', (e) => {
                const count = e.target.value.length;
                document.getElementById('subjectCount').textContent = count;
            });
        }

        // File input handler
        const fileInput = document.getElementById('attachment');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        // Form submission
        const form = document.getElementById('inquiryForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitInquiry();
            });
        }

        // Real-time preview update
        document.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('input', () => this.updatePreview());
        });

        // Copy reference button (for success screen)
        const copyBtn = document.getElementById('copyRef');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyReference());
        }

        // New inquiry button
        const newInquiryBtn = document.getElementById('newInquiry');
        if (newInquiryBtn) {
            newInquiryBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetForm();
            });
        }
    }

    renderTagChips() {
        const container = document.getElementById('tagChips');
        if (!container) return;

        container.innerHTML = this.availableTags.map(tag => {
            const isSelected = this.selectedTags.includes(tag);
            return `
                <button type="button" class="chip ${isSelected ? 'active' : ''}" data-tag="${tag}">
                    ${tag}
                </button>
            `;
        }).join('');

        // Add click listeners
        container.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => this.toggleTag(chip.dataset.tag));
        });
    }

    toggleTag(tag) {
        if (this.selectedTags.includes(tag)) {
            this.selectedTags = this.selectedTags.filter(t => t !== tag);
        } else {
            this.selectedTags.push(tag);
        }
        this.renderTagChips();
        this.updatePreview();
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        fileList.innerHTML = files.map(file => {
            const size = (file.size / 1024 / 1024).toFixed(2);
            return `
                <li class="file-item">
                    <span>${this.escapeHtml(file.name)} (${size} MB)</span>
                </li>
            `;
        }).join('');
    }

    goToStep(stepNumber) {
        // Validate current step before moving
        if (stepNumber > this.currentStep) {
            if (!this.validateStep(this.currentStep)) {
                return;
            }
        }

        // Hide all panels
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Show target panel
        const targetPanel = document.querySelector(`[data-panel="${stepNumber}"]`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }

        // Update step indicators
        document.querySelectorAll('.step').forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.toggle('current', stepNum === stepNumber);
            step.setAttribute('aria-selected', stepNum === stepNumber);
        });

        this.currentStep = stepNumber;
        this.updateProgress();

        // Update preview when moving to step 2
        if (stepNumber === 2) {
            this.updatePreview();
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    validateStep(stepNumber) {
        if (stepNumber === 1) {
            const category = document.querySelector('input[name="category"]:checked');
            const subject = document.getElementById('subject').value.trim();

            if (!category) {
                this.showToast('Please select a category');
                return false;
            }

            if (!subject) {
                this.showToast('Please enter a subject');
                return false;
            }

            return true;
        }

        return true;
    }

    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const percentage = (this.currentStep / 2) * 100;
            progressFill.style.width = `${percentage}%`;
        }
    }

    updatePreview() {
        const reviewBox = document.getElementById('reviewBox');
        if (!reviewBox) return;

        const category = document.querySelector('input[name="category"]:checked')?.value || 'Not selected';
        const subject = document.getElementById('subject')?.value || 'Not entered';
        const description = document.getElementById('description')?.value || 'Not entered';
        const desired = document.getElementById('desired')?.value || 'Not specified';
        const relatedDate = document.getElementById('relatedDate')?.value || 'Not specified';
        const callback = document.getElementById('callback')?.checked ? 'Yes' : 'No';
        const advisorSelect = document.getElementById('advisorSelect');
        const advisor = advisorSelect?.options[advisorSelect.selectedIndex]?.text || 'General assignment';

        reviewBox.innerHTML = `
            <div class="preview-item">
                <strong>Category:</strong> ${this.escapeHtml(category)}
            </div>
            <div class="preview-item">
                <strong>Subject:</strong> ${this.escapeHtml(subject)}
            </div>
            <div class="preview-item">
                <strong>Assigned to:</strong> ${this.escapeHtml(advisor)}
            </div>
            ${this.selectedTags.length > 0 ? `
                <div class="preview-item">
                    <strong>Tags:</strong> ${this.selectedTags.map(t => this.escapeHtml(t)).join(', ')}
                </div>
            ` : ''}
            <div class="preview-item">
                <strong>Description:</strong> ${this.escapeHtml(description)}
            </div>
            <div class="preview-item">
                <strong>Desired outcome:</strong> ${this.escapeHtml(desired)}
            </div>
            <div class="preview-item">
                <strong>Related date:</strong> ${this.escapeHtml(relatedDate)}
            </div>
            <div class="preview-item">
                <strong>Follow-up call requested:</strong> ${callback}
            </div>
        `;
    }

    async submitInquiry() {
        try {
            const submitBtn = document.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            // Validate step 2
            const description = document.getElementById('description').value.trim();
            if (!description) {
                this.showToast('Please provide a description');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit inquiry';
                return;
            }

            // Collect form data
            const category = document.querySelector('input[name="category"]:checked')?.value;
            const subject = document.getElementById('subject').value.trim();
            const desired = document.getElementById('desired').value.trim();
            const relatedDate = document.getElementById('relatedDate').value;
            const callback = document.getElementById('callback').checked;
            const advisorSelect = document.getElementById('advisorSelect');
            const advisorId = advisorSelect?.value || '';
            const advisorName = advisorSelect?.options[advisorSelect.selectedIndex]?.text || '';

            const requestData = {
                Category: category,
                Subject: subject,
                Description: description,
                DesiredOutcome: desired,
                RelatedDate: relatedDate,
                CallbackRequested: callback,
                Tags: this.selectedTags,
                AssignedAdvisorId: advisorId,
                AssignedAdvisorName: advisorName !== 'Select an advisor (optional)' ? advisorName : ''
            };

            console.log('Submitting inquiry:', requestData);

            const response = await fetch('/Inquiry/SubmitInquiry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showSuccessScreen(result.referenceNumber, requestData);
            } else {
                throw new Error(result.message || 'Failed to submit inquiry');
            }

        } catch (error) {
            console.error('Error submitting inquiry:', error);
            this.showToast('Failed to submit inquiry. Please try again.', 'error');

            const submitBtn = document.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit inquiry';
        }
    }

    showSuccessScreen(referenceNumber, formData) {
        // Hide form panels
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Show success panel
        const successPanel = document.getElementById('successPanel');
        if (successPanel) {
            successPanel.hidden = false;
            document.getElementById('refCode').textContent = referenceNumber;

            const summary = `Your inquiry about "${formData.Subject}" has been received. ` +
                `You'll be notified via email when there are updates.`;
            document.getElementById('successSummary').textContent = summary;

            // Setup track link
            const trackLink = document.getElementById('trackLink');
            if (trackLink) {
                trackLink.href = '/Inquiry/TrackAnInquiry';
            }
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    copyReference() {
        const refCode = document.getElementById('refCode').textContent;
        navigator.clipboard.writeText(refCode).then(() => {
            this.showToast('Reference number copied!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            this.showToast('Failed to copy reference number', 'error');
        });
    }

    resetForm() {
        // Reset form
        document.getElementById('inquiryForm').reset();
        this.selectedTags = [];
        this.renderTagChips();

        // Hide success panel
        const successPanel = document.getElementById('successPanel');
        if (successPanel) {
            successPanel.hidden = true;
        }

        // Go back to step 1
        this.goToStep(1);

        // Clear file list
        const fileList = document.getElementById('fileList');
        if (fileList) {
            fileList.innerHTML = '';
        }

        // Reset character counter
        document.getElementById('subjectCount').textContent = '0';

        this.showToast('Ready to submit a new inquiry');
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toastMsg');

        if (toast && toastMsg) {
            toastMsg.textContent = message;
            toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
            toast.classList.add('show');

            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
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
let inquiryForm;
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Content Loaded - Initializing InquiryForm');
    inquiryForm = new InquiryForm();
    inquiryForm.init();
});