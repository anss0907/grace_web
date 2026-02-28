"use client";

import { useROS } from "../lib/useROS";
import MapCanvas from "../components/MapCanvas";

export default function MapPage() {
    const { ros, status } = useROS();

    return (
        <main style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Top bar */}
            <div style={{
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "rgba(15, 10, 25, 0.95)",
                borderBottom: "1px solid rgba(155, 89, 182, 0.15)",
                zIndex: 10,
                marginTop: "70px",
            }}>
                <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>
                    <span className="gradient-text">Map Viewer</span>
                </h1>
                <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    backgroundColor: status === "connected" ? "#00e676" : "#ff1744",
                    boxShadow: `0 0 8px ${status === "connected" ? "#00e676" : "#ff1744"}`,
                }} />
                <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
                    {status === "connected" ? "rosbridge connected" : "disconnected"}
                </span>
            </div>

            {/* Full-screen map canvas */}
            <div style={{ flex: 1, overflow: "hidden" }}>
                <MapCanvas
                    ros={ros}
                    status={status}
                    enableNavGoal={true}
                    showTFLabels={true}
                    showLegend={true}
                />
            </div>
        </main>
    );
}
