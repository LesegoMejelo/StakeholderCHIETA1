(function(){
    const STORAGE_KEY = "stakeholder_feedback_v2";
    const SafeStore = (()=>{
      let memory = {};
      try{ const k="__t__"; localStorage.setItem(k,"1"); localStorage.removeItem(k);
        return { get(k){ const v=localStorage.getItem(k); return v?JSON.parse(v):null; }, set(k,v){ localStorage.setItem(k, JSON.stringify(v)); } }
      }catch{ return { get(k){ return memory[k] ?? null; }, set(k,v){ memory[k]=v; } } }
    })();
  
    const defaultState = {
      appointments: [
        { id:"a1", date:"2025-08-24", time:"10:00", subject:"Skills roadmap session", status:"Completed", feedback:null },
        { id:"a2", date:"2025-08-26", time:"14:00", subject:"Grant application review", status:"Completed", feedback:null },
        { id:"a3", date:"2025-08-29", time:"09:30", subject:"Compliance onboarding", status:"Scheduled", feedback:null },
        { id:"a4", date:"2025-09-01", time:"11:30", subject:"Quarterly review", status:"Completed", feedback:{ rating:4, tags:["Professionalism","Clarity"], comment:"Helpful session." } }
      ],
      inquiries: [
        { id:"q1", ref:"INQ-2101", title:"Skills development query", date:"2025-09-02", status:"Resolved", feedback:null },
        { id:"q2", ref:"INQ-2108", title:"Bursary enquiry", date:"2025-09-10", status:"Resolved", feedback:{ rating:5, tags:["Resolution quality","Courtesy"], comment:"Quick resolution, thank you!" } },
        { id:"q3", ref:"INQ-2109", title:"Compliance documentation", date:"2025-09-04", status:"Awaiting Info", feedback:null }
      ]
    };
    let state = SafeStore.get(STORAGE_KEY) || defaultState;
  
    const $ = (sel, root=document)=> root.querySelector(sel);
    const $$ = (sel, root=document)=> Array.from(root.querySelectorAll(sel));
    const fmtStar = n => "★";
    function save(){ SafeStore.set(STORAGE_KEY, state); }
    function toast(msg){ const box=$("#toast"),msgEl=$("#toastMsg"); msgEl.textContent=msg; box.classList.add("show"); clearTimeout(toast.t); toast.t=setTimeout(()=> box.classList.remove("show"), 1800); }
  
    document.addEventListener("click", (e)=>{
      const tab = e.target.closest(".tab"); if(!tab) return;
      $$(".tab").forEach(t=>{ t.classList.remove("active"); t.setAttribute("aria-selected","false"); });
      tab.classList.add("active"); tab.setAttribute("aria-selected","true");
      $$(".panel").forEach(p=> p.classList.remove("active"));
      $("#tab-"+tab.dataset.tab).classList.add("active");
    });
  
    function mountStars(container, currentValue){
      container.innerHTML=""; const starButtons=[];
      for(let i=1;i<=5;i++){ const b=document.createElement("button"); b.type="button"; b.className="star"; b.setAttribute("role","radio"); b.setAttribute("aria-label", i+" star"+(i>1?"s":"")); b.dataset.value=String(i); b.textContent=fmtStar(i); starButtons.push(b); container.appendChild(b); }
      function update(val){ starButtons.forEach(btn=> btn.setAttribute("aria-checked", String(Number(btn.dataset.value) <= (val||0)) )); container.dataset.value=String(val||0); }
      update(currentValue||0);
      container.addEventListener("click",(e)=>{ const btn=e.target.closest(".star"); if(!btn) return; update(Number(btn.dataset.value)); });
      container.addEventListener("keydown",(e)=>{ const val=Number(container.dataset.value||"0"); if(e.key==="ArrowRight"||e.key==="ArrowUp"){ e.preventDefault(); update(Math.min(5,val+1)); } if(e.key==="ArrowLeft"||e.key==="ArrowDown"){ e.preventDefault(); update(Math.max(0,val-1)); } });
    }
  
    const TAGS=["Professionalism","Clarity","Timeliness","Resolution quality","Ease of booking","Courtesy"];
    function mountChips(container, selected){ container.innerHTML=""; TAGS.forEach(t=>{ const chip=document.createElement("button"); chip.type="button"; chip.className="chip"; chip.textContent=t; if(selected && selected.includes(t)) chip.classList.add("active"); chip.addEventListener("click", ()=> chip.classList.toggle("active")); container.appendChild(chip); }); }
    function readChips(container){ return $$(".chip", container).filter(c=> c.classList.contains("active")).map(c=> c.textContent); }
  
    function renderAppointments(){
      const tbody=$("#apptRows"); if(!tbody) return;
      const q=($("#apptSearch").value||"").toLowerCase(); const completedOnly=$("#apptCompletedOnly").checked;
      tbody.innerHTML=""; state.appointments
        .filter(a => (!completedOnly || a.status==="Completed"))
        .filter(a => [a.date,a.time,a.subject,a.status].join(" ").toLowerCase().includes(q))
        .sort((a,b)=> (a.date+a.time).localeCompare(b.date+b.time))
        .forEach(a => { const tr=document.createElement("tr"); tr.dataset.id=a.id;
          const tdDate=document.createElement("td"); tdDate.textContent=a.date;
          const tdTime=document.createElement("td"); tdTime.textContent=a.time;
          const tdSubject=document.createElement("td"); tdSubject.textContent=a.subject;
          const tdStatus=document.createElement("td"); const bdg=document.createElement("span"); const done=!!a.feedback;
          bdg.className="badge " + (done ? "done" : (a.status==="Completed"?"pending":"na")); bdg.textContent=done?"Submitted":(a.status==="Completed"?"Awaiting":"N/A"); tdStatus.appendChild(bdg);
          const tdFb=document.createElement("td"); tdFb.textContent=done?"✅":"—";
          tr.append(tdDate,tdTime,tdSubject,tdStatus,tdFb); tbody.appendChild(tr);
        });
    }
    function renderInquiries(){
      const tbody=$("#inqRows"); if(!tbody) return;
      const q=($("#inqSearch").value||"").toLowerCase(); const resolvedOnly=$("#inqResolvedOnly").checked;
      tbody.innerHTML=""; state.inquiries
        .filter(i => (!resolvedOnly || i.status==="Resolved"))
        .filter(i => [i.ref,i.title,i.date,i.status].join(" ").toLowerCase().includes(q))
        .sort((a,b)=> (b.date).localeCompare(a.date))
        .forEach(i => { const tr=document.createElement("tr"); tr.dataset.id=i.id;
          const tdRef=document.createElement("td"); tdRef.textContent=i.ref;
          const tdTitle=document.createElement("td"); tdTitle.textContent=i.title;
          const tdDate=document.createElement("td"); tdDate.textContent=i.date;
          const tdStatus=document.createElement("td"); const bdg=document.createElement("span"); const done=!!i.feedback;
          bdg.className="badge " + (done ? "done" : (i.status==="Resolved"?"pending":"na")); bdg.textContent=done?"Submitted":(i.status==="Resolved"?"Awaiting":"N/A"); tdStatus.appendChild(bdg);
          const tdFb=document.createElement("td"); tdFb.textContent=done?"✅":"—";
          tr.append(tdRef,tdTitle,tdDate,tdStatus,tdFb); tbody.appendChild(tr);
        });
    }
  
    document.addEventListener("click", (e)=>{
      const arow = e.target.closest("#apptRows tr");
      if(arow){ const id=arow.dataset.id; $$("#apptRows tr").forEach(r=> r.classList.toggle("selected", r===arow));
        const a=state.appointments.find(x=> x.id===id); $("#apptSelected").textContent=a?`${a.date} ${a.time} — ${a.subject}`:"—";
        mountStars($("#apptStars"), a?.feedback?.rating || 0); mountChips($("#apptTags"), a?.feedback?.tags || []); $("#apptComment").value=a?.feedback?.comment || ""; return; }
      const irow = e.target.closest("#inqRows tr");
      if(irow){ const id=irow.dataset.id; $$("#inqRows tr").forEach(r=> r.classList.toggle("selected", r===irow));
        const iq=state.inquiries.find(x=> x.id===id); $("#inqSelected").textContent=iq?`${iq.ref} — ${iq.title}`:"—";
        mountStars($("#inqStars"), iq?.feedback?.rating || 0); mountChips($("#inqTags"), iq?.feedback?.tags || []); $("#inqComment").value=iq?.feedback?.comment || ""; return; }
    });
  
    $("#apptSubmit").addEventListener("click", ()=>{
      const row=$("#apptRows tr.selected"); if(!row){ toast("Select an appointment first."); return; }
      const id=row.dataset.id; const a=state.appointments.find(x=> x.id===id);
      const rating=Number($("#apptStars").dataset.value||"0"); if(!rating){ toast("Please choose a rating."); return; }
      const tags=Array.from($$("#apptTags .chip")).filter(c=>c.classList.contains("active")).map(c=>c.textContent);
      const comment=$("#apptComment").value.trim(); a.feedback={ rating, tags, comment, at:new Date().toISOString() };
      save(); renderAppointments(); updateSummary(); toast("Thanks! Feedback submitted.");
    });
    $("#inqSubmit").addEventListener("click", ()=>{
      const row=$("#inqRows tr.selected"); if(!row){ toast("Select an inquiry first."); return; }
      const id=row.dataset.id; const iq=state.inquiries.find(x=> x.id===id);
      const rating=Number($("#inqStars").dataset.value||"0"); if(!rating){ toast("Please choose a rating."); return; }
      const tags=Array.from($$("#inqTags .chip")).filter(c=>c.classList.contains("active")).map(c=>c.textContent);
      const comment=$("#inqComment").value.trim(); iq.feedback={ rating, tags, comment, at:new Date().toISOString() };
      save(); renderInquiries(); updateSummary(); toast("Thanks! Feedback submitted.");
    });
  
    const settingsBtn=$("#settings-btn"), settingsMenu=$("#settings-menu");
    if(settingsBtn && settingsMenu){
      settingsBtn.addEventListener("click", ()=>{ const expanded=settingsBtn.getAttribute("aria-expanded")==="true"; settingsBtn.setAttribute("aria-expanded", String(!expanded)); settingsMenu.hidden=expanded; });
      document.addEventListener("click", (e)=>{ if(!settingsMenu.contains(e.target) && e.target!==settingsBtn){ settingsBtn.setAttribute("aria-expanded","false"); settingsMenu.hidden=true; } });
    }
  
    function updateSummary(){ const ratings=[]; state.appointments.forEach(a=> a.feedback && ratings.push(a.feedback.rating)); state.inquiries.forEach(i=> i.feedback && ratings.push(i.feedback.rating)); const avg=ratings.length ? (ratings.reduce((s,n)=>s+n,0)/ratings.length) : 0; $("#avgRating").textContent=ratings.length ? avg.toFixed(1)+" / 5" : "—"; $("#respCount").textContent=String(ratings.length); }
  
    function mountAll(){ mountStars($("#apptStars"),0); mountStars($("#inqStars"),0); mountChips($("#apptTags"),[]); mountChips($("#inqTags"),[]); renderAppointments(); renderInquiries(); updateSummary(); }
    mountAll();
  })();