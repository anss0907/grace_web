"use client";

import { useEffect, useRef, useCallback } from "react";
import * as ROSLIB from "roslib";

// ── Types ──────────────────────────────────────────────────

interface OccupancyGridMsg {
    info: {
        width: number;
        height: number;
        resolution: number;
        origin: { position: { x: number; y: number }; orientation: { z: number; w: number } };
    };
    data: number[];
}

interface PoseMsg {
    position: { x: number; y: number; z: number };
    orientation: { x: number; y: number; z: number; w: number };
}

interface PathMsg {
    poses: { pose: PoseMsg }[];
}

interface LaserScanMsg {
    angle_min: number;
    angle_max: number;
    angle_increment: number;
    ranges: number[];
    range_min: number;
    range_max: number;
}

interface PolygonMsg {
    polygon: { points: { x: number; y: number }[] };
}

interface PoseArrayMsg {
    poses: PoseMsg[];
}

interface TFTransformMsg {
    transforms: {
        header: { frame_id: string };
        child_frame_id: string;
        transform: {
            translation: { x: number; y: number; z: number };
            rotation: { x: number; y: number; z: number; w: number };
        };
    }[];
}

interface Transform2D {
    x: number;
    y: number;
    yaw: number;
}

// ── Config ─────────────────────────────────────────────────

const TF_FRAMES_TO_SHOW = [
    // "map", "odom",
    "base_footprint",
    // "base_link", "base_scan",
    // "wheel_left_link", "wheel_right_link",
    // "caster_back_left_link", "caster_back_right_link",
    // "imu_link",
];

const TF_FRAME_COLORS: Record<string, string> = {
    map: "#ffffff",
    odom: "#aaaaaa",
    base_footprint: "#00e676",
    base_link: "#00e676",
    base_scan: "#ff5252",
    wheel_left_link: "#ffab40",
    wheel_right_link: "#ffab40",
    caster_back_left_link: "#80cbc4",
    caster_back_right_link: "#80cbc4",
    imu_link: "#ce93d8",
};

// ── Helpers ────────────────────────────────────────────────

function quatToYaw(q: { x?: number; y?: number; z: number; w: number }) {
    return 2 * Math.atan2(q.z, q.w);
}

function compose2D(parent: Transform2D, child: Transform2D): Transform2D {
    const cos = Math.cos(parent.yaw);
    const sin = Math.sin(parent.yaw);
    return {
        x: parent.x + cos * child.x - sin * child.y,
        y: parent.y + sin * child.x + cos * child.y,
        yaw: parent.yaw + child.yaw,
    };
}

function gridToImageData(msg: OccupancyGridMsg, mode: "map" | "costmap") {
    const { width, height } = msg.info;
    const imgData = new ImageData(width, height);
    const d = imgData.data;

    for (let row = 0; row < height; row++) {
        // Flip vertically: OccupancyGrid row 0 = bottom of map, ImageData row 0 = top of image
        const dstRow = height - 1 - row;
        for (let col = 0; col < width; col++) {
            const srcIdx = row * width + col;
            const dstIdx = (dstRow * width + col) * 4;
            const val = msg.data[srcIdx];

            if (mode === "map") {
                if (val === -1) {
                    d[dstIdx] = 128; d[dstIdx + 1] = 128; d[dstIdx + 2] = 128; d[dstIdx + 3] = 255;
                } else {
                    const c = 255 - Math.round((val / 100) * 255);
                    d[dstIdx] = c; d[dstIdx + 1] = c; d[dstIdx + 2] = c; d[dstIdx + 3] = 255;
                }
            } else {
                if (val === 0 || val === -1) {
                    d[dstIdx + 3] = 0;
                } else if (val >= 99) {
                    d[dstIdx] = 155; d[dstIdx + 1] = 0; d[dstIdx + 2] = 200; d[dstIdx + 3] = 140;
                } else if (val >= 50) {
                    d[dstIdx] = 230; d[dstIdx + 1] = 130; d[dstIdx + 2] = 0; d[dstIdx + 3] = 100;
                } else {
                    d[dstIdx] = 255; d[dstIdx + 1] = 255; d[dstIdx + 2] = 0; d[dstIdx + 3] = 60;
                }
            }
        }
    }
    return imgData;
}

