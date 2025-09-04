/* ===== Form logic (unchanged behavior, keeps alert) ===== */
const form = document.getElementById('appointment-form');
const advisorEl = document.getElementById('advisor');
const reasonEl = document.getElementById('reason');
const dateEl = document.getElementById('date');
const timeEl = document.getElementById('time');
const btn = document.getElementById('confirm-btn');
const countEl = document.getElementById('char-count');

/* Character counter */
function updateCount() {
    const max = parseInt(reasonEl.getAttribute('maxlength') || '300', 10);
    countEl.textContent = `${reasonEl.value.length}/${max}`;
}
reasonEl.addEventListener('input', updateCount);
updateCount();

/* Prevent past dates */
(function setMinDate() {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, '0');
    const dd = String(t.getDate()).padStart(2, '0');
    dateEl.min = `${yyyy}-${mm}-${dd}`;
})();

/* Enable/disable button */
function isComplete() {
    return advisorEl.value && reasonEl.value.trim() && dateEl.value && timeEl.value;
}
function toggleButton() { btn.disabled = !isComplete(); }
[advisorEl, reasonEl, dateEl, timeEl].forEach(el => el.addEventListener('input', toggleButton));
toggleButton();

/* Submit (with original alert) */
form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!isComplete()) {
        alert('Please fill in all fields');
        return;
    }

    const advisor = advisorEl.value;
    const reason = reasonEl.value.trim();
    const date = dateEl.value;
    const time = timeEl.value;

    alert(`Appointment confirmed!\nAdvisor: ${advisor}\nReason: ${reason}\nDate: ${date}\nTime: ${time}`);

    form.reset();
    updateCount();
    toggleButton();
});

/* ===== Parallax for circles (subtle, respects reduced motion) ===== */
(function parallaxCircles() {
    const circles = Array.from(document.querySelectorAll('.circle'));
    if (!circles.length) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = mediaQuery.matches;

    mediaQuery.addEventListener?.('change', () => {
        reduced = mediaQuery.matches;
    });

    // Disable on touch-only devices to avoid jumpiness
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (reduced || isTouch) return;

    let raf = null;
    let mouseX = 0, mouseY = 0;

    function onMove(e) {
        mouseX = e.clientX / window.innerWidth - 0.5;   // -0.5 .. 0.5
        mouseY = e.clientY / window.innerHeight - 0.5;  // -0.5 .. 0.5
        if (!raf) raf = requestAnimationFrame(applyParallax);
    }

    function applyParallax() {
        circles.forEach(el => {
            const speed = parseFloat(el.getAttribute('data-speed') || '1');
            const x = mouseX * 12 * speed;
            const y = mouseY * 12 * speed;
            el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        });
        raf = null;
    }

    window.addEventListener('mousemove', onMove);
})();