import { useState, useMemo, useRef } from "react";

// ─── DATA ─────────────────────────────────────────────────────────────────────
const SEASON_CREDIT_LIMIT = 600;

const INIT_ATHLETES = [
  { id:"A1",  name:"Ava Mitchell",   team:"16U Black", tier:"Gold",   age:16, phone:"615-555-0101", email:"ava@email.com",     creditsEarned:150, creditsPending:75  },
  { id:"A2",  name:"Brianna Kim",    team:"18U Gold",  tier:"Gold",   age:18, phone:"615-555-0102", email:"bri@email.com",     creditsEarned:200, creditsPending:0   },
  { id:"A3",  name:"Maya Torres",    team:"14U Black", tier:"Silver", age:14, phone:"615-555-0103", email:"maya@email.com",    creditsEarned:90,  creditsPending:90  },
  { id:"A4",  name:"Jordan Lee",     team:"16U Gold",  tier:"Gold",   age:16, phone:"615-555-0104", email:"jordan@email.com",  creditsEarned:45,  creditsPending:90  },
  { id:"A5",  name:"Riley Sanders",  team:"15U Black", tier:"Silver", age:15, phone:"615-555-0105", email:"riley@email.com",   creditsEarned:120, creditsPending:50  },
  { id:"A6",  name:"Camille Brooks", team:"14U Black", tier:"Silver", age:14, phone:"615-555-0106", email:"cam@email.com",     creditsEarned:30,  creditsPending:0   },
  { id:"A7",  name:"Tasha Green",    team:"18U Gold",  tier:"Elite",  age:18, phone:"615-555-0107", email:"tasha@email.com",   creditsEarned:280, creditsPending:25  },
  { id:"A8",  name:"Priya Nair",     team:"15U Black", tier:"Silver", age:15, phone:"615-555-0108", email:"priya@email.com",   creditsEarned:60,  creditsPending:40  },
  { id:"A9",  name:"Destiny Walker", team:"16U Black", tier:"Gold",   age:16, phone:"615-555-0109", email:"destiny@email.com", creditsEarned:175, creditsPending:0   },
  { id:"A10", name:"Leah Fontaine",  team:"17U Elite", tier:"Elite",  age:17, phone:"615-555-0110", email:"leah@email.com",    creditsEarned:320, creditsPending:50  },
];

const INIT_JOBS = [
  { id:1, title:"Court Setup – 14U Practice", category:"gym",        date:"2026-03-16", time:"8:00 AM",  duration:"1.5 hrs", credits:25,  spots:2, claimed:[],                   status:"open", icon:"🏐", location:"Main Gym",            createdBy:"Coach Renae" },
  { id:2, title:"Tournament Check-In Desk",   category:"tournament", date:"2026-03-22", time:"7:00 AM",  duration:"4 hrs",   credits:75,  spots:2, claimed:["Ava M."],           status:"open", icon:"📋", location:"TN Volleyball Center", createdBy:"Admin" },
  { id:3, title:"Score Table Operator",       category:"tournament", date:"2026-03-22", time:"9:00 AM",  duration:"6 hrs",   credits:100, spots:1, claimed:["Brianna K."],       status:"full", icon:"🧮", location:"TN Volleyball Center", createdBy:"Admin" },
  { id:4, title:"Gym Deep Clean – Saturday",  category:"gym",        date:"2026-03-21", time:"10:00 AM", duration:"2 hrs",   credits:40,  spots:3, claimed:[],                   status:"open", icon:"🧹", location:"Main Gym",            createdBy:"Coach Renae" },
  { id:5, title:"Concessions – Hosted Tourn.",category:"tournament", date:"2026-03-29", time:"8:00 AM",  duration:"5 hrs",   credits:90,  spots:4, claimed:["Maya T.","Jordan L."],status:"open",icon:"🍕", location:"TN Volleyball Center", createdBy:"Admin" },
  { id:6, title:"Net Setup & Breakdown",      category:"gym",        date:"2026-03-20", time:"6:30 PM",  duration:"1 hr",    credits:20,  spots:2, claimed:[],                   status:"open", icon:"🕸️", location:"Main Gym",            createdBy:"Coach Renae" },
  { id:7, title:"Film Crew – 16U Match",      category:"event",      date:"2026-03-18", time:"5:00 PM",  duration:"2 hrs",   credits:35,  spots:1, claimed:[],                   status:"open", icon:"🎬", location:"Court 3",             createdBy:"Admin" },
  { id:8, title:"Open Gym Supervision",       category:"event",      date:"2026-03-19", time:"3:00 PM",  duration:"3 hrs",   credits:50,  spots:2, claimed:["Riley S."],         status:"open", icon:"👁️", location:"Main Gym",            createdBy:"Coach Renae" },
];

const CAT_COLORS = {
  gym:        { bg:"bg-emerald-500/20", text:"text-emerald-300", border:"border-emerald-500/30", dot:"bg-emerald-400" },
  tournament: { bg:"bg-amber-500/20",   text:"text-amber-300",   border:"border-amber-500/30",   dot:"bg-amber-400"   },
  event:      { bg:"bg-sky-500/20",     text:"text-sky-300",     border:"border-sky-500/30",     dot:"bg-sky-400"     },
};

// ─── ATHLETE CSV TEMPLATE ─────────────────────────────────────────────────────
const ATHLETE_TEMPLATE = `name,email,phone,team,tier,age
Jane Smith,jane@email.com,615-555-0200,16U Black,Gold,16
Mike Johnson,mike@email.com,615-555-0201,14U Silver,Silver,14`;

