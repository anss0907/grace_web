"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as ROSLIB from "roslib";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

/**
 * Build the rosbridge URL from the browser's current hostname.
 * If accessed via IP (e.g. 10.5.28.243:3000), connects to ws://10.5.28.243:9090
 * If accessed via localhost, connects to ws://localhost:9090
 */
function getDefaultRosbridgeUrl() {
    if (typeof window === "undefined") return "ws://localhost:9090";
    return `ws://${window.location.hostname}:9090`;
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
