"use client";

import { useRef, useEffect, useState, Suspense, createContext, useContext } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
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
// Full-body story sections
// ============================================================
const FULLBODY_SECTIONS = [
    {
        title: "Meet GRACE",
        subtitle: "Your Digital Nurse Companion",
        text: "GRACE (Geriatric Robotic Assistance for Care and Engagement) is a mobile companion robot designed for elderly care — intelligent monitoring, interaction, and emotional support.",
    },
    {
        title: "Designed with Empathy",
        subtitle: "Friendly & Approachable",
        text: "Every curve, every proportion was designed to feel welcoming. GRACE's friendly face and soft silhouette reduce anxiety in elderly users who may struggle with technology.",
    },
    {
        title: "Built to Navigate",
        subtitle: "Autonomous & Aware",
        text: "RPLidar A2M7 for 360° scanning, 3 IMU sensors fused via EKF, and differential drive with hoverboard motors. GRACE moves through spaces safely and intelligently.",
    },
    {
        title: "Powered by ROS 2",
        subtitle: "Jetson Orin + Nav2",
        text: "Running ROS 2 Humble on NVIDIA Jetson Orin Nano, GRACE leverages Nav2 for autonomous navigation, SLAM for mapping, and real-time health monitoring.",
    },
];

// ============================================================
// URDF base story sections
// ============================================================
const BASE_SECTIONS = [
    {
        title: "The Hardware Platform",
        subtitle: "Currently Built & In Development",
        text: "This is GRACE's actual hardware base — designed in SolidWorks, manufactured, and assembled. The circular aluminum chassis houses the entire drive system, electronics, and battery packs.",
    },
    {
        title: "Differential Drive System",
        subtitle: "Repurposed Hoverboard Motors",
        text: "Two high-torque BLDC motors salvaged from hoverboards provide smooth differential drive. Combined with 4 passive casters for omnidirectional stability on hospital floors.",
    },
    {
        title: "Triple IMU Fusion",
        subtitle: "3 Sensors · 1 EKF",
        text: "Three BNO055 IMU sensors — main, front, and back — fused through an Extended Kalman Filter for precise localization. This eliminates wheel slip errors and gives reliable pose estimation.",
    },
    {
        title: "Active Development",
        subtitle: "Work in Progress",
        text: "The base platform is fully operational with autonomous navigation. We're actively working on the upper body integration, face display system, and health monitoring peripherals.",
    },
];

// ============================================================
// GLB Part
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
// MOBILE Full-body 3D model — CENTERED, rotate + move down
// ============================================================
function MobileFullBodyModel({ scrollProgress }: { scrollProgress: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const { scene } = useGLTF("/models/grace-full-body.glb");
    const geometry = (scene.children[0] as THREE.Mesh)?.geometry;
    const [centered, setCentered] = useState(false);
    const floatTime = useRef(0);

    useEffect(() => {
        if (geometry && !centered) {
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            if (box) {
                const center = new THREE.Vector3();
                box.getCenter(center);
                geometry.translate(-center.x, -center.y, -center.z);
                setCentered(true);
            }
        }
    }, [geometry, centered]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        floatTime.current += delta;

        const floatBob = Math.sin(floatTime.current * 1.2) * 0.06;

        // Rotate: 1 full spin over the scroll
        const targetRotY = scrollProgress * Math.PI * 2;

        // Move downward: descend less to stay centered
        const targetY = -(scrollProgress * 1.5) + floatBob;

        // Stay centered (no X movement)
        groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.05;
        groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.05;
        groupRef.current.position.x = 0; // Always centered
    });

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            <mesh geometry={geometry}>
                <meshPhongMaterial color="#2a1a3e" specular="#9B59B6" shininess={40} transparent opacity={0.85} />
            </mesh>
        </group>
    );
}

// ============================================================
// MOBILE URDF Base model — CENTERED, rotate + move down
// ============================================================
function MobileURDFBaseModel({ scrollProgress }: { scrollProgress: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const floatTime = useRef(0);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        floatTime.current += delta;

        const floatBob = Math.sin(floatTime.current * 1.2) * 0.04;

        // Rotate: 1 full spin
        const targetRotY = scrollProgress * Math.PI * 2;

        // Move downward: descend less to stay centered
        const targetY = -(scrollProgress * 1.0) + floatBob;

        groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.05;
        groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.05;
        groupRef.current.position.x = 0; // Always centered
    });

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            <group rotation={[-Math.PI / 2, 0, 0]} scale={[5, 5, 5]}>
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
// Scroll context
// ============================================================
const ScrollProgressContext = createContext(0);

function ScrollProgressInjector({ scrollProgress, children }: { scrollProgress: number; children: React.ReactNode }) {
    return (
        <ScrollProgressContext.Provider value={scrollProgress}>
            {children}
        </ScrollProgressContext.Provider>
    );
}

function MobileFullBodyModelWrapper() {
    const sp = useContext(ScrollProgressContext);
    return <MobileFullBodyModel scrollProgress={sp} />;
}

function MobileURDFBaseModelWrapper() {
    const sp = useContext(ScrollProgressContext);
    return <MobileURDFBaseModel scrollProgress={sp} />;
}

