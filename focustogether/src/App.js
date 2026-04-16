import { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, set, onValue } from "firebase/database";

function App() {
  const [running, setRunning] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState("offline");

  const userId = "user1";     // YOU
  const partnerId = "user2";  // HER

  // 🔄 Listen to partner
  useEffect(() => {
    const partnerRef = ref(db, "users/" + partnerId);

    onValue(partnerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPartnerStatus(data.status);
      }
    });
  }, []);

  // ▶️ Start studying
  const startSession = () => {
    setRunning(true);

    set(ref(db, "users/" + userId), {
      status: "studying"
    });
  };

  // ☕ Take break
  const takeBreak = () => {
    setRunning(false);

    set(ref(db, "users/" + userId), {
      status: "break"
    });
  };

  return (
    <div style={{
      height: "100vh",
      background: "linear-gradient(135deg, #0f172a, #1e293b)",
      color: "white",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif"
    }}>

      <h1>❤️ FocusTogether</h1>

      {/* 👩 Partner */}
      <p>
        👩 She is {partnerStatus === "studying" ? "studying 🟢" :
                  partnerStatus === "break" ? "on break ☕" : "offline ⚫"}
      </p>

      {/* 👨 You */}
      <p>
        👨 You are {running ? "studying 🟢" : "on break ☕"}
      </p>

      <div>
        <button onClick={startSession} style={btnStyle}>Start</button>
        <button onClick={takeBreak} style={btnStyle}>Break</button>
      </div>

      <p style={{ marginTop: "20px", opacity: 0.7 }}>
        "Focus now… I’ll distract you later 😏"
      </p>

    </div>
  );
}

const btnStyle = {
  margin: "10px",
  padding: "10px 20px",
  borderRadius: "12px",
  border: "none",
  background: "#e11d48",
  color: "white",
  cursor: "pointer"
};

export default App;