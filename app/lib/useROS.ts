"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as ROSLIB from "roslib";
import { RELAY_URL, CLIENT_TOKEN } from "./relay-config";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

/**
 * Build the rosbridge URL.
 * - On localhost → connects directly to ws://localhost:9090
 * - On live site → proxies through the relay: wss://relay?role=rosbridge&token=...
 */
function getDefaultRosbridgeUrl() {
    if (typeof window === "undefined") return "ws://localhost:9090";

    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("10.") || hostname.startsWith("192.168.");

    if (isLocal) {
        // Direct connection on local network
        return `ws://${hostname}:9090`;
    }

    // Live site — proxy through relay
    if (RELAY_URL && CLIENT_TOKEN) {
        const base = RELAY_URL.startsWith("ws") ? RELAY_URL : `wss://${RELAY_URL}`;
        return `${base}?role=rosbridge&token=${CLIENT_TOKEN}`;
    }

    // Fallback (won't work on live site without relay)
    return `ws://${hostname}:9090`;
}

/**
 * Hook to connect to a rosbridge WebSocket server.
 * Returns the ROS instance and connection status.
 */
export function useROS(url?: string) {
    const resolvedUrl = url ?? getDefaultRosbridgeUrl();
    const rosRef = useRef<ROSLIB.Ros | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>("disconnected");
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
        // Clean up any existing connection
        if (rosRef.current) {
            try { rosRef.current.close(); } catch { /* ignore */ }
        }

        setStatus("connecting");

        const ros = new ROSLIB.Ros({ url: resolvedUrl });
        rosRef.current = ros;

        ros.on("connection", () => {
            setStatus("connected");
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
                reconnectTimer.current = null;
            }
        });

        ros.on("error", () => {
            setStatus("disconnected");
        });

        ros.on("close", () => {
            setStatus("disconnected");
            // Auto-reconnect after 3 seconds
            if (!reconnectTimer.current) {
                reconnectTimer.current = setTimeout(() => {
                    reconnectTimer.current = null;
                    connect();
                }, 3000);
            }
        });
    }, [resolvedUrl]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
            }
            if (rosRef.current) {
                try { rosRef.current.close(); } catch { /* ignore */ }
            }
        };
    }, [connect]);

    return { ros: rosRef.current, status };
}
