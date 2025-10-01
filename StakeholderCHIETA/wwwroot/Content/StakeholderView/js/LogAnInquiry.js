(function () {
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

    // NEW FUNCTION: Fetch and Populate Advisors
    async function fetchAndPopulateAdvisors() {
        const advisorSelect = $("#advisorSelect");
        if (!advisorSelect) return;

        try {
            const response = await fetch('/api/inquiry/advisors');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const advisors = await response.json();

            // Clear existing options, keep the "Select an advisor" option
            advisorSelect.innerHTML = '<option value="">Select an advisor</option>';

            advisors.forEach(advisor => {
                const option = document.createElement('option');
                option.value = advisor.id;   // This will be assignedAdvisorId
                option.textContent = advisor.name; // This will be assignedAdvisorName
                advisorSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error fetching advisors:", error);
            toast("Failed to load advisors. Please refresh the page."); // Provide user feedback
        }
    }

    // ... (rest of your existing LogAnInquiry.js code) ...

    // Find the existing form submission event listener
    $("#inquiryForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        // Basic validation (you might have more comprehensive validation already)
        const form = e.target;
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Create FormData object
        const formData = new FormData(form);

        // Get the selected advisor's name based on the selected ID
        const advisorSelect = $("#advisorSelect");
        const selectedAdvisorId = advisorSelect.value;
        const selectedAdvisorName = selectedAdvisorId ? advisorSelect.options[advisorSelect.selectedIndex].textContent : "";

        // Add the advisor name to the form data
        // formData.append("assignedAdvisorId", selectedAdvisorId); // This is already handled by name="assignedAdvisorId" on the select
        formData.append("assignedAdvisorName", selectedAdvisorName);

        try {
            const response = await fetch('/api/inquiry', {
                method: 'POST',
                body: formData, // Use the FormData object
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            $("#refCode").textContent = result.referenceNumber;
            $("#successSummary").textContent = `Your inquiry about "${formData.get('subject')}" has been submitted and assigned to ${selectedAdvisorName}.`;
            $("#trackLink").href = `/inquirytracking?ref=${result.referenceNumber}`; // Example tracking link

            // Hide the form panels and show the success panel
            $$(".panel").forEach(p => p.hidden = true);
            $("#successPanel").hidden = false;

            toast("Inquiry submitted successfully!");

            // Optionally, reset the form for another submission
            // form.reset();

        } catch (error) {
            console.error('Error submitting inquiry:', error);
            toast('Failed to submit inquiry: ' + error.message);
        }
    });

    function init() {
        // ... (your existing init logic, e.g., for step progress, subject count, etc.) ...
        fetchAndPopulateAdvisors(); // CALL THE NEW FUNCTION HERE
    }

    init(); // Ensure init() is called when the DOM is ready
})();