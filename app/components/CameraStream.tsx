"use client";

import React, { useState, useEffect } from "react";
import { useLAN } from "./LANProvider";

interface CameraStreamProps {
  topic?: string;
}

export default function CameraStream({ topic = "/camera/camera/color/image_raw" }: CameraStreamProps) {
  const { isLanMode, lanIp } = useLAN();
  const [isPlaying, setIsPlaying] = useState(true);
  const [streamUrl, setStreamUrl] = useState("");
  const [cacheBuster, setCacheBuster] = useState(Date.now());

  // Determine base URL depending on LAN mode
  const baseUrl = isLanMode && lanIp
    ? `http://${lanIp}:8081`
    : process.env.NEXT_PUBLIC_CAMERA_STREAM_REMOTE;

  useEffect(() => {
    if (!baseUrl || !isPlaying) {
      setStreamUrl("");
      return;
    }

    // Append a timestamp to force the browser to reload the image tag
    const url = `${baseUrl}/stream?topic=${topic}&quality=70&width=640&height=480&t=${cacheBuster}`;
    setStreamUrl(url);
  }, [baseUrl, topic, isPlaying, cacheBuster]);

  const toggleStream = () => {
    if (!isPlaying) {
      setCacheBuster(Date.now()); // force reload when resuming
    }
    setIsPlaying(!isPlaying);
  };

  if (!baseUrl) {
    return (
      <div style={{
        width: "100%", height: "300px",
        background: "rgba(0,0,0,0.5)", border: "1px dashed rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,0.4)", borderRadius: "12px"
      }}>
        Camera Stream Not Configured
      </div>
    );
  }

  return (
    <div style={{
      position: "relative",
      width: "100%",
      background: "#000",
      borderRadius: "12px",
      overflow: "hidden",
      border: "1px solid rgba(155, 89, 182, 0.2)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    }}>
      {/* Top Overlay Bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)",
        padding: "10px 14px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1rem" }}>📷</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
            {topic}
          </span>
          {isLanMode && (
            <span style={{
              background: "rgba(0, 230, 118, 0.2)", color: "#00e676",
              padding: "2px 6px", borderRadius: "4px", fontSize: "0.6rem", fontWeight: 700
            }}>
              LAN
            </span>
          )}
        </div>
        
        <button
          onClick={toggleStream}
          style={{
            background: isPlaying ? "rgba(255, 23, 68, 0.2)" : "rgba(0, 230, 118, 0.2)",
            border: isPlaying ? "1px solid rgba(255, 23, 68, 0.4)" : "1px solid rgba(0, 230, 118, 0.4)",
            color: isPlaying ? "#ff5252" : "#00e676",
            padding: "4px 10px", borderRadius: "6px",
            fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
            backdropFilter: "blur(4px)",
          }}
        >
          {isPlaying ? "⏹ Stop" : "▶ Resume"}
        </button>
      </div>

      {/* Stream Image */}
      <div style={{ width: "100%", minHeight: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {streamUrl ? (
          <img
            src={streamUrl}
            alt="Robot Camera Stream"
            style={{ width: "100%", height: "auto", display: "block" }}
            onError={(e) => {
              // Hide broken image icon on error
              e.currentTarget.style.display = 'none';
            }}
            onLoad={(e) => {
              e.currentTarget.style.display = 'block';
            }}
          />
        ) : (
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textAlign: "center" }}>
            {isPlaying ? "Connecting to stream..." : "Stream Paused"}
          </div>
        )}
      </div>
    </div>
  );
}
