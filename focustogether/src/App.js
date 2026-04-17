import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { ref, set, onValue, push } from "firebase/database";

// ─────────────────────────────────────────────────────────────
//  CONFIG — each person edits only these 4 lines
// ─────────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const MY_ID = params.get("user") || "user1";

const PARTNER_ID = MY_ID === "user1" ? "user2" : "user1";

// 👇 KEY CHANGE
const PARTNER_NAME = MY_ID === "user1" ? "Baby" : "Deepa";
const MY_NAME = MY_ID === "user1" ? "Harsh" : "Baby";
// ─────────────────────────────────────────────────────────────

const DAILY_GOAL_MIN = 120;

const LOVE_MSGS = [
  { emoji: "❤️",  label: "Love you",    text: "I love you so much 💕"               },
  { emoji: "🥺",  label: "Miss you",    text: "I miss you right now 🥺"             },
  { emoji: "☕",  label: "Take break",  text: "Take a little break okay? 🫶"        },
  { emoji: "💪",  label: "You got this",text: "You're doing amazing, keep going! ✨"},
  { emoji: "🌙",  label: "Good night",  text: "Study well, dream of me tonight 🌙"  },
  { emoji: "🫂",  label: "Hug",         text: "Sending you a big hug right now 🫂"  },
];

const QUOTES = [
  "Side by side or miles apart, we study with the same heart.",
  "Focus now… I'll distract you later 😏",
  "Distance means nothing when purpose is shared.",
  "Same sky. Same goal. Same love.",
  "Every minute you focus is a minute I'm proud of you.",
  "Studying together, even when apart.",
];

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function timeAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}

// ── Particle Canvas ──────────────────────────────────────────
function ParticleBurst({ active, onDone }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.7,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * -4 - 0.5,
      size: Math.random() * 9 + 3,
      color: ["#f43f5e","#fb7185","#fda4af","#fbbf24","#f9a8d4","#c084fc","#e879f9"][Math.floor(Math.random()*7)],
      alpha: 1,
      heart: Math.random() > 0.4,
    }));
    let raf, done = false;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.alpha -= 0.011;
        if (p.alpha <= 0) return;
        alive++;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        if (p.heart) {
          ctx.font = `${p.size * 3}px serif`;
          ctx.fillText("♥", p.x, p.y);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      if (alive > 0) raf = requestAnimationFrame(draw);
      else if (!done) { done = true; onDone(); }
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  if (!active) return null;
  return <canvas ref={canvasRef} style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:9999 }} />;
}

// ── Love Popup ───────────────────────────────────────────────
function LovePopup({ msg, from, onClose }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, [msg, onClose]);

  if (!msg) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(10px)",
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(145deg,#1a0426,#2d0a20,#1a0426)",
          border: "1px solid rgba(244,63,94,0.5)",
          borderRadius: 28,
          padding: "2.5rem 2rem",
          textAlign: "center",
          maxWidth: 360,
          width: "90%",
          boxShadow:
            "0 0 80px rgba(244,63,94,0.35),0 0 160px rgba(244,63,94,0.1)",
          animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 16 }}>💌</div>
        <div
          style={{
            fontSize: 12,
            color: "#f9a8d4",
            marginBottom: 14,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          from {from}
        </div>
        <div
          style={{
            fontFamily: "'Lora',serif",
            fontSize: 22,
            color: "white",
            lineHeight: 1.5,
            marginBottom: 20,
          }}
        >
          {msg}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
          tap to close
        </div>
      </div>
    </div>
  );
}

// ── Break Banner ─────────────────────────────────────────────
function BreakBanner({ name, status, breakMsg }) {
  if (status !== "break") return null;
  return (
    <div style={{
      background:"rgba(251,191,36,0.08)",border:"0.5px solid rgba(251,191,36,0.25)",
      borderRadius:14,padding:"10px 16px",marginBottom:"1rem",
      display:"flex",alignItems:"center",gap:10,animation:"slideDown 0.4s ease",
    }}>
      <span style={{ fontSize:18 }}>☕</span>
      <div>
        <div style={{ fontSize:13,color:"#fbbf24",fontWeight:500 }}>{name} is on a break</div>
        {breakMsg && <div style={{ fontSize:12,color:"#92400e",marginTop:2 }}>{breakMsg}</div>}
      </div>
    </div>
  );
}

