"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, useGLTF } from "@react-three/drei";
import * as THREE from "three";

// ============================================================
// URDF-derived transforms for hardware base
// ============================================================
const URDF_PARTS = [
    { name: "base_link", file: "/models/base_link.glb", position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], color: "#1a1a2e" },
    { name: "wheel_right", file: "/models/wheel_right_link.glb", position: [0.0005, -0.22734, 0.038] as [number, number, number], rotation: [-Math.PI / 2, 0, 0] as [number, number, number], color: "#9B59B6" },
    { name: "wheel_left", file: "/models/wheel_left_link.glb", position: [-0.0005, 0.22734, 0.038] as [number, number, number], rotation: [-Math.PI / 2, 0, 0] as [number, number, number], color: "#9B59B6" },
    { name: "caster_bl", file: "/models/caster_back_left_link.glb", position: [-0.14848, 0.085725, 0.0005] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], color: "#B76E79" },
    { name: "caster_br", file: "/models/caster_back_right_link.glb", position: [-0.14848, -0.085725, 0.0005] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], color: "#B76E79" },
    { name: "caster_fl", file: "/models/caster_front_left_link.glb", position: [0.14848, 0.085725, 0.0005] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], color: "#B76E79" },
    { name: "caster_fr", file: "/models/caster_front_right_link.glb", position: [0.14848, -0.085725, 0.0005] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], color: "#B76E79" },
    { name: "imu_main", file: "/models/imu_link.glb", position: [-0.0105, -0.042038, 0.094] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], color: "#E91E63" },
    { name: "imu_back", file: "/models/imu_back_link.glb", position: [-0.1932, 0, 0.031] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number], color: "#E91E63" },
    { name: "imu_front", file: "/models/imu_front_link.glb", position: [0.1932, 0, 0.031] as [number, number, number], rotation: [Math.PI, Math.PI / 2, 0] as [number, number, number], color: "#E91E63" },
    { name: "laser", file: "/models/laser_link.glb", position: [0, 0, 0.2321] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], color: "#333344" },
];

// ============================================================
// GLB Part component
// ============================================================
function GLBPart({ file, position, rotation, color }: {
    file: string;
    position: [number, number, number];
    rotation: [number, number, number];
    color: string;
}) {
    const { scene } = useGLTF(file);
    const geometry = (scene.children[0] as THREE.Mesh)?.geometry;
    if (!geometry) return null;
    return (
        <mesh geometry={geometry} position={position} rotation={rotation}>
            <meshPhongMaterial color={color} shininess={60} />
        </mesh>
    );
}

// ============================================================
// Full body single-STL model
// ============================================================
function FullBodyModel() {
    const { scene } = useGLTF("/models/grace-full-body.glb");
    const geometry = (scene.children[0] as THREE.Mesh)?.geometry;

    useEffect(() => {
        if (geometry) {
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            if (box) {
                const center = new THREE.Vector3();
                box.getCenter(center);
                geometry.translate(-center.x, -center.y, -center.z);
            }
        }
    }, [geometry]);

    return (
        <mesh geometry={geometry}>
            <meshPhongMaterial color="#2a1a3e" specular="#9B59B6" shininess={40} />
        </mesh>
    );
}

// ============================================================
// URDF hardware base model (assembled)
// ============================================================
function URDFBaseModel() {
    return (
        <group scale={[4, 4, 4]}>
            {URDF_PARTS.map((part) => (
                <GLBPart
                    key={part.name}
                    file={part.file}
                    position={part.position}
                    rotation={part.rotation}
                    color={part.color}
                />
            ))}
        </group>
    );
}

// ============================================================
// Slow auto-rotate wrapper
// ============================================================
function AutoRotate({ children, enabled, correctZUp }: { children: React.ReactNode; enabled: boolean; correctZUp: boolean }) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((_, delta) => {
        if (groupRef.current && enabled) {
            groupRef.current.rotation.y += delta * 0.2;
        }
    });

    // Outer group: Y rotation (always global Y axis)
    // Inner group: Z-up → Y-up correction for URDF models
    return (
        <group ref={groupRef}>
            <group rotation={correctZUp ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
                {children}
            </group>
        </group>
    );
}

// ============================================================
// Adaptive performance
// ============================================================
function AdaptivePerformance() {
    const { gl } = useThree();
    useEffect(() => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }, [gl]);
    return null;
}

