(function(){
  // -------- Utilities --------
  const $ = (s,r=document)=> r.querySelector(s);
  const $$ = (s,r=document)=> Array.from(r.querySelectorAll(s));
  function toast(msg){
    const box = $("#toast"); const msgEl = $("#toastMsg");
    msgEl.textContent = msg; box.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(()=> box.classList.remove("show"), 1800);
  }

  // -------- Tag chips --------
  const TAGS = ["Eligibility","Documents","Portal access","Payment","Schedule","Accreditation","Policy","Technical"];
  function mountChips(){
    const row = $("#tagChips"); row.innerHTML = "";
    TAGS.forEach(t=>{
      const chip = document.createElement("button");
      chip.type="button"; chip.className="chip"; chip.textContent=t;
      chip.addEventListener("click", ()=> chip.classList.toggle("active"));
      row.appendChild(chip);
    });
  }
  function readChips(){ return $$("#tagChips .chip.active").map(c=> c.textContent); }

  // -------- Progress & navigation (2 steps) --------
  function setStep(n){
    $$(".panel").forEach(p=> p.classList.toggle("active", p.dataset.panel === String(n)));
    $$(".step").forEach(s=>{
      const active = s.dataset.step === String(n);
      s.classList.toggle("current", active);
      s.setAttribute("aria-selected", String(active));
    });
    // 2-step progress: 50% and 100%
    $("#progressFill").style.width = (n===1 ? 50 : 100) + "%";
    if(n===2) updateReview();
  }

  document.addEventListener("click", (e)=>{
    // next/back
    const nextBtn = e.target.closest("[data-next]");
    if(nextBtn){ const step = Number(nextBtn.dataset.next); if(validateStep(step-1)) setStep(step); return; }
    const prevBtn = e.target.closest("[data-prev]");
    if(prevBtn){ setStep(Number(prevBtn.dataset.prev)); return; }
    // settings
    const settingsBtn = e.target.closest("#settings-btn");
    if(settingsBtn){
      const menu = $("#settings-menu"); const expanded = settingsBtn.getAttribute("aria-expanded")==="true";
      settingsBtn.setAttribute("aria-expanded", String(!expanded)); menu.hidden = expanded; return;
    }
    // copy ref
    const copy = e.target.closest("#copyRef"); if(copy){ const txt=$("#refCode").textContent; navigator.clipboard?.writeText(txt); toast("Reference copied"); return; }
  });

  document.addEventListener("click", (e)=>{
    const outsideMenu = !$("#settings-menu")?.contains(e.target) && e.target !== $("#settings-btn");
    if(outsideMenu){ $("#settings-menu")?.setAttribute("hidden", ""); $("#settings-btn")?.setAttribute("aria-expanded","false"); }
  });

  // simple validators per step
  function validateStep(step){
    if(step===1){ // step 1: category + subject
      const subject = $("#subject");
      if(!document.querySelector('input[name="category"]:checked')){ toast("Please choose a category."); return false; }
      if(!subject.value.trim()){ subject.focus(); toast("Subject is required."); return false; }
      return true;
    }
    if(step===2){ // step 2: description
      const desc = $("#description"); if(!desc.value.trim()){ desc.focus(); toast("Please add a description."); return false; }
      return true;
    }
    return true;
  }

  // subject counter
  $("#subject").addEventListener("input", ()=> $("#subjectCount").textContent = String($("#subject").value.length));

  // files
  $("#attachment").addEventListener("change", ()=>{
    const list = $("#fileList"); list.innerHTML = "";
    const files = Array.from($("#attachment").files || []);
    const maxFiles = 5; const maxSize = 5 * 1024 * 1024;
    if(files.length > maxFiles){ toast("Please choose up to 5 files."); $("#attachment").value = ""; return; }
    for(const f of files){
      if(f.size > maxSize){ toast("Each file must be under 5MB."); $("#attachment").value = ""; list.innerHTML=""; return; }
      const li = document.createElement("li"); li.textContent = f.name + " (" + Math.round(f.size/1024) + " KB)";
      list.appendChild(li);
    }
  });

  // review box (no contact info)
  function updateReview(){
    const formData = readForm();
    const preview = [
      "Category: " + formData.category,
      "Subject: " + formData.subject,
      "Tags: " + (formData.tags.join(", ") || "—"),
      "",
      "Description:",
      formData.description,
      "",
      "Desired outcome: " + (formData.desired || "—"),
      "Related date: " + (formData.relatedDate || "—"),
      "Follow-up call: " + (formData.callback ? "Yes" : "No")
    ].join("\n");
    $("#reviewBox").textContent = preview;
  }

  // read form data (without contact fields)
  function readForm(){
    const cat = document.querySelector('input[name="category"]:checked')?.value || "";
    return {
      category: cat,
      subject: $("#subject").value.trim(),
      tags: readChips(),
      description: $("#description").value.trim(),
      desired: $("#desired").value.trim(),
      relatedDate: $("#relatedDate").value,
      callback: $("#callback").checked
    };
  }

  // submit
  $("#inquiryForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    if(!validateStep(1) || !validateStep(2)){ return; }

    // Build payload
    const payload = readForm();
    payload.tags = payload.tags.slice(0,6);
    payload.files = Array.from($("#attachment").files||[]).map(f=>({ name:f.name, size:f.size }));
    payload.createdAt = new Date().toISOString();
    payload.ref = genRef();

    // Simulate API call
    console.log("Submitting inquiry payload:", payload);

    // Show success (no email text)
    $("#refCode").textContent = payload.ref;
    $("#successSummary").textContent = `We created your inquiry under “${payload.category} — ${payload.subject}”. Keep this reference for your records.`;
    $("#trackLink").href = "track.html?ref=" + encodeURIComponent(payload.ref);
    $("#successPanel").hidden = false;
    $$(".panel").forEach(p=> p.classList.remove("active"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function genRef(){
    const now = new Date();
    const y = String(now.getFullYear()).slice(-2);
    const m = String(now.getMonth()+1).padStart(2,"0");
    const d = String(now.getDate()).padStart(2,"0");
    const rand = Math.random().toString(36).slice(2,6).toUpperCase();
    return `INQ-${y}${m}${d}-${rand}`;
  }

  // URL param prefill
  function prefillFromURL(){
    const params = new URLSearchParams(location.search);
    const subject = params.get("subject"); if(subject){ $("#subject").value = subject; $("#subjectCount").textContent = String(subject.length); }
    const category = params.get("category");
    if(category){
      const radio = Array.from(document.querySelectorAll('input[name="category"]')).find(r => r.value.toLowerCase() === category.toLowerCase());
      if(radio) radio.checked = true;
    }
    const desired = params.get("desired"); if(desired) $("#desired").value = desired;
  }

  // New inquiry link
  $("#newInquiry").addEventListener("click", (e)=>{
    e.preventDefault();
    $("#inquiryForm").reset();
    $$("#tagChips .chip").forEach(c=> c.classList.remove("active"));
    $("#successPanel").hidden = true;
    $("#subjectCount").textContent = "0";
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Init
  mountChips();
  prefillFromURL();
  setStep(1);
})();