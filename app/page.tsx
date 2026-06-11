import Image from "next/image";
import Link from "next/link";
import RobotViewer3D from "./components/RobotViewerWrapper";
import { URDFBaseScrollStory } from "./components/RobotViewerWrapper";
import ScrollReveal from "./components/ScrollReveal";
import HomePageSwitch from "./components/HomePageSwitch";

export default function Home() {
  return (
    <HomePageSwitch desktopChildren={<DesktopHome />} />
  );
}

function DesktopHome() {
  return (
    <>
      {/* ========== HERO ========== */}
      <section className="hero">
        <span className="hero-badge">🩺 FYP 2022 · UET Lahore</span>
        <h1 className="hero-title">GRACE</h1>
        <p className="hero-subtitle">
          <strong>G</strong>eriatric <strong>R</strong>obotic{" "}
          <strong>A</strong>ssistance for <strong>C</strong>are and{" "}
          <strong>E</strong>ngagement is a mobile robot focused on
          intelligent monitoring, daily reminders, and dedicated care
          for elderly users.
        </p>
        <p className="hero-tagline">
          No arms. No lifting grandma. Just brains and vibes. 🧠✨
        </p>
        <div className="hero-cta">
          <Link href="/hardware" className="btn btn-primary">
            ⚙️ Explore Hardware
          </Link>
          <Link href="/viewer" className="btn btn-primary">
            🤖 View in 3D
          </Link>
          <Link href="/dashboard" className="btn btn-secondary">
            📡 Open Dashboard
          </Link>
        </div>
      </section>

      {/* ========== SCROLL-DRIVEN 3D: FULL BODY ========== */}
      <RobotViewer3D />

      {/* ========== SCROLL-DRIVEN 3D: HARDWARE BASE ========== */}
      <URDFBaseScrollStory />

      {/* ========== GRACE CHARACTER + LOGO ========== */}
      <ScrollReveal>
        <section className="section">
          <div className="feature-block">
            <div className="feature-visual" style={{ padding: 0, overflow: "hidden", background: "transparent", border: "none" }}>
              <Image
                src="/images/grace-character.jpeg"
                alt="GRACE robot character - front view"
                width={400}
                height={400}
                style={{ objectFit: "contain", borderRadius: "20px", width: "100%", height: "auto" }}
                priority
              />
            </div>
            <div className="feature-content">
              <Image
                src="/images/grace-logo.jpeg"
                alt="GRACE logo"
                width={320}
                height={320}
                style={{ objectFit: "contain", borderRadius: "16px", marginBottom: "1.5rem", maxWidth: "100%", height: "auto" }}
              />
              <h3>Meet GRACE</h3>
              <p>
                A friendly companion designed specifically for
                elderly care. GRACE doesn&apos;t have arms or lift anything; instead, she relies on advanced perception and AI to keep seniors safe, engaged, and independent at home.
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ========== STATS ========== */}
      <ScrollReveal>
        <section className="section">
          <div className="stats-row">
            <div className="stat-item">
              <div className="stat-value">8 GB</div>
              <div className="stat-label">Jetson Orin Nano</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">3</div>
              <div className="stat-label">IMU Sensors</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">84 kg</div>
              <div className="stat-label">Load Tested</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">~2 hrs</div>
              <div className="stat-label">Battery Life</div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ========== THE CARE CRISIS ========== */}
      <ScrollReveal>
        <section className="section">
          <div className="section-header">
            <div className="section-label">The Problem</div>
            <h2 className="section-title">The Unprecedented Care Crisis</h2>
            <div className="divider"></div>
            <p className="section-desc">
              With the global senior population projected to double by 2050,
              how can we develop a scalable, non-intrusive solution?
            </p>
          </div>

          <div className="image-showcase">
            <Image
              src="/images/care-crisis-infographic.jpeg"
              alt="Introduction to the elderly care crisis - isolation, caregiver load, and the technical gap"
              width={1000}
              height={500}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "20px",
                border: "1px solid var(--grace-border)",
              }}
            />
          </div>
        </section>
      </ScrollReveal>

      {/* ========== USE CASE ========== */}
      <ScrollReveal>
        <section className="section">
          <div className="section-header">
            <div className="section-label">Use Case</div>
            <h2 className="section-title">Companionship-First Robotics</h2>
            <div className="divider"></div>
          </div>

          <div className="feature-block">
            <div className="feature-visual" style={{ padding: 0, overflow: "hidden", background: "transparent", border: "none" }}>
              <Image
                src="/images/grace-with-grandma.jpeg"
                alt="GRACE robot talking to an elderly woman in a living room"
                width={500}
                height={500}
                style={{ objectFit: "cover", borderRadius: "20px", width: "100%", height: "auto" }}
              />
            </div>
            <div className="feature-content">
              <h3>Built for Elderly Care</h3>
              <p>
                GRACE autonomously navigates indoor spaces, follows humans,
                monitors health vitals via a smart wristband, detects posture
                anomalies, and provides verbal prompts for exercises, medication
                reminders, and daily routines.
              </p>
              <p>
                She instantly sends caretaker alerts when anomalies or emergencies are detected, bridging the gap between elderly independence and continuous remote monitoring.
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ========== DESIGN EVOLUTION ========== */}
      <ScrollReveal>
        <section className="section">
          <div className="section-header">
            <div className="section-label">Design</div>
            <h2 className="section-title">From Sketch to Reality</h2>
            <div className="divider"></div>
            <p className="section-desc">
              GRACE&apos;s design evolved from pencil sketches to 3D renders to a
              physical prototype — every iteration refined for elderly interaction.
            </p>
          </div>

          <div className="card-grid">
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <Image
                src="/images/grace-sketch-views.jpeg"
                alt="GRACE pencil sketch views - front, side, and 3/4 back"
                width={500}
                height={500}
                style={{ width: "100%", height: "auto" }}
              />
              <div style={{ padding: "1.5rem" }}>
                <h3 className="card-title">✏️ Concept Sketches</h3>
                <p className="card-text">
                  Front, side, and 3/4 back pencil views — establishing the
                  friendly, approachable character proportions.
                </p>
              </div>
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <Image
                src="/images/grace-3d-renders.jpeg"
                alt="GRACE 3D rendered views - front, side, and three-quarter"
                width={500}
                height={500}
                style={{ width: "100%", height: "auto" }}
              />
              <div style={{ padding: "1.5rem" }}>
                <h3 className="card-title">🖥️ 3D Renders</h3>
                <p className="card-text">
                  Polished 3D renders showing the final character design with the
                  signature navy dress and friendly face panel.
                </p>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ========== PERCEPTION ========== */}
      <ScrollReveal>
        <section className="section">
          <div className="section-header">
            <div className="section-label">Perception</div>
            <h2 className="section-title">Advanced Visual Perception</h2>
            <div className="divider"></div>
            <p className="section-desc">
              A multi-sensor perception stack that maps, scans, follows, and
              understands the environment in real-time.
            </p>
          </div>

          <div className="card-grid">
            <div className="card">
              <div className="card-icon">📡</div>
              <h3 className="card-title">RPLidar A2M7</h3>
              <p className="card-text">
                360° laser scanning for SLAM-based navigation and real-time
                obstacle avoidance. Maps the entire environment.
              </p>
            </div>
            <div className="card">
              <div className="card-icon">📷</div>
              <h3 className="card-title">Intel RealSense D435i</h3>
              <p className="card-text">
                RGB-D stereo camera with depth perception. Used for human
                detection, following, and spatial awareness.
              </p>
            </div>
            <div className="card">
              <div className="card-icon">🎥</div>
              <h3 className="card-title">Standard RGB Camera</h3>
              <p className="card-text">
                General-purpose vision for pose detection, context awareness, and
                AI inference running on the Jetson GPU.
              </p>
            </div>
            <div className="card">
              <div className="card-icon">🔊</div>
              <h3 className="card-title">Ultrasonic Sensor</h3>
              <p className="card-text">
                Close-range obstacle detection as a safety fallback. Works even in
                conditions where LiDAR may miss objects.
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ========== CAPABILITIES ========== */}
      <ScrollReveal>
        <section className="section">
          <div className="section-header">
            <div className="section-label">Capabilities</div>
            <h2 className="section-title">What Can GRACE Do?</h2>
            <div className="divider"></div>
          </div>

          <div className="card-grid">
            <div className="card">
              <div className="card-icon">🗺️</div>
              <h3 className="card-title">SLAM Navigation</h3>
              <p className="card-text">
                Autonomous mapping and navigation using SLAM Toolbox and Nav2.
                GRACE builds, saves, and navigates indoor maps independently.
              </p>
            </div>
            <div className="card">
              <div className="card-icon">🚶</div>
              <h3 className="card-title">Human Following</h3>
              <p className="card-text">
                Detects and follows a person using depth + vision, maintaining a
                safe distance while moving through the environment.
              </p>
            </div>
            <div className="card">
              <div className="card-icon">🧍</div>
              <h3 className="card-title">Posture Detection</h3>
              <p className="card-text">
                AI-powered pose estimation to detect falls, slouching, or unusual
                positions and alert caretakers immediately.
              </p>
            </div>
            <div className="card">
              <div className="card-icon">💓</div>
              <h3 className="card-title">Health Monitoring</h3>
              <p className="card-text">
                Integrates with a smart wristband to track SpO2, heart rate, and
                lifestyle metrics in real-time.
              </p>
            </div>
            <div className="card">
              <div className="card-icon">🗣️</div>
              <h3 className="card-title">Verbal Interaction</h3>
              <p className="card-text">
                Daily reminders, exercise suggestions, and medication prompts
                for the elderly.
              </p>
            </div>
            <div className="card">
              <div className="card-icon">🚨</div>
              <h3 className="card-title">Caretaker Alerts</h3>
              <p className="card-text">
                When anomalies such as abnormal vitals, falls, or distress
                are detected, GRACE instantly notifies the remote caretaker.
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ========== DATA STREAMS ========== */}
      <ScrollReveal>
        <section className="section">
          <div className="section-header">
            <div className="section-label">Data</div>
            <h2 className="section-title">A Walking Nursing Station</h2>
            <div className="divider"></div>
            <p className="section-desc">
              GRACE collects and processes four categories of real-time data
              streams, turning raw sensor data into actionable care insights.
            </p>
          </div>

          <div className="card-grid">
            <div className="card">
              <div className="card-icon">🔋</div>
              <h3 className="card-title">Robot Health</h3>
              <p className="card-text">
                Hoverboard 40V &amp; 24V battery systems, discharge and charging currents, ESP32 board temperature, and core telemetry.
              </p>
            </div>
            <div className="card">
              <div className="card-icon">⌚</div>
              <h3 className="card-title">Person Vitals</h3>
              <p className="card-text">
                Smart wristband integration tracking heart rate, SpO2, systolic/diastolic blood pressure, daily steps, and calories.
              </p>
            </div>
            <div className="card">
              <div className="card-icon">🌡️</div>
              <h3 className="card-title">Environment</h3>
              <p className="card-text">
                BME680 &amp; STM32 sensors monitoring temperature, humidity, pressure, air quality (PM 1.0/2.5/10), and gas resistance (MQ).
              </p>
            </div>
            <div className="card">
              <div className="card-icon">🧠</div>
              <h3 className="card-title">AI Perception</h3>
              <p className="card-text">
                Pose detection, human following, context awareness, and advanced spatial mapping using RealSense and RPLidar.
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ========== PROJECT INFO ========== */}
      <ScrollReveal>
        <section className="section">
          <div className="section-header">
            <div className="section-label">Project</div>
            <h2 className="section-title">About the Project</h2>
            <div className="divider"></div>
          </div>

          <div className="feature-block">
            <div className="feature-visual" style={{ padding: 0, overflow: "hidden", background: "transparent", border: "none" }}>
              <Image
                src="/images/grace-character.jpeg"
                alt="GRACE robot character"
                width={350}
                height={350}
                style={{ objectFit: "contain", maxWidth: "100%", height: "auto" }}
              />
            </div>
            <div className="feature-content">
              <h3>Final Year Project — UET Lahore</h3>
              <p>
                GRACE is a Final Year Project (FYP 2022) from the{" "}
                <strong>Department of Mechatronics and Control Engineering</strong>{" "}
                at the University of Engineering and Technology, Lahore.
              </p>
              <p>
                Most student projects try to build a humanoid that barely works.
                GRACE focused on <strong>practical elderly independence</strong> —
                companionship-first robotics with a real-world application.
              </p>
              <ul className="spec-list" style={{ marginTop: "1rem" }}>
                <li>Group 3 Members:</li>
                <li>• Muhammad Anss (2022-MC-01)</li>
                <li>• Anas Gulzar (2022-MC-07)</li>
                <li>• Alishba Ramzan (2022-MC-35)</li>
                <br />
                <li>Department: Mechatronics &amp; Control Engineering</li>
                <li>University: UET Lahore</li>
                <li>Year: FYP 2022</li>
              </ul>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ========== PROJECT POSTER ========== */}
      <ScrollReveal>
        <section className="section">
          <div className="section-header">
            <div className="section-label">Documentation</div>
            <h2 className="section-title">Project Poster</h2>
            <div className="divider"></div>
            <p className="section-desc">
              The official FYP poster detailing the core architecture, capabilities, and goals of the GRACE project.
            </p>
          </div>

          <div className="image-showcase" style={{ display: 'flex', justifyContent: 'center' }}>
            <Image
              src="/images/FYPposter.jpg"
              alt="GRACE Project Poster"
              width={1200}
              height={800}
              style={{
                width: "100%",
                maxWidth: "1000px",
                height: "auto",
                borderRadius: "20px",
                border: "1px solid var(--grace-border)",
                boxShadow: "var(--grace-shadow-lg)"
              }}
            />
          </div>
        </section>
      </ScrollReveal>
    </>
  );
}
