"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRelay } from "../lib/useRelay";
import type { PresetInfo } from "../lib/useRelay";

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
    const [tabs, setTabs] = useState<TerminalTab[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>(null);

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

    /* ── Handle terminal exit ── */
    useEffect(() => {
        tabs.forEach((tab) => {
            if (tab.alive) {
                relay.onTerminalExit(tab.id, () => {
                    setTabs((prev) =>
                        prev.map((t) => (t.id === tab.id ? { ...t, alive: false, label: t.label + " (exited)" } : t))
                    );
                });
            }
        });
    }, [tabs, relay]);

    /* ── Preset buttons (hardcoded fallback + dynamic from agent) ── */
    const defaultPresets: Record<string, PresetInfo> = {
        simulation: { label: "🤖 Simulation", description: "Launch Gazebo + RViz simulation" },
        rosbridge: { label: "🌉 Rosbridge", description: "Start rosbridge WebSocket server" },
        chatter_pub: { label: "📡 Chatter Pub", description: "Publish test messages to /chatter" },
        web_cmd_echo: { label: "👂 Web Cmd Echo", description: "Echo /web_cmd messages" },
    };
    const presetList = Object.keys(relay.presets).length > 0 ? relay.presets : defaultPresets;

    return (
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingTop: "70px" }}>

            {/* ── Top Bar: Agent Status ── */}
            <div style={{
                padding: "12px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(15, 10, 25, 0.95)",
                borderBottom: "1px solid rgba(155, 89, 182, 0.15)",
                flexWrap: "wrap", gap: "10px",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
                        <span className="gradient-text">Terminal</span>
                    </h1>
                    <AgentBadge status={relay.agentStatus} />
                </div>
                {relay.agentInfo && (
                    <div style={{ display: "flex", gap: "16px", fontSize: "0.7rem", opacity: 0.4, fontFamily: "monospace" }}>
                        <span>🖥 {relay.agentInfo.hostname}</span>
                        <span>📡 {relay.agentInfo.ip}</span>
                        <span>⏱ {formatUptime(relay.agentInfo.uptime)}</span>
                    </div>
                )}
            </div>

            {/* ── Preset Buttons ── */}
            <div style={{
                padding: "12px 20px",
                display: "flex", alignItems: "center", gap: "8px",
                background: "rgba(15, 10, 25, 0.8)",
                borderBottom: "1px solid rgba(155, 89, 182, 0.08)",
                flexWrap: "wrap",
                overflowX: "auto",
            }}>
                {Object.entries(presetList).map(([key, info]) => (
                    <button
                        key={key}
                        onClick={() => runPreset(key, info)}
                        disabled={relay.agentStatus !== "online"}
                        title={info.description}
                        style={{
                            padding: "6px 14px",
                            borderRadius: "10px",
                            border: "1px solid rgba(155, 89, 182, 0.2)",
                            background: relay.agentStatus === "online"
                                ? "rgba(155, 89, 182, 0.08)"
                                : "rgba(255,255,255,0.02)",
                            color: relay.agentStatus === "online" ? "#e0d0f0" : "rgba(255,255,255,0.2)",
                            fontSize: "0.78rem",
                            fontWeight: 500,
                            cursor: relay.agentStatus === "online" ? "pointer" : "not-allowed",
                            whiteSpace: "nowrap",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            if (relay.agentStatus === "online") {
                                e.currentTarget.style.background = "rgba(155, 89, 182, 0.2)";
                                e.currentTarget.style.borderColor = "rgba(155, 89, 182, 0.4)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = relay.agentStatus === "online"
                                ? "rgba(155, 89, 182, 0.08)" : "rgba(255,255,255,0.02)";
                            e.currentTarget.style.borderColor = "rgba(155, 89, 182, 0.2)";
                        }}
                    >
                        {info.label}
                    </button>
                ))}

                <div style={{ width: "1px", height: "24px", background: "rgba(155,89,182,0.15)", margin: "0 4px" }} />

                <button
                    onClick={() => newTerminal()}
                    disabled={relay.agentStatus !== "online"}
                    style={{
                        padding: "6px 14px",
                        borderRadius: "10px",
                        border: "1px solid rgba(0, 230, 118, 0.2)",
                        background: relay.agentStatus === "online"
                            ? "rgba(0, 230, 118, 0.08)"
                            : "rgba(255,255,255,0.02)",
                        color: relay.agentStatus === "online" ? "#a0f0c0" : "rgba(255,255,255,0.2)",
                        fontSize: "0.78rem",
                        fontWeight: 500,
                        cursor: relay.agentStatus === "online" ? "pointer" : "not-allowed",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s ease",
                    }}
                >
                    ➕ New Terminal
                </button>
            </div>

            {/* ── Tab Bar ── */}
            {tabs.length > 0 && (
                <div style={{
                    display: "flex",
                    background: "rgba(15, 10, 25, 0.9)",
                    borderBottom: "1px solid rgba(155, 89, 182, 0.1)",
                    overflowX: "auto",
                }}>
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: "8px 16px",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "8px",
                                borderBottom: activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
                                background: activeTab === tab.id ? "rgba(155, 89, 182, 0.06)" : "transparent",
                                color: activeTab === tab.id ? "#e0d0f0" : "rgba(255,255,255,0.4)",
                                transition: "all 0.15s ease",
                                whiteSpace: "nowrap",
                                userSelect: "none",
                            }}
                        >
                            <span style={{
                                width: "6px", height: "6px", borderRadius: "50%",
                                background: tab.alive ? "#00e676" : "#ff1744",
                                boxShadow: tab.alive ? "0 0 6px #00e676" : "0 0 6px #ff1744",
                            }} />
                            {tab.label}
                            <span
                                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                                style={{
                                    marginLeft: "4px",
                                    fontSize: "0.85rem",
                                    opacity: 0.3,
                                    cursor: "pointer",
                                    lineHeight: 1,
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; e.currentTarget.style.color = "#ff1744"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.3"; e.currentTarget.style.color = "inherit"; }}
                            >
                                ×
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Terminal Area ── */}
            <div style={{ flex: 1, position: "relative", background: "#0a0a0a", minHeight: "400px" }}>
                {tabs.length === 0 ? (
                    <EmptyState
                        agentStatus={relay.agentStatus}
                        onNewTerminal={() => newTerminal()}
                    />
                ) : (
                    tabs.map((tab) => (
                        <div
                            key={tab.id}
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: activeTab === tab.id ? "flex" : "none",
                            }}
                        >
                            <XTermView
                                terminalId={tab.id}
                                relay={relay}
                                isActive={activeTab === tab.id}
                            />
                        </div>
                    ))
                )}
            </div>
        </main>
    );
}