// ── Goal Panel ───────────────────────────────────────────────
function GoalPanel({ myGoal, setMyGoal, partnerGoal, partnerName, onSave, saved }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(myGoal);

  function save() {
    setMyGoal(draft);
    onSave(draft);
    setEditing(false);
  }

  return (
    <div style={{
      background:"rgba(255,255,255,0.03)",border:"0.5px solid rgba(255,255,255,0.07)",
      borderRadius:18,padding:"14px",marginBottom:"1rem",
    }}>
      <div style={{ display:"flex",gap:12 }}>
        {/* My goal */}
        <div style={{ flex:1,minWidth:0 }}>
          <div style={GL.label}>Your goal</div>
          {editing ? (
            <>
              <textarea
                style={GL.textarea}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="What will you focus on?"
                rows={3}
                autoFocus
              />
              <div style={{ display:"flex",gap:6,marginTop:8 }}>
                <button style={GL.saveBtn} onClick={save}>Save ✓</button>
                <button style={GL.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </>
          ) : (
            <div style={GL.display} onClick={() => { setDraft(myGoal); setEditing(true); }}>
              {myGoal
                ? <><span style={GL.goalTxt}>{myGoal}</span><span style={GL.editHint}>✎</span></>
                : <span style={GL.placeholder}>tap to set your goal...</span>
              }
            </div>
          )}
          {saved && <div style={{ fontSize:11,color:"#4ade80",marginTop:6 }}>✓ Saved!</div>}
        </div>

        <div style={{ width:"0.5px",background:"rgba(255,255,255,0.06)",flexShrink:0 }} />

        {/* Partner goal */}
        <div style={{ flex:1,minWidth:0 }}>
          <div style={GL.label}>{partnerName}'s goal</div>
          <div style={{ ...GL.display, cursor:"default" }}>
            {partnerGoal
              ? <span style={GL.goalTxt}>{partnerGoal}</span>
              : <span style={GL.placeholder}>waiting...</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

const GL = {
  label:      { fontSize:11,color:"#64748b",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8 },
  display:    { cursor:"pointer",padding:"8px 10px",borderRadius:12,background:"rgba(255,255,255,0.04)",minHeight:58,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:6,transition:"background 0.2s" },
  goalTxt:    { fontSize:13,color:"#e2e8f0",lineHeight:1.5,flex:1 },
  editHint:   { fontSize:12,color:"#334155",flexShrink:0,marginTop:2 },
  placeholder:{ fontSize:13,color:"#334155",fontStyle:"italic",lineHeight:1.5 },
  textarea:   { width:"100%",background:"rgba(255,255,255,0.06)",border:"0.5px solid rgba(244,63,94,0.3)",borderRadius:12,padding:"8px 10px",color:"white",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",lineHeight:1.5 },
  saveBtn:    { fontSize:12,padding:"6px 14px",borderRadius:8,border:"none",background:"rgba(244,63,94,0.25)",color:"#f43f5e",cursor:"pointer",fontFamily:"inherit",fontWeight:500 },
  cancelBtn:  { fontSize:12,padding:"6px 12px",borderRadius:8,border:"0.5px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#64748b",cursor:"pointer",fontFamily:"inherit" },
};

// ── Love Buttons ─────────────────────────────────────────────
function LovePanel({ onSend, lastSent }) {
  return (
    <div style={{ marginBottom:"1rem" }}>
      <div style={{ fontSize:11,color:"#64748b",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8 }}>
        Send a little something ✉️
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6 }}>
        {LOVE_MSGS.map((m, i) => (
          <button key={i} onClick={() => onSend(m.text, i)} style={{
            display:"flex",flexDirection:"column",alignItems:"center",gap:4,
            padding:"10px 4px",borderRadius:14,
            border: lastSent===i ? "0.5px solid rgba(244,63,94,0.5)" : "0.5px solid rgba(255,255,255,0.07)",
            background: lastSent===i ? "rgba(244,63,94,0.15)" : "rgba(255,255,255,0.04)",
            cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",
          }}>
            <span style={{ fontSize:20 }}>{m.emoji}</span>
            <span style={{ fontSize:10,color:"#94a3b8",textAlign:"center",lineHeight:1.2 }}>{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Heart Sync Banner ────────────────────────────────────────
function HeartSync({ myStatus, partnerStatus }) {
  const both = myStatus==="studying" && partnerStatus==="studying";
  return (
    <div style={{ textAlign:"center",marginBottom:"0.75rem",minHeight:22 }}>
      {both ? (
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <span style={{ fontSize:13,color:"#f43f5e",animation:"pulse 1.3s ease infinite" }}>♥</span>
          <span style={{ fontSize:12,color:"#f9a8d4",letterSpacing:"0.04em" }}>Studying together right now</span>
          <span style={{ fontSize:13,color:"#f43f5e",animation:"pulse 1.3s ease infinite 0.3s" }}>♥</span>
        </div>
      ) : (
        <span style={{ fontSize:12,color:"#334155" }}>
          {partnerStatus==="offline" ? `${PARTNER_NAME} is offline` :
           partnerStatus==="break"   ? `${PARTNER_NAME} is on a break` :
                                       `${PARTNER_NAME} is online`}
        </span>
      )}
    </div>
  );
}

function SDot({ status }) {
  const c = status==="studying"?"#4ade80":status==="break"?"#fbbf24":"#334155";
  return <span style={{ display:"inline-block",width:7,height:7,borderRadius:"50%",background:c,boxShadow:status==="studying"?`0 0 7px ${c}`:"none",transition:"all 0.4s",flexShrink:0 }} />;
}

// ── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [view,            setView]            = useState("main");
  const [running,         setRunning]         = useState(false);
  const [onBreak,         setOnBreak]         = useState(false);
  const [myTime,          setMyTime]          = useState(0);
  const [partnerTime,     setPartnerTime]     = useState(0);
  const [partnerStatus,   setPartnerStatus]   = useState("offline");
  const [myGoal,          setMyGoal]          = useState("");
  const [partnerGoal,     setPartnerGoal]     = useState("");
  const [goalSaved,       setGoalSaved]       = useState(false);
  const [partnerBreakMsg, setPartnerBreakMsg] = useState("");
  const [soundOn,         setSoundOn]         = useState(false);
  const [sessions,        setSessions]        = useState([]);
  const [totalToday,      setTotalToday]      = useState(0);
  const [quote,           setQuote]           = useState(QUOTES[0]);
  const [popup,           setPopup]           = useState(null);
  const [burst,           setBurst]           = useState(false);
  const [lastSent,        setLastSent]        = useState(null);
  const [msgHistory,      setMsgHistory]      = useState([]);
  const [seenMsgId,       setSeenMsgId]       = useState(null);

  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const myStatus    = running ? "studying" : onBreak ? "break" : "offline";

  // Listen to partner state
  useEffect(() => {
    const unsub = onValue(ref(db, "users/" + PARTNER_ID), snap => {
      const d = snap.val() || {};
      setPartnerStatus(d.status   || "offline");
      setPartnerTime  (d.time     || 0);
      setPartnerGoal  (d.goal     || "");
      setPartnerBreakMsg(d.breakMsg || "");
    });
    return () => unsub();
  }, []);

  // Listen to incoming messages
  useEffect(() => {
    const unsub = onValue(ref(db, "messages/" + MY_ID), snap => {
      const data = snap.val();
      if (!data) return;
      const arr = Object.entries(data)
        .map(([k, v]) => ({ id: k, ...v }))
        .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
      if (arr.length > 0 && arr[0].id !== seenMsgId) {
        setSeenMsgId(arr[0].id);
        setPopup({ text: arr[0].text, from: PARTNER_NAME });
        setBurst(true);
      }
      setMsgHistory(arr.slice(0, 30));
    });
    return () => unsub();
  }, [seenMsgId]);

  // My timer + push to Firebase
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (running) {
      intervalRef.current = setInterval(() => {
        setMyTime(prev => {
          const next = prev + 1;
          set(ref(db, "users/" + MY_ID), { status:"studying", time:next, goal:myGoal, breakMsg:"" });
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, myGoal]);

  function startSession() {
    setRunning(true); setOnBreak(false);
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    set(ref(db, "users/" + MY_ID), { status:"studying", time:myTime, goal:myGoal, breakMsg:"" });
  }
  function takeBreak() {
    setRunning(false); setOnBreak(true);
    clearInterval(intervalRef.current);
    const msg = `Taking a short break ☕`;
    set(ref(db, "users/" + MY_ID), { status:"break", time:myTime, goal:myGoal, breakMsg:msg });
  }
  function endSession() {
    clearInterval(intervalRef.current);
    if (myTime > 5) {
      setSessions(prev => [{ duration:myTime, goal:myGoal||"No goal", date:new Date().toISOString() }, ...prev]);
      setTotalToday(prev => prev + myTime);
    }
    setRunning(false); setOnBreak(false); setMyTime(0);
    set(ref(db, "users/" + MY_ID), { status:"offline", time:0, goal:myGoal, breakMsg:"" });
  }
  function saveGoal(g) {
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 2000);
    // goal is pushed as part of users/MY_ID in the timer loop; also push standalone
    set(ref(db, "users/" + MY_ID), { status:myStatus, time:myTime, goal:g, breakMsg:"" });
  }
  function sendMsg(text, idx) {
    const r = push(ref(db, "messages/" + PARTNER_ID));
    set(r, { text, from: MY_ID, sentAt: new Date().toISOString() });
    setMsgHistory(prev => [{ id: Date.now()+"", text, from:"me", sentAt:new Date().toISOString() }, ...prev].slice(0, 30));
    setLastSent(idx);
    setTimeout(() => setLastSent(null), 3000);
  }
  function toggleSound() {
    if (!soundOn) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const gain = ctx.createGain(); gain.gain.value = 0.18; gain.connect(ctx.destination);
      const buf = 4096;
      const node = ctx.createScriptProcessor(buf, 1, 1);
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      node.onaudioprocess = e => {
        const o = e.outputBuffer.getChannelData(0);
        for (let i=0;i<buf;i++){const w=Math.random()*2-1;b0=0.99886*b0+w*0.0555179;b1=0.99332*b1+w*0.0750759;b2=0.96900*b2+w*0.1538520;b3=0.86650*b3+w*0.3104856;b4=0.55000*b4+w*0.5329522;b5=-0.7616*b5-w*0.0168980;o[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;b6=w*0.115926;}
      };
      node.connect(gain);
      audioCtxRef.current = ctx; setSoundOn(true);
    } else {
      audioCtxRef.current?.close(); setSoundOn(false);
    }
  }

  const totalMins = Math.floor(totalToday / 60);
  const pct = Math.min(100, Math.round((totalMins / DAILY_GOAL_MIN) * 100));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#08030f;font-family:'DM Sans',sans-serif;}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes popIn{from{opacity:0;transform:scale(0.6) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.4)}}
        @keyframes glow{0%,100%{box-shadow:0 0 16px rgba(74,222,128,0.1)}50%{box-shadow:0 0 30px rgba(74,222,128,0.3)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        input,textarea,button{font-family:'DM Sans',sans-serif;}
        input::placeholder,textarea::placeholder{color:#334155;}
        textarea{resize:none;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(244,63,94,0.25);border-radius:2px;}
      `}</style>

      <ParticleBurst active={burst} onDone={() => setBurst(false)} />
      <LovePopup msg={popup?.text} from={popup?.from} onClose={() => setPopup(null)} />

      <div style={{
        minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
        padding:"2rem 1rem",position:"relative",overflow:"hidden",
        background:"radial-gradient(ellipse at 20% 50%,#1c0028 0%,#08030f 55%,#0a0310 100%)",
      }}>
        {/* Ambient orbs */}
        <div style={{ position:"fixed",top:"-10%",left:"-5%",width:420,height:420,borderRadius:"50%",background:"rgba(244,63,94,0.05)",filter:"blur(90px)",pointerEvents:"none" }} />
        <div style={{ position:"fixed",bottom:"-15%",right:"-10%",width:500,height:500,borderRadius:"50%",background:"rgba(192,132,252,0.04)",filter:"blur(100px)",pointerEvents:"none" }} />

        <div style={{
          width:"100%",maxWidth:480,
          background:"rgba(12,6,22,0.92)",backdropFilter:"blur(32px)",
          border:"0.5px solid rgba(244,63,94,0.12)",borderRadius:28,padding:"1.75rem",
          color:"white",position:"relative",zIndex:1,
          boxShadow:"0 0 100px rgba(244,63,94,0.07),inset 0 1px 0 rgba(255,255,255,0.04)",
          animation:"float 7s ease infinite",
        }}>

          {/* Header */}
          <div style={{ textAlign:"center",marginBottom:"1.25rem" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:5 }}>
              <span style={{ fontSize:14,color:"#f43f5e",animation:"pulse 1.5s ease infinite" }}>♥</span>
              <span style={{ fontFamily:"'Lora',serif",fontSize:22,fontWeight:500,letterSpacing:"0.02em" }}>FocusTogether</span>
              <span style={{ fontSize:14,color:"#f43f5e",animation:"pulse 1.5s ease infinite 0.4s" }}>♥</span>
            </div>
            <p style={{ fontSize:11,color:"#334155",letterSpacing:"0.14em",textTransform:"uppercase" }}>
              {MY_NAME} & {PARTNER_NAME}
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display:"flex",gap:3,marginBottom:"1.25rem",background:"rgba(255,255,255,0.03)",borderRadius:14,padding:3 }}>
            {[["main","Focus"],["stats","Stats"],["msgs","Messages"]].map(([v,l]) => (
              <button key={v} onClick={() => setView(v)} style={{
                flex:1,fontSize:12,padding:"7px 0",borderRadius:11,border:"none",
                background:view===v ? "rgba(244,63,94,0.18)" : "transparent",
                color:view===v ? "#f43f5e" : "#475569",
                cursor:"pointer",fontFamily:"inherit",fontWeight:view===v?500:400,transition:"all 0.2s",
              }}>{l}</button>
            ))}
          </div>

          {/* ══ MAIN VIEW ══ */}
          {view==="main" && <>
            <HeartSync myStatus={myStatus} partnerStatus={partnerStatus} />
            <BreakBanner name={PARTNER_NAME} status={partnerStatus} breakMsg={partnerBreakMsg} />

            {/* Timer cards */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:"1rem" }}>
              {[
                { name:MY_NAME,      time:myTime,      status:myStatus,      goal:myGoal      },
                { name:PARTNER_NAME, time:partnerTime, status:partnerStatus, goal:partnerGoal },
              ].map(({ name, time, status, goal }, i) => (
                <div key={i} style={{
                  background:"rgba(255,255,255,0.03)",
                  border: status==="studying" ? "0.5px solid rgba(74,222,128,0.22)" : "0.5px solid rgba(255,255,255,0.06)",
                  borderRadius:18,padding:"12px",transition:"all 0.4s",
                  ...(status==="studying" ? { animation:"glow 3s ease infinite" } : {}),
                }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:8 }}>
                    <SDot status={status} />
                    <span style={{ fontSize:11,color:"#94a3b8",flex:1,letterSpacing:"0.05em" }}>{name}</span>
                    <span style={{ fontSize:10,color:"#334155",background:"rgba(255,255,255,0.04)",borderRadius:6,padding:"2px 6px" }}>
                      {status==="studying"?"focusing":status==="break"?"break":"offline"}
                    </span>
                  </div>
                  <div style={{ fontSize:30,fontWeight:500,letterSpacing:1,fontVariantNumeric:"tabular-nums",marginBottom:6 }}>{fmt(time)}</div>
                  {goal
                    ? <div style={{ fontSize:11,color:"#475569",background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"4px 8px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{goal}</div>
                    : <div style={{ fontSize:11,color:"#1e293b",fontStyle:"italic" }}>no goal set</div>
                  }
                </div>
              ))}
            </div>

            {/* Goal panel */}
            <GoalPanel
              myGoal={myGoal} setMyGoal={setMyGoal}
              partnerGoal={partnerGoal} partnerName={PARTNER_NAME}
              onSave={saveGoal} saved={goalSaved}
            />

            {/* Session controls */}
            <div style={{ display:"flex",gap:8,marginBottom:"1rem" }}>
              {!running && (
                <button onClick={startSession} style={{
                  flex:1,padding:"11px 0",fontSize:13,fontWeight:500,borderRadius:14,
                  border:"none",background:"linear-gradient(135deg,#f43f5e,#e11d48)",
                  color:"white",cursor:"pointer",fontFamily:"inherit",
                  boxShadow:"0 4px 20px rgba(244,63,94,0.28)",
                }}>
                  {onBreak ? "Resume session" : "Start session"}
                </button>
              )}
              {running && (
                <button onClick={takeBreak} style={{ flex:1,padding:"11px 0",fontSize:13,fontWeight:400,borderRadius:14,border:"0.5px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.05)",color:"#94a3b8",cursor:"pointer",fontFamily:"inherit" }}>
                  ☕ Take a break
                </button>
              )}
              {(running || onBreak) && (
                <button onClick={endSession} style={{ flex:1,padding:"11px 0",fontSize:13,fontWeight:400,borderRadius:14,border:"0.5px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.05)",color:"#94a3b8",cursor:"pointer",fontFamily:"inherit" }}>
                  End session
                </button>
              )}
              <button onClick={toggleSound} style={{
                padding:"11px 14px",fontSize:13,borderRadius:14,
                border: soundOn ? "0.5px solid rgba(244,63,94,0.4)" : "0.5px solid rgba(255,255,255,0.08)",
                background: soundOn ? "rgba(244,63,94,0.15)" : "rgba(255,255,255,0.05)",
                color: soundOn ? "#f43f5e" : "#64748b",cursor:"pointer",fontFamily:"inherit",
              }}>
                {soundOn ? "🔊" : "🔇"}
              </button>
            </div>

            {/* Love panel */}
            <LovePanel onSend={sendMsg} lastSent={lastSent} />

            {/* Quote */}
            <div style={{ textAlign:"center",padding:"12px 1rem",background:"rgba(244,63,94,0.04)",border:"0.5px solid rgba(244,63,94,0.09)",borderRadius:14,marginBottom:"0.75rem" }}>
              <span style={{ fontFamily:"'Lora',serif",fontSize:13,color:"#475569",fontStyle:"italic",lineHeight:1.6 }}>"{quote}"</span>
            </div>

            <p style={{ textAlign:"center",fontSize:11,color:"#1e293b" }}>Made with ❤️ by Harsh — for us</p>
          </>}

          {/* ══ STATS VIEW ══ */}
          {view==="stats" && <>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:"1rem" }}>
              {[{l:"Today",v:fmt(totalToday)},{l:"Sessions",v:sessions.length},{l:"Streak",v:`${Math.min(sessions.length,7)}d`}].map(({l,v}) => (
                <div key={l} style={{ background:"rgba(255,255,255,0.04)",borderRadius:14,padding:12,textAlign:"center" }}>
                  <div style={{ fontSize:20,fontWeight:500,fontVariantNumeric:"tabular-nums" }}>{v}</div>
                  <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"rgba(255,255,255,0.03)",border:"0.5px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"12px 14px",marginBottom:"1rem" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                <span style={{ fontSize:12,color:"#64748b" }}>Daily goal</span>
                <span style={{ fontSize:12,color:"#64748b" }}>{totalMins} / {DAILY_GOAL_MIN} min</span>
              </div>
              <div style={{ height:6,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden" }}>
                <div style={{ height:"100%",background:"linear-gradient(90deg,#f43f5e,#fb7185)",borderRadius:3,width:`${pct}%`,transition:"width 0.5s" }} />
              </div>
              <div style={{ fontSize:11,color:"#334155",marginTop:6,textAlign:"center" }}>{pct}% complete</div>
            </div>
            <div style={{ fontSize:11,color:"#475569",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8 }}>Session history</div>
            {sessions.length===0
              ? <p style={{ fontSize:13,color:"#334155",textAlign:"center",padding:"1.5rem 0" }}>No sessions yet — start your first one!</p>
              : sessions.slice(0,6).map((s,i) => (
                <div key={i} style={{ display:"flex",alignItems:"center",background:"rgba(255,255,255,0.03)",borderRadius:12,padding:"10px 12px",marginBottom:6 }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,color:"#cbd5e1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.goal}</div>
                    <div style={{ fontSize:11,color:"#334155",marginTop:2 }}>{timeAgo(s.date)}</div>
                  </div>
                  <div style={{ fontSize:14,fontWeight:500,color:"#f43f5e",fontVariantNumeric:"tabular-nums",marginLeft:12,flexShrink:0 }}>{fmt(s.duration)}</div>
                </div>
              ))
            }
          </>}

          {/* ══ MESSAGES VIEW ══ */}
          {view==="msgs" && <>
            <LovePanel onSend={sendMsg} lastSent={lastSent} />
            <div style={{ fontSize:11,color:"#475569",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8 }}>Message history</div>
            <div style={{ maxHeight:320,overflowY:"auto",paddingRight:2 }}>
              {msgHistory.length===0
                ? <p style={{ fontSize:13,color:"#334155",textAlign:"center",padding:"2rem 0" }}>No messages yet — send the first one! 💌</p>
                : msgHistory.map((m, i) => {
                  const isMe = m.from==="me" || m.from===MY_ID;
                  return (
                    <div key={m.id||i} style={{ display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",marginBottom:10 }}>
                      <div style={{
                        maxWidth:"78%",borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px",
                        padding:"10px 14px",
                        background:isMe?"rgba(244,63,94,0.15)":"rgba(255,255,255,0.06)",
                        border:isMe?"0.5px solid rgba(244,63,94,0.3)":"0.5px solid rgba(255,255,255,0.08)",
                      }}>
                        <div style={{ fontSize:14,color:"#e2e8f0",lineHeight:1.4 }}>{m.text}</div>
                      </div>
                      <div style={{ fontSize:10,color:"#334155",marginTop:3,marginLeft:4,marginRight:4 }}>
                        {isMe ? "you" : PARTNER_NAME} · {timeAgo(m.sentAt)}
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </>}

        </div>
      </div>
    </>
  );
}