// ============================================================
// Mobile scroll storytelling section
// Model: top 45% (sticky), centered, rotates + moves down
// Text: bottom area, closer together (70vh per card)
// ============================================================
function MobileScrollStorySection({
    sections,
    children,
    glowColor,
}: {
    sections: { title: string; subtitle: string; text: string }[];
    children: React.ReactNode;
    glowColor: string;
}) {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (!sectionRef.current) return;
            const rect = sectionRef.current.getBoundingClientRect();
            const sectionHeight = sectionRef.current.offsetHeight;
            const viewportH = window.innerHeight;

            const raw = (viewportH - rect.top) / (sectionHeight + viewportH);
            const progress = Math.max(0, Math.min(1, raw));
            setScrollProgress(progress);

            const idx = Math.min(
                sections.length - 1,
                Math.floor(progress * sections.length)
            );
            setActiveIndex(idx);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, [sections.length]);

    if (hasError) return null;

    return (
        <div ref={sectionRef} style={{ position: "relative" }}>
            {/* Sticky 3D Canvas — top portion */}
            <div
                style={{
                    position: "sticky",
                    top: 0,
                    height: "100vh",
                    width: "100%",
                    zIndex: 0,
                    pointerEvents: "none",
                }}
            >
                <div style={{ height: "100vh", position: "relative" }}>
                    <Canvas
                        camera={{ position: [3.5, 1.5, 3.5], fov: 40 }}
                        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
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
                        <ambientLight intensity={0.5} />
                        <directionalLight position={[5, 8, 5]} intensity={1} color="#F3E5F5" />
                        <directionalLight position={[-3, 4, -2]} intensity={0.4} color="#E91E63" />
                        <pointLight position={[0, 3, 0]} intensity={0.4} color="#9B59B6" />
                        <Suspense fallback={null}>
                            <ScrollProgressInjector scrollProgress={scrollProgress}>
                                {children}
                            </ScrollProgressInjector>
                        </Suspense>
                    </Canvas>
                    {/* Glow */}
                    <div style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "200px",
                        height: "200px",
                        borderRadius: "50%",
                        background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                        animation: "pulseGlow 3s ease-in-out infinite",
                        pointerEvents: "none",
                        zIndex: -1,
                    }} />
                </div>
            </div>

            {/* Text sections — closer together (70vh instead of 100vh) */}
            <div
                style={{
                    position: "relative",
                    zIndex: 1,
                    marginTop: "-100vh",
                    paddingTop: "40vh",
                    pointerEvents: "none",
                }}
            >
                {sections.map((section, i) => {
                    const isActive = activeIndex === i;
                    return (
                        <div
                            key={i}
                            style={{
                                minHeight: "45vh",
                                display: "flex",
                                alignItems: "flex-end",
                                justifyContent: "center",
                                padding: "1.5rem 1rem 3rem",
                            }}
                        >
                            <div
                                style={{
                                    maxWidth: "95%",
                                    width: "100%",
                                    padding: "1.25rem",
                                    borderRadius: "20px",
                                    background: "rgba(13, 6, 24, 0.92)",
                                    backdropFilter: "blur(16px)",
                                    border: `1px solid rgba(155, 89, 182, ${isActive ? "0.3" : "0.1"})`,
                                    opacity: isActive ? 1 : 0.3,
                                    transform: `translateY(${isActive ? "0" : "20px"})`,
                                    transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                                    pointerEvents: "auto",
                                }}
                            >
                                <span
                                    style={{
                                        display: "inline-block",
                                        fontSize: "0.6rem",
                                        fontWeight: 700,
                                        letterSpacing: "3px",
                                        textTransform: "uppercase",
                                        color: "#E91E63",
                                        marginBottom: "0.5rem",
                                    }}
                                >
                                    {section.subtitle}
                                </span>
                                <h2
                                    style={{
                                        fontSize: "1.3rem",
                                        fontWeight: 800,
                                        color: "#F3E5F5",
                                        lineHeight: 1.15,
                                        marginBottom: "0.6rem",
                                    }}
                                >
                                    {section.title}
                                </h2>
                                <p
                                    style={{
                                        fontSize: "0.8rem",
                                        lineHeight: 1.65,
                                        color: "#B39DDB",
                                        margin: 0,
                                    }}
                                >
                                    {section.text}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes pulseGlow {
                  0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
                  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
                }
            `}</style>
        </div>
    );
}

// ============================================================
// EXPORTED: Mobile Full-body scroll story
// ============================================================
export function MobileFullBodyScrollStory() {
    return (
        <MobileScrollStorySection sections={FULLBODY_SECTIONS} glowColor="rgba(155,89,182,0.12)">
            <MobileFullBodyModelWrapper />
        </MobileScrollStorySection>
    );
}

// ============================================================
// EXPORTED: Mobile URDF base scroll story
// ============================================================
export function MobileURDFBaseScrollStory() {
    return (
        <MobileScrollStorySection sections={BASE_SECTIONS} glowColor="rgba(233,30,99,0.10)">
            <MobileURDFBaseModelWrapper />
        </MobileScrollStorySection>
    );
}
