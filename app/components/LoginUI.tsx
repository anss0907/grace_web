"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthProvider";

/**
 * A compact admin login/logout button that lives in the navbar.
 * When not authenticated: shows a small "Admin" button that opens a login modal.
 * When authenticated: shows the username + a logout button.
 */
export default function LoginUI() {
  const { isAuthenticated, user, loading, login, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  /* Close modal on outside click */
  useEffect(() => {
    if (!showModal) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowModal(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showModal]);

  /* Close on Escape */
  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModal(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const err = await login(username, password);
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      setShowModal(false);
      setUsername("");
      setPassword("");
    }
  };

  if (loading) return null;

  return (
    <>
      {/* ── Navbar button ── */}
      {isAuthenticated ? (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          marginLeft: "auto",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "4px 12px", borderRadius: "20px",
            background: "rgba(0, 230, 118, 0.08)",
            border: "1px solid rgba(0, 230, 118, 0.2)",
          }}>
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: "#00e676",
              boxShadow: "0 0 6px #00e676",
            }} />
            <span style={{
              fontSize: "0.72rem", fontWeight: 600,
              color: "#00e676", letterSpacing: "0.02em",
            }}>
              {user}
            </span>
          </div>
          <button
            onClick={logout}
            style={{
              padding: "4px 10px", borderRadius: "8px",
              border: "1px solid rgba(255, 23, 68, 0.2)",
              background: "rgba(255, 23, 68, 0.06)",
              color: "#ff5252", fontSize: "0.68rem",
              fontWeight: 500, cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 23, 68, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 23, 68, 0.06)";
            }}
          >
            Logout
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          style={{
            marginLeft: "auto",
            padding: "5px 14px", borderRadius: "8px",
            border: "1px solid rgba(155, 89, 182, 0.2)",
            background: "rgba(155, 89, 182, 0.08)",
            color: "#c084fc", fontSize: "0.72rem",
            fontWeight: 600, cursor: "pointer",
            transition: "all 0.2s",
            letterSpacing: "0.03em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(155, 89, 182, 0.18)";
            e.currentTarget.style.boxShadow = "0 0 12px rgba(155, 89, 182, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(155, 89, 182, 0.08)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          🔒 Admin
        </button>
      )}

      {/* ── Login Modal ── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)",
          animation: "fadeIn 0.2s ease",
        }}>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .login-input:focus { border-color: rgba(155, 89, 182, 0.5) !important; outline: none; box-shadow: 0 0 0 3px rgba(155, 89, 182, 0.1); }
          `}</style>
          <div
            ref={modalRef}
            style={{
              width: "360px", maxWidth: "90vw",
              background: "linear-gradient(180deg, rgba(20, 15, 35, 0.98), rgba(10, 8, 20, 0.98))",
              border: "1px solid rgba(155, 89, 182, 0.15)",
              borderRadius: "20px", padding: "32px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(155, 89, 182, 0.05)",
              animation: "slideUp 0.3s ease",
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div style={{
                width: "56px", height: "56px", margin: "0 auto 16px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, rgba(155, 89, 182, 0.2), rgba(183, 110, 121, 0.2))",
                border: "1px solid rgba(155, 89, 182, 0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.5rem",
              }}>
                🔐
              </div>
              <h2 style={{
                margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 700,
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Admin Access
              </h2>
              <p style={{
                margin: 0, fontSize: "0.75rem",
                color: "rgba(255,255,255,0.35)",
              }}>
                Sign in to control the robot
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block", fontSize: "0.7rem", fontWeight: 600,
                  color: "rgba(255,255,255,0.4)", marginBottom: "6px",
                  letterSpacing: "0.05em", textTransform: "uppercase",
                }}>
                  Username
                </label>
                <input
                  className="login-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  autoComplete="username"
                  placeholder="Enter username"
                  style={{
                    width: "100%", padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(155, 89, 182, 0.15)",
                    background: "rgba(255, 255, 255, 0.03)",
                    color: "#e0e0e0", fontSize: "0.85rem",
                    fontFamily: "'JetBrains Mono', monospace",
                    transition: "all 0.2s",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block", fontSize: "0.7rem", fontWeight: 600,
                  color: "rgba(255,255,255,0.4)", marginBottom: "6px",
                  letterSpacing: "0.05em", textTransform: "uppercase",
                }}>
                  Password
                </label>
                <input
                  className="login-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  style={{
                    width: "100%", padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(155, 89, 182, 0.15)",
                    background: "rgba(255, 255, 255, 0.03)",
                    color: "#e0e0e0", fontSize: "0.85rem",
                    fontFamily: "'JetBrains Mono', monospace",
                    transition: "all 0.2s",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: "8px 12px", borderRadius: "8px",
                  background: "rgba(255, 23, 68, 0.08)",
                  border: "1px solid rgba(255, 23, 68, 0.2)",
                  color: "#ff5252", fontSize: "0.75rem",
                  marginBottom: "16px", textAlign: "center",
                }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !username || !password}
                style={{
                  width: "100%", padding: "11px",
                  borderRadius: "10px", border: "none",
                  background: submitting || !username || !password
                    ? "rgba(155, 89, 182, 0.15)"
                    : "linear-gradient(135deg, var(--primary), var(--secondary))",
                  color: submitting || !username || !password
                    ? "rgba(255,255,255,0.3)" : "#fff",
                  fontSize: "0.85rem", fontWeight: 600,
                  cursor: submitting || !username || !password
                    ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  letterSpacing: "0.02em",
                }}
              >
                {submitting ? "Signing in…" : "Sign In"}
              </button>
            </form>

            {/* Close */}
            <button
              onClick={() => setShowModal(false)}
              style={{
                display: "block", margin: "16px auto 0",
                background: "none", border: "none",
                color: "rgba(255,255,255,0.25)", fontSize: "0.72rem",
                cursor: "pointer", transition: "color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.25)";
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