// ── Props ──────────────────────────────────────────────────

interface MapCanvasProps {
    ros: ROSLIB.Ros | null;
    status: string;
    /** Allow right-click to publish nav goals */
    enableNavGoal?: boolean;
    /** Show TF frame labels */
    showTFLabels?: boolean;
    /** Show legend overlay */
    showLegend?: boolean;
    /** CSS style overrides for the container */
    style?: React.CSSProperties;
}

// ── Component ──────────────────────────────────────────────

export default function MapCanvas({
    ros,
    status,
    enableNavGoal = true,
    showTFLabels = true,
    showLegend = false,
    style,
}: MapCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Data refs
    const mapData = useRef<{ img: ImageData; info: OccupancyGridMsg["info"] } | null>(null);
    const globalCostmap = useRef<{ img: ImageData; info: OccupancyGridMsg["info"] } | null>(null);
    const localCostmap = useRef<{ img: ImageData; info: OccupancyGridMsg["info"] } | null>(null);
    const robotPose = useRef<{ x: number; y: number; yaw: number } | null>(null);
    const laserPoints = useRef<{ x: number; y: number }[]>([]);
    const globalPath = useRef<{ x: number; y: number }[]>([]);
    const localPath = useRef<{ x: number; y: number }[]>([]);
    const footprint = useRef<{ x: number; y: number }[]>([]);
    const particles = useRef<{ x: number; y: number }[]>([]);
    const goalPose = useRef<{ x: number; y: number } | null>(null);
    const tfStore = useRef<Map<string, { parent: string; tf: Transform2D }>>(new Map());
    const tfFramePositions = useRef<Map<string, Transform2D>>(new Map());

    // Pan & zoom
    const viewOffset = useRef({ x: 0, y: 0 });
    const viewScale = useRef(1);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });
    const hasAutocentered = useRef(false);

    // ── Coordinate transforms ──────────────────────────────

    const worldToCanvas = useCallback((wx: number, wy: number) => {
        if (!mapData.current) return { cx: 0, cy: 0 };
        const info = mapData.current.info;
        const px = (wx - info.origin.position.x) / info.resolution;
        const py = info.height - (wy - info.origin.position.y) / info.resolution;
        return {
            cx: px * viewScale.current + viewOffset.current.x,
            cy: py * viewScale.current + viewOffset.current.y,
        };
    }, []);

    const canvasToWorld = useCallback((cx: number, cy: number) => {
        if (!mapData.current) return { wx: 0, wy: 0 };
        const info = mapData.current.info;
        const px = (cx - viewOffset.current.x) / viewScale.current;
        const py = (cy - viewOffset.current.y) / viewScale.current;
        return {
            wx: px * info.resolution + info.origin.position.x,
            wy: (info.height - py) * info.resolution + info.origin.position.y,
        };
    }, []);

    // ── ROS subscriptions ──────────────────────────────────

    useEffect(() => {
        if (!ros || status !== "connected") return;

        const subs: ROSLIB.Topic<unknown>[] = [];

        function sub<T>(name: string, type: string, cb: (msg: T) => void) {
            const t = new ROSLIB.Topic({ ros: ros!, name, messageType: type });
            t.subscribe((m) => cb(m as T));
            subs.push(t);
        }

        sub<OccupancyGridMsg>("/map", "nav_msgs/OccupancyGrid", (msg) => {
            mapData.current = { img: gridToImageData(msg, "map"), info: msg.info };
            if (!hasAutocentered.current && canvasRef.current) {
                hasAutocentered.current = true;
                const canvas = canvasRef.current;
                const s = Math.min(canvas.width / msg.info.width, canvas.height / msg.info.height) * 0.9;
                viewScale.current = s;
                viewOffset.current = {
                    x: (canvas.width - msg.info.width * s) / 2,
                    y: (canvas.height - msg.info.height * s) / 2,
                };
            }
        });

        sub<OccupancyGridMsg>("/global_costmap/costmap", "nav_msgs/OccupancyGrid", (msg) => {
            globalCostmap.current = { img: gridToImageData(msg, "costmap"), info: msg.info };
        });

        sub<OccupancyGridMsg>("/local_costmap/costmap", "nav_msgs/OccupancyGrid", (msg) => {
            localCostmap.current = { img: gridToImageData(msg, "costmap"), info: msg.info };
        });

        sub<{ pose: { pose: PoseMsg } }>("/amcl_pose", "geometry_msgs/PoseWithCovarianceStamped", (msg) => {
            const p = msg.pose.pose;
            robotPose.current = { x: p.position.x, y: p.position.y, yaw: quatToYaw(p.orientation) };
        });

        sub<LaserScanMsg>("/scan", "sensor_msgs/LaserScan", (msg) => {
            if (!robotPose.current) return;
            const rp = robotPose.current;
            const pts: { x: number; y: number }[] = [];
            let angle = msg.angle_min;
            for (let i = 0; i < msg.ranges.length; i++) {
                const r = msg.ranges[i];
                if (r >= msg.range_min && r <= msg.range_max) {
                    const absAngle = rp.yaw + angle;
                    pts.push({ x: rp.x + r * Math.cos(absAngle), y: rp.y + r * Math.sin(absAngle) });
                }
                angle += msg.angle_increment;
            }
            laserPoints.current = pts;
        });

        sub<PathMsg>("/plan", "nav_msgs/Path", (msg) => {
            globalPath.current = msg.poses.map((p) => ({ x: p.pose.position.x, y: p.pose.position.y }));
        });

        sub<PathMsg>("/local_plan", "nav_msgs/Path", (msg) => {
            localPath.current = msg.poses.map((p) => ({ x: p.pose.position.x, y: p.pose.position.y }));
        });

        sub<PolygonMsg>("/local_costmap/published_footprint", "geometry_msgs/PolygonStamped", (msg) => {
            footprint.current = msg.polygon.points.map((p) => ({ x: p.x, y: p.y }));
        });

        sub<PoseArrayMsg>("/particle_cloud", "geometry_msgs/PoseArray", (msg) => {
            particles.current = msg.poses.map((p) => ({ x: p.position.x, y: p.position.y }));
        });

        function handleTF(msg: TFTransformMsg) {
            for (const t of msg.transforms) {
                const child = t.child_frame_id.replace(/^\//, "");
                const parent = t.header.frame_id.replace(/^\//, "");
                if (child.startsWith("camera")) continue;
                tfStore.current.set(child, {
                    parent,
                    tf: { x: t.transform.translation.x, y: t.transform.translation.y, yaw: quatToYaw(t.transform.rotation) },
                });
            }
            function resolveFrame(frame: string, visited: Set<string>): Transform2D | null {
                if (frame === "map") return { x: 0, y: 0, yaw: 0 };
                if (visited.has(frame)) return null;
                visited.add(frame);
                const entry = tfStore.current.get(frame);
                if (!entry) return null;
                const parentTF = resolveFrame(entry.parent, visited);
                if (!parentTF) return null;
                return compose2D(parentTF, entry.tf);
            }
            const positions = new Map<string, Transform2D>();
            positions.set("map", { x: 0, y: 0, yaw: 0 });
            for (const frame of TF_FRAMES_TO_SHOW) {
                if (frame === "map") continue;
                const resolved = resolveFrame(frame, new Set());
                if (resolved) positions.set(frame, resolved);
            }
            tfFramePositions.current = positions;
        }

        sub<TFTransformMsg>("/tf", "tf2_msgs/TFMessage", handleTF);
        sub<TFTransformMsg>("/tf_static", "tf2_msgs/TFMessage", handleTF);

        return () => { subs.forEach((s) => s.unsubscribe()); };
    }, [ros, status]);

    // ── Render loop ────────────────────────────────────────

    useEffect(() => {
        let animId: number;

        function draw() {
            const canvas = canvasRef.current;
            if (!canvas) { animId = requestAnimationFrame(draw); return; }
            const ctx = canvas.getContext("2d");
            if (!ctx) { animId = requestAnimationFrame(draw); return; }

            const rect = canvas.parentElement?.getBoundingClientRect();
            if (rect) { canvas.width = rect.width; canvas.height = rect.height; }

            const scale = viewScale.current;
            const off = viewOffset.current;

            ctx.fillStyle = "#1a1a2e";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Base map
            if (mapData.current) {
                const tmp = document.createElement("canvas");
                tmp.width = mapData.current.info.width;
                tmp.height = mapData.current.info.height;
                tmp.getContext("2d")!.putImageData(mapData.current.img, 0, 0);
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(tmp, off.x, off.y, mapData.current.info.width * scale, mapData.current.info.height * scale);
            }

            // Costmap overlay helper
            function drawCostmap(c: CanvasRenderingContext2D, cm: { img: ImageData; info: OccupancyGridMsg["info"] } | null) {
                if (!cm || !mapData.current) return;
                const mi = mapData.current.info;
                const tmp = document.createElement("canvas");
                tmp.width = cm.info.width;
                tmp.height = cm.info.height;
                tmp.getContext("2d")!.putImageData(cm.img, 0, 0);
                const ratio = cm.info.resolution / mi.resolution;
                const ox = (cm.info.origin.position.x - mi.origin.position.x) / mi.resolution;
                const oy = mi.height - (cm.info.origin.position.y - mi.origin.position.y) / mi.resolution - cm.info.height * ratio;
                c.drawImage(tmp, off.x + ox * scale, off.y + oy * scale, cm.info.width * ratio * scale, cm.info.height * ratio * scale);
            }

            drawCostmap(ctx, globalCostmap.current);
            drawCostmap(ctx, localCostmap.current);

            // AMCL particles
            if (particles.current.length > 0) {
                ctx.fillStyle = "rgba(0, 200, 80, 0.3)";
                for (const p of particles.current) {
                    const { cx, cy } = worldToCanvas(p.x, p.y);
                    ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
                }
            }

            // Global plan (blue)
            if (globalPath.current.length > 1) {
                ctx.strokeStyle = "rgba(0, 100, 255, 0.8)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                const f = worldToCanvas(globalPath.current[0].x, globalPath.current[0].y);
                ctx.moveTo(f.cx, f.cy);
                for (let i = 1; i < globalPath.current.length; i++) {
                    const pt = worldToCanvas(globalPath.current[i].x, globalPath.current[i].y);
                    ctx.lineTo(pt.cx, pt.cy);
                }
                ctx.stroke();
            }

            // Local plan (purple)
            if (localPath.current.length > 1) {
                ctx.strokeStyle = "rgba(180, 0, 255, 0.8)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                const f = worldToCanvas(localPath.current[0].x, localPath.current[0].y);
                ctx.moveTo(f.cx, f.cy);
                for (let i = 1; i < localPath.current.length; i++) {
                    const pt = worldToCanvas(localPath.current[i].x, localPath.current[i].y);
                    ctx.lineTo(pt.cx, pt.cy);
                }
                ctx.stroke();
            }

            // Laser scan (red)
            if (laserPoints.current.length > 0) {
                ctx.fillStyle = "rgba(255, 50, 50, 0.8)";
                for (const p of laserPoints.current) {
                    const { cx, cy } = worldToCanvas(p.x, p.y);
                    ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
                }
            }

            // Robot footprint (green polygon)
            if (footprint.current.length > 2) {
                ctx.strokeStyle = "rgba(25, 255, 0, 0.8)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                const f0 = worldToCanvas(footprint.current[0].x, footprint.current[0].y);
                ctx.moveTo(f0.cx, f0.cy);
                for (let i = 1; i < footprint.current.length; i++) {
                    const fp = worldToCanvas(footprint.current[i].x, footprint.current[i].y);
                    ctx.lineTo(fp.cx, fp.cy);
                }
                ctx.closePath(); ctx.stroke();
            }

            // Robot arrow
            if (robotPose.current) {
                const rp = robotPose.current;
                const { cx, cy } = worldToCanvas(rp.x, rp.y);
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(-rp.yaw);
                ctx.fillStyle = "#00e676";
                ctx.beginPath();
                ctx.moveTo(12, 0);
                ctx.lineTo(-7, -6);
                ctx.lineTo(-4, 0);
                ctx.lineTo(-7, 6);
                ctx.closePath();
                ctx.fill();
                ctx.shadowColor = "#00e676"; ctx.shadowBlur = 8; ctx.fill();
                ctx.restore();
            }

            // TF frames
            if (tfFramePositions.current.size > 0) {
                const axisLen = 14;
                for (const [frame, tf] of tfFramePositions.current) {
                    const { cx, cy } = worldToCanvas(tf.x, tf.y);
                    const color = TF_FRAME_COLORS[frame] || "#ffffff";

                    ctx.strokeStyle = "rgba(255, 80, 80, 0.9)";
                    ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(-tf.yaw) * axisLen, cy + Math.sin(-tf.yaw) * axisLen);
                    ctx.stroke();

                    ctx.strokeStyle = "rgba(80, 255, 80, 0.9)";
                    ctx.beginPath(); ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(-tf.yaw + Math.PI / 2) * axisLen, cy + Math.sin(-tf.yaw + Math.PI / 2) * axisLen);
                    ctx.stroke();

                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();

                    if (showTFLabels) {
                        ctx.font = "9px monospace";
                        ctx.globalAlpha = 0.7;
                        ctx.fillText(frame, cx + 6, cy - 6);
                        ctx.globalAlpha = 1;
                    }
                }
            }

            // Goal marker
            if (goalPose.current) {
                const { cx, cy } = worldToCanvas(goalPose.current.x, goalPose.current.y);
                ctx.strokeStyle = "#ff1744";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
                ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
                ctx.stroke();
                ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.stroke();
            }

            animId = requestAnimationFrame(draw);
        }

        animId = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animId);
    }, [worldToCanvas, showTFLabels]);

    // ── Mouse handlers ─────────────────────────────────────

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const z = e.deltaY < 0 ? 1.15 : 0.87;
        viewOffset.current = {
            x: mx - (mx - viewOffset.current.x) * z,
            y: my - (my - viewOffset.current.y) * z,
        };
        viewScale.current *= z;
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (e.button === 0) {
            isPanning.current = true;
            panStart.current = { x: e.clientX - viewOffset.current.x, y: e.clientY - viewOffset.current.y };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isPanning.current) return;
        viewOffset.current = {
            x: e.clientX - panStart.current.x,
            y: e.clientY - panStart.current.y,
        };
    }, []);

    const handlePointerUp = useCallback(() => { isPanning.current = false; }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        if (!enableNavGoal || !ros || status !== "connected" || !mapData.current) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const { wx, wy } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);

        goalPose.current = { x: wx, y: wy };

        const goalTopic = new ROSLIB.Topic({ ros, name: "/goal_pose", messageType: "geometry_msgs/PoseStamped" });
        goalTopic.publish({
            header: { frame_id: "map", stamp: { sec: 0, nanosec: 0 } },
            pose: { position: { x: wx, y: wy, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
        });
    }, [ros, status, enableNavGoal, canvasToWorld]);

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", ...style }}>
            <canvas
                ref={canvasRef}
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onContextMenu={handleContextMenu}
                style={{ width: "100%", height: "100%", cursor: "grab", touchAction: "none" }}
            />
            {showLegend && (
                <div style={{
                    position: "absolute", bottom: 12, left: 12,
                    background: "rgba(15,10,25,0.85)", borderRadius: 10,
                    padding: "8px 12px", fontSize: "0.65rem", lineHeight: 1.8,
                    border: "1px solid rgba(155,89,182,0.1)", backdropFilter: "blur(8px)",
                }}>
                    <div><span style={{ color: "#00e676" }}>▲</span> Robot</div>
                    <div><span style={{ color: "#ff3232" }}>●</span> Laser</div>
                    <div><span style={{ color: "#0064ff" }}>━</span> Global Plan</div>
                    <div><span style={{ color: "#b400ff" }}>━</span> Local Plan</div>
                    <div><span style={{ color: "#19ff00" }}>□</span> Footprint</div>
                    <div><span style={{ color: "#ffab40" }}>⊹</span> TF Frames</div>
                    <div><span style={{ color: "#ff1744" }}>⊕</span> Right-click = Nav Goal</div>
                </div>
            )}
        </div>
    );
}
