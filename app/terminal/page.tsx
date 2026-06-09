"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRelay } from "../lib/useRelay";
import { useAuth } from "../components/AuthProvider";
import { useLAN } from "../components/LANProvider";
import type { PresetInfo } from "../lib/useRelay";
import "@xterm/xterm/css/xterm.css";

/* ── Types ────────────────────────────────────────── */
interface TerminalTab {
    id: string;
    label: string;
    preset: string | null;
    alive: boolean;
}

/* ── Helpers ──────────────────────────────────────── */
function uuid() {
    return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

function formatUptime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

/* ═══════════════════════════════════════════════════
   TERMINAL PAGE
   ═══════════════════════════════════════════════════ */
export default function TerminalPage() {
    const relay = useRelay();
    const { isAuthenticated } = useAuth();
    const { setLanIp } = useLAN();
    const [tabs, setTabs] = useState<TerminalTab[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [killRosStatus, setKillRosStatus] = useState<{ msg: string; ok: boolean } | null>(null);
    const [killing, setKilling] = useState<string | null>(null); // which kill is in progress
    const [ipPrompt, setIpPrompt] = useState<string | null>(null); // holds discovered IP
    const recoveredRef = useRef<Set<string>>(new Set()); // track IDs we already recovered

    /* ── Create a new blank terminal ── */
    const newTerminal = useCallback((label?: string) => {
        const id = uuid();
        setTabs((prev) => [...prev, { id, label: label || "Terminal", preset: null, alive: true }]);
        setActiveTab(id);
        relay.createTerminal(id, label || "Terminal");
    }, [relay]);

    /* ── Run a preset command ── */
    const runPreset = useCallback((presetKey: string, presetInfo: PresetInfo) => {
        const id = uuid();
        setTabs((prev) => [...prev, { id, label: presetInfo.label, preset: presetKey, alive: true }]);
        setActiveTab(id);
        relay.runPreset(id, presetKey);
    }, [relay]);

    /* ── Close a tab ── */
    const closeTab = useCallback((id: string) => {
        relay.killTerminal(id);
        setTabs((prev) => {
            const next = prev.filter((t) => t.id !== id);
            if (activeTab === id) {
                setActiveTab(next.length > 0 ? next[next.length - 1].id : null);
            }
            return next;
        });
    }, [relay, activeTab]);

    /* ── Send Ctrl+C to stop a running command ── */
    const stopCommand = useCallback((id: string) => {
        relay.sendInput(id, "\x03"); // Ctrl+C character
    }, [relay]);

    /* ── Find Robot IP ── */
    const findRobotIp = useCallback(() => {
        const id = uuid();
        setTabs((prev) => [...prev, { id, label: "🔍 Find IP", preset: null, alive: true }]);
        setActiveTab(id);
        relay.createTerminal(id, "Find IP");
        
        // Wait a tiny bit for it to connect, then run hostname -I
        setTimeout(() => {
            relay.sendInput(id, "hostname -I\r");
        }, 500);

        // Listen to this specific terminal's output
        const listener = (data: string) => {
            // Match local IPv4 addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
            const match = data.match(/\b(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)\b/);
            if (match) {
                setIpPrompt(match[0]);
                // Only prompt once, then we can technically ignore further output.
            }
        };
        relay.onTerminalOutput(id, listener);
    }, [relay]);

    /* ── Handle terminal exit ── */
    useEffect(() => {
        tabs.forEach((tab) => {
            if (tab.alive) {
                relay.onTerminalExit(tab.id, () => {
                    setTabs((prev) =>
                        prev.map((t) => (t.id === tab.id ? { ...t, alive: false, label: t.label.replace(" 🔄", "") + " (exited)" } : t))
                    );
                });
            }
        });
    }, [tabs, relay]);

    /* ── Recover existing terminals from agent on connect ── */
    useEffect(() => {
        if (relay.agentStatus !== "online" || relay.terminals.length === 0) return;
        relay.terminals.forEach((info) => {
            if (recoveredRef.current.has(info.id)) return; // already added
            recoveredRef.current.add(info.id);
            setTabs((prev) => {
                if (prev.some((t) => t.id === info.id)) return prev; // already in UI
                return [...prev, { id: info.id, label: info.label, preset: info.command, alive: true }];
            });
            setActiveTab((cur) => cur ?? info.id);
        });
    }, [relay.terminals, relay.agentStatus]);

    /* ── Emergency kill helpers ── */
    const handleKillRos = useCallback((target: "all" | "gazebo" | "rosbridge") => {
        setKilling(target);
        setKillRosStatus(null);
        relay.killRosProcesses(target, (result) => {
            setKillRosStatus({ msg: result.message, ok: result.success });
            setKilling(null);
            setTimeout(() => setKillRosStatus(null), 5000);
        });
    }, [relay]);

    const handleKillAllTerminals = useCallback(() => {
        setKilling("terminals");
        relay.killAllTerminals();
        // Clear local tabs too
        setTabs([]);
        setActiveTab(null);
        recoveredRef.current.clear();
        setTimeout(() => setKilling(null), 1500);
    }, [relay]);

    /* ── Preset buttons (hardcoded fallback + dynamic from agent) ── */
    const defaultPresets: Record<string, PresetInfo> = {
        simulation: { label: "🤖 Simulation", description: "Launch Gazebo + RViz simulation" },
        rosbridge: { label: "🌉 Rosbridge", description: "Start rosbridge WebSocket server" },
        chatter_pub: { label: "📡 Chatter Pub", description: "Publish test messages to /chatter" },
        web_cmd_echo: { label: "👂 Web Cmd Echo", description: "Echo /web_cmd messages" },
    };
    const presetList = Object.keys(relay.presets).length > 0 ? relay.presets : defaultPresets;

    return (
        <main style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            paddingTop: "70px",
            overflow: "hidden",
        }}>
            {/* ── Inline styles for animations ── */}
            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 8px currentColor; }
                    50% { box-shadow: 0 0 16px currentColor, 0 0 24px currentColor; }
                }
                @keyframes terminal-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .kill-spin { animation: spin 0.8s linear infinite; display: inline-block; }
                .preset-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(155, 89, 182, 0.2);
                }
                .preset-btn:active:not(:disabled) { transform: translateY(0); }
                .kill-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    filter: brightness(1.2);
                }
                .kill-btn:active:not(:disabled) { transform: translateY(0); }
                .tab-item:hover { background: rgba(155, 89, 182, 0.08) !important; }
                .close-btn:hover { color: #ff1744 !important; opacity: 0.9 !important; }
                .xterm { height: 100%; }
                .xterm .xterm-viewport { overflow-y: auto !important; }
                .xterm .xterm-viewport::-webkit-scrollbar { width: 8px; }
                .xterm .xterm-viewport::-webkit-scrollbar-track { background: transparent; }
                .xterm .xterm-viewport::-webkit-scrollbar-thumb {
                    background: rgba(155, 89, 182, 0.3); border-radius: 4px;
                }
                .xterm .xterm-viewport::-webkit-scrollbar-thumb:hover { background: rgba(155, 89, 182, 0.5); }
                .terminal-area { position: relative; background: #0a0a0a; }
                .terminal-area::before {
                    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 40px;
                    background: linear-gradient(to bottom, rgba(155, 89, 182, 0.03), transparent);
                    pointer-events: none; z-index: 1;
                }
                .stop-float {
                    position: absolute; bottom: 40px; right: 40px; z-index: 10;
                    padding: 8px 16px; border-radius: 10px;
                    border: 1px solid rgba(255, 23, 68, 0.3);
                    background: rgba(255, 23, 68, 0.12); color: #ff5252;
                    font-size: 0.75rem; font-weight: 600; cursor: pointer;
                    backdrop-filter: blur(8px); transition: all 0.2s; display: none;
                }
                .stop-float:hover { background: rgba(255, 23, 68, 0.25); box-shadow: 0 4px 16px rgba(255, 23, 68, 0.2); }
                @media (max-width: 768px) { .stop-float { display: block; } }
            `}</style>

            {/* ── Top Bar: Agent Status ── */}
            <div style={{
                padding: "10px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(15, 10, 25, 0.98)",
                borderBottom: "1px solid rgba(155, 89, 182, 0.12)",
                backdropFilter: "blur(12px)",
                flexWrap: "wrap", gap: "8px",
                flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, letterSpacing: "0.02em" }}>
                        <span style={{ marginRight: "6px", fontSize: "0.9rem" }}>⌨️</span>
                        <span className="gradient-text">Remote Terminal</span>
                    </h1>
                    <AgentBadge status={relay.agentStatus} />
                </div>
                {relay.agentInfo && (
                    <div style={{
                        display: "flex", gap: "14px", fontSize: "0.68rem",
                        opacity: 0.35, fontFamily: "'JetBrains Mono', monospace",
                    }}>
                        <span>🖥 {relay.agentInfo.hostname}</span>
                        <span>📡 {relay.agentInfo.ip}</span>
                        <span>⏱ {formatUptime(relay.agentInfo.uptime)}</span>
                    </div>
                )}
            </div>

            {/* ── Preset Buttons + Emergency Kill Row ── */}
            <div style={{
                padding: "8px 20px",
                display: "flex", alignItems: "center", gap: "6px",
                background: "rgba(15, 10, 25, 0.85)",
                borderBottom: "1px solid rgba(155, 89, 182, 0.06)",
                flexWrap: "wrap",
                overflowX: "auto",
                flexShrink: 0,
            }}>
                <span style={{
                    fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: "rgba(155, 89, 182, 0.4)",
                    marginRight: "6px",
                }}>Presets</span>

                {Object.entries(presetList).map(([key, info]) => (
                    <button
                        key={key}
                        className="preset-btn"
                        onClick={() => runPreset(key, info)}
                        disabled={relay.agentStatus !== "online" || !isAuthenticated}
                        title={isAuthenticated ? info.description : "Login required"}
                        style={{
                            padding: "5px 12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(155, 89, 182, 0.15)",
                            background: relay.agentStatus === "online" && isAuthenticated
                                ? "rgba(155, 89, 182, 0.06)"
                                : "rgba(255,255,255,0.02)",
                            color: relay.agentStatus === "online" && isAuthenticated ? "#d4c0e8" : "rgba(255,255,255,0.15)",
                            fontSize: "0.72rem",
                            fontWeight: 500,
                            cursor: relay.agentStatus === "online" && isAuthenticated ? "pointer" : "not-allowed",
                            whiteSpace: "nowrap",
                            transition: "all 0.2s ease",
                        }}
                    >
                        {info.label}
                    </button>
                ))}

                <div style={{ width: "1px", height: "20px", background: "rgba(155,89,182,0.1)", margin: "0 4px" }} />

                <button
                    className="preset-btn"
                    onClick={() => newTerminal()}
                    disabled={relay.agentStatus !== "online" || !isAuthenticated}
                    style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(0, 230, 118, 0.15)",
                        background: relay.agentStatus === "online" && isAuthenticated
                            ? "rgba(0, 230, 118, 0.06)"
                            : "rgba(255,255,255,0.02)",
                        color: relay.agentStatus === "online" && isAuthenticated ? "#90e8b8" : "rgba(255,255,255,0.15)",
                        fontSize: "0.72rem",
                        fontWeight: 500,
                        cursor: relay.agentStatus === "online" && isAuthenticated ? "pointer" : "not-allowed",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s ease",
                    }}
                >
                    ➕ New Terminal
                </button>

                <div style={{ width: "1px", height: "20px", background: "rgba(0,188,212,0.1)", margin: "0 4px" }} />

                <button
                    className="preset-btn"
                    onClick={findRobotIp}
                    disabled={relay.agentStatus !== "online" || !isAuthenticated}
                    style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(0, 188, 212, 0.15)",
                        background: relay.agentStatus === "online" && isAuthenticated
                            ? "rgba(0, 188, 212, 0.06)"
                            : "rgba(255,255,255,0.02)",
                        color: relay.agentStatus === "online" && isAuthenticated ? "#84ffff" : "rgba(255,255,255,0.15)",
                        fontSize: "0.72rem",
                        fontWeight: 500,
                        cursor: relay.agentStatus === "online" && isAuthenticated ? "pointer" : "not-allowed",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s ease",
                    }}
                >
                    🔍 Find Robot IP
                </button>

                {/* ── Emergency Kill Divider ── */}
                {isAuthenticated && relay.agentStatus === "online" && (
                    <>
                        <div style={{ width: "1px", height: "20px", background: "rgba(255,23,68,0.2)", margin: "0 6px" }} />
                        <span style={{
                            fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: "0.08em", color: "rgba(255,82,82,0.5)",
                            marginRight: "2px",
                        }}>🚨 Kill</span>

                        <button
                            className="kill-btn"
                            title="Kill all open terminal sessions"
                            disabled={killing !== null}
                            onClick={handleKillAllTerminals}
                            style={killBtnStyle("rgba(255,82,82,0.15)", "rgba(255,82,82,0.3)", killing === "terminals")}
                        >
                            {killing === "terminals" ? <span className="kill-spin">⏳</span> : "☠️"} Terminals
                        </button>

                        <button
                            className="kill-btn"
                            title="Kill Gazebo + RViz2 processes"
                            disabled={killing !== null}
                            onClick={() => handleKillRos("gazebo")}
                            style={killBtnStyle("rgba(255,152,0,0.12)", "rgba(255,152,0,0.3)", killing === "gazebo")}
                        >
                            {killing === "gazebo" ? <span className="kill-spin">⏳</span> : "🤖"} Gazebo+RViz
                        </button>

                        <button
                            className="kill-btn"
                            title="Kill rosbridge WebSocket server"
                            disabled={killing !== null}
                            onClick={() => handleKillRos("rosbridge")}
                            style={killBtnStyle("rgba(33,150,243,0.1)", "rgba(33,150,243,0.3)", killing === "rosbridge")}
                        >
                            {killing === "rosbridge" ? <span className="kill-spin">⏳</span> : "🌉"} Rosbridge
                        </button>

                        <button
                            className="kill-btn"
                            title="Kill ALL ROS processes (nuclear option)"
                            disabled={killing !== null}
                            onClick={() => handleKillRos("all")}
                            style={killBtnStyle("rgba(244,67,54,0.18)", "rgba(244,67,54,0.4)", killing === "all")}
                        >
                            {killing === "all" ? <span className="kill-spin">⏳</span> : "💥"} Kill All ROS
                        </button>
                    </>
                )}
            </div>

            {/* ── Kill status toast ── */}
            {killRosStatus && (
                <div style={{
                    padding: "6px 20px",
                    background: killRosStatus.ok ? "rgba(0,230,118,0.08)" : "rgba(255,82,82,0.08)",
                    borderBottom: `1px solid ${killRosStatus.ok ? "rgba(0,230,118,0.15)" : "rgba(255,82,82,0.15)"}`,
                    color: killRosStatus.ok ? "#69f0ae" : "#ff5252",
                    fontSize: "0.72rem",
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0,
                }}>
                    {killRosStatus.msg}
                </div>
            )}

            {/* ── IP Discovered Popup ── */}
            {ipPrompt && (
                <div style={{
                    position: "fixed", top: "80px", left: "50%", transform: "translateX(-50%)",
                    background: "rgba(20, 15, 30, 0.95)", border: "1px solid rgba(0, 230, 118, 0.3)",
                    padding: "16px 24px", borderRadius: "16px", zIndex: 9999,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.6), 0 0 20px rgba(0, 230, 118, 0.1)",
                    backdropFilter: "blur(10px)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
                    animation: "slideUp 0.3s ease",
                }}>
                    <div style={{ fontSize: "0.9rem", color: "#e0e0e0" }}>
                        Found Local IP: <strong style={{ color: "#00e676", fontSize: "1.1rem", fontFamily: "monospace" }}>{ipPrompt}</strong>
                    </div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.6, marginBottom: "4px" }}>
                        Do you want to add this to your LAN settings?
                    </div>
                    <div style={{ display: "flex", gap: "12px" }}>
                        <button
                            onClick={() => { setLanIp(ipPrompt); setIpPrompt(null); }}
                            style={{
                                padding: "6px 14px", borderRadius: "8px", border: "none",
                                background: "linear-gradient(135deg, #00c6ff, #0072ff)", color: "#fff",
                                fontSize: "0.8rem", fontWeight: 600, cursor: "pointer"
                            }}
                        >
                            Add to Settings
                        </button>
                        <button
                            onClick={() => setIpPrompt(null)}
                            style={{
                                padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)",
                                background: "transparent", color: "rgba(255,255,255,0.6)",
                                fontSize: "0.8rem", fontWeight: 600, cursor: "pointer"
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* ── Tab Bar ── */}
            {tabs.length > 0 && (
                <div style={{
                    display: "flex",
                    background: "rgba(10, 8, 20, 0.95)",
                    borderBottom: "1px solid rgba(155, 89, 182, 0.08)",
                    overflowX: "auto",
                    flexShrink: 0,
                    alignItems: "center",
                }}>
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            className="tab-item"
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: "7px 14px",
                                fontSize: "0.7rem",
                                fontWeight: 500,
                                cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "7px",
                                borderBottom: activeTab === tab.id
                                    ? "2px solid var(--primary)"
                                    : "2px solid transparent",
                                background: activeTab === tab.id
                                    ? "rgba(155, 89, 182, 0.05)"
                                    : "transparent",
                                color: activeTab === tab.id ? "#e0d0f0" : "rgba(255,255,255,0.35)",
                                transition: "all 0.15s ease",
                                whiteSpace: "nowrap",
                                userSelect: "none",
                            }}
                        >
                            <span style={{
                                width: "5px", height: "5px", borderRadius: "50%",
                                background: tab.alive ? "#00e676" : "#ff1744",
                                boxShadow: tab.alive ? "0 0 5px #00e676" : "0 0 5px #ff1744",
                                flexShrink: 0,
                            }} />
                            {tab.label}
                            {tab.alive && isAuthenticated && (
                                <span
                                    className="close-btn"
                                    title="Stop command (Ctrl+C)"
                                    onClick={(e) => { e.stopPropagation(); stopCommand(tab.id); }}
                                    style={{
                                        marginLeft: "3px",
                                        fontSize: "0.7rem",
                                        opacity: 0.3,
                                        cursor: "pointer",
                                        lineHeight: 1,
                                        transition: "all 0.15s",
                                        color: "#ff5252",
                                    }}
                                >
                                    ⏹
                                </span>
                            )}
                            {isAuthenticated && (
                            <span
                                className="close-btn"
                                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                                style={{
                                    marginLeft: "2px",
                                    fontSize: "0.8rem",
                                    opacity: 0.25,
                                    cursor: "pointer",
                                    lineHeight: 1,
                                    transition: "all 0.15s",
                                }}
                            >
                                ×
                            </span>
                            )}
                        </div>
                    ))}
                    {isAuthenticated && (
                        <div
                            onClick={() => newTerminal()}
                            style={{
                                padding: "7px 12px",
                                fontSize: "0.8rem",
                                color: "rgba(155, 89, 182, 0.6)",
                                cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.15s ease",
                            }}
                            title="New Terminal"
                            onMouseOver={(e) => e.currentTarget.style.color = "rgba(155, 89, 182, 1)"}
                            onMouseOut={(e) => e.currentTarget.style.color = "rgba(155, 89, 182, 0.6)"}
                        >
                            ➕
                        </div>
                    )}
                </div>
            )}

            {/* ── Terminal Area (fills remaining viewport) ── */}
            <div className="terminal-area" style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
                {tabs.length === 0 ? (
                    <EmptyState
                        agentStatus={relay.agentStatus}
                        onNewTerminal={() => newTerminal()}
                        isAuthenticated={isAuthenticated}
                    />
                ) : (
                    tabs.map((tab) => (
                        <div
                            key={tab.id}
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: activeTab === tab.id ? "flex" : "none",
                                flexDirection: "column",
                            }}
                        >
                            <XTermView
                                terminalId={tab.id}
                                relay={relay}
                                isActive={activeTab === tab.id}
                                readOnly={!isAuthenticated}
                            />
                            {tab.alive && isAuthenticated && (
                                <button
                                    className="stop-float"
                                    onClick={() => stopCommand(tab.id)}
                                >
                                    ⏹ Stop Command
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </main>
    );
}

/* ── Kill button style helper ────────────────────────────── */
function killBtnStyle(bg: string, border: string, active: boolean): React.CSSProperties {
    return {
        padding: "5px 11px",
        borderRadius: "8px",
        border: `1px solid ${border}`,
        background: active ? border : bg,
        color: active ? "#fff" : "rgba(255,200,200,0.8)",
        fontSize: "0.72rem",
        fontWeight: 600,
        cursor: active ? "wait" : "pointer",
        whiteSpace: "nowrap" as const,
        transition: "all 0.2s ease",
        opacity: active ? 0.7 : 1,
    };
}

/* ═══════════════════════════════════════════════════
   XTERM VIEW — dynamically loads xterm.js
   ═══════════════════════════════════════════════════ */
function XTermView({
    terminalId,
    relay,
    isActive,
    readOnly = false,
}: {
    terminalId: string;
    relay: ReturnType<typeof useRelay>;
    isActive: boolean;
    readOnly?: boolean;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<unknown>(null);
    const fitAddonRef = useRef<unknown>(null);
    const [loaded, setLoaded] = useState(false);

    /* ── Load xterm.js dynamically (browser-only) ── */
    useEffect(() => {
        let mounted = true;

        async function initXterm() {
            if (termRef.current || !containerRef.current) return;

            try {
                const [xtermModule, fitModule] = await Promise.all([
                    import("@xterm/xterm"),
                    import("@xterm/addon-fit"),
                ]);

                if (!mounted || !containerRef.current) return;

                const Terminal = xtermModule.Terminal;
                const FitAddon = fitModule.FitAddon;

                const fitAddon = new FitAddon();
                const term = new Terminal({
                    cursorBlink: true,
                    cursorStyle: "bar",
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                    lineHeight: 1.2,
                    letterSpacing: 0.5,
                    theme: {
                        background: "transparent",
                        foreground: "#e0e0e0",
                        cursor: "#9b59b6",
                        cursorAccent: "#0a0a0a",
                        selectionBackground: "rgba(155, 89, 182, 0.3)",
                        selectionForeground: "#ffffff",
                        black: "#1a1a2e",
                        red: "#ff1744",
                        green: "#00e676",
                        yellow: "#ffab00",
                        blue: "#448aff",
                        magenta: "#9b59b6",
                        cyan: "#00bcd4",
                        white: "#e0e0e0",
                        brightBlack: "#555577",
                        brightRed: "#ff5252",
                        brightGreen: "#69f0ae",
                        brightYellow: "#ffd740",
                        brightBlue: "#82b1ff",
                        brightMagenta: "#c084fc",
                        brightCyan: "#67e8f9",
                        brightWhite: "#ffffff",
                    },
                    allowProposedApi: true,
                    scrollback: 5000,
                    convertEol: true,
                });

                term.loadAddon(fitAddon);
                term.open(containerRef.current);
                fitAddon.fit();

                termRef.current = term;
                fitAddonRef.current = fitAddon;
                setLoaded(true);

                // Send input to agent (only if not readOnly)
                if (!readOnly) {
                    term.onData((data: string) => {
                        relay.sendInput(terminalId, data);
                    });
                }

                // Receive output from agent
                relay.onTerminalOutput(terminalId, (data: string) => {
                    term.write(data);
                });

                // Handle terminal exit
                relay.onTerminalExit(terminalId, () => {
                    term.write("\r\n\x1b[90m--- Process exited ---\x1b[0m\r\n");
                });

                // Send initial size
                relay.resizeTerminal(terminalId, term.cols, term.rows);

                // Resize on container resize
                const resizeObserver = new ResizeObserver(() => {
                    try {
                        fitAddon.fit();
                        relay.resizeTerminal(terminalId, term.cols, term.rows);
                    } catch { /* ignore during unmount */ }
                });
                if (containerRef.current) {
                    resizeObserver.observe(containerRef.current);
                }

                return () => {
                    resizeObserver.disconnect();
                    term.dispose();
                };
            } catch (err) {
                console.error("Failed to load xterm:", err);
            }
        }

        initXterm();

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terminalId]);

    /* ── Re-fit when tab becomes active ── */
    useEffect(() => {
        if (isActive && fitAddonRef.current && loaded) {
            setTimeout(() => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (fitAddonRef.current as any).fit();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const term = termRef.current as any;
                    if (term) {
                        relay.resizeTerminal(terminalId, term.cols, term.rows);
                    }
                } catch { /* ignore */ }
            }, 50);
        }
    }, [isActive, loaded, relay, terminalId]);

    return (
        <div
            style={{
                flex: 1,
                padding: "16px 20px 24px 20px",
                background: "#0a0a0a",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            <div style={{
                flex: 1,
                background: "#0c0a12",
                borderRadius: "12px",
                border: "1px solid rgba(155, 89, 182, 0.15)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(155, 89, 182, 0.04)",
                padding: "14px 16px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
            }}>
                <div ref={containerRef} style={{ flex: 1, overflow: "hidden" }} />
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   AGENT STATUS BADGE
   ═══════════════════════════════════════════════════ */
function AgentBadge({ status }: { status: string }) {
    const color =
        status === "online" ? "#00e676" :
        status === "connecting" ? "#ffab00" : "#ff1744";
    const text =
        status === "online" ? "Agent Online" :
        status === "connecting" ? "Connecting…" : "Agent Offline";

    return (
        <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "3px 10px", borderRadius: "20px",
            backgroundColor: `${color}10`,
            border: `1px solid ${color}25`,
        }}>
            <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                backgroundColor: color,
                boxShadow: `0 0 6px ${color}`,
                animation: status === "online"
                    ? "pulse-glow 3s infinite"
                    : status === "connecting"
                        ? "pulse-glow 1s infinite"
                        : "none",
            }} />
            <span style={{ fontSize: "0.68rem", fontWeight: 500, color }}>{text}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════ */
function EmptyState({
    agentStatus,
    onNewTerminal,
    isAuthenticated,
}: {
    agentStatus: string;
    onNewTerminal: () => void;
    isAuthenticated: boolean;
}) {
    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: "100%", padding: "40px", textAlign: "center",
        }}>
            {agentStatus === "online" ? (
                <>
                    <div style={{
                        fontSize: "2.5rem", marginBottom: "16px",
                        filter: "drop-shadow(0 0 12px rgba(155, 89, 182, 0.3))",
                    }}>⌨️</div>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: "0 0 8px" }}>
                        <span className="gradient-text">Agent Connected</span>
                    </h2>
                    <p style={{
                        opacity: 0.35, fontSize: "0.8rem", maxWidth: "380px",
                        lineHeight: 1.6, margin: "0 0 20px",
                    }}>
                        Use the preset buttons above to launch ROS 2 services, or open a blank terminal to run custom commands on your machine.
                    </p>
                    <button
                        onClick={onNewTerminal}
                        className="preset-btn"
                        disabled={!isAuthenticated}
                        title={isAuthenticated ? "Open Terminal" : "Login required"}
                        style={{
                            padding: "8px 22px",
                            borderRadius: "10px",
                            border: "none",
                            background: isAuthenticated
                                ? "linear-gradient(135deg, var(--primary), var(--secondary))"
                                : "rgba(255,255,255,0.05)",
                            color: isAuthenticated ? "#fff" : "rgba(255,255,255,0.2)",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: isAuthenticated ? "pointer" : "not-allowed",
                            transition: "all 0.2s ease",
                        }}
                    >
                        {isAuthenticated ? "➕ Open Terminal" : "🔒 Login Required"}
                    </button>
                </>
            ) : agentStatus === "connecting" ? (
                <>
                    <div style={{
                        fontSize: "2.5rem", marginBottom: "16px",
                        animation: "terminal-blink 1.5s infinite",
                    }}>🔌</div>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: "0 0 8px", color: "#ffab00" }}>
                        Connecting to Relay…
                    </h2>
                    <p style={{ opacity: 0.35, fontSize: "0.8rem", maxWidth: "380px", lineHeight: 1.6 }}>
                        Attempting to connect to the relay server. This may take a moment.
                    </p>
                </>
            ) : (
                <>
                    <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>🔴</div>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: "0 0 8px", color: "#ff1744" }}>
                        Agent Offline
                    </h2>
                    <p style={{
                        opacity: 0.35, fontSize: "0.8rem", maxWidth: "380px",
                        lineHeight: 1.6, margin: "0 0 14px",
                    }}>
                        The local agent is not running on your laptop. Start it with:
                    </p>
                    <code style={{
                        display: "block",
                        padding: "10px 18px",
                        borderRadius: "10px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        color: "#ffab00",
                        fontSize: "0.75rem",
                        fontFamily: "'JetBrains Mono', monospace",
                        userSelect: "all",
                    }}>
                        cd relay/agent && node agent.js
                    </code>
                </>
            )}
        </div>
    );
}
