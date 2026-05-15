import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

// ─── Animated background blobs ────────────────────────────────────────────────
const BLOBS_DARK = [
  { top: "-15%",  left: "-10%", size: 520, color: "rgba(214,78,18,0.18)",  dur: 8  },
  { top: "55%",   left: "70%",  size: 440, color: "rgba(255,107,53,0.14)", dur: 11 },
  { top: "30%",   left: "45%",  size: 360, color: "rgba(255,159,28,0.1)",  dur: 14 },
];

const BLOBS_LIGHT = [
  { top: "-15%",  left: "-10%", size: 520, color: "rgba(214,78,18,0.08)",  dur: 8  },
  { top: "55%",   left: "70%",  size: 440, color: "rgba(255,107,53,0.06)", dur: 11 },
  { top: "30%",   left: "45%",  size: 360, color: "rgba(255,159,28,0.05)", dur: 14 },
];

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState("owner");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Light mode login page to match default theme
  const isDark = false;
  const BLOBS = isDark ? BLOBS_DARK : BLOBS_LIGHT;

  // Theme-adaptive colors
  const C = isDark ? {
    bg:        "linear-gradient(135deg,#080C16 0%,#0D1728 50%,#080C16 100%)",
    cardBg:    "rgba(14,21,37,0.85)",
    cardBorder:"rgba(255,107,53,0.25)",
    cardShadow:"0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
    textPrimary:   "#E4ECF7",
    textSecondary: "#4E6080",
    inputBg:    "rgba(255,255,255,0.04)",
    inputBorder:"rgba(255,255,255,0.1)",
    roleBgActive:  "linear-gradient(135deg,rgba(255,107,53,0.2),rgba(255,159,28,0.1))",
    roleBgIdle:    "rgba(255,255,255,0.03)",
    roleBorderActive: "rgba(255,107,53,0.6)",
    roleBorderIdle:   "rgba(255,255,255,0.08)",
    demoBg:     "rgba(56,189,248,0.06)",
    demoBorder: "rgba(56,189,248,0.15)",
    demoLabel:  "#38BDF8",
  } : {
    bg:        "linear-gradient(135deg,#F0F4FF 0%,#E8EDFA 50%,#F0F4FF 100%)",
    cardBg:    "rgba(255,255,255,0.92)",
    cardBorder:"rgba(214,78,18,0.2)",
    cardShadow:"0 24px 80px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
    textPrimary:   "#0F172A",
    textSecondary: "#64748B",
    inputBg:    "rgba(0,0,0,0.03)",
    inputBorder:"rgba(0,0,0,0.1)",
    roleBgActive:  "linear-gradient(135deg,rgba(214,78,18,0.1),rgba(255,159,28,0.06))",
    roleBgIdle:    "rgba(0,0,0,0.02)",
    roleBorderActive: "rgba(214,78,18,0.5)",
    roleBorderIdle:   "rgba(0,0,0,0.08)",
    demoBg:     "rgba(2,132,199,0.06)",
    demoBorder: "rgba(2,132,199,0.15)",
    demoLabel:  "#0284C7",
  };

  // Pre-fill demo creds when role is selected
  const selectRole = (r) => {
    setRole(r);
    setUsername(r === "owner" ? "owner" : "staff");
    setPassword("pranjal@123");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", position: "relative", overflow: "hidden",
      background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'IBM Plex Sans','Segoe UI',sans-serif",
    }}>
      {/* Animated background blobs */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes blob{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(18px,-12px) scale(1.05)}66%{transform:translate(-10px,15px) scale(0.97)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .login-card{animation:fadeUp 0.6s ease both}
        .role-btn{transition:all 0.2s;cursor:pointer;border:none;font-family:inherit}
        .role-btn:hover{transform:translateY(-2px)}
        .login-input{transition:border-color 0.2s,box-shadow 0.2s}
        .login-input:focus{outline:none;border-color:#D64E12!important;box-shadow:0 0 0 3px rgba(214,78,18,0.12)!important}
        .login-btn{transition:all 0.2s;cursor:pointer;border:none;font-family:inherit}
        .login-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(214,78,18,0.3)!important}
        .login-btn:active:not(:disabled){transform:translateY(0)}
      `}</style>

      {/* Background blobs */}
      {BLOBS.map((b, i) => (
        <div key={i} style={{
          position: "absolute", top: b.top, left: b.left,
          width: b.size, height: b.size, borderRadius: "50%",
          background: `radial-gradient(circle,${b.color},transparent 70%)`,
          animation: `blob ${b.dur}s ease-in-out infinite`, pointerEvents: "none",
        }} />
      ))}

      {/* Card */}
      <div className="login-card" style={{
        position: "relative", width: 440, padding: "40px 36px",
        background: C.cardBg,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 20,
        backdropFilter: "blur(24px)",
        boxShadow: C.cardShadow,
      }}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 14px",
            background: "linear-gradient(135deg,#D64E12,#E8920A)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 700, color: "#fff",
            boxShadow: "0 8px 24px rgba(214,78,18,0.3)",
          }}>P</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.03em" }}>PulseCart</div>
          <div style={{ fontSize: 11, color: C.textSecondary, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 3 }}>
            Retail Intelligence Platform
          </div>
        </div>

        {/* Role selector */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: C.textSecondary, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
            Sign in as
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { r: "owner", label: "Owner Dashboard",  icon: "👤", desc: "Full analytics access" },
              { r: "staff", label: "Staff Dashboard",  icon: "👥", desc: "Inventory & orders" },
            ].map(({ r, label, icon, desc }) => (
              <button
                key={r} className="role-btn"
                onClick={() => selectRole(r)}
                style={{
                  padding: "14px 12px", borderRadius: 12, textAlign: "left",
                  background: role === r ? C.roleBgActive : C.roleBgIdle,
                  border: `1px solid ${role === r ? C.roleBorderActive : C.roleBorderIdle}`,
                  boxShadow: role === r ? "0 0 0 2px rgba(214,78,18,0.1)" : "none",
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: role === r ? "#D64E12" : C.textPrimary }}>{label}</div>
                <div style={{ fontSize: 10, color: C.textSecondary, marginTop: 2 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: C.textSecondary, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Username
            </label>
            <input
              className="login-input"
              type="text" value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="owner / staff"
              required
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10,
                background: C.inputBg,
                border: `1px solid ${C.inputBorder}`,
                color: C.textPrimary, fontSize: 13,
                fontFamily: "'IBM Plex Sans',sans-serif",
              }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: C.textSecondary, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Password
            </label>
            <input
              className="login-input"
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder=""
              autoComplete="new-password"
              required
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10,
                background: C.inputBg,
                border: `1px solid ${C.inputBorder}`,
                color: C.textPrimary, fontSize: 13,
                fontFamily: "'IBM Plex Sans',sans-serif",
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#DC2626", marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            className="login-btn"
            type="submit"
            disabled={loading}
            style={{
              width: "100%", marginTop: 8, padding: "13px",
              borderRadius: 12, fontWeight: 700, fontSize: 13, color: "#fff",
              background: loading ? "rgba(214,78,18,0.4)" : "linear-gradient(135deg,#D64E12,#E8920A)",
              boxShadow: "0 4px 16px rgba(214,78,18,0.25)",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        {/* Demo hint */}
        <div style={{ marginTop: 20, padding: "12px 14px", background: C.demoBg, borderRadius: 10, border: `1px solid ${C.demoBorder}` }}>
          <div style={{ fontSize: 10, color: C.demoLabel, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Demo Credentials</div>
          <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.7 }}>
            <span style={{ color: C.textPrimary }}>owner</span> / <span style={{ color: "#D64E12" }}>pranjal@123</span> — full analytics access<br />
            <span style={{ color: C.textPrimary }}>staff</span> / <span style={{ color: "#D64E12" }}>pranjal@123</span> — inventory &amp; orders only
          </div>
        </div>
      </div>
    </div>
  );
}
