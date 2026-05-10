// src/index.js
// ─────────────────────────────────────────────────────────────────────────────
// React 18 entry point with:
//   - Error boundary (catches any component crash gracefully)
//   - StrictMode (dev-only double invoke — seedFirebase guard handles this)
//   - IBM Plex Sans font preload
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[PulseCart] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const T = {
      bg: "#F7F8FC", panel: "#FFFFFF", border: "#E2E8F4",
      text: "#111827", muted: "#6B7A99", brand: "#D64E12",
    };

    return (
      <div style={{
        minHeight: "100vh", background: T.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", padding: 24,
      }}>
        <div style={{
          background: T.panel, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: "36px 40px", maxWidth: 480, width: "100%",
          boxShadow: "0 4px 24px #0000000F",
        }}>
          {/* Logo */}
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg,#D64E12,#E8920A)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 20,
          }}>P</div>

          <div style={{ fontSize: 11, color: T.brand, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 10, letterSpacing: "-0.02em" }}>
            PulseCart hit an error
          </div>
          <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, marginBottom: 24 }}>
            An unexpected error occurred. This is usually caused by an API connectivity issue or a stale cache. Try refreshing the page.
          </div>

          {/* Error detail */}
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA",
            borderRadius: 8, padding: "10px 14px", marginBottom: 24,
            fontSize: 11, color: "#991B1B", fontFamily: "monospace",
            wordBreak: "break-word",
          }}>
            {this.state.error?.message || "Unknown error"}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                flex: 1, background: "#D64E12", border: "none", borderRadius: 8,
                padding: "10px 16px", color: "#fff", fontWeight: 600, fontSize: 13,
                cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              Reload page
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                flex: 1, background: "#F7F8FC", border: "1px solid #E2E8F4",
                borderRadius: 8, padding: "10px 16px", color: "#6B7A99",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const container = document.getElementById("root");
if (!container) throw new Error("[PulseCart] #root element not found in DOM");

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
