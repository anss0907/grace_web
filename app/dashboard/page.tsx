"use client";

import { useEffect, useState } from "react";
import { useROS } from "../lib/useROS";
import * as ROSLIB from "roslib";

/* ── Constants ──────────────────────────────────── */
const MAX_GAUGE_VALUE = 180; // RPM — motor speed range is -180 to 180
const GAUGE_SIZE = 200;
const NEEDLE_LENGTH = 70;

/* ── Types ──────────────────────────────────────── */
interface MotorVelocities {
    left: number;
    right: number;
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
export default function DashboardPage() {
    const { ros, status } = useROS();

    // Motor commands sent TO the motors
    const [motorCmd, setMotorCmd] = useState<MotorVelocities | null>(null);
    // Encoder feedback FROM the motors
    const [encoderFb, setEncoderFb] = useState<MotorVelocities | null>(null);



    // Subscribe to motor command topic
    useEffect(() => {
        if (!ros || status !== "connected") return;

        const topic = new ROSLIB.Topic({
            ros,
            name: "simple_velocity_controller/commands",
            messageType: "std_msgs/Float64MultiArray",
        });

        topic.subscribe((msg) => {
            const data = (msg as { data: number[] }).data;
            if (data && data.length >= 2) {
                setMotorCmd({ right: data[0], left: data[1] });
            }
        });

        return () => { topic.unsubscribe(); };
    }, [ros, status]);

    // Subscribe to joint states (encoder feedback)
    useEffect(() => {
        if (!ros || status !== "connected") return;

        const topic = new ROSLIB.Topic({
            ros,
            name: "joint_states",
            messageType: "sensor_msgs/JointState",
        });

        topic.subscribe((msg) => {
            const m = msg as { name: string[]; velocity: number[] };
            if (m.velocity && m.velocity.length >= 2) {
                setEncoderFb({ right: m.velocity[0], left: m.velocity[1] });
            }
        });

        return () => { topic.unsubscribe(); };
    }, [ros, status]);

    const cmdLeft = motorCmd?.left ?? 0;
    const cmdRight = motorCmd?.right ?? 0;
    const fbLeft = encoderFb?.left ?? 0;
    const fbRight = encoderFb?.right ?? 0;

    return (
        <main className="page-container" style={{ minHeight: "100vh", paddingTop: "100px", paddingBottom: "60px" }}>
            <section style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px" }}>

                {/* ── Header ── */}
                <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                    <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, margin: 0 }}>
                        <span className="gradient-text">Dashboard</span>
                    </h1>
                    <p style={{ opacity: 0.5, fontSize: "0.9rem", marginTop: "8px" }}>
                        Real-time motor velocity monitoring
                    </p>
                    <ConnectionBadge status={status} />
                </div>

                {/* ── Rosbridge Launch Notice ── */}
                {status !== "connected" && (
                    <div style={{
                        padding: "16px 20px",
                        borderRadius: "16px",
                        background: "rgba(255, 171, 0, 0.08)",
                        border: "1px solid rgba(255, 171, 0, 0.25)",
                        marginBottom: "2rem",
                        fontSize: "0.82rem",
                        lineHeight: 1.7,
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                            <span style={{ fontSize: "1rem" }}>⚠️</span>
                            <strong style={{ color: "#ffab00" }}>Rosbridge Required</strong>
                        </div>
                        <p style={{ margin: "0 0 8px", opacity: 0.7 }}>
                            Make sure the rosbridge WebSocket server is running before using the dashboard:
                        </p>
                        <code style={{
                            display: "block",
                            padding: "10px 14px",
                            borderRadius: "10px",
                            background: "rgba(0,0,0,0.3)",
                            color: "#ffab00",
                            fontSize: "0.78rem",
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            userSelect: "all",
                        }}>
                            ros2 launch rosbridge_server rosbridge_websocket_launch.xml
                        </code>
                        <p style={{ margin: "8px 0 0", opacity: 0.4, fontSize: "0.7rem", fontStyle: "italic" }}>
                            Production phase — this notice will be removed once rosbridge is added to the main launch file.
                        </p>
                    </div>
                )}

                {/* ── LEFT MOTOR ROW ── */}
                <MotorRowHeader label="Left Motor" icon="◀" />
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "2rem",
                }}>
                    <GaugeChart
                        label="Command"
                        value={cmdLeft}
                        maxValue={MAX_GAUGE_VALUE}
                        color="#9b59b6"
                        accentColor="#c084fc"
                        direction="⬆ Sending"
                    />
                    <GaugeChart
                        label="Feedback"
                        value={fbLeft}
                        maxValue={MAX_GAUGE_VALUE}
                        color="#00e676"
                        accentColor="#6ee7b7"
                        direction="⬇ Receiving"
                    />
                </div>

