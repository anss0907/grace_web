"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useROS } from "../lib/useROS";
import { useAuth } from "../components/AuthProvider";
import { useLAN } from "../components/LANProvider";
import { supabase } from "../lib/supabase";
import * as ROSLIB from "roslib";
import MapCanvas from "../components/MapCanvas";
import CameraStream from "../components/CameraStream";

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);
    return isMobile;
}

// Joystick constants
const PAD_SIZE = 220;
const KNOB_SIZE = 70;
const MAX_LINEAR = 0.5;   // m/s
const MAX_ANGULAR = 1.5;  // rad/s
const PUBLISH_RATE = 10;  // Hz

export default function TeleopPage() {
    const { ros, status } = useROS();
    const { isAuthenticated } = useAuth();
    const { isLanMode } = useLAN();
    const isMobile = useIsMobile();

    // Joystick state
    const [joyX, setJoyX] = useState(0); // -1 to 1 (left/right → angular)
    const [joyY, setJoyY] = useState(0); // -1 to 1 (up/down → linear)
    const isDragging = useRef(false);
    const padRef = useRef<HTMLDivElement>(null);

    // Motor command monitoring (simple_velocity_controller/commands)
    const [motorCmd, setMotorCmd] = useState<{ left: number; right: number } | null>(null);

    // Joint state monitoring (joint_states)
    const [jointVel, setJointVel] = useState<{ left: number; right: number } | null>(null);

    // Waypoints state
    const [waypoints, setWaypoints] = useState<any[]>([]);
    const [pendingWaypoint, setPendingWaypoint] = useState<{ x: number; y: number; theta: number } | null>(null);
    const [newWaypointName, setNewWaypointName] = useState("");
    const [isSavingWaypoint, setIsSavingWaypoint] = useState(false);
    const currentPoseRef = useRef<{ x: number; y: number; yaw: number } | null>(null);

    const fetchWaypoints = useCallback(async () => {
        const { data } = await supabase.from('waypoints').select('*').order('created_at', { ascending: true });
        if (data) setWaypoints(data);
    }, []);

    useEffect(() => {
        fetchWaypoints();
    }, [fetchWaypoints]);

    // Publish timer ref
    const publishTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const latestJoy = useRef({ x: 0, y: 0 });

    // Keep latest joystick values in ref for the publish timer
    useEffect(() => {
        latestJoy.current = { x: joyX, y: joyY };
    }, [joyX, joyY]);

    // Publish Twist at fixed rate (only if authenticated)
    useEffect(() => {
        if (!ros || status !== "connected" || !isAuthenticated) return;

        const cmdTopic = new ROSLIB.Topic({
            ros,
            name: "grace_controller/cmd_vel_unstamped",
            messageType: "geometry_msgs/Twist",
        });

        publishTimer.current = setInterval(() => {
            const { x, y } = latestJoy.current;
            cmdTopic.publish({
                linear: { x: y * MAX_LINEAR, y: 0, z: 0 },
                angular: { x: 0, y: 0, z: -x * MAX_ANGULAR },
            });
        }, 1000 / PUBLISH_RATE);

        return () => {
            if (publishTimer.current) clearInterval(publishTimer.current);
            // Send stop command
            cmdTopic.publish({
                linear: { x: 0, y: 0, z: 0 },
                angular: { x: 0, y: 0, z: 0 },
            });
        };
    }, [ros, status, isAuthenticated]);

    // Subscribe to motor commands
    useEffect(() => {
        if (!ros || status !== "connected") return;

        const motorTopic = new ROSLIB.Topic({
            ros,
            name: "simple_velocity_controller/commands",
            messageType: "std_msgs/Float64MultiArray",
        });

        motorTopic.subscribe((msg) => {
            const data = (msg as { data: number[] }).data;
            if (data && data.length >= 2) {
                setMotorCmd({ right: data[0], left: data[1] });
            }
        });

        return () => { motorTopic.unsubscribe(); };
    }, [ros, status]);

    // Subscribe to joint states
    useEffect(() => {
        if (!ros || status !== "connected") return;

        const jointTopic = new ROSLIB.Topic({
            ros,
            name: "joint_states",
            messageType: "sensor_msgs/JointState",
        });

        jointTopic.subscribe((msg) => {
            const m = msg as { name: string[]; velocity: number[] };
            if (m.velocity && m.velocity.length >= 2) {
                // Joint order may vary — map by index (from simple_controller: [0]=right, [1]=left)
                setJointVel({ right: m.velocity[0], left: m.velocity[1] });
            }
        });

        return () => { jointTopic.unsubscribe(); };
    }, [ros, status]);

    // Subscribe to amcl_pose for Waypoints
    useEffect(() => {
        if (!ros || status !== "connected") return;

        const poseTopic = new ROSLIB.Topic({
            ros,
            name: "/amcl_pose",
            messageType: "geometry_msgs/PoseWithCovarianceStamped",
        });

        poseTopic.subscribe((msg: any) => {
            const p = msg.pose.pose;
            const q = p.orientation;
            const yaw = 2 * Math.atan2(q.z, q.w);
            currentPoseRef.current = { x: p.position.x, y: p.position.y, yaw };
        });

        return () => { poseTopic.unsubscribe(); };
    }, [ros, status]);

    // ── Waypoint Handlers ──────────────────────────────

    const handlePrepareSave = () => {
        if (!currentPoseRef.current) {
            alert("No pose data received yet. Are AMCL and the robot running?");
            return;
        }
        setPendingWaypoint({
            x: currentPoseRef.current.x,
            y: currentPoseRef.current.y,
            theta: currentPoseRef.current.yaw
        });
    };

    const handleSaveWaypoint = async () => {
        if (!pendingWaypoint || !newWaypointName.trim()) return;
        setIsSavingWaypoint(true);
        const { error } = await supabase.from('waypoints').insert([{
            name: newWaypointName.trim(),
            x: pendingWaypoint.x,
            y: pendingWaypoint.y,
            theta: pendingWaypoint.theta
        }]);
        if (!error) {
            setNewWaypointName("");
            setPendingWaypoint(null);
            fetchWaypoints();
        }
        setIsSavingWaypoint(false);
    };

    const handleDeleteWaypoint = async (id: string) => {
        await supabase.from('waypoints').delete().eq('id', id);
        fetchWaypoints();
    };

    const handleGoToWaypoint = (wp: any) => {
        if (!ros || status !== "connected") return;
        const goalTopic = new ROSLIB.Topic({ ros, name: "/goal_pose", messageType: "geometry_msgs/PoseStamped" });
        goalTopic.publish({
            header: { frame_id: "map", stamp: { sec: 0, nanosec: 0 } },
            pose: { 
                position: { x: wp.x, y: wp.y, z: 0 }, 
                orientation: { x: 0, y: 0, z: Math.sin(wp.theta / 2), w: Math.cos(wp.theta / 2) } 
            },
        });
    };

    // ── Joystick pointer handlers ──────────────────────────

    const getJoyPosition = useCallback((clientX: number, clientY: number) => {
        if (!padRef.current) return { x: 0, y: 0 };
        const rect = padRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const maxR = (PAD_SIZE - KNOB_SIZE) / 2;

        let dx = clientX - cx;
        let dy = clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxR) {
            dx = (dx / dist) * maxR;
            dy = (dy / dist) * maxR;
        }

        return { x: dx / maxR, y: -dy / maxR }; // y inverted: up = positive
    }, []);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (!isAuthenticated) return;
        isDragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        const pos = getJoyPosition(e.clientX, e.clientY);
        setJoyX(pos.x);
        setJoyY(pos.y);
    }, [getJoyPosition, isAuthenticated]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current || !isAuthenticated) return;
        const pos = getJoyPosition(e.clientX, e.clientY);
        setJoyX(pos.x);
        setJoyY(pos.y);
    }, [getJoyPosition, isAuthenticated]);

    const onPointerUp = useCallback(() => {
        isDragging.current = false;
        setJoyX(0);
        setJoyY(0);
    }, []);

    // Computed values
    const linearVel = joyY * MAX_LINEAR;
    const angularVel = -joyX * MAX_ANGULAR;
    const knobOffsetX = joyX * (PAD_SIZE - KNOB_SIZE) / 2;
    const knobOffsetY = -joyY * (PAD_SIZE - KNOB_SIZE) / 2;

    return (
        <main style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Top bar */}
            <div style={{
                padding: "10px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(15, 10, 25, 0.95)",
                borderBottom: "1px solid rgba(155, 89, 182, 0.15)",
                marginTop: "70px", zIndex: 10,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
                        <span className="gradient-text">Teleop</span>
                    </h1>
                    <div style={{
                        width: "8px", height: "8px", borderRadius: "50%",
                        backgroundColor: status === "connected" ? "#00e676" : status === "connecting" ? "#ffab00" : "#ff1744",
                        boxShadow: `0 0 10px ${status === "connected" ? "#00e676" : status === "connecting" ? "#ffab00" : "#ff1744"}`,
                    }} />
                    <span style={{ fontSize: "0.7rem", opacity: 0.4, fontFamily: "monospace" }}>
                        {status === "connected" ? `connected via ${isLanMode ? 'LAN' : 'Ngrok'}` : status}
                    </span>
                </div>
                <span style={{ fontSize: "0.65rem", opacity: 0.3, fontFamily: "monospace" }}>
                    grace_controller/cmd_vel_unstamped @ {PUBLISH_RATE}Hz
                </span>
            </div>

            {/* Split layout: Map | Controls (stacks on mobile) */}
            <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", overflow: "hidden" }}>

                {/* LEFT: Camera Stream + Live map */}
                <div style={{
                    flex: isMobile ? "0 0 auto" : "1 1 60%",
                    display: "flex", flexDirection: "column", gap: "14px",
                    borderRight: isMobile ? "none" : "1px solid rgba(155, 89, 182, 0.12)",
                    borderBottom: isMobile ? "1px solid rgba(155, 89, 182, 0.12)" : "none",
                    padding: isMobile ? "12px" : "16px",
                    minWidth: 0,
                }}>
                    <CameraStream topic="/camera/camera/color/image_raw" />
                    <div style={{
                        position: "relative",
                        flex: 1,
                        minHeight: isMobile ? "250px" : "300px",
                        borderRadius: "12px",
                        overflow: "hidden",
                        border: "1px solid rgba(155, 89, 182, 0.15)",
                    }}>
                        <MapCanvas
                            ros={ros}
                            status={status}
                            enableNavGoal={true}
                            showTFLabels={false}
                            showLegend={false}
                        />
                        {/* Compact legend */}
                        <div style={{
                            position: "absolute", bottom: 8, left: 8,
                            background: "rgba(15,10,25,0.8)", borderRadius: 8,
                            padding: "6px 10px", fontSize: "0.6rem", lineHeight: 1.7,
                            border: "1px solid rgba(155,89,182,0.08)", backdropFilter: "blur(6px)",
                        }}>
                            <span style={{ color: "#00e676" }}>▲</span> Robot&ensp;
                            <span style={{ color: "#ff3232" }}>●</span> Laser&ensp;
                            <span style={{ color: "#0064ff" }}>━</span> Plan&ensp;
                            <span style={{ color: "#ff1744" }}>⊕</span> R-click = Goal
                        </div>
                    </div>
                </div>

                {/* RIGHT: Joystick + data panels */}
                <div style={{
                    flex: isMobile ? "1 1 auto" : "0 0 340px",
                    display: "flex", flexDirection: "column",
                    padding: isMobile ? "12px" : "16px",
                    gap: isMobile ? "10px" : "14px",
                    overflowY: "auto",
                    background: "rgba(15, 10, 25, 0.6)",
                    alignItems: isMobile ? "center" : "stretch",
                }}>

                    {/* Joystick */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                        <div
                            ref={padRef}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                            style={{
                                width: PAD_SIZE,
                                height: PAD_SIZE,
                                borderRadius: "50%",
                                background: "radial-gradient(circle, rgba(155, 89, 182, 0.08) 0%, rgba(155, 89, 182, 0.02) 100%)",
                                border: "2px solid rgba(155, 89, 182, 0.2)",
                                position: "relative",
                                touchAction: "none",
                                cursor: "grab",
                                userSelect: "none",
                            }}
                        >
                            {/* Crosshairs */}
                            <div style={{ position: "absolute", top: "50%", left: "10%", right: "10%", height: "1px", backgroundColor: "rgba(155, 89, 182, 0.15)" }} />
                            <div style={{ position: "absolute", left: "50%", top: "10%", bottom: "10%", width: "1px", backgroundColor: "rgba(155, 89, 182, 0.15)" }} />
                            {/* Knob */}
                            <div style={{
                                width: KNOB_SIZE, height: KNOB_SIZE, borderRadius: "50%",
                                background: isDragging.current
                                    ? "linear-gradient(135deg, var(--primary), var(--secondary))"
                                    : "linear-gradient(135deg, rgba(155, 89, 182, 0.5), rgba(183, 110, 121, 0.5))",
                                boxShadow: isDragging.current ? "0 0 20px rgba(155, 89, 182, 0.5)" : "0 0 10px rgba(155, 89, 182, 0.2)",
                                position: "absolute",
                                top: `calc(50% - ${KNOB_SIZE / 2}px + ${knobOffsetY}px)`,
                                left: `calc(50% - ${KNOB_SIZE / 2}px + ${knobOffsetX}px)`,
                                transition: isDragging.current ? "none" : "all 0.2s ease",
                                cursor: "grab",
                            }} />
                        </div>

                        {/* Lock overlay when not authenticated */}
                        {!isAuthenticated && (
                            <div style={{
                                position: "absolute", inset: 0,
                                borderRadius: "50%",
                                background: "rgba(10, 8, 20, 0.75)",
                                backdropFilter: "blur(3px)",
                                display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center",
                                gap: "6px", zIndex: 5,
                            }}>
                                <span style={{ fontSize: "1.5rem" }}>🔒</span>
                                <span style={{
                                    fontSize: "0.65rem", fontWeight: 600,
                                    color: "rgba(255,255,255,0.4)",
                                    textAlign: "center", padding: "0 20px",
                                }}>Login to control</span>
                            </div>
                        )}

                        {/* Velocity readout (compact) */}
                        <div style={{ display: "flex", gap: "20px", textAlign: "center" }}>
                            <div>
                                <div style={{ fontSize: "0.6rem", opacity: 0.4 }}>Linear m/s</div>
                                <div style={{
                                    fontFamily: "'JetBrains Mono', monospace", fontSize: "1.2rem", fontWeight: 700,
                                    color: Math.abs(linearVel) > 0.01 ? "var(--primary)" : "var(--text-secondary)",
                                }}>{linearVel.toFixed(3)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: "0.6rem", opacity: 0.4 }}>Angular rad/s</div>
                                <div style={{
                                    fontFamily: "'JetBrains Mono', monospace", fontSize: "1.2rem", fontWeight: 700,
                                    color: Math.abs(angularVel) > 0.01 ? "#E91E63" : "var(--text-secondary)",
                                }}>{angularVel.toFixed(3)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Motor commands */}
                    <div className="glass-card" style={{ padding: "12px" }}>
                        <h3 style={{ margin: "0 0 8px", fontSize: "0.8rem", opacity: 0.5 }}>⬆ Sent to Motors</h3>
                        <div style={{ fontSize: "0.6rem", opacity: 0.3, fontFamily: "monospace", marginBottom: 8 }}>
                            simple_velocity_controller/commands
                        </div>
                        {motorCmd ? (
                            <div style={{ display: "flex", gap: "1rem" }}>
                                <WheelGauge label="Left" value={motorCmd.left} unit="rad/s" color="var(--primary)" />
                                <WheelGauge label="Right" value={motorCmd.right} unit="rad/s" color="#E91E63" />
                            </div>
                        ) : (
                            <div style={{ textAlign: "center", opacity: 0.3, padding: "8px", fontSize: "0.75rem" }}>
                                {status === "connected" ? "Waiting…" : "Not connected"}
                            </div>
                        )}
                    </div>

                    {/* Encoder feedback */}
                    <div className="glass-card" style={{ padding: "12px" }}>
                        <h3 style={{ margin: "0 0 8px", fontSize: "0.8rem", opacity: 0.5 }}>⬇ Encoder Feedback</h3>
                        <div style={{ fontSize: "0.6rem", opacity: 0.3, fontFamily: "monospace", marginBottom: 8 }}>
                            joint_states
                        </div>
                        {jointVel ? (
                            <div style={{ display: "flex", gap: "1rem" }}>
                                <WheelGauge label="Left" value={jointVel.left} unit="rad/s" color="var(--primary)" />
                                <WheelGauge label="Right" value={jointVel.right} unit="rad/s" color="#E91E63" />
                            </div>
                        ) : (
                            <div style={{ textAlign: "center", opacity: 0.3, padding: "8px", fontSize: "0.75rem" }}>
                                {status === "connected" ? "Waiting…" : "Not connected"}
                            </div>
                        )}
                    </div>

                    {/* Saved Locations / Waypoints */}
                    <div className="glass-card" style={{ padding: "12px" }}>
                        <h3 style={{ margin: "0 0 10px", fontSize: "0.85rem", opacity: 0.8 }}>📍 Saved Locations</h3>
                        
                        {!pendingWaypoint ? (
                            <button
                                onClick={handlePrepareSave}
                                style={{
                                    width: "100%", padding: "8px", borderRadius: "6px",
                                    background: "rgba(0, 230, 118, 0.15)", border: "1px solid rgba(0, 230, 118, 0.3)",
                                    color: "#00e676", cursor: "pointer",
                                    fontSize: "0.75rem", fontWeight: 600, marginBottom: "12px"
                                }}
                            >
                                + Save Current Location
                            </button>
                        ) : (
                            <div style={{ background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: "8px", marginBottom: "12px" }}>
                                <div style={{ fontSize: "0.6rem", opacity: 0.6, fontFamily: "monospace", marginBottom: "6px" }}>
                                    X: {pendingWaypoint.x.toFixed(2)} | Y: {pendingWaypoint.y.toFixed(2)} | θ: {pendingWaypoint.theta.toFixed(2)}
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    <input
                                        type="text"
                                        placeholder="Location Name (e.g. Kitchen)"
                                        value={newWaypointName}
                                        onChange={(e) => setNewWaypointName(e.target.value)}
                                        style={{
                                            flex: 1, padding: "6px 8px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.2)",
                                            background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "0.75rem"
                                        }}
                                    />
                                    <button
                                        onClick={handleSaveWaypoint}
                                        disabled={isSavingWaypoint || !newWaypointName.trim()}
                                        style={{
                                            padding: "6px 12px", borderRadius: "4px", background: "#00e676", color: "#000",
                                            fontWeight: "bold", fontSize: "0.75rem", cursor: newWaypointName.trim() ? "pointer" : "not-allowed"
                                        }}
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setPendingWaypoint(null)}
                                        style={{
                                            padding: "6px", borderRadius: "4px", background: "rgba(255,23,68,0.2)", color: "#ff5252",
                                            border: "1px solid rgba(255,23,68,0.4)", cursor: "pointer"
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                            {waypoints.length === 0 ? (
                                <div style={{ textAlign: "center", opacity: 0.3, padding: "8px", fontSize: "0.7rem" }}>No locations saved yet</div>
                            ) : (
                                waypoints.map(wp => (
                                    <div key={wp.id} style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                                        padding: "6px 10px", borderRadius: "6px"
                                    }}>
                                        <button
                                            onClick={() => handleGoToWaypoint(wp)}
                                            style={{
                                                flex: 1, textAlign: "left", background: "transparent", border: "none", color: "#fff",
                                                cursor: "pointer", display: "flex", flexDirection: "column", gap: "2px"
                                            }}
                                        >
                                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#9b59b6" }}>{wp.name}</span>
                                            <span style={{ fontSize: "0.55rem", opacity: 0.5, fontFamily: "monospace" }}>
                                                {wp.x.toFixed(1)}, {wp.y.toFixed(1)}, {wp.theta.toFixed(1)} rad
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteWaypoint(wp.id)}
                                            style={{
                                                background: "transparent", border: "none", color: "rgba(255,23,68,0.7)", cursor: "pointer",
                                                padding: "4px", fontSize: "0.9rem"
                                            }}
                                            title="Delete Location"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

/* ── Wheel speed gauge sub-component ── */
function WheelGauge({ label, value, unit, color }: {
    label: string; value: number; unit: string; color: string;
}) {
    return (
        <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", opacity: 0.5, marginBottom: "6px" }}>{label}</div>
            <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "1.3rem",
                fontWeight: 700,
                color: Math.abs(value) > 0.01 ? color : "var(--text-secondary)",
                transition: "color 0.2s ease",
            }}>
                {value.toFixed(3)}
            </div>
            <div style={{ fontSize: "0.65rem", opacity: 0.35 }}>{unit}</div>
        </div>
    );
}