/* ═══════════════════════════════════════════════════
   XTERM VIEW — dynamically loads xterm.js
   ═══════════════════════════════════════════════════ */
function XTermView({
    terminalId,
    relay,
    isActive,
}: {
    terminalId: string;
    relay: ReturnType<typeof useRelay>;
    isActive: boolean;
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
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                    theme: {
                        background: "#0a0a0a",
                        foreground: "#e0e0e0",
                        cursor: "#9b59b6",
                        cursorAccent: "#0a0a0a",
                        selectionBackground: "rgba(155, 89, 182, 0.3)",
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

                // Send input to agent
                term.onData((data: string) => {
                    relay.sendInput(terminalId, data);
                });

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

                // Resize on window resize
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
            ref={containerRef}
            style={{
                flex: 1,
                padding: "4px",
                background: "#0a0a0a",
                overflow: "hidden",
            }}
        />
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
            padding: "4px 12px", borderRadius: "20px",
            backgroundColor: `${color}15`,
            border: `1px solid ${color}30`,
        }}>
            <div style={{
                width: "7px", height: "7px", borderRadius: "50%",
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}`,
                animation: status === "connecting" ? "pulse 1.5s infinite" : "none",
            }} />
            <span style={{ fontSize: "0.72rem", fontWeight: 500, color }}>{text}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════ */
function EmptyState({
    agentStatus,
    onNewTerminal,
}: {
    agentStatus: string;
    onNewTerminal: () => void;
}) {
    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: "100%", padding: "40px", textAlign: "center",
        }}>
            {agentStatus === "online" ? (
                <>
                    <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🖥️</div>
                    <h2 style={{ fontSize: "1.3rem", fontWeight: 600, margin: "0 0 8px" }}>
                        <span className="gradient-text">Agent Connected</span>
                    </h2>
                    <p style={{ opacity: 0.4, fontSize: "0.85rem", maxWidth: "400px", lineHeight: 1.6, margin: "0 0 24px" }}>
                        Use the preset buttons above to launch ROS 2 services, or open a blank terminal to run custom commands on your machine.
                    </p>
                    <button
                        onClick={onNewTerminal}
                        style={{
                            padding: "10px 24px",
                            borderRadius: "12px",
                            border: "none",
                            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                            color: "#fff",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        ➕ Open Terminal
                    </button>
                </>
            ) : agentStatus === "connecting" ? (
                <>
                    <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔌</div>
                    <h2 style={{ fontSize: "1.3rem", fontWeight: 600, margin: "0 0 8px", color: "#ffab00" }}>
                        Connecting to Relay…
                    </h2>
                    <p style={{ opacity: 0.4, fontSize: "0.85rem", maxWidth: "400px", lineHeight: 1.6 }}>
                        Attempting to connect to the relay server. This may take a moment.
                    </p>
                </>
            ) : (
                <>
                    <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔴</div>
                    <h2 style={{ fontSize: "1.3rem", fontWeight: 600, margin: "0 0 8px", color: "#ff1744" }}>
                        Agent Offline
                    </h2>
                    <p style={{ opacity: 0.4, fontSize: "0.85rem", maxWidth: "400px", lineHeight: 1.6, margin: "0 0 16px" }}>
                        The local agent is not running on your laptop. Start it with:
                    </p>
                    <code style={{
                        display: "block",
                        padding: "12px 20px",
                        borderRadius: "12px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        color: "#ffab00",
                        fontSize: "0.8rem",
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