const JOB_TEMPLATE = `title,category,date,time,duration,credits,spots,location
Court Breakdown,gym,2026-04-05,9:00 AM,1 hr,20,2,Main Gym
Ref Table Assistant,tournament,2026-04-12,8:00 AM,4 hrs,70,1,TN Volleyball Center`;

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g,"_"));
  const rows = lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] || ""]));
  });
  return { headers, rows };
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Badge({ category }) {
  const c = CAT_COLORS[category] || CAT_COLORS.event;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>
      {category}
    </span>
  );
}

function CreditBar({ earned, pending, limit }) {
  const ep = Math.min((earned/limit)*100,100);
  const pp = Math.min(((earned+pending)/limit)*100,100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span><span className="text-white font-semibold">${earned}</span> earned · <span className="text-amber-300 font-semibold">${pending}</span> pending</span>
        <span className="text-slate-500">/${limit} limit</span>
      </div>
      <div className="h-2.5 bg-slate-700/60 rounded-full overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 bg-amber-400/50 rounded-full transition-all" style={{width:`${pp}%`}}/>
        <div className="absolute inset-y-0 left-0 bg-emerald-400 rounded-full transition-all" style={{width:`${ep}%`}}/>
      </div>
    </div>
  );
}

function JobCard({ job, onDibs, myDibs }) {
  const isFull = job.status==="full"||job.claimed.length>=job.spots;
  const hasDibs = myDibs.includes(job.id);
  const spotsLeft = job.spots-job.claimed.length;
  return (
    <div className={`relative rounded-2xl border transition-all duration-300 overflow-hidden
      ${isFull?"border-slate-700/40 bg-slate-800/30 opacity-60":hasDibs?"border-emerald-500/50 bg-emerald-950/40 shadow-lg":"border-slate-700/60 bg-slate-800/50 hover:border-slate-600 hover:shadow-xl"}`}>
      {hasDibs&&<div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400"/>}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{job.icon}</span>
            <div>
              <h3 className="font-bold text-white text-sm">{job.title}</h3>
              <p className="text-slate-400 text-xs mt-0.5">{job.location}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-black text-emerald-400">${job.credits}</div>
            <div className="text-xs text-slate-500">credits</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge category={job.category}/>
          <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">📅 {new Date(job.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
          <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">⏰ {job.time}</span>
          <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">⏱ {job.duration}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{isFull?"No spots left":`${spotsLeft} spot${spotsLeft!==1?"s":""} left`}</span>
          {hasDibs?(
            <button onClick={()=>onDibs(job.id)} className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition-all">✓ Got Dibs — Cancel?</button>
          ):isFull?(
            <span className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-700/30 text-slate-500 border border-slate-700/30">Full</span>
          ):(
            <button onClick={()=>onDibs(job.id)} className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-900/30">Call Dibs!</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ATHLETE VIEW ─────────────────────────────────────────────────────────────
function AthleteView({ jobs, setJobs, athletes }) {
  const athlete = athletes[0];
  const [myDibs, setMyDibs] = useState([2]);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const pendingCredits = jobs.filter(j=>myDibs.includes(j.id)).reduce((s,j)=>s+j.credits,0);

  function handleDibs(jobId) {
    const job = jobs.find(j=>j.id===jobId);
    if (myDibs.includes(jobId)) {
      setMyDibs(p=>p.filter(id=>id!==jobId));
      setJobs(p=>p.map(j=>j.id===jobId?{...j,claimed:j.claimed.filter(n=>n!=="Ava M."),status:"open"}:j));
      setToast({type:"cancel",msg:`Dibs cancelled on "${job.title}"`});
    } else {
      setMyDibs(p=>[...p,jobId]);
      setJobs(p=>p.map(j=>j.id===jobId?{...j,claimed:[...j.claimed,"Ava M."],status:j.claimed.length+1>=j.spots?"full":"open"}:j));
      setToast({type:"success",msg:`Dibs claimed! "${job.title}" — $${job.credits} credits`});
    }
    setTimeout(()=>setToast(null),3000);
  }

  const filtered = filter==="mine"?jobs.filter(j=>myDibs.includes(j.id)):filter==="all"?jobs:jobs.filter(j=>j.category===filter);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-white">{athlete?.name || "Athlete"}</h2>
            <p className="text-sm text-slate-400">{athlete?.team} · 2025–26 Season</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-white">{(athlete?.creditsEarned||0)+pendingCredits}</div>
            <div className="text-xs text-slate-400">total credits</div>
          </div>
        </div>
        <CreditBar earned={athlete?.creditsEarned||0} pending={pendingCredits} limit={SEASON_CREDIT_LIMIT}/>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[["all","All Jobs"],["mine","My Dibs"],["gym","Gym"],["tournament","Tournament"],["event","Event"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} className={`shrink-0 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${filter===v?"bg-amber-500 text-slate-900":"bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60"}`}>
            {l}{v==="mine"&&myDibs.length>0?` (${myDibs.length})`:""}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map(job=><JobCard key={job.id} job={job} onDibs={handleDibs} myDibs={myDibs}/>)}
        {filtered.length===0&&<div className="col-span-2 text-center py-12 text-slate-500">No jobs in this category.</div>}
      </div>
      {toast&&<div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl z-50 ${toast.type==="success"?"bg-emerald-500 text-white":"bg-slate-600 text-white"}`}>{toast.type==="success"?"✓ ":"✕ "}{toast.msg}</div>}
    </div>
  );
}

// ─── ALERTS PANEL ─────────────────────────────────────────────────────────────
function AlertsPanel({ athletes }) {
  const TEAMS = [...new Set(athletes.map(a=>a.team))];
  const TIERS = [...new Set(athletes.map(a=>a.tier))];
  const [filterMode, setFilterMode] = useState("team");
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedTiers, setSelectedTiers] = useState([]);
  const [selectedAthletes, setSelectedAthletes] = useState([]);
  const [channel, setChannel] = useState("both");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(null);
  const [history, setHistory] = useState([
    {id:1,date:"Mar 10",to:"All Gold Teams",channel:"both",subject:"New DIBS jobs posted!",recipients:6},
    {id:2,date:"Mar 7", to:"18U Gold",      channel:"email",subject:"Tournament volunteer needed",recipients:3},
  ]);
  const toggle=(arr,setArr,val)=>setArr(p=>p.includes(val)?p.filter(v=>v!==val):[...p,val]);
  const recipients = useMemo(()=>{
    if(filterMode==="individual") return athletes.filter(a=>selectedAthletes.includes(a.id));
    if(filterMode==="team")       return athletes.filter(a=>selectedTeams.length===0||selectedTeams.includes(a.team));
    if(filterMode==="tier")       return athletes.filter(a=>selectedTiers.length===0||selectedTiers.includes(a.tier));
    return athletes;
  },[filterMode,selectedTeams,selectedTiers,selectedAthletes,athletes]);

  function handleSend(){
    if(!body.trim()) return;
    const label=filterMode==="individual"?`${recipients.length} athletes`:filterMode==="team"?selectedTeams.join(", ")||"All Teams":selectedTiers.map(t=>`${t} Tier`).join(", ")||"All Tiers";
    setHistory(p=>[{id:Date.now(),date:"Just now",to:label,channel,subject:subject||"(no subject)",recipients:recipients.length},...p]);
    setSent({label,count:recipients.length,channel});
    setSubject("");setBody("");
    setTimeout(()=>setSent(null),4000);
  }

  const TIER_COLORS={Gold:"text-amber-400 bg-amber-500/15 border-amber-500/30",Silver:"text-slate-300 bg-slate-500/15 border-slate-500/30",Elite:"text-purple-400 bg-purple-500/15 border-purple-500/30"};

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Send Via</div>
          <div className="flex gap-2">
            {[["email","✉️ Email"],["sms","💬 Text"],["both","✉️+💬 Both"]].map(([v,l])=>(
              <button key={v} onClick={()=>setChannel(v)} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${channel===v?"bg-amber-500 text-slate-900 border-amber-500":"bg-slate-800 text-slate-400 border-slate-700 hover:text-white"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Filter Recipients By</div>
          <div className="flex gap-2">
            {[["individual","👤 Individual"],["team","🏐 Team"],["tier","⭐ Tier"]].map(([v,l])=>(
              <button key={v} onClick={()=>setFilterMode(v)} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${filterMode===v?"bg-sky-500 text-white border-sky-500":"bg-slate-800 text-slate-400 border-slate-700 hover:text-white"}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{filterMode==="individual"?"Select Athletes":filterMode==="team"?"Select Teams":"Select Skill Tiers"}</div>
          <div className="text-xs text-sky-400 font-bold">{recipients.length} recipient{recipients.length!==1?"s":""} selected</div>
        </div>
        {filterMode==="team"&&<div className="flex flex-wrap gap-2">{TEAMS.map(t=><button key={t} onClick={()=>toggle(selectedTeams,setSelectedTeams,t)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedTeams.includes(t)?"bg-sky-500 text-white border-sky-500":"bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500"}`}>{t}</button>)}<button onClick={()=>setSelectedTeams([])} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-slate-600 text-slate-400 hover:text-white">All Teams</button></div>}
        {filterMode==="tier"&&<div className="space-y-2"><div className="flex flex-wrap gap-2">{TIERS.map(t=><button key={t} onClick={()=>toggle(selectedTiers,setSelectedTiers,t)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedTiers.includes(t)?TIER_COLORS[t]||"bg-slate-600 text-white border-slate-500":"bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500"}`}>{t==="Elite"?"👑":t==="Gold"?"🥇":"🥈"} {t} Tier</button>)}<button onClick={()=>setSelectedTiers([])} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-slate-600 text-slate-400 hover:text-white">All Tiers</button></div><p className="text-xs text-slate-500">Tier selection targets athletes across all age groups.</p></div>}
        {filterMode==="individual"&&<div className="flex flex-wrap gap-2">{athletes.map(a=><button key={a.id} onClick={()=>toggle(selectedAthletes,setSelectedAthletes,a.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedAthletes.includes(a.id)?"bg-sky-500/20 text-sky-300 border-sky-500/50":"bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500"}`}><span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-xs font-black">{a.name[0]}</span>{a.name.split(" ")[0]}</button>)}</div>}
        {recipients.length>0&&recipients.length<=6&&<div className="mt-3 pt-3 border-t border-slate-700/40 flex flex-wrap gap-1.5">{recipients.map(a=><span key={a.id} className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full">{a.name}</span>)}</div>}
      </div>
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5 space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Compose Message</div>
        {channel!=="sms"&&<input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Email subject line…" className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"/>}
        <textarea value={body} onChange={e=>setBody(e.target.value)} rows={4} placeholder={channel==="sms"?"Write your text message (160 chars)…":"Write your message…"} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"/>
        {channel==="sms"&&<div className={`text-right text-xs ${body.length>160?"text-red-400":"text-slate-500"}`}>{body.length}/160</div>}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-500">To <span className="text-white font-bold">{recipients.length}</span> athlete{recipients.length!==1?"s":""} via <span className="text-amber-400 font-bold">{channel==="both"?"email + text":channel}</span></div>
          <button onClick={handleSend} disabled={!body.trim()||recipients.length===0} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-amber-900/20">Send Alert →</button>
        </div>
      </div>
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Alerts</div>
        <div className="space-y-2">
          {history.map(h=>(
            <div key={h.id} className="flex items-center gap-4 rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-3">
              <span className="text-lg">{h.channel==="sms"?"💬":h.channel==="email"?"✉️":"📣"}</span>
              <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-white truncate">{h.subject}</div><div className="text-xs text-slate-400">To: {h.to}</div></div>
              <div className="text-right shrink-0"><div className="text-xs font-bold text-sky-400">{h.recipients} sent</div><div className="text-xs text-slate-500">{h.date}</div></div>
            </div>
          ))}
        </div>
      </div>
      {sent&&<div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl z-50 bg-emerald-500 text-white">✓ Alert sent to {sent.count} athletes via {sent.channel==="both"?"email + text":sent.channel}</div>}
    </div>
  );
}

// ─── SPLASH PANEL ─────────────────────────────────────────────────────────────
function SplashPanel() {
  const [copied,setCopied]=useState(false);
  const [igCopied,setIgCopied]=useState(false);
  const [previewOpen,setPreviewOpen]=useState(false);
  const URL="https://midtnvbc.com/dibs-signup";
  function copyLink(){navigator.clipboard?.writeText(URL);setCopied(true);setTimeout(()=>setCopied(false),2500);}
  function copyIg(){navigator.clipboard?.writeText(`🏐 Want to earn credit toward your club dues?\n\nSign up for DIBS — Mid TN VBC's Work/Play program!\n\n👇 ${URL}\n\n#MidTNVBC #VolleyballLife #DIBS`);setIgCopied(true);setTimeout(()=>setIgCopied(false),3000);}
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/60 flex items-center justify-between">
          <div><div className="text-sm font-black text-white">DIBS Sign-Up Splash Page</div><div className="text-xs text-slate-400 mt-0.5">{URL}</div></div>
          <button onClick={()=>setPreviewOpen(!previewOpen)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600">{previewOpen?"Hide Preview":"Preview Page"}</button>
        </div>
        {previewOpen&&(
          <div className="bg-slate-950 p-4">
            <div className="rounded-xl overflow-hidden border border-slate-700/60 max-w-sm mx-auto">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 text-center">
                <div className="text-5xl mb-3">🏐</div>
                <div className="text-3xl font-black text-white tracking-tight">DIBS</div>
                <div className="text-amber-100 text-sm mt-1 font-semibold">Work / Play Program</div>
                <div className="text-xs text-amber-200 mt-0.5">Mid Tennessee Volleyball Club</div>
              </div>
              <div className="bg-slate-900 p-6 space-y-4">
                <div className="text-center"><div className="text-white font-black text-lg">Earn Credit. Reduce Dues.</div><div className="text-slate-400 text-xs mt-2">Volunteer for gym setup, tournaments, and events — every shift earns credit toward your dues.</div></div>
                {["Claim open volunteer shifts","Track earnings in real time","Credits apply directly to dues","Up to $600/season"].map((f,i)=><div key={i} className="flex items-center gap-2 text-xs text-slate-300"><span className="text-emerald-400 font-bold">✓</span>{f}</div>)}
                <div className="bg-amber-500 text-slate-900 text-center py-3 rounded-xl text-sm font-black">Join DIBS Now →</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Share Signup Link</div>
          <div className="flex gap-2 mb-3"><div className="flex-1 bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono truncate">{URL}</div><button onClick={copyLink} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${copied?"bg-emerald-500/20 text-emerald-400 border-emerald-500/40":"bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600"}`}>{copied?"✓ Copied!":"Copy"}</button></div>
          <div className="flex gap-2">{[["✉️","Email"],["💬","Text"],["🔗","QR"]].map(([ic,l])=><button key={l} className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-700/60 text-slate-300 hover:bg-slate-700 border border-slate-700">{ic} {l}</button>)}</div>
        </div>
        <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-950/30 to-purple-950/30 p-5">
          <div className="flex items-center gap-2 mb-4"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-pink-400"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg><div className="text-xs font-bold text-pink-300 uppercase tracking-wider">Instagram · @midtnvbc</div></div>
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 mb-3 text-xs text-slate-300 leading-relaxed">🏐 Want to earn credit toward your dues?<br/><br/>Sign up for <span className="text-amber-400 font-bold">DIBS</span> — Mid TN VBC's Work/Play!<br/><span className="text-sky-400">{URL}</span><br/><span className="text-slate-500">#MidTNVBC #VolleyballLife #DIBS</span></div>
          <div className="flex gap-2"><button onClick={copyIg} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${igCopied?"bg-emerald-500/20 text-emerald-400 border-emerald-500/40":"bg-pink-500/20 text-pink-300 border-pink-500/30 hover:bg-pink-500/30"}`}>{igCopied?"✓ Copied!":"Copy Caption"}</button><button className="px-3 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-500 to-purple-500 text-white">Open IG →</button></div>
        </div>
      </div>
    </div>
  );
}

// ─── IMPORT PANEL ─────────────────────────────────────────────────────────────
const ATHLETE_FIELDS = ["name","email","phone","team","tier","age"];
const JOB_FIELDS     = ["title","category","date","time","duration","credits","spots","location"];

function ColumnMapper({ headers, fields, mapping, setMapping }) {
  return (
    <div className="grid gap-2">
      {fields.map(field => (
        <div key={field} className="flex items-center gap-3">
          <div className="w-28 shrink-0 text-xs font-bold text-slate-300 capitalize">{field}</div>
          <select
            value={mapping[field]||""}
            onChange={e=>setMapping(m=>({...m,[field]:e.target.value}))}
            className="flex-1 bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
          >
            <option value="">— skip —</option>
            {headers.map(h=><option key={h} value={h}>{h}</option>)}
          </select>
          {mapping[field] ? <span className="text-emerald-400 text-xs">✓</span> : <span className="text-slate-600 text-xs">○</span>}
        </div>
      ))}
    </div>
  );
}

function ImportPanel({ onImportAthletes, onImportJobs, existingAthletes, existingJobs }) {
  const [mode, setMode]           = useState("athletes"); // "athletes" | "jobs"
  const [inputMode, setInputMode] = useState("upload");   // "upload" | "paste"
  const [rawCSV, setRawCSV]       = useState("");
  const [parsed, setParsed]       = useState(null);       // { headers, rows }
  const [mapping, setMapping]     = useState({});
  const [selected, setSelected]   = useState([]);         // row indices to import
  const [step, setStep]           = useState("input");    // "input"|"map"|"preview"|"done"
  const [result, setResult]       = useState(null);
  const fileRef = useRef();

  const fields = mode === "athletes" ? ATHLETE_FIELDS : JOB_FIELDS;

  // auto-map columns that match field names exactly
  function autoMap(headers) {
    const m = {};
    fields.forEach(f => {
      const match = headers.find(h => h.toLowerCase().replace(/\s+/g,"_") === f);
      if (match) m[f] = match;
    });
    return m;
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      setRawCSV(text);
      const p = parseCSV(text);
      setParsed(p);
      setMapping(autoMap(p.headers));
      setSelected(p.rows.map((_,i)=>i));
      setStep("map");
    };
    reader.readAsText(file);
  }

  function handleParse() {
    if (!rawCSV.trim()) return;
    const p = parseCSV(rawCSV);
    setParsed(p);
    setMapping(autoMap(p.headers));
    setSelected(p.rows.map((_,i)=>i));
    setStep("map");
  }

  function proceedToPreview() { setStep("preview"); }

  // detect duplicates
  function isDuplicate(row) {
    const mapped = applyMapping(row);
    if (mode==="athletes") return existingAthletes.some(a=>a.email&&mapped.email&&a.email.toLowerCase()===mapped.email.toLowerCase());
    if (mode==="jobs")     return existingJobs.some(j=>j.title&&mapped.title&&j.title.toLowerCase()===mapped.title.toLowerCase()&&j.date===mapped.date);
    return false;
  }

  function applyMapping(row) {
    const out = {};
    fields.forEach(f=>{ if(mapping[f]) out[f]=row[mapping[f]]||""; });
    return out;
  }

  function handleConfirm() {
    const rows = selected.map(i=>applyMapping(parsed.rows[i]));
    let added=0, dupes=0;
    if (mode==="athletes") {
      const newAthletes = rows.filter(r=>{
        const isDup = existingAthletes.some(a=>a.email&&r.email&&a.email.toLowerCase()===r.email.toLowerCase());
        if(isDup){dupes++;return false;}
        added++;return true;
      }).map((r,i)=>({
        id:`IMP-${Date.now()}-${i}`,
        name:r.name||"Unknown",
        email:r.email||"",
        phone:r.phone||"",
        team:r.team||"Unassigned",
        tier:r.tier||"Silver",
        age:parseInt(r.age)||0,
        creditsEarned:0,
        creditsPending:0,
      }));
      onImportAthletes(newAthletes);
    } else {
      const newJobs = rows.filter(r=>{
        const isDup = existingJobs.some(j=>j.title&&r.title&&j.title.toLowerCase()===r.title.toLowerCase()&&j.date===r.date);
        if(isDup){dupes++;return false;}
        added++;return true;
      }).map((r,i)=>({
        id:Date.now()+i,
        title:r.title||"Untitled Job",
        category:r.category||"gym",
        date:r.date||"",
        time:r.time||"TBD",
        duration:r.duration||"",
        credits:parseInt(r.credits)||0,
        spots:parseInt(r.spots)||1,
        location:r.location||"",
        claimed:[],
        status:"open",
        icon:"🏐",
        createdBy:"Import",
      }));
      onImportJobs(newJobs);
    }
    setResult({added,dupes,total:rows.length,mode});
    setStep("done");
  }

  function reset() {
    setRawCSV(""); setParsed(null); setMapping({}); setSelected([]); setStep("input"); setResult(null);
  }

  function downloadTemplate() {
    const text = mode==="athletes"?ATHLETE_TEMPLATE:JOB_TEMPLATE;
    const blob = new Blob([text],{type:"text/csv"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`dibs-${mode}-template.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const toggleRow = i => setSelected(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i]);
  const toggleAll = () => setSelected(selected.length===parsed?.rows.length?[]:parsed?.rows.map((_,i)=>i)||[]);
  const mappedCount = fields.filter(f=>mapping[f]).length;

  return (
    <div className="space-y-5">
      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-3">
        {[["athletes","👤 Import Athletes","Roster, contact info, team & tier assignments"],["jobs","📋 Import Job List","Existing volunteer job listings & schedules"]].map(([v,l,d])=>(
          <button key={v} onClick={()=>{setMode(v);reset();}} className={`rounded-2xl border p-4 text-left transition-all ${mode===v?"border-amber-500/50 bg-amber-950/30":"border-slate-700/60 bg-slate-800/40 hover:border-slate-600"}`}>
            <div className={`text-sm font-black mb-1 ${mode===v?"text-amber-400":"text-white"}`}>{l}</div>
            <div className="text-xs text-slate-400">{d}</div>
          </button>
        ))}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[["input","1","Upload / Paste"],["map","2","Map Columns"],["preview","3","Preview & Select"],["done","4","Complete"]].map(([s,n,l],idx,arr)=>(
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-1.5 ${step===s?"text-amber-400":["done"].includes(step)||(["preview","done"].includes(step)&&idx<3)||(step==="map"&&idx===0)||(step==="preview"&&idx<=1)||(step==="done")?"text-emerald-400":"text-slate-600"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border ${step===s?"border-amber-400 bg-amber-500/20":step==="done"||["preview","done"].includes(step)&&idx<3||(step==="preview"&&idx<2)||(step==="map"&&idx<1)?"border-emerald-500 bg-emerald-500/20":"border-slate-700 bg-slate-800"}`}>{n}</div>
              <span className="text-xs font-bold hidden sm:inline">{l}</span>
            </div>
            {idx<arr.length-1&&<div className={`flex-1 h-px ${step!=="input"&&idx===0||step==="preview"&&idx===1||step==="done"?"bg-emerald-500/40":"bg-slate-700"}`}/>}
          </div>
        ))}
      </div>

      {/* ── STEP 1: INPUT ── */}
      {step==="input"&&(
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {[["upload","⬆ Upload CSV"],["paste","📋 Paste Data"]].map(([v,l])=>(
                <button key={v} onClick={()=>setInputMode(v)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${inputMode===v?"bg-sky-500 text-white border-sky-500":"bg-slate-800 text-slate-400 border-slate-700 hover:text-white"}`}>{l}</button>
              ))}
            </div>
            <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-700/60 text-slate-300 hover:bg-slate-700 border border-slate-600 transition-colors">
              ⬇ Download {mode==="athletes"?"Athlete":"Job"} Template
            </button>
          </div>

          {inputMode==="upload"?(
            <div
              onClick={()=>fileRef.current?.click()}
              className="border-2 border-dashed border-slate-600 hover:border-amber-500/50 rounded-2xl p-10 text-center cursor-pointer transition-all group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📂</div>
              <div className="text-sm font-bold text-white mb-1">Drop your CSV file here</div>
              <div className="text-xs text-slate-400 mb-4">or click to browse · .csv, .txt accepted</div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">Choose File</div>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile}/>
            </div>
          ):(
            <div className="space-y-3">
              <div className="text-xs text-slate-400">Paste CSV data directly — copy from Google Sheets, Excel, or any spreadsheet. First row should be column headers.</div>
              <textarea
                value={rawCSV}
                onChange={e=>setRawCSV(e.target.value)}
                rows={8}
                placeholder={mode==="athletes"
                  ?"name,email,phone,team,tier,age\nJane Smith,jane@email.com,615-555-0200,16U Black,Gold,16\n..."
                  :"title,category,date,time,duration,credits,spots,location\nCourt Breakdown,gym,2026-04-05,9:00 AM,1 hr,20,2,Main Gym\n..."}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none"
              />
              <button onClick={handleParse} disabled={!rawCSV.trim()} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-40 transition-colors">Parse Data →</button>
            </div>
          )}

          {/* Format guide */}
          <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 p-4">
            <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Expected Columns for {mode==="athletes"?"Athletes":"Jobs"}</div>
            <div className="flex flex-wrap gap-1.5">
              {fields.map(f=>(
                <span key={f} className="px-2 py-0.5 rounded-lg bg-slate-700/60 text-xs text-slate-300 font-mono">{f}</span>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Column names don't need to match exactly — you'll map them in the next step.</p>
          </div>
        </div>
      )}

      {/* ── STEP 2: MAP COLUMNS ── */}
      {step==="map"&&parsed&&(
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-white">Map Your Columns</div>
              <div className="text-xs text-slate-400 mt-0.5">{parsed.rows.length} rows detected · ${mappedCount}/${fields.length} fields mapped</div>
            </div>
            <button onClick={reset} className="text-xs text-slate-400 hover:text-white">← Back</button>
          </div>

          {/* Auto-map notice */}
          {mappedCount>0&&(
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5">
              <span className="text-emerald-400">✓</span>
              <span className="text-xs text-emerald-300 font-semibold">{mappedCount} column{mappedCount!==1?"s":""} auto-mapped from your headers</span>
            </div>
          )}

          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Column Mapping</div>
            <ColumnMapper headers={parsed.headers} fields={fields} mapping={mapping} setMapping={setMapping}/>
          </div>

          {/* Raw preview */}
          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/20 overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-700/40 text-xs font-bold text-slate-400 uppercase tracking-wider">Raw Data Preview (first 3 rows)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-slate-700/40">{parsed.headers.map(h=><th key={h} className="px-3 py-2 text-left text-slate-400 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>{parsed.rows.slice(0,3).map((row,i)=><tr key={i} className="border-b border-slate-700/20">{parsed.headers.map(h=><td key={h} className="px-3 py-2 text-slate-300 whitespace-nowrap max-w-32 truncate">{row[h]}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </div>

          <button onClick={proceedToPreview} disabled={mappedCount<(mode==="athletes"?2:2)} className="w-full py-3 rounded-xl text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-40 transition-colors">
            Preview & Select Rows →
          </button>
        </div>
      )}

      {/* ── STEP 3: PREVIEW ── */}
      {step==="preview"&&parsed&&(
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-white">Preview Import</div>
              <div className="text-xs text-slate-400 mt-0.5">{selected.length} of {parsed.rows.length} rows selected</div>
            </div>
            <button onClick={()=>setStep("map")} className="text-xs text-slate-400 hover:text-white">← Back</button>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"/>New — will be imported</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"/>Duplicate — already exists</span>
          </div>

          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/60 bg-slate-800/60">
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" checked={selected.length===parsed.rows.length} onChange={toggleAll} className="accent-amber-500"/>
                    </th>
                    {fields.filter(f=>mapping[f]).map(f=><th key={f} className="px-3 py-3 text-left text-slate-400 font-semibold capitalize whitespace-nowrap">{f}</th>)}
                    <th className="px-3 py-3 text-left text-slate-400 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((row,i)=>{
                    const mapped = applyMapping(row);
                    const dup = isDuplicate(row);
                    const isSelected = selected.includes(i);
                    return (
                      <tr key={i} onClick={()=>toggleRow(i)} className={`border-b border-slate-700/20 cursor-pointer transition-colors ${isSelected?"bg-slate-800/40":"opacity-50"} hover:bg-slate-800/60`}>
                        <td className="px-4 py-2.5">
                          <input type="checkbox" checked={isSelected} onChange={()=>toggleRow(i)} onClick={e=>e.stopPropagation()} className="accent-amber-500"/>
                        </td>
                        {fields.filter(f=>mapping[f]).map(f=>(
                          <td key={f} className="px-3 py-2.5 text-slate-300 whitespace-nowrap max-w-36 truncate">{mapped[f]||<span className="text-slate-600 italic">—</span>}</td>
                        ))}
                        <td className="px-3 py-2.5">
                          {dup
                            ? <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">Duplicate</span>
                            : <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">New</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleConfirm} disabled={selected.length===0} className="flex-1 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-40 transition-colors">
              ✓ Import {selected.length} {mode==="athletes"?"Athlete":"Job"}{selected.length!==1?"s":""}
            </button>
            <button onClick={reset} className="px-5 py-3 rounded-xl text-sm font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* ── STEP 4: DONE ── */}
      {step==="done"&&result&&(
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <div className="text-2xl font-black text-white mb-1">Import Complete</div>
            <div className="text-slate-400 text-sm mb-6">Your {result.mode} have been added to DIBS</div>
            <div className="flex justify-center gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-black text-emerald-400">{result.added}</div>
                <div className="text-xs text-slate-400">Added</div>
              </div>
              {result.dupes>0&&(
                <div className="text-center">
                  <div className="text-3xl font-black text-amber-400">{result.dupes}</div>
                  <div className="text-xs text-slate-400">Skipped (duplicates)</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-3xl font-black text-slate-400">{result.total}</div>
                <div className="text-xs text-slate-400">Total rows</div>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={reset} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors">Import More</button>
              <button onClick={()=>{setMode(mode==="athletes"?"jobs":"athletes");reset();}} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 transition-colors">
                Switch to {mode==="athletes"?"Jobs":"Athletes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MANAGER VIEW ─────────────────────────────────────────────────────────────
function ManagerView({ jobs, setJobs, athletes, setAthletes }) {
  const [tab, setTab] = useState("jobs");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({title:"",category:"gym",date:"",time:"",duration:"",credits:"",spots:"1",location:"",icon:"🏐"});
  const [seasonLimit, setSeasonLimit] = useState(600);
  const [editingLimit, setEditingLimit] = useState(false);

  const totalCredits = jobs.reduce((s,j)=>s+j.claimed.length*j.credits,0);
  const openJobs = jobs.filter(j=>j.status==="open").length;
  const ICONS = ["🏐","🧹","📋","🧮","🍕","🕸️","🎬","👁️","🚗","📦"];

  function handleCreate(e) {
    e.preventDefault();
    setJobs(p=>[{id:Date.now(),...form,credits:parseInt(form.credits),spots:parseInt(form.spots),claimed:[],status:"open",createdBy:"Manager"},...p]);
    setForm({title:"",category:"gym",date:"",time:"",duration:"",credits:"",spots:"1",location:"",icon:"🏐"});
    setShowForm(false);
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{l:"Open Jobs",v:openJobs,c:"text-amber-400"},{l:"Total Listings",v:jobs.length,c:"text-sky-400"},{l:"Credits Issued",v:`$${totalCredits}`,c:"text-emerald-400"},{l:"Athletes",v:athletes.length,c:"text-purple-400"}].map(s=>(
          <div key={s.l} className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-4">
            <div className={`text-2xl font-black ${s.c}`}>{s.v}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-800/60 rounded-2xl p-1 border border-slate-700/60 overflow-x-auto">
        {[["jobs","⚙️ Jobs"],["alerts","📣 Alerts"],["splash","🔗 Share"],["import","⬆ Import"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)} className={`shrink-0 flex-1 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${tab===v?"bg-amber-500 text-slate-900 shadow":"text-slate-400 hover:text-white"}`}>{l}</button>
        ))}
      </div>

      {/* JOBS TAB */}
      {tab==="jobs"&&(
        <div className="space-y-5">
          <div className="rounded-2xl border border-purple-500/30 bg-purple-950/30 p-4 flex items-center gap-4">
            <div className="flex-1"><div className="text-sm font-bold text-white mb-0.5">Season Credit Limit Per Athlete</div><div className="text-xs text-slate-400">Max credits any athlete can earn this season</div></div>
            {editingLimit?(
              <div className="flex items-center gap-2"><input type="number" value={seasonLimit} onChange={e=>setSeasonLimit(parseInt(e.target.value))} className="w-24 bg-slate-800 border border-slate-600 rounded-xl px-3 py-1.5 text-white text-sm font-bold text-center"/><button onClick={()=>setEditingLimit(false)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500 text-white">Save</button></div>
            ):(
              <div className="flex items-center gap-3"><span className="text-2xl font-black text-purple-400">$${seasonLimit}</span><button onClick={()=>setEditingLimit(true)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600">Edit</button></div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white">Job Listings</h3>
            <button onClick={()=>setShowForm(!showForm)} className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-900/30">{showForm?"✕ Cancel":"+ Create Job"}</button>
          </div>

          {showForm&&(
            <form onSubmit={handleCreate} className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-4">
              <div className="text-sm font-bold text-amber-300">New Job Listing</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className="text-xs text-slate-400 mb-1 block">Job Title *</label><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Court Setup – 14U Practice" className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"/></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"><option value="gym">Gym</option><option value="tournament">Tournament</option><option value="event">Event</option></select></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Icon</label><div className="flex gap-1.5 flex-wrap">{ICONS.map(ic=><button type="button" key={ic} onClick={()=>setForm({...form,icon:ic})} className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${form.icon===ic?"border-amber-400 bg-amber-500/20":"border-slate-700 bg-slate-800 hover:border-slate-600"}`}>{ic}</button>)}</div></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Date *</label><input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"/></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Time *</label><input required value={form.time} onChange={e=>setForm({...form,time:e.target.value})} placeholder="8:00 AM" className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"/></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Duration</label><input value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})} placeholder="2 hrs" className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"/></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Location</label><input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Main Gym" className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"/></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Credits ($) *</label><input required type="number" value={form.credits} onChange={e=>setForm({...form,credits:e.target.value})} placeholder="50" className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"/></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Open Spots</label><input type="number" min="1" value={form.spots} onChange={e=>setForm({...form,spots:e.target.value})} className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"/></div>
              </div>
              <button type="submit" className="px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-500 text-slate-900 hover:bg-amber-400">Create & Post Job</button>
            </form>
          )}

          <div className="space-y-2">
            {jobs.map(job=>(
              <div key={job.id} className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3 flex items-center gap-4">
                <span className="text-xl">{job.icon}</span>
                <div className="flex-1 min-w-0"><div className="text-sm font-bold text-white truncate">{job.title}</div><div className="text-xs text-slate-400">{new Date(job.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})} · {job.time} · {job.location}</div></div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge category={job.category}/>
                  <span className="text-sm font-bold text-emerald-400 w-12 text-right">${job.credits}</span>
                  <span className="text-xs text-slate-400 w-16 text-center">{job.claimed.length}/{job.spots}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${job.status==="full"?"bg-slate-700 text-slate-400":"bg-emerald-500/20 text-emerald-400"}`}>{job.status==="full"?"Full":"Open"}</span>
                  <button onClick={()=>setJobs(p=>p.filter(j=>j.id!==job.id))} className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs flex items-center justify-center">✕</button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-base font-black text-white mb-3">Athlete Credit Ledger</h3>
            <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-700/60">{["Athlete","Team","Earned","Pending","Remaining"].map(h=><th key={h} className={`px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider ${h==="Athlete"||h==="Team"?"text-left":"text-right"}`}>{h}</th>)}</tr></thead>
                <tbody>{athletes.map((a,i)=>(
                  <tr key={a.id} className={`border-b border-slate-700/30 ${i%2===0?"":"bg-slate-800/20"}`}>
                    <td className="px-4 py-3 font-semibold text-white">{a.name}</td>
                    <td className="px-4 py-3 text-slate-400">{a.team}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-bold">${a.creditsEarned}</td>
                    <td className="px-4 py-3 text-right text-amber-400 font-bold">${a.creditsPending}</td>
                    <td className="px-4 py-3 text-right text-slate-300">${600-a.creditsEarned-a.creditsPending}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab==="alerts"&&<AlertsPanel athletes={athletes}/>}
      {tab==="splash"&&<SplashPanel/>}
      {tab==="import"&&(
        <ImportPanel
          onImportAthletes={newAthletes=>setAthletes(p=>[...p,...newAthletes])}
          onImportJobs={newJobs=>setJobs(p=>[...p,...newJobs])}
          existingAthletes={athletes}
          existingJobs={jobs}
        />
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export const DibsApp = () => {
  const [view, setView] = useState("athlete");
  const [jobs, setJobs] = useState(INIT_JOBS);
  const [athletes, setAthletes] = useState(INIT_ATHLETES);

  return (
    <div className="h-full bg-slate-950 text-white" style={{fontFamily:"'DM Sans', system-ui, sans-serif"}}>
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-900 font-black text-lg">D</div>
            <div>
              <div className="font-black text-white leading-none tracking-tight">DIBS</div>
              <div className="text-xs text-slate-400 leading-none mt-0.5">Work / Play · Mid TN Volleyball</div>
            </div>
          </div>
          <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
            <button onClick={()=>setView("athlete")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view==="athlete"?"bg-amber-500 text-slate-900":"text-slate-400 hover:text-white"}`}>🏐 Athlete</button>
            <button onClick={()=>setView("manager")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view==="manager"?"bg-amber-500 text-slate-900":"text-slate-400 hover:text-white"}`}>⚙️ Manager</button>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {view==="athlete"
          ? <AthleteView jobs={jobs} setJobs={setJobs} athletes={athletes}/>
          : <ManagerView jobs={jobs} setJobs={setJobs} athletes={athletes} setAthletes={setAthletes}/>
        }
      </div>
    </div>
  );
}
