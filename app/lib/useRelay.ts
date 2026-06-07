"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getRelayUrl } from "./relay-config";

/* ── Types ────────────────────────────────────────── */

export type AgentStatus = "online" | "offline" | "connecting";

export interface TerminalInfo {
    id: string;
    label: string;
    command: string | null;
    createdAt: number;
}

export interface AgentInfo {
    hostname: string;
    platform: string;
    uptime: number;
    ip: string;
    nodeVersion: string;
    terminalCount: number;
}

export interface PresetInfo {
    label: string;
    description: string;
}

export type RelayMessage =
    | { type: "agent_online" }
    | { type: "agent_offline" }
    | { type: "terminal_output"; id: string; data: string }
    | { type: "terminal_created"; id: string; label: string }
    | { type: "terminal_exited"; id: string; exitCode: number | null; signal: string | null }
    | { type: "terminal_list"; terminals: TerminalInfo[] }
    | { type: "agent_status"; hostname: string; platform: string; uptime: number; ip: string; nodeVersion: string; terminalCount: number }
    | { type: "presets_list"; presets: Record<string, PresetInfo> }
    | { type: "kill_all_done"; killed: number }
    | { type: "kill_ros_done"; target: string; success: boolean; message: string }
    | { type: "scrollback"; id: string; data: string | null }
    | { type: "error"; message: string };

/* ── Hook ─────────────────────────────────────────── */

export function useRelay() {
    const wsRef = useRef<WebSocket | null>(null);
    const [agentStatus, setAgentStatus] = useState<AgentStatus>("connecting");
    const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
    const [terminals, setTerminals] = useState<TerminalInfo[]>([]);
    const [presets, setPresets] = useState<Record<string, PresetInfo>>({});
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const listenersRef = useRef<Map<string, (data: string) => void>>(new Map());
    const exitListenersRef = useRef<Map<string, (exitCode: number | null, signal: string | null) => void>>(new Map());
    const scrollbackListenersRef = useRef<Map<string, (data: string | null) => void>>(new Map());
    const killRosListenersRef = useRef<Array<(result: { target: string; success: boolean; message: string }) => void>>([]);

    const connect = useCallback(() => {
        const url = getRelayUrl();
        if (!url) {
            console.warn("Relay URL not configured — skipping connection");
            setAgentStatus("offline");
            return;
        }

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("✅ Connected to relay");
            // Request current state
            ws.send(JSON.stringify({ type: "get_status" }));
            ws.send(JSON.stringify({ type: "list_terminals" }));
            ws.send(JSON.stringify({ type: "get_presets" }));
        };

        ws.onmessage = (event) => {
            try {
                const msg: RelayMessage = JSON.parse(event.data);

                switch (msg.type) {
                    case "agent_online":
                        setAgentStatus("online");
                        // Refresh status when agent comes online
                        ws.send(JSON.stringify({ type: "get_status" }));
                        ws.send(JSON.stringify({ type: "get_presets" }));
                        break;

                    case "agent_offline":
                        setAgentStatus("offline");
                        setAgentInfo(null);
                        setTerminals([]);
                        break;

                    case "terminal_output": {
                        const listener = listenersRef.current.get(msg.id);
                        if (listener) listener(msg.data);
                        break;
                    }

                    case "terminal_created":
                        // Terminal list will be sent separately
                        break;

                    case "terminal_exited": {
                        const exitListener = exitListenersRef.current.get(msg.id);
                        if (exitListener) exitListener(msg.exitCode, msg.signal);
                        // Remove listeners
                        listenersRef.current.delete(msg.id);
                        exitListenersRef.current.delete(msg.id);
                        break;
                    }

                    case "terminal_list":
                        setTerminals(msg.terminals);
                        break;

                    case "agent_status":
                        setAgentStatus("online");
                        setAgentInfo({
                            hostname: msg.hostname,
                            platform: msg.platform,
                            uptime: msg.uptime,
                            ip: msg.ip,
                            nodeVersion: msg.nodeVersion,
                            terminalCount: msg.terminalCount,
                        });
                        break;

                    case "presets_list":
                        setPresets(msg.presets);
                        break;

                    case "kill_all_done":
                        // Terminals already cleared by individual kill_terminal events
                        break;

                    case "kill_ros_done": {
                        const callbacks = killRosListenersRef.current.splice(0);
                        callbacks.forEach((cb) => cb({ target: msg.target, success: msg.success, message: msg.message }));
                        break;
                    }

                    case "scrollback": {
                        const sbListener = scrollbackListenersRef.current.get(msg.id);
                        if (sbListener) {
                            scrollbackListenersRef.current.delete(msg.id);
                            sbListener(msg.data);
                        }
                        break;
                    }

                    case "error":
                        console.error("Agent error:", msg.message);
                        break;
                }
            } catch {
                console.error("Invalid relay message");
            }
        };

        ws.onclose = () => {
            console.log("🔴 Disconnected from relay");
            if (wsRef.current === ws) {
                wsRef.current = null;
                setAgentStatus("connecting");

                // Auto-reconnect after 3s
                if (!reconnectTimer.current) {
                    reconnectTimer.current = setTimeout(() => {
                        reconnectTimer.current = null;
                        connect();
                    }, 3000);
                }
            }
        };

        ws.onerror = () => {
            // onclose will fire after this
        };
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, [connect]);

    /* ── Actions ── */

    const send = useCallback((obj: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(obj));
        }
    }, []);

    const createTerminal = useCallback((id: string, label: string) => {
        send({ type: "create_terminal", id, label });
    }, [send]);

    const runPreset = useCallback((id: string, preset: string) => {
        send({ type: "run_preset", id, preset });
    }, [send]);

    const sendInput = useCallback((id: string, data: string) => {
        send({ type: "send_input", id, data });
    }, [send]);

    const resizeTerminal = useCallback((id: string, cols: number, rows: number) => {
        send({ type: "resize_terminal", id, cols, rows });
    }, [send]);

    const killTerminal = useCallback((id: string) => {
        send({ type: "kill_terminal", id });
        listenersRef.current.delete(id);
        exitListenersRef.current.delete(id);
        scrollbackListenersRef.current.delete(id);
    }, [send]);

    const killAllTerminals = useCallback(() => {
        send({ type: "kill_all_terminals" });
        listenersRef.current.clear();
        exitListenersRef.current.clear();
        scrollbackListenersRef.current.clear();
    }, [send]);

    const killRosProcesses = useCallback((
        target: "all" | "gazebo" | "rosbridge",
        callback?: (result: { target: string; success: boolean; message: string }) => void
    ) => {
        if (callback) killRosListenersRef.current.push(callback);
        send({ type: "kill_ros", target });
    }, [send]);

    const getScrollback = useCallback((id: string, callback: (data: string | null) => void) => {
        scrollbackListenersRef.current.set(id, callback);
        send({ type: "get_scrollback", id });
    }, [send]);

    const onTerminalOutput = useCallback((id: string, callback: (data: string) => void) => {
        listenersRef.current.set(id, callback);
    }, []);

    const onTerminalExit = useCallback((id: string, callback: (exitCode: number | null, signal: string | null) => void) => {
        exitListenersRef.current.set(id, callback);
    }, []);

    return {
        agentStatus,
        agentInfo,
        terminals,
        presets,
        createTerminal,
        runPreset,
        sendInput,
        resizeTerminal,
        killTerminal,
        killAllTerminals,
        killRosProcesses,
        getScrollback,
        onTerminalOutput,
        onTerminalExit,
    };
}
