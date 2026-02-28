"use client";

import { useEffect, useState, useRef } from "react";
import { useROS } from "../lib/useROS";
import * as ROSLIB from "roslib";

export default function TelemetryPage() {
    const { ros, status } = useROS();
    const [lastMessage, setLastMessage] = useState<string | null>(null);
    const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);
    const [msgCount, setMsgCount] = useState(0);
    const listenerRef = useRef<ROSLIB.Topic<unknown> | null>(null);

    // Publisher state
    const [publishInput, setPublishInput] = useState("");
    const [publishCount, setPublishCount] = useState(0);
    const [lastPublished, setLastPublished] = useState<string | null>(null);

    useEffect(() => {
        if (!ros || status !== "connected") return;

        const topic = new ROSLIB.Topic({
            ros,
            name: "/chatter",
            messageType: "std_msgs/msg/String",
        });

        topic.subscribe((message) => {
            setLastMessage((message as { data: string }).data);
            setLastTimestamp(new Date().toLocaleTimeString());
            setMsgCount((prev) => prev + 1);
        });

        listenerRef.current = topic;

        return () => {
            topic.unsubscribe();
            listenerRef.current = null;
        };
    }, [ros, status]);

    function handlePublish() {
        if (!ros || status !== "connected" || !publishInput.trim()) return;

        const topic = new ROSLIB.Topic({
            ros,
            name: "/web_cmd",
            messageType: "std_msgs/msg/String",
        });

        topic.publish({ data: publishInput.trim() });

        setLastPublished(publishInput.trim());
        setPublishCount((prev) => prev + 1);
        setPublishInput("");
    }

    return (
        <main className="page-container" style={{ minHeight: "100vh", paddingTop: "120px" }}>
            <section className="content-section" style={{ maxWidth: "800px", margin: "0 auto" }}>
                {/* Page header */}
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                    <h1 className="section-title gradient-text">Telemetry</h1>
                    <p className="section-subtitle" style={{ opacity: 0.7 }}>
                        Live ROS 2 message stream
                    </p>
                </div>

                {/* Connection status */}
                <div className="glass-card" style={{ padding: "1.5rem 2rem", marginBottom: "2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div
                                style={{
                                    width: "12px",
                                    height: "12px",
                                    borderRadius: "50%",
                                    backgroundColor:
                                        status === "connected"
                                            ? "#00e676"
                                            : status === "connecting"
                                                ? "#ffab00"
                                                : "#ff1744",
                                    boxShadow:
                                        status === "connected"
                                            ? "0 0 12px #00e676"
                                            : status === "connecting"
                                                ? "0 0 12px #ffab00"
                                                : "0 0 12px #ff1744",
                                    transition: "all 0.3s ease",
                                }}
                            />
                            <span style={{ fontWeight: 600, fontSize: "1.05rem" }}>
                                rosbridge
                            </span>
                        </div>
                        <span
                            style={{
                                fontSize: "0.85rem",
                                padding: "4px 14px",
                                borderRadius: "20px",
                                backgroundColor:
                                    status === "connected"
                                        ? "rgba(0, 230, 118, 0.15)"
                                        : status === "connecting"
                                            ? "rgba(255, 171, 0, 0.15)"
                                            : "rgba(255, 23, 68, 0.15)",
                                color:
                                    status === "connected"
                                        ? "#00e676"
                                        : status === "connecting"
                                            ? "#ffab00"
                                            : "#ff1744",
                                fontWeight: 500,
                            }}
                        >
                            {status === "connected"
                                ? "Connected"
                                : status === "connecting"
                                    ? "Connecting…"
                                    : "Disconnected"}
                        </span>
                    </div>
                    <div style={{ marginTop: "8px", fontSize: "0.8rem", opacity: 0.5 }}>
                        ws://localhost:9090
                    </div>
                </div>

                {/* ========== SUBSCRIBER SECTION ========== */}
                <div className="glass-card" style={{ padding: "1.5rem 2rem", marginBottom: "2rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                            <span style={{ opacity: 0.5, fontWeight: 400 }}>⬇ Listening:</span>{" "}
                            <code style={{
                                color: "var(--primary)",
                                backgroundColor: "rgba(155, 89, 182, 0.1)",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "0.95rem",
                            }}>
                                /chatter
                            </code>
                        </h3>
                        <span style={{ fontSize: "0.8rem", opacity: 0.5 }}>
                            {msgCount} received
                        </span>
                    </div>

                    {lastMessage !== null ? (
                        <div
                            style={{
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                fontSize: "1.4rem",
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                padding: "1rem",
                                backgroundColor: "rgba(155, 89, 182, 0.06)",
                                borderRadius: "12px",
                                borderLeft: "3px solid var(--primary)",
                                wordBreak: "break-word",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span>{lastMessage}</span>
                                {lastTimestamp && (
                                    <span style={{ fontSize: "0.7rem", opacity: 0.35, fontWeight: 400 }}>
                                        {lastTimestamp}
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: "center", padding: "1.5rem", opacity: 0.3, fontSize: "0.9rem" }}>
                            {status === "connected"
                                ? "Waiting for messages on /chatter…"
                                : "Connect to rosbridge to receive messages"}
                        </div>
                    )}
                </div>

                {/* ========== PUBLISHER SECTION ========== */}
                <div className="glass-card" style={{ padding: "1.5rem 2rem", marginBottom: "2rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                            <span style={{ opacity: 0.5, fontWeight: 400 }}>⬆ Publishing:</span>{" "}
                            <code style={{
                                color: "#00e676",
                                backgroundColor: "rgba(0, 230, 118, 0.1)",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "0.95rem",
                            }}>
                                /web_cmd
                            </code>
                        </h3>
                        <span style={{ fontSize: "0.8rem", opacity: 0.5 }}>
                            {publishCount} sent
                        </span>
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginBottom: lastPublished ? "12px" : 0 }}>
                        <input
                            type="text"
                            value={publishInput}
                            onChange={(e) => setPublishInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handlePublish()}
                            placeholder={status === "connected" ? "Type a message to publish…" : "Connect to rosbridge first"}
                            disabled={status !== "connected"}
                            style={{
                                flex: 1,
                                padding: "12px 16px",
                                borderRadius: "12px",
                                border: "1px solid rgba(155, 89, 182, 0.2)",
                                backgroundColor: "rgba(255, 255, 255, 0.03)",
                                color: "var(--text-primary)",
                                fontSize: "0.95rem",
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                outline: "none",
                                transition: "border-color 0.2s ease",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(155, 89, 182, 0.2)")}
                        />
                        <button
                            onClick={handlePublish}
                            disabled={status !== "connected" || !publishInput.trim()}
                            style={{
                                padding: "12px 24px",
                                borderRadius: "12px",
                                border: "none",
                                background: status === "connected" && publishInput.trim()
                                    ? "linear-gradient(135deg, var(--primary), var(--secondary))"
                                    : "rgba(155, 89, 182, 0.15)",
                                color: status === "connected" && publishInput.trim()
                                    ? "#fff"
                                    : "rgba(255,255,255,0.3)",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                cursor: status === "connected" && publishInput.trim() ? "pointer" : "not-allowed",
                                transition: "all 0.2s ease",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Send →
                        </button>
                    </div>

                    {lastPublished && (
                        <div style={{
                            fontSize: "0.8rem",
                            opacity: 0.4,
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        }}>
                            Last sent: &quot;{lastPublished}&quot;
                        </div>
                    )}
                </div>

                {/* Instructions */}
                <div style={{
                    marginTop: "2rem",
                    padding: "1.5rem 2rem",
                    borderRadius: "16px",
                    backgroundColor: "rgba(155, 89, 182, 0.05)",
                    border: "1px solid rgba(155, 89, 182, 0.1)",
                    fontSize: "0.8rem",
                    opacity: 0.6,
                    lineHeight: 1.8,
                }}>
                    <strong style={{ opacity: 1 }}>Quick Start:</strong>
                    <br />
                    <code>ros2 launch rosbridge_server rosbridge_websocket_launch.xml</code>
                    <br />
                    <span style={{ opacity: 0.7 }}>Subscribe (CLI → Web):</span>{" "}
                    <code>ros2 topic pub /chatter std_msgs/msg/String &quot;data: hello&quot; --rate 1</code>
                    <br />
                    <span style={{ opacity: 0.7 }}>Publish (Web → CLI):</span>{" "}
                    <code>ros2 topic echo /web_cmd</code>
                </div>
            </section>
        </main>
    );
}

