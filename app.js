/* ============================================================
   Bill & Subscription Tracker — app.js  (vanilla JS, no deps)
   All data saved locally in this browser. Nothing leaves the device.
   ============================================================ */
(function () {
  "use strict";
  const I = {
    overview:'<svg viewBox="0 0 24 24" fill="none"><path d="M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    bills:'<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2.4" stroke="currentColor" stroke-width="1.7"/><path d="M4 9h16M8 13h6M8 16h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    cal:'<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="2.4" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 9h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    insights:'<svg viewBox="0 0 24 24" fill="none"><path d="M5 19V10M12 19V5M19 19v-6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    settings:'<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2l-.4-2.6H8.9l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 4 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2l.4 2.6h4.2l.4-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    edit:'<svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m13.5 6.5 4 4" stroke="currentColor" stroke-width="1.7"/></svg>',
    del:'<svg viewBox="0 0 24 24" fill="none"><path d="M5 7h14M10 7V5h4v2m1 0-.5 13h-9L5 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plus:'<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4 10-11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const CFG = (typeof window!=="undefined" && window.PBA_CFG) ? window.PBA_CFG : {};
  const KEY = CFG.key || "bst.v1";
  const DEFAULT_CATS = CFG.billCats || ["Housing","Utilities","Phone & Internet","Streaming","Music","Software","Insurance","Memberships","Finance","Other"];

  function blank(){
    return {
      meta:{ brand:CFG.brand||"Bills", tag:CFG.tag||"never miss a payment", currency:CFG.currency||"£", passcode:"" },
      ui:{ view:"overview", month:new Date().toISOString().slice(0,7) },
      cats:[...DEFAULT_CATS],
      items:[]   // {id,name,amount,cycle,nextDue,category,active}
    };
  }
  let S = load();
  function load(){ try{const r=localStorage.getItem(KEY);return r?Object.assign(blank(),JSON.parse(r)):blank();}catch(e){return blank();} }
  function save(){ try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){toast("Couldn't save — storage may be full","warn");} }

  const $=(s,r=document)=>r.querySelector(s);
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function money(n,dp=2){const c=S.meta.currency||"£";const v=Math.abs(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:dp,maximumFractionDigits:dp});return (n<0?"-":"")+c+v;}
  const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d;};
  const parseD=s=>{const d=new Date(s+"T00:00:00");return isNaN(d)?today():d;};
  const fmtD=d=>d.toLocaleDateString(undefined,{day:"numeric",month:"short"});
  const CYCLES={weekly:{lbl:"/wk",mEq:52/12,days:7},monthly:{lbl:"/mo",mEq:1,days:30},quarterly:{lbl:"/qtr",mEq:1/3,days:91},yearly:{lbl:"/yr",mEq:1/12,days:365}};
  const monthlyEq=it=>(+it.amount||0)*(CYCLES[it.cycle]||CYCLES.monthly).mEq;
  function advance(dateStr,cycle){const d=parseD(dateStr);const c=cycle;
    if(c==="weekly")d.setDate(d.getDate()+7);else if(c==="monthly")d.setMonth(d.getMonth()+1);
    else if(c==="quarterly")d.setMonth(d.getMonth()+3);else d.setFullYear(d.getFullYear()+1);
    return d.toISOString().slice(0,10);}
  const active=()=>S.items.filter(i=>i.active!==false);
  function dueInfo(it){const days=Math.round((parseD(it.nextDue)-today())/86400000);
    let status=days<0?"over":(days<=7?"soon":"later");
    let label=days<0?`${-days}d overdue`:(days===0?"due today":(days<=14?`in ${days}d`:fmtD(parseD(it.nextDue))));
    return {days,status,label};}

  /* nav */
  const HIDE=CFG.hideViews||[];
  const NAV=[["overview","Overview",I.overview],["bills","Bills",I.bills],["calendar","Calendar",I.cal],["insights","Insights",I.insights],["settings","Settings",I.settings]].filter(n=>!HIDE.includes(n[0]));
  const TITLES={overview:"Overview",bills:"Bills & Subscriptions",calendar:"Calendar",insights:"Insights",settings:"Settings"};
  function paintNav(){
    $("#nav").innerHTML=NAV.map(([id,l,ic])=>`<button class="nav-item ${S.ui.view===id?"active":""}" data-act="nav" data-id="${id}">${ic}<span>${l}</span></button>`).join("");
    $("#mobileBar").innerHTML=NAV.slice(0,5).map(([id,l,ic])=>`<button class="${S.ui.view===id?"active":""}" data-act="nav" data-id="${id}">${ic}<span>${l}</span></button>`).join("");
    $("#brandName").childNodes[0].nodeValue=S.meta.brand||"Bills";$("#brandTag").textContent=S.meta.tag||"";document.title=S.meta.brand||"Bills";
  }
  function render(){
    if(HIDE.includes(S.ui.view))S.ui.view="overview";
    paintNav();$("#viewTitle").textContent=TITLES[S.ui.view];
    $("#monthLabel").textContent=monthLabel(S.ui.month);
    $("#monthNav").style.visibility=(["calendar"].includes(S.ui.view))?"visible":"hidden";
    ({overview:vOverview,bills:vBills,calendar:vCalendar,insights:vInsights,settings:vSettings}[S.ui.view])();
  }
  function monthLabel(m){const [y,mo]=m.split("-");return new Date(y,mo-1,1).toLocaleDateString(undefined,{month:"long",year:"numeric"});}
  function shiftMonth(d){const[y,mo]=S.ui.month.split("-").map(Number);S.ui.month=new Date(y,mo-1+d,1).toISOString().slice(0,7);render();}

  /* monthly occurrence helpers (for current calendar/overview month) */
  function thisMonthKey(){return new Date().toISOString().slice(0,7);}
  function dueThisMonth(){ // items with nextDue in current real month
    const mk=thisMonthKey();
    return active().filter(i=>(i.nextDue||"").slice(0,7)===mk);
  }

  /* ---------- OVERVIEW ---------- */
  function vOverview(){
    const items=active();
    const monthlyTotal=items.reduce((a,b)=>a+monthlyEq(b),0);
    const annual=monthlyTotal*12;
    const dtm=dueThisMonth();
    const futureThis=dtm.filter(i=>parseD(i.nextDue)>=today());
    const upcomingThis=futureThis.reduce((a,b)=>a+(+b.amount||0),0);
    const futureAll=items.filter(i=>dueInfo(i).days>=0).sort((a,b)=>parseD(a.nextDue)-parseD(b.nextDue));
    const nextUp=futureAll[0];const daysToNext=nextUp?dueInfo(nextUp).days:null;
    const pct=daysToNext==null?0:Math.max(6,Math.min(100,(1-daysToNext/30)*100));
    const due7=items.filter(i=>{const d=dueInfo(i);return d.days>=0&&d.days<=7;});
    let ringColor=(daysToNext!=null&&daysToNext<=3)?"#F4D08A":"#9FE6C4";
    const upcoming=[...futureAll,...items.filter(i=>dueInfo(i).days<0)].slice(0,6);
    const upHtml=upcoming.length?`<div class="txlist">${upcoming.map(billRow).join("")}</div>`:`<p style="color:var(--muted);font-size:.9rem">No bills yet. Add your first one.</p>`;
    // category bars
    const byCat={};items.forEach(i=>byCat[i.category]=(byCat[i.category]||0)+monthlyEq(i));
    const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,6);
    const max=Math.max(1,...cats.map(c=>c[1]));
    const bars=cats.length?cats.map(([c,v])=>`<div class="row"><div class="top"><span class="name">${esc(c)}</span><span class="amt"><b>${money(v)}</b>/mo</span></div><div class="track"><span style="width:${v/max*100}%"></span></div></div>`).join(""):`<p style="color:var(--muted);font-size:.9rem">Add bills to see your breakdown.</p>`;
    $("#view").innerHTML=`
      <div class="hero">
        <div>
          <div class="hero-label">Still to go out this month</div>
          <div class="hero-figure num">${money(upcomingThis)}</div>
          <div class="hero-sub num">${futureThis.length} bills left this month · <b>${money(monthlyTotal)}</b>/mo recurring</div>
        </div>
        <div class="ring" style="--p:${pct};--c:${ringColor}">
          ${daysToNext!=null?`<div class="ring-txt"><div class="pct num">${daysToNext}d</div><div class="cap">to next</div></div>`:`<div class="ring-txt"><div class="cap" style="padding:0 12px">Add bills to start</div></div>`}
        </div>
      </div>
      <div class="grid stats">
        ${stat("Monthly recurring",money(monthlyTotal),"var(--brand)")}
        ${stat("Yearly total",money(annual,0),"var(--accent-d)")}
        ${stat("Active bills",String(items.length),"var(--ink)")}
        ${stat("Due in 7 days",String(due7.length),due7.length?"var(--neg)":"var(--pos)")}
      </div>
      <div class="grid cols">
        <div class="card card-pad"><div class="section-title">Upcoming payments</div>${upHtml}</div>
        <div class="card card-pad"><div class="section-title">Where it goes (per month)</div><div class="catbar">${bars}</div></div>
      </div>`;
  }
  function stat(l,v,dot){return `<div class="card stat"><div class="lbl"><span class="dot" style="background:${dot}"></span>${l}</div><div class="val num">${v}</div></div>`;}
  function billRow(it){
    const d=dueInfo(it);const cyc=(CYCLES[it.cycle]||CYCLES.monthly).lbl;
    return `<div class="tx">
      <div class="tx-ico" style="background:var(--brand-soft);color:var(--brand-d);font-weight:800">${esc((it.name||"?")[0].toUpperCase())}</div>
      <div class="tx-main"><div class="tx-desc">${esc(it.name)}</div>
        <div class="tx-meta"><span class="chip">${esc(it.category)}</span><span class="due-pill ${d.status}">${d.label}</span></div></div>
      <div class="tx-amt num">${money(it.amount)}<span style="color:var(--faint);font-weight:500">${cyc}</span></div>
      <div class="tx-actions">
        <button class="icon-btn" title="Mark paid" data-act="paid" data-id="${it.id}">${I.check}</button>
        <button class="icon-btn" data-act="edit-bill" data-id="${it.id}">${I.edit}</button>
        <button class="icon-btn danger" data-act="del-bill" data-id="${it.id}">${I.del}</button>
      </div></div>`;
  }

  /* ---------- BILLS ---------- */
  let bf={q:"",cat:"all"};
  function vBills(){
    let list=active().slice().sort((a,b)=>parseD(a.nextDue)-parseD(b.nextDue));
    if(bf.cat!=="all")list=list.filter(i=>i.category===bf.cat);
    if(bf.q)list=list.filter(i=>(i.name||"").toLowerCase().includes(bf.q.toLowerCase()));
    const rows=list.length?list.map(it=>{
      const d=dueInfo(it);const cyc=(CYCLES[it.cycle]||CYCLES.monthly).lbl;
      return `<div class="bill-row">
        <div class="bill-ico">${esc((it.name||"?")[0].toUpperCase())}</div>
        <div><div class="bill-name">${esc(it.name)}</div><div class="bill-sub">${esc(it.category)} · ${money(monthlyEq(it))}/mo equiv</div></div>
        <div class="col-hide"><span class="due-pill ${d.status}">${d.label}</span></div>
        <div class="num" style="font-weight:700">${money(it.amount)}<span style="color:var(--faint);font-weight:500">${cyc}</span></div>
        <div style="display:flex;gap:2px;justify-content:flex-end">
          <button class="icon-btn" title="Mark paid" data-act="paid" data-id="${it.id}">${I.check}</button>
          <button class="icon-btn" data-act="edit-bill" data-id="${it.id}">${I.edit}</button>
          <button class="icon-btn danger" data-act="del-bill" data-id="${it.id}">${I.del}</button></div>
      </div>`;}).join(""):empty();
    $("#view").innerHTML=`<div class="card card-pad">
      <div class="list-head">
        <div class="toolbar">
          <div class="search"><span><svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="m20 20-3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span><input class="input" id="bq" placeholder="Search" value="${esc(bf.q)}"></div>
          <select class="input" id="bc"><option value="all">All categories</option>${S.cats.map(c=>`<option ${bf.cat===c?"selected":""}>${esc(c)}</option>`).join("")}</select>
        </div>
        <button class="btn btn-accent btn-sm" data-act="add-bill">${I.plus} Add bill</button>
      </div>${rows}</div>`;
    $("#bq").oninput=e=>{bf.q=e.target.value;const p=e.target.selectionStart;vBills();const s=$("#bq");s.focus();s.setSelectionRange(p,p);};
    $("#bc").onchange=e=>{bf.cat=e.target.value;vBills();};
  }
  function empty(){return `<div class="empty"><div class="e-ico">${I.bills}</div><h3>No bills yet</h3><p>Add your subscriptions and bills to see what's really leaving your account each month — and never miss a payment again.</p><button class="btn btn-accent" data-act="add-bill">${I.plus} Add your first bill</button></div>`;}

  /* ---------- CALENDAR ---------- */
  function occurrencesInMonth(it,y,m){ // returns array of day numbers (1..n) in month m(0-based) of year y
    const base=parseD(it.nextDue);const dim=new Date(y,m+1,0).getDate();const out=[];
    if(it.cycle==="weekly"){const wd=base.getDay();for(let d=1;d<=dim;d++){if(new Date(y,m,d).getDay()===wd)out.push(d);}}
    else if(it.cycle==="monthly"){out.push(Math.min(base.getDate(),dim));}
    else if(it.cycle==="quarterly"){if((m-base.getMonth())%3===0)out.push(Math.min(base.getDate(),dim));}
    else {if(m===base.getMonth())out.push(Math.min(base.getDate(),dim));}
    return out;
  }
  function vCalendar(){
    const [y,mo]=S.ui.month.split("-").map(Number);const m=mo-1;
    const first=new Date(y,m,1);let startDow=(first.getDay()+6)%7; // Mon=0
    const dim=new Date(y,m+1,0).getDate();
    const map={};active().forEach(it=>occurrencesInMonth(it,y,m).forEach(d=>{(map[d]=map[d]||[]).push(it);}));
    const todayD=today();const isThisMonth=(todayD.getFullYear()===y&&todayD.getMonth()===m);
    const dows=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    let cells=dows.map(d=>`<div class="dow">${d}</div>`).join("");
    for(let i=0;i<startDow;i++)cells+=`<div class="cell empty"></div>`;
    for(let d=1;d<=dim;d++){
      const its=map[d]||[];const tot=its.reduce((a,b)=>a+(+b.amount||0),0);
      cells+=`<div class="cell ${isThisMonth&&d===todayD.getDate()?"today":""}">
        <div class="dnum">${d}</div>
        <div class="ddot">${its.slice(0,5).map(()=>`<span></span>`).join("")}</div>
        ${tot>0?`<div class="damt">${money(tot,0)}</div>`:""}</div>`;
    }
    // list this displayed month
    const dueList=[];active().forEach(it=>occurrencesInMonth(it,y,m).forEach(d=>dueList.push({d,it})));
    dueList.sort((a,b)=>a.d-b.d);
    const monthTot=dueList.reduce((a,x)=>a+(+x.it.amount||0),0);
    const list=dueList.length?dueList.map(({d,it})=>`<div class="tx">
        <div class="tx-ico" style="background:var(--brand-soft);color:var(--brand-d);font-weight:800">${d}</div>
        <div class="tx-main"><div class="tx-desc">${esc(it.name)}</div><div class="tx-meta"><span class="chip">${esc(it.category)}</span></div></div>
        <div class="tx-amt num">${money(it.amount)}</div></div>`).join(""):`<p style="color:var(--muted);font-size:.9rem">Nothing scheduled this month.</p>`;
    $("#view").innerHTML=`
      <div class="card card-pad"><div class="section-title">${monthLabel(S.ui.month)} — ${money(monthTot,0)} scheduled</div>
        <div class="cal">${cells}</div></div>
      <div class="card card-pad" style="margin-top:16px"><div class="section-title">Payments this month</div><div class="txlist">${list}</div></div>`;
  }

  /* ---------- INSIGHTS ---------- */
  function vInsights(){
    const items=active();const monthly=items.reduce((a,b)=>a+monthlyEq(b),0);
    const byCat={};items.forEach(i=>byCat[i.category]=(byCat[i.category]||0)+monthlyEq(i));
    const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);const max=Math.max(1,...cats.map(c=>c[1]));
    const top=[...items].sort((a,b)=>monthlyEq(b)-monthlyEq(a)).slice(0,5);
    $("#view").innerHTML=`
      <div class="grid stats" style="grid-template-columns:repeat(3,1fr)">
        ${stat("Per month",money(monthly),"var(--brand)")}
        ${stat("Per year",money(monthly*12,0),"var(--accent-d)")}
        ${stat("Per day",money(monthly*12/365),"var(--ink)")}
      </div>
      <div class="grid cols">
        <div class="card card-pad"><div class="section-title">Spending by category (per month)</div><div class="catbar">
          ${cats.length?cats.map(([c,v])=>`<div class="row"><div class="top"><span class="name">${esc(c)}</span><span class="amt"><b>${money(v)}</b> · ${Math.round(v/monthly*100||0)}%</span></div><div class="track"><span style="width:${v/max*100}%"></span></div></div>`).join(""):`<p style="color:var(--muted);font-size:.9rem">No data yet.</p>`}
        </div></div>
        <div class="card card-pad"><div class="section-title">Your biggest commitments</div><div class="txlist">
          ${top.length?top.map(it=>`<div class="tx"><div class="tx-ico" style="background:var(--accent-soft);color:var(--accent-d);font-weight:800">${esc((it.name||"?")[0].toUpperCase())}</div><div class="tx-main"><div class="tx-desc">${esc(it.name)}</div><div class="tx-meta"><span class="chip">${esc(it.category)}</span></div></div><div class="tx-amt num">${money(monthlyEq(it))}/mo</div></div>`).join(""):`<p style="color:var(--muted);font-size:.9rem">No data yet.</p>`}
        </div></div>
      </div>
      <div class="card card-pad" style="margin-top:16px;background:var(--brand-soft);border-color:transparent">
        <b style="color:var(--brand-d)">Quick win:</b> you're spending <b>${money(monthly*12,0)}</b> a year on recurring payments. Scan your biggest commitments above — cancelling just one you don't use could save you hundreds.</div>`;
  }

  /* ---------- SETTINGS ---------- */
  function vSettings(){
    const hp=!!S.meta.passcode;
    $("#view").innerHTML=`
      <div class="card card-pad"><div class="section-title">Personalise</div>
        <div class="set-row"><div class="info"><h4>App name</h4><p>Shown in the sidebar and browser tab.</p></div><input class="input" id="sB" style="max-width:200px" value="${esc(S.meta.brand)}"></div>
        <div class="set-row"><div class="info"><h4>Tagline</h4><p>The small line under the name.</p></div><input class="input" id="sT" style="max-width:200px" value="${esc(S.meta.tag)}"></div>
        <div class="set-row"><div class="info"><h4>Currency symbol</h4></div><input class="input num" id="sC" style="max-width:80px;text-align:center" maxlength="3" value="${esc(S.meta.currency)}"></div>
        <div class="set-row"><div class="info" style="width:100%"><button class="btn btn-primary btn-sm" data-act="save-settings">${I.check} Save changes</button></div></div>
      </div>
      <div class="card card-pad" style="margin-top:16px"><div class="section-title">Privacy lock</div>
        <div class="set-row"><div class="info"><h4>Passcode ${hp?'<span class="chip" style="color:var(--pos);background:var(--pos-soft);border-color:transparent">On</span>':""}</h4><p>Adds a passcode screen when the app opens — a soft privacy lock for shared devices. Your data always stays on this device.</p></div>${hp?`<button class="btn btn-danger btn-sm" data-act="remove-pass">Turn off</button>`:`<button class="btn btn-ghost btn-sm" data-act="set-pass">Set passcode</button>`}</div>
      </div>
      <div class="card card-pad" style="margin-top:16px"><div class="section-title">Your data</div>
        <div class="set-row"><div class="info"><h4>Back up / export</h4><p>Download all your data as a file.</p></div><button class="btn btn-ghost btn-sm" data-act="export">Export data</button></div>
        <div class="set-row"><div class="info"><h4>Restore / import</h4><p>Load data from a backup file (replaces current data).</p></div><button class="btn btn-ghost btn-sm" data-act="import">Import data</button></div>
        <div class="set-row"><div class="info"><h4>Try sample data</h4><p>Fill the app with example bills to explore.</p></div><button class="btn btn-ghost btn-sm" data-act="load-sample">Load sample</button></div>
        <div class="set-row"><div class="info"><h4>Start fresh</h4><p>Delete everything and reset.</p></div><button class="btn btn-danger btn-sm" data-act="clear-all">Clear all data</button></div>
      </div>
      <p style="color:var(--faint);font-size:.8rem;margin-top:16px;text-align:center">Private · offline · your data never leaves this device · not financial advice</p>`;
    $("#sB").oninput=e=>S.meta.brand=e.target.value;$("#sT").oninput=e=>S.meta.tag=e.target.value;$("#sC").oninput=e=>S.meta.currency=e.target.value||"£";
  }

  /* ---------- modal ---------- */
  function modal(title,body,onSave,saveLabel="Save"){
    const root=$("#modalRoot");
    root.innerHTML=`<div class="scrim" id="scrim"><div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" id="mClose">✕</button></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="btn btn-ghost" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${saveLabel}</button></div></div></div>`;
    const close=()=>{root.innerHTML="";document.removeEventListener("keydown",onKey);};
    function onKey(e){if(e.key==="Escape")close();if(e.key==="Enter"&&e.target.tagName!=="SELECT"){e.preventDefault();doSave();}}
    function doSave(){if(onSave()!==false)close();}
    $("#mClose").onclick=close;$("#mCancel").onclick=close;$("#scrim").onclick=e=>{if(e.target.id==="scrim")close();};$("#mSave").onclick=doSave;
    document.addEventListener("keydown",onKey);const f=root.querySelector("input,select");if(f)f.focus();
  }
  const val=id=>{const e=$("#"+id);return e?e.value.trim():"";};
  const numv=id=>{const n=parseFloat(val(id));return isNaN(n)?0:n;};
  let curCycle="monthly";
  function billModal(ex){
    const it=ex||{name:"",amount:"",cycle:"monthly",nextDue:new Date(Date.now()+5*864e5).toISOString().slice(0,10),category:S.cats[0]};
    curCycle=it.cycle;
    modal(ex?"Edit bill":"Add bill",`
      <div class="field"><label>Name</label><input class="input" id="fN" placeholder="e.g. Netflix, Rent, Gym" value="${esc(it.name)}"></div>
      <div class="two">
        <div class="field"><label>Amount</label><input class="input num" id="fA" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" value="${it.amount}"></div>
        <div class="field"><label>Next due</label><input class="input num" id="fD" type="date" value="${it.nextDue}"></div>
      </div>
      <div class="field"><label>Billing cycle</label>
        <div class="seg" id="segCyc">
          ${["weekly","monthly","quarterly","yearly"].map(c=>`<button data-c="${c}" class="${it.cycle===c?"on":""}">${c[0].toUpperCase()+c.slice(1)}</button>`).join("")}
        </div></div>
      <div class="field"><label>Category</label><select class="input" id="fC">${S.cats.map(c=>`<option ${c===it.category?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
    `,()=>{
      const name=val("fN");if(!name){toast("Name it","warn");return false;}
      const amt=numv("fA");if(amt<=0){toast("Enter an amount","warn");return false;}
      const rec={id:ex?ex.id:uid(),name,amount:amt,cycle:curCycle,nextDue:val("fD")||it.nextDue,category:val("fC"),active:true};
      if(ex){const i=S.items.findIndex(x=>x.id===ex.id);S.items[i]=rec;toast("Bill updated");}else{S.items.push(rec);toast("Bill added");}
      save();render();
    },ex?"Save":"Add");
    $("#segCyc").querySelectorAll("button").forEach(b=>b.onclick=()=>{curCycle=b.dataset.c;$("#segCyc").querySelectorAll("button").forEach(x=>x.className="");b.className="on";});
  }

  /* export/import/sample */
  function exportData(){const blob=new Blob([JSON.stringify(S,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(S.meta.brand||"bills").replace(/\s+/g,"-").toLowerCase()+"-backup.json";a.click();URL.revokeObjectURL(a.href);toast("Backup downloaded");}
  function importData(){const inp=document.createElement("input");inp.type="file";inp.accept="application/json,.json";inp.onchange=()=>{const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{S=Object.assign(blank(),JSON.parse(r.result));save();render();toast("Data imported");}catch(e){toast("That file couldn't be read","warn");}};r.readAsText(f);};inp.click();}
  function loadSample(){
    const off=n=>{const d=today();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
    const cats=S.cats;const has=c=>cats.includes(c);const pick=n=>cats[n%cats.length];
    S.items=[
      {id:uid(),name:"Rent",amount:1100,cycle:"monthly",nextDue:off(9),category:has("Housing")?"Housing":cats[0],active:true},
      {id:uid(),name:"Netflix",amount:12.99,cycle:"monthly",nextDue:off(2),category:has("Streaming")?"Streaming":pick(3),active:true},
      {id:uid(),name:"Spotify",amount:11.99,cycle:"monthly",nextDue:off(5),category:has("Music")?"Music":pick(4),active:true},
      {id:uid(),name:"Mobile phone",amount:24,cycle:"monthly",nextDue:off(12),category:has("Phone & Internet")?"Phone & Internet":pick(2),active:true},
      {id:uid(),name:"Broadband",amount:32,cycle:"monthly",nextDue:off(7),category:has("Phone & Internet")?"Phone & Internet":pick(2),active:true},
      {id:uid(),name:"Gym membership",amount:39,cycle:"monthly",nextDue:off(16),category:has("Memberships")?"Memberships":pick(7),active:true},
      {id:uid(),name:"iCloud storage",amount:2.99,cycle:"monthly",nextDue:off(20),category:has("Software")?"Software":pick(5),active:true},
      {id:uid(),name:"Car insurance",amount:680,cycle:"yearly",nextDue:off(24),category:has("Insurance")?"Insurance":pick(6),active:true},
      {id:uid(),name:"Amazon Prime",amount:95,cycle:"yearly",nextDue:off(3),category:has("Memberships")?"Memberships":pick(7),active:true},
      {id:uid(),name:"Council tax",amount:165,cycle:"monthly",nextDue:off(14),category:has("Utilities")?"Utilities":pick(1),active:true},
    ];
    save();render();toast("Sample data loaded");
  }

  function toast(msg,kind="ok"){const w=$("#toastWrap");const el=document.createElement("div");el.className="toast "+(kind==="warn"?"warn":"ok");el.innerHTML=(kind==="warn"?"":I.check)+`<span>${esc(msg)}</span>`;w.appendChild(el);setTimeout(()=>el.remove(),3000);}

  function maybeLock(){if(S.meta.passcode){const lock=$("#lock");lock.hidden=false;$("#lockTitle").textContent="Welcome to "+(S.meta.brand||"your bills");const go=()=>{if($("#lockInput").value===S.meta.passcode)lock.hidden=true;else{toast("Wrong passcode","warn");$("#lockInput").value="";$("#lockInput").focus();}};$("#lockBtn").onclick=go;$("#lockInput").onkeydown=e=>{if(e.key==="Enter")go();};$("#lockInput").focus();}}

  document.addEventListener("click",e=>{
    const el=e.target.closest("[data-act]");if(!el)return;const act=el.dataset.act,id=el.dataset.id;
    const A={
      nav:()=>{S.ui.view=id;render();document.querySelector(".content").scrollTo?.(0,0);},
      "add-bill":()=>billModal(),"edit-bill":()=>billModal(S.items.find(x=>x.id===id)),
      "del-bill":()=>{if(confirm("Delete this bill?")){S.items=S.items.filter(x=>x.id!==id);save();render();toast("Deleted");}},
      paid:()=>{const it=S.items.find(x=>x.id===id);if(it){it.nextDue=advance(it.nextDue,it.cycle);save();render();toast("Marked paid — next date set");}},
      "save-settings":()=>{save();render();toast("Saved");},
      "set-pass":()=>passModal(),"remove-pass":()=>{S.meta.passcode="";save();render();toast("Passcode off");},
      export:exportData,import:importData,"load-sample":loadSample,
      "clear-all":()=>{if(confirm("Delete ALL your data and start fresh?")){S=blank();save();render();toast("All data cleared");}},
    };
    if(A[act])A[act]();
  });
  function passModal(){modal("Set a passcode",`<p style="color:var(--muted);font-size:.88rem;margin:-2px 0 2px">Choose a passcode you'll remember.</p><div class="field"><label>Passcode</label><input class="input num" id="pA" type="password" inputmode="numeric" maxlength="12" placeholder="••••"></div><div class="field"><label>Confirm</label><input class="input num" id="pB" type="password" inputmode="numeric" maxlength="12" placeholder="••••"></div>`,()=>{const a=val("pA"),b=val("pB");if(a.length<3){toast("At least 3 characters","warn");return false;}if(a!==b){toast("Doesn't match","warn");return false;}S.meta.passcode=a;save();render();toast("Passcode set");},"Set passcode");}

  $("#addBtn").onclick=()=>billModal();$("#fab").onclick=()=>billModal();
  $("#prevMonth").onclick=()=>shiftMonth(-1);$("#nextMonth").onclick=()=>shiftMonth(1);
  maybeLock();render();
})();
