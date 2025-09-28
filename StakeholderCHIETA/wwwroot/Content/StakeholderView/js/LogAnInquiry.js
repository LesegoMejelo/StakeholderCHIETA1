// LogAnInquiry.js  — vanilla JS (no jQuery)
// Assumes your HTML has: #inquiryForm, #subject, #description, #desired, #relatedDate,
// #callback, input[name="category"], #tagChips, #subjectCount, #attachment, #fileList,
// step UI: .panel[data-panel="1|2"], .step[data-step="1|2"], #progressFill
// review UI: #reviewBox
// success UI: #successPanel, #refCode, #successSummary, #trackLink (optional)
// toast: #toast, #toastMsg

(function () {
    // ---------- Utilities ----------
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    function toast(msg) {
        const box = $("#toast");
        const msgEl = $("#toastMsg");
        if (!box || !msgEl) return console.warn("toast container missing");
        msgEl.textContent = msg;
        box.classList.add("show");
        clearTimeout(toast.t);
        toast.t = setTimeout(() => box.classList.remove("show"), 1800);
    }

    // ---------- Tag chips ----------
    const TAGS = ["Eligibility", "Documents", "Portal access", "Payment", "Schedule", "Accreditation", "Policy", "Technical"];

    function mountChips() {
        const row = $("#tagChips");
        if (!row) return;
        row.innerHTML = "";
        TAGS.forEach(t => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "chip";
            chip.textContent = t;
            chip.addEventListener("click", () => chip.classList.toggle("active"));
            row.appendChild(chip);
        });
    }

    function readChips() {
        return $$("#tagChips .chip.active").map(c => c.textContent);
    }

    // ---------- Stepper / progress ----------
    function setStep(n) {
        // show the requested panel
        $$(".panel").forEach(p => p.classList.toggle("active", p.dataset.panel === String(n)));

        // update step indicators
        $$(".step").forEach(s => {
            const active = s.dataset.step === String(n);
            s.classList.toggle("current", active);
            s.setAttribute("aria-selected", String(active));
        });

        // progress: 50% (step1) / 100% (step2)
        const fill = $("#progressFill");
        if (fill) fill.style.width = (n === 1 ? 50 : 100) + "%";

        if (n === 2) updateReview();
        // if the second part is further down, ensure it’s visible
        const activePanel = $(`.panel[data-panel="${n}"]`);
        activePanel?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // global click delegation: next/back, settings, copy
    document.addEventListener("click", (e) => {
        // next
        const nextBtn = e.target.closest("[data-next]");
        if (nextBtn) {
            const step = Number(nextBtn.dataset.next);
            // validate the current step before advancing
            if (validateStep(step - 1)) setStep(step);
            return;
        }
        // back
        const prevBtn = e.target.closest("[data-prev]");
        if (prevBtn) { setStep(Number(prevBtn.dataset.prev)); return; }

        // settings menu toggle (optional; safe-guarded)
        const settingsBtn = e.target.closest("#settings-btn");
        if (settingsBtn) {
            const menu = $("#settings-menu");
            const expanded = settingsBtn.getAttribute("aria-expanded") === "true";
            settingsBtn.setAttribute("aria-expanded", String(!expanded));
            if (menu) menu.hidden = expanded;
            return;
        }

        // copy reference
        const copy = e.target.closest("#copyRef");
        if (copy) {
            const txt = $("#refCode")?.textContent?.trim();
            if (txt) { navigator.clipboard?.writeText(txt); toast("Reference copied"); }
            return;
        }
    });

    // click-away to close settings (optional; safe-guarded)
    document.addEventListener("click", (e) => {
        const menu = $("#settings-menu");
        const btn = $("#settings-btn");
        if (!menu || !btn) return;
        const outsideMenu = !menu.contains(e.target) && e.target !== btn;
        if (outsideMenu) { menu.setAttribute("hidden", ""); btn.setAttribute("aria-expanded", "false"); }
    });

    // ---------- Validation ----------
    function validateStep(step) {
        if (step === 1) {
            const subject = $("#subject");
            if (!document.querySelector('input[name="category"]:checked')) { toast("Please choose a category."); return false; }
            if (!subject || !subject.value.trim()) { subject?.focus(); toast("Subject is required."); return false; }
            return true;
        }
        if (step === 2) {
            const desc = $("#description");
            if (!desc || !desc.value.trim()) { desc?.focus(); toast("Please add a description."); return false; }
            return true;
        }
        return true;
    }

    // subject counter
    $("#subject")?.addEventListener("input", () => {
        const s = $("#subject");
        const c = $("#subjectCount");
        if (s && c) c.textContent = String(s.value.length);
    });

    // attachments list
    $("#attachment")?.addEventListener("change", () => {
        const input = $("#attachment");
        const list = $("#fileList");
        if (!input || !list) return;

        list.innerHTML = "";
        const files = Array.from(input.files || []);
        const maxFiles = 5;
        const maxSize = 5 * 1024 * 1024;

        if (files.length > maxFiles) { toast("Please choose up to 5 files."); input.value = ""; return; }

        for (const f of files) {
            if (f.size > maxSize) { toast("Each file must be under 5MB."); input.value = ""; list.innerHTML = ""; return; }
            const li = document.createElement("li");
            li.textContent = `${f.name} (${Math.round(f.size / 1024)} KB)`;
            list.appendChild(li);
        }
    });

    // ---------- Review ----------
    function updateReview() {
        const formData = readForm();
        const preview = [
            `Category: ${formData.category || "—"}`,
            `Subject: ${formData.subject || "—"}`,
            `Tags: ${formData.tags.join(", ") || "—"}`,
            "",
            "Description:",
            formData.description || "—",
            "",
            `Desired outcome: ${formData.desired || "—"}`,
            `Related date: ${formData.relatedDate || "—"}`,
            `Follow-up call: ${formData.callback ? "Yes" : "No"}`
        ].join("\n");
        const box = $("#reviewBox");
        if (box) box.textContent = preview;
    }

    function readForm() {
        const catInput = document.querySelector('input[name="category"]:checked');
        return {
            category: catInput?.value || "",
            subject: $("#subject")?.value.trim() || "",
            tags: readChips(),
            description: $("#description")?.value.trim() || "",
            desired: $("#desired")?.value.trim() || "",
            relatedDate: $("#relatedDate")?.value || "",
            callback: !!$("#callback")?.checked
        };
    }

    // ---------- Submit ----------
    $("#inquiryForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!validateStep(1) || !validateStep(2)) return;

        const payload = readForm();
        const submitBtn = $("#inquiryForm button[type='submit']");
        const originalText = submitBtn?.textContent || "Submit";
        if (submitBtn) { submitBtn.textContent = "Submitting..."; submitBtn.disabled = true; }

        try {
            const formData = new FormData();
            // do NOT send name; server gets it from the auth principal
            formData.append("subject", payload.subject);
            formData.append("description", payload.description);
            formData.append("inquiryType", payload.category);
            formData.append("desiredOutcome", payload.desired);
            formData.append("relatedDate", payload.relatedDate);
            formData.append("tags", payload.tags.join(","));
            formData.append("followUpCall", String(payload.callback));

            // (optional) include files if your API accepts them under "files"
            const fileInput = $("#attachment");
            if (fileInput && fileInput.files?.length) {
                Array.from(fileInput.files).forEach(f => formData.append("files", f));
            }

            const response = await fetch("/api/inquiry", { method: "POST", body: formData });
            const responseText = await response.text();

            if (!response.ok) throw new Error(`Server error: ${response.status} - ${responseText}`);

            const result = JSON.parse(responseText || "{}");
            const refNumber = result.referenceNumber || result.id || genRef();

            showSuccess(refNumber, payload);
            toast("Inquiry submitted successfully!");
        } catch (error) {
            console.error("Submission failed:", error);
            toast("Failed to submit inquiry: " + (error?.message || "Unknown error"));
        } finally {
            if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled = false; }
        }
    });

    // ---------- Success view ----------
    function showSuccess(refId, formData) {
        $("#refCode") && ($("#refCode").textContent = refId);
        $("#successSummary") && ($("#successSummary").textContent =
            `We created your inquiry under "${formData.category} — ${formData.subject}". Keep this reference for your records.`);

        const trackLink = $("#trackLink");
        if (trackLink) trackLink.href = "track.html?ref=" + encodeURIComponent(refId);

        const success = $("#successPanel");
        if (success) success.hidden = false;

        // FIX: use $$ here (NodeList → array), not $
        $$(".panel").forEach(p => p.classList.remove("active"));

        // jump to top so the user sees the confirmation immediately
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // ---------- Helpers ----------
    function genRef() {
        const now = new Date();
        const y = String(now.getFullYear()).slice(-2);
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
        return `INQ-${y}${m}${d}-${rand}`;
    }

    function prefillFromURL() {
        const params = new URLSearchParams(location.search);
        const subject = params.get("subject");
        if (subject && $("#subject")) {
            $("#subject").value = subject;
            $("#subjectCount") && ($("#subjectCount").textContent = String(subject.length));
        }
        const category = params.get("category");
        if (category) {
            const radio = $$('input[name="category"]').find(r => r.value.toLowerCase() === category.toLowerCase());
            radio && (radio.checked = true);
        }
        const desired = params.get("desired");
        if (desired && $("#desired")) $("#desired").value = desired;
    }

    $("#newInquiry")?.addEventListener("click", (e) => {
        e.preventDefault();
        $("#inquiryForm")?.reset();
        $$("#tagChips .chip").forEach(c => c.classList.remove("active"));
        $("#successPanel") && ($("#successPanel").hidden = true);
        $("#subjectCount") && ($("#subjectCount").textContent = "0");
        $("#fileList") && ($("#fileList").innerHTML = "");
        setStep(1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Global debugging
    window.addEventListener("error", (e) => console.error("JavaScript error:", e.error || e.message || e));
    window.addEventListener("unhandledrejection", (e) => console.error("Unhandled promise rejection:", e.reason));

    // ---------- Init ----------
    console.log("Initializing inquiry form...");
    mountChips();
    prefillFromURL();
    setStep(1);
    console.log("Inquiry form initialized");
})();
