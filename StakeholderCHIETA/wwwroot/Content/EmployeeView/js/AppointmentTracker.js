(() => {
    // ---------- Safe storage ----------
    const SafeStore = (() => {
      try {
        const k = "__test__";
        localStorage.setItem(k, "1");
        localStorage.removeItem(k);
        return {
          get: (key) => JSON.parse(localStorage.getItem(key) || "null"),
          set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
        };
      } catch {
        const mem = {};
        return { get: (k) => mem[k] ?? null, set: (k, v) => (mem[k] = v) };
      }
    })();
  
    const STORAGE_KEY = "appt_tracker2_state_refined_modals_v1";
  
    // ---------- Seed data ----------
    const defaultState = {
      requests: [
        { id: "r1", date: "2025-08-24", time: "10:00", reason: "Skills roadmap session", status: "Scheduled" },
        { id: "r2", date: "2025-08-26", time: "14:00", reason: "Grant application review", status: "Scheduled" },
        { id: "r3", date: "2025-08-29", time: "09:30", reason: "Compliance onboarding", status: "Scheduled" },
        { id: "r4", date: "2025-09-01", time: "11:30", reason: "Quarterly review", status: "Scheduled" },
        { id: "r5", date: "2025-09-03", time: "16:00", reason: "Supplier onboarding", status: "Scheduled" },
        { id: "r6", date: "2025-09-05", time: "09:00", reason: "UX feedback session", status: "Scheduled" },
        { id: "r7", date: "2025-09-07", time: "13:15", reason: "Budget alignment", status: "Scheduled" },
        { id: "r8", date: "2025-09-10", time: "15:45", reason: "Security compliance check", status: "Scheduled" },
        { id: "r9", date: "2025-09-12", time: "08:30", reason: "Partner intro call", status: "Scheduled" },
        { id: "r10", date: "2025-09-14", time: "12:00", reason: "Marketing sync", status: "Scheduled" }
      ],
      appointments: [
        { id: "a1", date: "2025-08-01", title: "Intro call" },
        { id: "a2", date: "2025-08-07", title: "Site visit" },
        { id: "a3", date: "2025-08-13", title: "Review" },
        { id: "a4", date: "2025-08-22", title: "Workshop" },
        { id: "a5", date: "2025-08-30", title: "Follow-up" }
      ]
    };
  
    let state = SafeStore.get(STORAGE_KEY) || defaultState;
    const $ = (s, r=document) => r.querySelector(s);
    const save = () => SafeStore.set(STORAGE_KEY, state);
  
    // ---------- Undo manager (20s) ----------
  const Undo = {
    last: null,
    timer: null,
    ttl: 20000,
    arm(payload){
      // payload: { kind: 'replace'|'delete', index, prev, collection, message }
      this.last = payload;
      clearTimeout(this.timer);
      this.timer = setTimeout(()=> this.disarm(), this.ttl);
      showToast(payload.message, true);
    },
    disarm(){ this.last = null; hideUndo(); },
    apply(){
      if(!this.last) return;
      const { kind, index, prev, collection } = this.last;
      if(kind === "delete"){
        collection.splice(index, 0, JSON.parse(JSON.stringify(prev)));
      }else{
        collection[index] = JSON.parse(JSON.stringify(prev));
      }
      save(); renderAll();
      showToast("Undone.", false);
      this.disarm();
    }
  };
  
  
    // ---------- UI helpers ----------
    function showToast(msg, withUndo){
      $("#toastMsg").textContent = msg;
      $("#toastUndo").style.display = withUndo ? "inline-block" : "none";
      $("#toast").classList.add("show");
    }
    function hideUndo(){
      $("#toastUndo").style.display = "none";
      $("#toast").classList.remove("show");
    }
    $("#toastUndo")?.addEventListener("click", () => Undo.apply());
  
    function badgeClass(status){
      const s = (status||"").toLowerCase();
      if(s.includes("confirm")) return "confirmed";
      if(s.includes("declined — proposed")) return "declined-proposed";
      if(s.includes("declined")) return "declined";
      return "scheduled";
    }
  
    // ---------- Renderers ----------
    function renderRequests(){
      const tbody = $("#requestRows");
      if(!tbody) return;
      tbody.innerHTML = "";
  
      state.requests.forEach((req) => {
        const tr = document.createElement("tr");
        tr.dataset.id = req.id;
  
        tr.innerHTML = `
          <td>${req.date}</td>
          <td>${req.time}</td>
          <td>${req.reason}</td>
          <td><span class="badge ${badgeClass(req.status)}">${req.status}</span></td>
          <td>
            <div class="cell-actions">
              <button class="btn ghost small" data-action="info">More info</button>
              <button class="btn small" data-action="accept" ${finalized(req) ? "disabled" : ""}>Accept</button>
              <button class="btn secondary small" data-action="decline" ${finalized(req) ? "disabled" : ""}>Decline</button>
            </div>
          </td>
        `;
  
        tbody.appendChild(tr);
      });
  
      function finalized(r){ return ["Confirmed","Declined","Declined — proposed"].includes(r.status); }
    }
  
    function renderUpcomingSummary(){
      const ul = $("#upcomingSummary");
      if(!ul) return;
      ul.innerHTML = "";
  
      const confirmed = state.requests
        .filter(r => r.status === "Confirmed")
        .map(r => ({ id:"u_"+r.id, date:r.date, title:r.reason, time:r.time }));
  
      const all = [...state.appointments, ...confirmed]
        .filter(a => a.date)
        .sort((a,b)=> a.date.localeCompare(b.date));
  
      // Show first 3 like EmployeeLanding
      all.slice(0,3).forEach(a => {
        const li = document.createElement("li");
        const left = `${a.date} • ${a.time || ""}`.trim().replace(/\s+•\s*$/, "");
        li.innerHTML = `<span class="muted">${left}</span><span>${a.title}</span>`;
        ul.appendChild(li);
      });
    }
  
    function renderAll(){
      renderUpcomingSummary();
      renderRequests();
    }
  
    // ---------- Modals / focus ----------
    function openModal(id){
      const m = $(id);
      m.classList.add("show");
      trapFocus(m);
    }
    function closeModal(id){
      const m = $(id);
      m.classList.remove("show");
      releaseFocus();
    }
  
    let lastFocused = null;
    function trapFocus(container){
      lastFocused = document.activeElement;
      const focusable = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
      const nodes = Array.from(container.querySelectorAll(focusable)).filter(n=>!n.disabled);
      const first = nodes[0], last = nodes[nodes.length-1];
      function onKey(ev){
        if(ev.key === "Escape"){ ev.preventDefault(); closeModal("#declineModal"); closeModal("#infoModal"); }
        if(ev.key === "Tab"){
          if(ev.shiftKey && document.activeElement === first){ ev.preventDefault(); last.focus(); }
          else if(!ev.shiftKey && document.activeElement === last){ ev.preventDefault(); first.focus(); }
        }
      }
      container.addEventListener("keydown", onKey);
    }
    function releaseFocus(){
      if(lastFocused && typeof lastFocused.focus === "function"){ lastFocused.focus(); }
    }
  
    // ---------- Settings menu + dark toggle ----------
    const settingsBtn = $("#settings-btn");
    const settingsMenu = $("#settings-menu");
    settingsBtn?.addEventListener("click", (e)=>{
      e.stopPropagation();
      const expanded = settingsBtn.getAttribute("aria-expanded") === "true";
      settingsBtn.setAttribute("aria-expanded", String(!expanded));
      settingsMenu.hidden = expanded;
    });
    document.addEventListener("click", (e)=>{
      if(settingsMenu && !settingsMenu.hidden && !settingsMenu.contains(e.target) && e.target !== settingsBtn){
        settingsBtn.setAttribute("aria-expanded", "false");
        settingsMenu.hidden = true;
      }
    });
    $("#pref-dark")?.addEventListener("change", (e)=>{
      document.body.classList.toggle("dark", e.target.checked);
    });
  
    // ---------- Decline flow (2s delay + red state) ----------
    const pendingDecline = new Map(); // id -> {timer, btn}
  
    document.addEventListener("click", (e)=>{
      const btn = e.target.closest("button"); if(!btn) return;
  
      if(btn.dataset.closeModal === "true" || btn.id === "declineCancel"){
        const m = $("#declineModal");
        const pendingId = m.dataset.id;
        if(pendingId && pendingDecline.has(pendingId)){
          const entry = pendingDecline.get(pendingId);
          clearTimeout(entry.timer);
          entry.btn.classList.remove("danger");
          pendingDecline.delete(pendingId);
        }
        closeModal("#declineModal"); closeModal("#infoModal");
        return;
      }
  
      // Table actions
      const action = btn.dataset.action;
      if(action && btn.closest("table")){
        const row = btn.closest("tr");
        const id = row?.dataset?.id;
        const idx = state.requests.findIndex(r => r.id === id);
        const req = state.requests[idx];
        if(idx < 0) return;
  
        if(action === "info"){
          showInfo(req);
        } else if(action === "accept"){
          const prev = JSON.parse(JSON.stringify(req));
          req.status = "Confirmed";
          save(); renderAll();
          Undo.arm({ message: "Appointment confirmed. Undo?", index: idx, prev, collection: state.requests });
        } else if(action === "decline"){
          // Make Decline look "armed"
          btn.classList.add("danger");
  
          // Prepare modal fields
          const m = $("#declineModal");
          m.dataset.id = req.id;
          $("#decReason").value = req.declineReason || "";
          $("#decNewDate").value = (req.proposed?.date) || "";
          $("#decNewTime").value = (req.proposed?.time) || "";
          $("#decContext").textContent = `${req.date} at ${req.time} — ${req.reason}`;
  
          // Start (or restart) 2s timer to show modal
          if(pendingDecline.has(req.id)){
            clearTimeout(pendingDecline.get(req.id).timer);
          }
          const timer = setTimeout(()=>{
            openModal("#declineModal");
            btn.classList.remove("danger");
            pendingDecline.delete(req.id);
          }, 2000);
          pendingDecline.set(req.id, { timer, btn });
        }
      }
    });
  
    // ---------- Decline submit ----------
    $("#declineForm")?.addEventListener("submit", (e)=>{
      e.preventDefault();
      const id = $("#declineModal").dataset.id;
      const idx = state.requests.findIndex(r => r.id === id);
      const req = state.requests[idx];
      if(idx < 0) return;
      const prev = JSON.parse(JSON.stringify(req));
  
      const reason = $("#decReason").value.trim();
      const newDate = $("#decNewDate").value;
      const newTime = $("#decNewTime").value;
  
      req.declineReason = reason || "";
      req.proposed = { date:newDate || "", time:newTime || "" };
      const proposedProvided = (newDate || newTime);
      req.status = proposedProvided ? "Declined — proposed" : "Declined";
  
      save(); renderAll();
      closeModal("#declineModal");
      Undo.arm({
        message: proposedProvided ? "Declined with a proposed time. Undo?" : "Declined. Undo?",
        index: idx, prev, collection: state.requests
      });
    });
  
    // ---------- Info modal ----------
    function showInfo(req){
      $("#infoSubtitle").textContent = `Request #${req.id}`;
      $("#infoDate").textContent = req.date || "—";
      $("#infoTime").textContent = req.time || "—";
      $("#infoReason").textContent = req.reason || "—";
      $("#infoStatus").textContent = req.status || "—";
      $("#infoDeclineReason").textContent = (req.declineReason && req.status.toLowerCase().includes("declined")) ? req.declineReason : "—";
      const proposed = (req.proposed && (req.proposed.date || req.proposed.time)) ? `${req.proposed.date || ""} ${req.proposed.time || ""}`.trim() : "—";
      $("#infoProposed").textContent = proposed;
      openModal("#infoModal");
    }
  
    // ---------- Boot ----------
    renderAll();
  })();