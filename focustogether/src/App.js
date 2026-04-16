import { useState, useEffect, useRef } from "react";
import { db } from "./firebase"; // 👈 your firebase.js file
import { ref, set, onValue } from "firebase/database";

// ─────────────────────────────────────────
// CONFIG — change these two lines only
const MY_ID = "user1";       // your ID
const PARTNER_ID = "user2";  // partner's ID
// ─────────────────────────────────────────

const DAILY_GOAL_MINUTES = 120;

const QUOTES = [
  "Focus now… I'll distract you later.",
  "You've got this. Eyes on the goal.",
  "One hour at a time.",
  "Proud of you for starting.",
  "Distance means nothing when purpose is shared.",
  "Same sky, same focus, same heart.",
];

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── STATUS DOT ───────────────────────────
function StatusDot({ status }) {
  const color =
    status === "studying" ? "#4ade80"
    : status === "break"  ? "#fbbf24"
    : "#6b7280";
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8,
      borderRadius: "50%", background: color,
      boxShadow: status === "studying" ? `0 0 6px ${color}` : "none",
      transition: "background 0.4s",
    }} />
  );
}

// ─── TIMER CARD ───────────────────────────
function TimerCard({ label, time, status, goal }) {
  return (
    <div style={styles.timerCard}>
      <div style={styles.timerLabel}>
        <StatusDot status={status} />
        <span style={{ marginLeft: 6, fontSize: 12, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={styles.timerDisplay}>{fmt(time)}</div>
      <div style={styles.timerGoal}>{goal || "No goal set"}</div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────
export default function App() {
  const [view, setView]                 = useState("timer"); // "timer" | "stats"
  const [running, setRunning]           = useState(false);
  const [onBreak, setOnBreak]           = useState(false);
  const [myTime, setMyTime]             = useState(0);
  const [partnerTime, setPartnerTime]   = useState(0);
  const [partnerStatus, setPartnerStatus] = useState("offline");
  const [goal, setGoal]                 = useState("");
  const [partnerGoal, setPartnerGoal]   = useState("");
  const [soundOn, setSoundOn]           = useState(false);
  const [sessions, setSessions]         = useState([]);
  const [totalToday, setTotalToday]     = useState(0);
  const [quote, setQuote]               = useState(QUOTES[0]);
  const [sessionMsg, setSessionMsg]     = useState("Ready to focus?");

  const intervalRef  = useRef(null);
  const audioCtxRef  = useRef(null);
  const gainRef      = useRef(null);

  // ── Listen to partner on Firebase ──────
  useEffect(() => {
    const partnerRef = ref(db, "users/" + PARTNER_ID);
    const unsub = onValue(partnerRef, (snap) => {
      const data = snap.val();
      if (data) {
        setPartnerStatus(data.status || "offline");
        setPartnerTime(data.time     || 0);
        setPartnerGoal(data.goal     || "");
      }
    });
    return () => unsub();
  }, []);

  // ── Push my state to Firebase every second ──
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (running) {
      intervalRef.current = setInterval(() => {
        setMyTime((prev) => {
          const next = prev + 1;
          set(ref(db, "users/" + MY_ID), {
            status: "studying",
            time: next,
            goal,
          });
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, goal]);

  // ── ACTIONS ────────────────────────────
  function startSession() {
    setRunning(true);
    setOnBreak(false);
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    setSessionMsg("Session in progress");
    set(ref(db, "users/" + MY_ID), { status: "studying", time: myTime, goal });
  }

  function takeBreak() {
    setRunning(false);
    setOnBreak(true);
    clearInterval(intervalRef.current);
    setSessionMsg("On a break — recharge!");
    set(ref(db, "users/" + MY_ID), { status: "break", time: myTime, goal });
  }

  function endSession() {
    clearInterval(intervalRef.current);
    if (myTime > 5) {
      const newSession = { duration: myTime, goal: goal || "No goal", date: new Date().toISOString() };
      setSessions((prev) => [newSession, ...prev]);
      setTotalToday((prev) => prev + myTime);
    }
    setRunning(false);
    setOnBreak(false);
    setMyTime(0);
    setSessionMsg("Session ended — great work!");
    set(ref(db, "users/" + MY_ID), { status: "offline", time: 0, goal });
  }

  // ── AMBIENT SOUND ──────────────────────
  function toggleSound() {
    if (!soundOn) {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const gain = ctx.createGain();
      gain.gain.value = 0.25;
      gain.connect(ctx.destination);

      // Pink-ish noise
      const bufferSize = 4096;
      const node = ctx.createScriptProcessor(bufferSize, 1, 1);
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      node.onaudioprocess = (e) => {
        const out = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const w = Math.random() * 2 - 1;
          b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
          b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
          b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
          out[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;
          b6=w*0.115926;
        }
      };
      node.connect(gain);
      audioCtxRef.current = ctx;
      gainRef.current     = node;
      setSoundOn(true);
    } else {
      gainRef.current?.disconnect();
      audioCtxRef.current?.close();
      setSoundOn(false);
    }
  }

  // ── STATS ──────────────────────────────
  const totalMins  = Math.floor(totalToday / 60);
  const progressPct = Math.min(100, Math.round((totalMins / DAILY_GOAL_MINUTES) * 100));
  const myStatus   = running ? "studying" : onBreak ? "break" : "offline";

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>
            <span style={styles.logoDot} />
            <span style={styles.logoText}>FocusTogether</span>
            <span style={styles.logoDot} />
          </div>
          <p style={styles.sessionMsg}>{sessionMsg}</p>
        </div>

        {/* View tabs */}
        <div style={styles.tabs}>
          {["timer", "stats"].map((v) => (
            <button key={v} style={{ ...styles.tab, ...(view === v ? styles.tabActive : {}) }} onClick={() => setView(v)}>
              {v === "timer" ? "Timer" : "Stats"}
            </button>
          ))}
        </div>

        {/* ── TIMER VIEW ── */}
        {view === "timer" && (
          <>
            {/* Two timers */}
            <div style={styles.timerRow}>
              <TimerCard label="You" time={myTime} status={myStatus} goal={goal} />
              <TimerCard label="Partner" time={partnerTime} status={partnerStatus} goal={partnerGoal} />
            </div>

            {/* Goal input */}
            <div style={styles.goalSection}>
              <label style={styles.goalLabel}>Your session goal</label>
              <input
                style={styles.goalInput}
                placeholder="e.g. Finish chapter 3..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            {/* Buttons */}
            <div style={styles.btnGrid}>
              {!running && (
                <button style={{ ...styles.btn, ...styles.btnPrimary, gridColumn: "1 / -1" }} onClick={startSession}>
                  {onBreak ? "Resume session" : "Start session"}
                </button>
              )}
              {running && (
                <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={takeBreak}>
                  Take a break
                </button>
              )}
              {(running || onBreak) && (
                <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={endSession}>
                  End session
                </button>
              )}
            </div>

            {/* Sound toggle */}
            <div style={styles.soundRow}>
              <span style={styles.soundLabel}>Ambient focus sounds</span>
              <div style={{ ...styles.toggle, ...(soundOn ? styles.toggleOn : {}) }} onClick={toggleSound}>
                <div style={{ ...styles.toggleThumb, transform: soundOn ? "translateX(16px)" : "none" }} />
              </div>
            </div>
          </>
        )}

        {/* ── STATS VIEW ── */}
        {view === "stats" && (
          <>
            <div style={styles.statsGrid}>
              {[
                { label: "Today",    value: fmt(totalToday)    },
                { label: "Sessions", value: sessions.length    },
                { label: "Streak",   value: `${Math.min(sessions.length, 7)}d` },
              ].map(({ label, value }) => (
                <div key={label} style={styles.statCard}>
                  <div style={styles.statValue}>{value}</div>
                  <div style={styles.statLabel}>{label}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={styles.progressCard}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Daily goal</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{totalMins} / {DAILY_GOAL_MINUTES} min</span>
              </div>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
              </div>
            </div>

            {/* Session history */}
            <div style={styles.historyTitle}>Recent sessions</div>
            {sessions.length === 0 && (
              <p style={{ fontSize: 13, color: "#475569", textAlign: "center", padding: "1rem 0" }}>
                No sessions yet — start your first one!
              </p>
            )}
            {sessions.slice(0, 5).map((s, i) => (
              <div key={i} style={styles.sessionRow}>
                <span style={styles.sessionGoal}>{s.goal}</span>
                <span style={styles.sessionDur}>{fmt(s.duration)}</span>
              </div>
            ))}
          </>
        )}

        {/* Footer */}
        <div style={styles.divider} />
        <p style={styles.quote}>"{quote}"</p>
        <p style={styles.sig}>Made with ❤️ by Harsh — for us</p>

      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
    background: "linear-gradient(135deg, #020617 0%, #0f172a 60%, #1e0a1e 100%)",
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    background: "rgba(15,23,42,0.85)",
    backdropFilter: "blur(24px)",
    border: "0.5px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: "2rem",
    color: "white",
    boxShadow: "0 0 60px rgba(212,83,126,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  header:     { textAlign: "center", marginBottom: "1.5rem" },
  logo:       { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 },
  logoDot:    { display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#f43f5e" },
  logoText:   { fontSize: 20, fontWeight: 600, color: "white", letterSpacing: "0.02em" },
  sessionMsg: { fontSize: 13, color: "#64748b" },

  tabs:       { display: "flex", gap: 6, justifyContent: "center", marginBottom: "1.5rem" },
  tab:        { fontSize: 12, padding: "4px 16px", borderRadius: 20, border: "0.5px solid rgba(255,255,255,0.1)", background: "transparent", cursor: "pointer", color: "#64748b", fontFamily: "inherit", transition: "all 0.2s" },
  tabActive:  { background: "rgba(244,63,94,0.15)", color: "#f43f5e", borderColor: "rgba(244,63,94,0.4)" },

  timerRow:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.25rem" },
  timerCard:  { background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1rem" },
  timerLabel: { display: "flex", alignItems: "center", marginBottom: 8 },
  timerDisplay: { fontSize: 32, fontWeight: 600, letterSpacing: 1, fontVariantNumeric: "tabular-nums", marginBottom: 4 },
  timerGoal:  { fontSize: 11, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  goalSection: { marginBottom: "1.25rem" },
  goalLabel:   { fontSize: 13, color: "#64748b", marginBottom: 6, display: "block" },
  goalInput:   { width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: 12, border: "0.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "white", outline: "none", fontFamily: "inherit", boxSizing: "border-box" },

  btnGrid:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "1.25rem" },
  btn:        { padding: "11px 0", fontSize: 14, fontWeight: 500, borderRadius: 12, cursor: "pointer", border: "none", fontFamily: "inherit", transition: "opacity 0.15s, transform 0.1s" },
  btnPrimary:  { background: "linear-gradient(135deg, #f43f5e, #e11d48)", color: "white" },
  btnSecondary: { background: "rgba(255,255,255,0.06)", color: "#cbd5e1", border: "0.5px solid rgba(255,255,255,0.08)" },

  soundRow:   { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 12, marginBottom: "1.25rem" },
  soundLabel: { fontSize: 13, color: "#64748b" },
  toggle:     { width: 36, height: 20, borderRadius: 10, background: "rgba(255,255,255,0.15)", cursor: "pointer", position: "relative", transition: "background 0.2s" },
  toggleOn:   { background: "#f43f5e" },
  toggleThumb: { position: "absolute", top: 3, left: 3, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "transform 0.2s" },

  statsGrid:  { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: "1.25rem" },
  statCard:   { background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px", textAlign: "center" },
  statValue:  { fontSize: 20, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  statLabel:  { fontSize: 11, color: "#64748b", marginTop: 2 },

  progressCard:  { background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px", marginBottom: "1.25rem" },
  progressTrack: { height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" },
  progressFill:  { height: "100%", background: "linear-gradient(90deg, #f43f5e, #fb7185)", borderRadius: 3, transition: "width 0.5s" },

  historyTitle: { fontSize: 13, color: "#64748b", marginBottom: 8 },
  sessionRow:   { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 12px", marginBottom: 6 },
  sessionGoal:  { fontSize: 13, color: "#cbd5e1", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  sessionDur:   { fontSize: 12, color: "#64748b", marginLeft: 12, flexShrink: 0 },

  divider:    { height: "0.5px", background: "rgba(255,255,255,0.06)", margin: "1.25rem 0" },
  quote:      { textAlign: "center", fontSize: 13, color: "#475569", fontStyle: "italic", marginBottom: 8 },
  sig:        { textAlign: "center", fontSize: 11, color: "#334155" },
};
