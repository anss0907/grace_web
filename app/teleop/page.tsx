"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useROS } from "../lib/useROS";
import * as ROSLIB from "roslib";
import MapCanvas from "../components/MapCanvas";

// Joystick constants
const PAD_SIZE = 220;
const KNOB_SIZE = 70;
const MAX_LINEAR = 0.5;   // m/s
const MAX_ANGULAR = 1.5;  // rad/s
const PUBLISH_RATE = 10;  // Hz

export default function TeleopPage() {
    const { ros, status } = useROS();

    // Joystick state
    const [joyX, setJoyX] = useState(0); // -1 to 1 (left/right → angular)
    const [joyY, setJoyY] = useState(0); // -1 to 1 (up/down → linear)
    const isDragging = useRef(false);
    const padRef = useRef<HTMLDivElement>(null);

    // Motor command monitoring (simple_velocity_controller/commands)
    const [motorCmd, setMotorCmd] = useState<{ left: number; right: number } | null>(null);

    // Joint state monitoring (joint_states)
    const [jointVel, setJointVel] = useState<{ left: number; right: number } | null>(null);

    // Publish timer ref
    const publishTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const latestJoy = useRef({ x: 0, y: 0 });

    // Keep latest joystick values in ref for the publish timer
    useEffect(() => {
        latestJoy.current = { x: joyX, y: joyY };
    }, [joyX, joyY]);

    // Publish Twist at fixed rate
    useEffect(() => {
        if (!ros || status !== "connected") return;

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
    }, [ros, status]);

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
        isDragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        const pos = getJoyPosition(e.clientX, e.clientY);
        setJoyX(pos.x);
        setJoyY(pos.y);
    }, [getJoyPosition]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current) return;
        const pos = getJoyPosition(e.clientX, e.clientY);
        setJoyX(pos.x);
        setJoyY(pos.y);
    }, [getJoyPosition]);

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
                        {status === "connected" ? "rosbridge connected" : status}
                    </span>
                </div>
                <span style={{ fontSize: "0.65rem", opacity: 0.3, fontFamily: "monospace" }}>
                    grace_controller/cmd_vel_unstamped @ {PUBLISH_RATE}Hz
                </span>
            </div>

            {/* Split layout: Map | Controls */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

                {/* LEFT: Live map */}
                <div style={{
                    flex: "1 1 60%",
                    borderRight: "1px solid rgba(155, 89, 182, 0.12)",
                    position: "relative",
                    minWidth: 0,
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

                {/* RIGHT: Joystick + data panels */}
                <div style={{
                    flex: "0 0 340px",
                    display: "flex", flexDirection: "column",
                    padding: "16px",
                    gap: "14px",
                    overflowY: "auto",
                    background: "rgba(15, 10, 25, 0.6)",
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
