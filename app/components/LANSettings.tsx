"use client";

import React from "react";
import { useAuth } from "./AuthProvider";
import { useLAN } from "./LANProvider";

export default function LANSettings() {
  const { isAuthenticated } = useAuth();
  const { lanIp, setLanIp, isLanMode, setIsLanMode } = useLAN();

  if (!isAuthenticated) {
    return null; // Hidden from non-admins
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      background: "rgba(10, 8, 20, 0.6)",
      padding: "4px 8px",
      borderRadius: "12px",
      border: "1px solid rgba(155, 89, 182, 0.15)",
    }}>
      <input
        type="text"
        placeholder="LAN IP (e.g. 192.168.1.100)"
        value={lanIp}
        onChange={(e) => setLanIp(e.target.value)}
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          color: "#fff",
          padding: "4px 8px",
          borderRadius: "6px",
          fontSize: "0.75rem",
          width: "140px",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      />
      
      <button
        onClick={() => setIsLanMode(!isLanMode)}
        disabled={!lanIp}
        style={{
          padding: "4px 10px",
          borderRadius: "6px",
          border: isLanMode ? "1px solid rgba(0, 230, 118, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
          background: isLanMode ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 255, 255, 0.05)",
          color: isLanMode ? "#00e676" : "#aaa",
          fontSize: "0.7rem",
          fontWeight: 600,
          cursor: lanIp ? "pointer" : "not-allowed",
          transition: "all 0.2s",
        }}
        title={isLanMode ? "Switch to Internet Mode" : "Connect to LAN"}
      >
        {isLanMode ? "LAN Mode Enabled" : "Connect LAN"}
      </button>
    </div>
  );
}