                {/* ── RIGHT MOTOR ROW ── */}
                <MotorRowHeader label="Right Motor" icon="▶" />
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "2rem",
                }}>
                    <GaugeChart
                        label="Command"
                        value={cmdRight}
                        maxValue={MAX_GAUGE_VALUE}
                        color="#E91E63"
                        accentColor="#f472b6"
                        direction="⬆ Sending"
                    />
                    <GaugeChart
                        label="Feedback"
                        value={fbRight}
                        maxValue={MAX_GAUGE_VALUE}
                        color="#00bcd4"
                        accentColor="#67e8f9"
                        direction="⬇ Receiving"
                    />
                </div>

                {/* ── Topic Badges ── */}
                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "24px",
                    flexWrap: "wrap",
                }}>
                    <TopicBadge
                        direction="⬆"
                        label="Commands"
                        topic="simple_velocity_controller/commands"
                        color="#9b59b6"
                    />
                    <TopicBadge
                        direction="⬇"
                        label="Feedback"
                        topic="joint_states"
                        color="#00e676"
                    />
                </div>

            </section>
        </main>
    );
}

/* ═══════════════════════════════════════════════════
   MOTOR ROW HEADER
   ═══════════════════════════════════════════════════ */
function MotorRowHeader({ label, icon }: { label: string; icon: string }) {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "12px",
            paddingLeft: "4px",
        }}>
            <span style={{ fontSize: "0.9rem" }}>{icon}</span>
            <span style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                opacity: 0.45,
            }}>{label}</span>
            <div style={{
                flex: 1,
                height: "1px",
                background: "linear-gradient(90deg, rgba(255,255,255,0.1), transparent)",
            }} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CONNECTION BADGE
   ═══════════════════════════════════════════════════ */
function ConnectionBadge({ status }: { status: string }) {
    const color =
        status === "connected" ? "#00e676" :
            status === "connecting" ? "#ffab00" : "#ff1744";
    const text =
        status === "connected" ? "Connected" :
            status === "connecting" ? "Connecting…" : "Disconnected";

    return (
        <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "12px",
            padding: "6px 18px",
            borderRadius: "24px",
            backgroundColor: `${color}15`,
            border: `1px solid ${color}30`,
        }}>
            <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                backgroundColor: color,
                boxShadow: `0 0 10px ${color}`,
                animation: status === "connecting" ? "pulse 1.5s infinite" : "none",
            }} />
            <span style={{ fontSize: "0.8rem", fontWeight: 500, color }}>{text}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   TOPIC BADGE
   ═══════════════════════════════════════════════════ */
function TopicBadge({ direction, label, topic, color }: {
    direction: string; label: string; topic: string; color: string;
}) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "6px 14px", borderRadius: "12px",
            backgroundColor: `${color}10`,
            border: `1px solid ${color}20`,
        }}>
            <span style={{ fontSize: "0.75rem" }}>{direction}</span>
            <span style={{ fontSize: "0.7rem", opacity: 0.5 }}>{label}:</span>
            <code style={{
                fontSize: "0.7rem", color,
                backgroundColor: `${color}15`,
                padding: "2px 6px", borderRadius: "4px",
            }}>{topic}</code>
        </div>
    );
}

