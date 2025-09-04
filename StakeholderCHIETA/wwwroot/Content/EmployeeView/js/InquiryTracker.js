// Simple mock to demonstrate behavior.
// Replace with your actual API/database call.
const MOCK_DB = {
    "CHI-2025-00123": {
        status: "in-progress",
        description:
            "Your inquiry has been received and assigned to an agent. Estimated response within 2 business days."
    },
    "CHI-2025-00456": {
        status: "completed",
        description:
            "Issue resolved on 22 Aug 2025. A confirmation email has been sent with the resolution details."
    }
};

const searchForm = document.getElementById("searchForm");
const refInput = document.getElementById("refNumber");
const desc = document.getElementById("statusDesc");
const statusInProgress = document.getElementById("statusInProgress");
const statusCompleted = document.getElementById("statusCompleted");
const doneBtn = document.getElementById("doneBtn");

function clearUI() {
    statusInProgress.checked = false;
    statusCompleted.checked = false;
    desc.value = "";
}

const settingsBtn = document.getElementById('settings-btn');
const settingsMenu = document.getElementById('settings-menu');
const prefDark = document.getElementById('pref-dark');
const DARK_KEY = 'prefers-dark';

const closeMenu = () => { if (settingsMenu) { settingsMenu.hidden = true; settingsBtn?.setAttribute('aria-expanded', 'false'); } };
const openMenu = () => { if (settingsMenu) { settingsMenu.hidden = false; settingsBtn?.setAttribute('aria-expanded', 'true'); } };

settingsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = settingsBtn.getAttribute('aria-expanded') === 'true';
    expanded ? closeMenu() : openMenu();
});
document.addEventListener('click', (e) => {
    if (!settingsMenu || settingsMenu.hidden) return;
    if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) closeMenu();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    clearUI();

    const ref = refInput.value.trim().toUpperCase();
    // Simulate fetch delay for UX
    searchForm.querySelector("button[type=submit]").disabled = true;

    setTimeout(() => {
        const record = MOCK_DB[ref];

        if (!record) {
            desc.removeAttribute("readonly");
            desc.value = "No record found for the provided reference number.";
            desc.setAttribute("readonly", true);
        } else {
            if (record.status === "in-progress") statusInProgress.checked = true;
            if (record.status === "completed") statusCompleted.checked = true;
            desc.removeAttribute("readonly");
            desc.value = record.description;
            desc.setAttribute("readonly", true);
        }

        searchForm.querySelector("button[type=submit]").disabled = false;
    }, 450);
});

doneBtn.addEventListener("click", () => {
    // You can redirect back or close a modal here.
    // For now we just provide a little acknowledgement.
    doneBtn.textContent = "Saved";
    setTimeout(() => (doneBtn.textContent = "Done"), 1200);
});