// ============================================================
// Main interactive viewer page component
// ============================================================
export default function InteractiveViewer() {
    const [activeModel, setActiveModel] = useState<"fullbody" | "base">("fullbody");
    const [autoRotate, setAutoRotate] = useState(false);
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <div style={{
                width: "100%",
                height: "80vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1rem",
                color: "#B39DDB",
            }}>
                <span style={{ fontSize: "3rem" }}>🤖</span>
                <h2>WebGL Error</h2>
                <p>Your GPU might be busy or unsupported.</p>
                <button
                    onClick={() => setHasError(false)}
                    style={{
                        padding: "0.6rem 2rem",
                        borderRadius: "8px",
                        border: "1px solid rgba(155, 89, 182, 0.3)",
                        background: "rgba(155, 89, 182, 0.15)",
                        color: "#F3E5F5",
                        cursor: "pointer",
                        fontSize: "1rem",
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div style={{ position: "relative", width: "100%", height: "calc(100vh - 80px)" }}>
            {/* 3D Canvas */}
            <Canvas
                camera={{ position: [3, 2.5, 3], fov: 35 }}
                gl={{
                    antialias: false,
                    alpha: true,
                    powerPreference: "low-power",
                }}
                dpr={[1, 1.5]}
                style={{ background: "transparent" }}
                onCreated={({ gl }) => {
                    gl.domElement.addEventListener("webglcontextlost", (e) => {
                        e.preventDefault();
                        setHasError(true);
                    });
                }}
            >
                <AdaptivePerformance />

                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 8, 5]} intensity={1} color="#F3E5F5" />
                <directionalLight position={[-3, 4, -2]} intensity={0.4} color="#E91E63" />
                <pointLight position={[0, 3, 0]} intensity={0.4} color="#9B59B6" />

                {/* Grid floor */}
                <Grid
                    args={[20, 20]}
                    position={[0, -1, 0]}
                    cellColor="#2a1a3e"
                    sectionColor="#9B59B6"
                    fadeDistance={15}
                    fadeStrength={2}
                    cellSize={0.5}
                    sectionSize={2}
                    infiniteGrid
                />

                {/* Model */}
                <Suspense fallback={null}>
                    <AutoRotate enabled={autoRotate} correctZUp={activeModel === "base"}>
                        {activeModel === "fullbody" ? (
                            <FullBodyModel />
                        ) : (
                            <URDFBaseModel />
                        )}
                    </AutoRotate>
                </Suspense>

                {/* Full orbit controls */}
                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={0.5}
                    maxDistance={10}
                />
            </Canvas>

            {/* ========== OVERLAY CONTROLS ========== */}
            <div style={{
                position: "absolute",
                top: "1.5rem",
                left: "1.5rem",
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                gap: "0.8rem",
            }}>
                {/* Title */}
                <div style={{
                    padding: "1rem 1.5rem",
                    borderRadius: "12px",
                    background: "rgba(13, 6, 24, 0.8)",
                    border: "1px solid rgba(155, 89, 182, 0.2)",
                    backdropFilter: "blur(10px)",
                }}>
                    <h2 style={{ color: "#F3E5F5", fontSize: "1.2rem", margin: 0 }}>
                        🤖 GRACE 3D Viewer
                    </h2>
                    <p style={{ color: "#B39DDB", fontSize: "0.8rem", margin: "0.3rem 0 0" }}>
                        Drag to rotate · Scroll to zoom · Right-drag to pan
                    </p>
                </div>

                {/* Model switcher */}
                <div style={{
                    padding: "0.8rem 1rem",
                    borderRadius: "12px",
                    background: "rgba(13, 6, 24, 0.8)",
                    border: "1px solid rgba(155, 89, 182, 0.2)",
                    backdropFilter: "blur(10px)",
                    display: "flex",
                    gap: "0.5rem",
                }}>
                    <button
                        onClick={() => setActiveModel("fullbody")}
                        style={{
                            flex: 1,
                            padding: "0.5rem 0.8rem",
                            borderRadius: "8px",
                            border: "none",
                            background: activeModel === "fullbody"
                                ? "linear-gradient(135deg, #9B59B6, #E91E63)"
                                : "rgba(155, 89, 182, 0.1)",
                            color: "#F3E5F5",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            transition: "all 0.3s ease",
                        }}
                    >
                        Full Body
                    </button>
                    <button
                        onClick={() => setActiveModel("base")}
                        style={{
                            flex: 1,
                            padding: "0.5rem 0.8rem",
                            borderRadius: "8px",
                            border: "none",
                            background: activeModel === "base"
                                ? "linear-gradient(135deg, #9B59B6, #E91E63)"
                                : "rgba(155, 89, 182, 0.1)",
                            color: "#F3E5F5",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            transition: "all 0.3s ease",
                        }}
                    >
                        Hardware Base
                    </button>
                </div>

                {/* Auto-rotate toggle */}
                <button
                    onClick={() => setAutoRotate(!autoRotate)}
                    style={{
                        padding: "0.6rem 1rem",
                        borderRadius: "12px",
                        background: "rgba(13, 6, 24, 0.8)",
                        border: `1px solid ${autoRotate ? "rgba(155, 89, 182, 0.4)" : "rgba(155, 89, 182, 0.15)"}`,
                        backdropFilter: "blur(10px)",
                        color: autoRotate ? "#E91E63" : "#B39DDB",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        textAlign: "left",
                        transition: "all 0.3s ease",
                    }}
                >
                    {autoRotate ? "⏸ Auto-Rotate ON" : "▶ Auto-Rotate OFF"}
                </button>
            </div>

            {/* Model info panel */}
            <div style={{
                position: "absolute",
                bottom: "1.5rem",
                right: "1.5rem",
                zIndex: 10,
                padding: "1rem 1.5rem",
                borderRadius: "12px",
                background: "rgba(13, 6, 24, 0.8)",
                border: "1px solid rgba(155, 89, 182, 0.2)",
                backdropFilter: "blur(10px)",
                color: "#B39DDB",
                fontSize: "0.8rem",
                maxWidth: "280px",
            }}>
                <h3 style={{ color: "#F3E5F5", margin: "0 0 0.5rem", fontSize: "0.95rem" }}>
                    {activeModel === "fullbody" ? "Conceptual Full Body" : "URDF Hardware Base"}
                </h3>
                {activeModel === "fullbody" ? (
                    <p style={{ margin: 0, lineHeight: 1.5 }}>
                        Final conceptual design of GRACE with upper body shell, face display area, and full chassis.
                    </p>
                ) : (
                    <p style={{ margin: 0, lineHeight: 1.5 }}>
                        11 parts from URDF: base plate, 2 hoverboard wheels, 4 casters, 3 IMUs, and RPLidar A2M7.
                    </p>
                )}
            </div>
        </div>
    );
}