function GaugeChart({ label, value, maxValue, color, accentColor, direction }: {
    label: string; value: number; maxValue: number; color: string; accentColor: string; direction?: string;
}) {
    // Clamp value within [-max, +max]
    const clampedValue = Math.max(-maxValue, Math.min(maxValue, value));
    const fraction = clampedValue / maxValue; // -1 to +1
    const isActive = Math.abs(clampedValue) > 0.5;

    // Gauge geometry
    const cx = GAUGE_SIZE / 2;
    const cy = GAUGE_SIZE / 2 + 10;
    const arcRadius = 75;
    const arcStroke = 8;

    // Full arc: 270° from -225° to +45°  (bottom-left to bottom-right)
    // Center (zero) is at -90° (straight up)
    const ARC_START = -225;
    const ARC_END = 45;
    const ARC_SPAN = ARC_END - ARC_START; // 270°
    const CENTER_ANGLE = -90; // zero point = top dead center

    // Needle angle: map fraction [-1..+1] → [ARC_START..ARC_END]
    const needleAngleDeg = CENTER_ANGLE + fraction * (ARC_SPAN / 2);
    const needleAngleRad = (needleAngleDeg * Math.PI) / 180;

    const needleX = cx + NEEDLE_LENGTH * Math.cos(needleAngleRad);
    const needleY = cy + NEEDLE_LENGTH * Math.sin(needleAngleRad);

    // Background arc (full 270°)
    const bgArcPath = describeArc(cx, cy, arcRadius, ARC_START, ARC_END);

    // Filled arc: from center outward in the direction of value
    let filledArcPath = "";
    if (Math.abs(fraction) > 0.003) {
        if (fraction > 0) {
            filledArcPath = describeArc(cx, cy, arcRadius, CENTER_ANGLE, CENTER_ANGLE + fraction * (ARC_SPAN / 2));
        } else {
            filledArcPath = describeArc(cx, cy, arcRadius, CENTER_ANGLE + fraction * (ARC_SPAN / 2), CENTER_ANGLE);
        }
    }

    // Tick marks: -180, -135, -90, -45, 0, 45, 90, 135, 180  (9 major positions)
    const ticks: {
        x1: number; y1: number; x2: number; y2: number;
        major: boolean; val: string; labelX: number; labelY: number;
    }[] = [];
    const numTicks = 18; // 18 divisions = ticks every 15°
    for (let i = 0; i <= numTicks; i++) {
        const angle = ARC_START + (i / numTicks) * ARC_SPAN;
        const rad = (angle * Math.PI) / 180;
        const outerR = arcRadius + 12;
        const isMajor = i % 3 === 0; // every 3rd tick = 45 RPM increments
        const isZero = i === numTicks / 2;
        const innerR = arcRadius + (isMajor ? 5 : 9);

        // Label value: map i from 0..numTicks → -180..+180
        const tickValue = -maxValue + (i / numTicks) * 2 * maxValue;

        ticks.push({
            x1: cx + innerR * Math.cos(rad),
            y1: cy + innerR * Math.sin(rad),
            x2: cx + outerR * Math.cos(rad),
            y2: cy + outerR * Math.sin(rad),
            major: isMajor,
            val: isZero ? "0" : tickValue.toFixed(0),
            labelX: cx + (outerR + 13) * Math.cos(rad),
            labelY: cy + (outerR + 13) * Math.sin(rad),
        });
    }

    // Unique ID for this gauge
    const uid = label.replace(/\s/g, "") + direction?.replace(/\s/g, "");

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "24px 12px 16px",
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 0.015)",
            border: `1px solid ${isActive ? `${color}25` : "rgba(255,255,255,0.05)"}`,
            backdropFilter: "blur(12px)",
            boxShadow: isActive
                ? `0 8px 32px rgba(0,0,0,0.3), 0 0 30px ${color}10`
                : "0 8px 32px rgba(0,0,0,0.3)",
            position: "relative",
            overflow: "hidden",
            transition: "border-color 0.4s ease, box-shadow 0.4s ease",
        }}>
            {/* Animated background glow */}
            <div style={{
                position: "absolute",
                top: "30%", left: "50%",
                width: isActive ? "160px" : "100px",
                height: isActive ? "160px" : "100px",
                background: `radial-gradient(circle, ${color}${isActive ? "18" : "08"} 0%, transparent 70%)`,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                transition: "all 0.5s ease",
            }} />

            <svg
                width={GAUGE_SIZE}
                height={GAUGE_SIZE * 0.75}
                viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE * 0.75}`}
                style={{ overflow: "visible" }}
            >
                <defs>
                    {/* Gradient for positive fill */}
                    <linearGradient id={`grad-pos-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={accentColor} stopOpacity={1} />
                    </linearGradient>
                    {/* Gradient for negative fill */}
                    <linearGradient id={`grad-neg-${uid}`} x1="100%" y1="0%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={accentColor} stopOpacity={1} />
                    </linearGradient>
                    <filter id={`glow-${uid}`}>
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id={`needle-glow-${uid}`}>
                        <feGaussianBlur stdDeviation={isActive ? "3" : "1.5"} result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background arc */}
                <path
                    d={bgArcPath}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={arcStroke}
                    strokeLinecap="round"
                />

                {/* Zero marker line (subtle) */}
                {(() => {
                    const zeroRad = (CENTER_ANGLE * Math.PI) / 180;
                    return (
                        <line
                            x1={cx + (arcRadius - 4) * Math.cos(zeroRad)}
                            y1={cy + (arcRadius - 4) * Math.sin(zeroRad)}
                            x2={cx + (arcRadius + 14) * Math.cos(zeroRad)}
                            y2={cy + (arcRadius + 14) * Math.sin(zeroRad)}
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth={2}
                            strokeLinecap="round"
                        />
                    );
                })()}

                {/* Filled arc from center outward */}
                {filledArcPath && (
                    <path
                        d={filledArcPath}
                        fill="none"
                        stroke={`url(#grad-${fraction >= 0 ? "pos" : "neg"}-${uid})`}
                        strokeWidth={arcStroke + 1}
                        strokeLinecap="round"
                        filter={`url(#glow-${uid})`}
                    />
                )}

                {/* Tick marks */}
                {ticks.map((t, i) => (
                    <g key={i}>
                        <line
                            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                            stroke={t.major ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}
                            strokeWidth={t.major ? 1.5 : 0.8}
                        />
                        {t.major && (
                            <text
                                x={t.labelX} y={t.labelY}
                                textAnchor="middle" dominantBaseline="middle"
                                fill="rgba(255,255,255,0.25)"
                                fontSize="8" fontFamily="'JetBrains Mono', monospace"
                            >
                                {t.val}
                            </text>
                        )}
                    </g>
                ))}

                {/* Needle */}
                <line
                    x1={cx} y1={cy}
                    x2={needleX} y2={needleY}
                    stroke={isActive ? color : "rgba(255,255,255,0.2)"}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    filter={`url(#needle-glow-${uid})`}
                    style={{ transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
                />

                {/* Center dot */}
                <circle
                    cx={cx} cy={cy} r={6}
                    fill={isActive ? color : "rgba(255,255,255,0.15)"}
                    opacity={0.8}
                    style={{ transition: "fill 0.3s ease" }}
                />
                <circle cx={cx} cy={cy} r={2.5} fill="#fff" opacity={0.6} />
            </svg>

            {/* Digital value under gauge */}
            <div style={{
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: "1.4rem",
                fontWeight: 700,
                color: isActive ? color : "rgba(255,255,255,0.2)",
                marginTop: "-4px",
                transition: "color 0.3s ease",
            }}>
                {clampedValue >= 0 && clampedValue > 0.5 ? "+" : ""}{clampedValue.toFixed(1)}
                <span style={{ fontSize: "0.55rem", opacity: 0.5, marginLeft: "4px" }}>RPM</span>
            </div>

            {/* Label */}
            <div style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "1px",
                opacity: 0.4,
                marginTop: "6px",
            }}>{label}</div>

            {/* Direction tag */}
            {direction && (
                <div style={{
                    fontSize: "0.6rem",
                    opacity: 0.3,
                    marginTop: "4px",
                }}>{direction}</div>
            )}
        </div>
    );
}

/* ── SVG Arc Helper ─────────────────────────────── */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
    };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, endAngle);
    const sweep = endAngle - startAngle;
    const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
    const sweepFlag = sweep > 0 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`;
}

