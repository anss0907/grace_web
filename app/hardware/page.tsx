import Image from "next/image";

export default function HardwarePage() {
    return (
        <>
            {/* ========== HERO ========== */}
            <section className="hero" style={{ minHeight: "60vh" }}>
                <span className="hero-badge">⚙️ Hardware Specifications</span>
                <h1
                    className="hero-title"
                    style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)" }}
                >
                    Under the Hood
                </h1>
                <p className="hero-subtitle">
                    Every sensor, motor, and microcontroller that makes GRACE tick. A
                    distributed embedded system with AI muscle.
                </p>
            </section>

            {/* ========== PHYSICAL ROBOT ========== */}
            <section className="section">
                <div className="section-header">
                    <div className="section-label">The Robot</div>
                    <h2 className="section-title">Meet the Hardware</h2>
                    <div className="divider"></div>
                </div>

                <div className="feature-block">
                    <div
                        className="feature-visual"
                        style={{
                            padding: 0,
                            overflow: "hidden",
                            background: "transparent",
                            border: "none",
                        }}
                    >
                        <Image
                            src="/images/grace-physical-base.jpeg"
                            alt="GRACE physical robot base - real hardware with LiDAR, ultrasonic sensors, and hoverboard wheels"
                            width={600}
                            height={450}
                            style={{
                                objectFit: "cover",
                                borderRadius: "20px",
                                width: "100%",
                                height: "auto",
                            }}
                            priority
                        />
                    </div>
                    <div className="feature-content">
                        <h3>The Physical Base</h3>
                        <p>
                            GRACE&apos;s base houses the hoverboard BLDC motors, LiDAR, ultrasonic
                            sensors, battery packs, motor drivers, and the main electronics.
                            The transparent top cover shows the internal wiring and PCBs.
                        </p>
                        <ul className="spec-list">
                            <li>Hoverboard BLDC motors (differential drive)</li>
                            <li>RPLidar A2M7 mounted on top</li>
                            <li>Ultrasonic sensors on front face</li>
                            <li>Red power switch + safety kill</li>
                            <li>Transparent acrylic top cover</li>
                            <li>Tested with 84 kg load for ~2 hours</li>
                        </ul>
                    </div>
                </div>

                <div className="feature-block reverse">
                    <div
                        className="feature-visual"
                        style={{
                            padding: 0,
                            overflow: "hidden",
                            background: "transparent",
                            border: "none",
                        }}
                    >
                        <Image
                            src="/images/grace-cad-design.jpeg"
                            alt="GRACE base CAD design in SolidWorks - circular base with hoverboard wheel and LiDAR mount"
                            width={600}
                            height={450}
                            style={{
                                objectFit: "cover",
                                borderRadius: "20px",
                                width: "100%",
                                height: "auto",
                            }}
                        />
                    </div>
                    <div className="feature-content">
                        <h3>SolidWorks CAD Design</h3>
                        <p>
                            The base was designed in SolidWorks with DFA + DFM optimization.
                            Circular aluminum base plate, integrated motor mounts, and sensor
                            housings — all designed for manufacturability.
                        </p>
                        <ul className="spec-list">
                            <li>Circular base plate design</li>
                            <li>Integrated LiDAR mount (center top)</li>
                            <li>Hoverboard wheel on each side</li>
                            <li>Ultrasonic sensor ports on front</li>
                            <li>Internal compartments for electronics</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* ========== CORE BRAIN ========== */}
            <section className="section">
                <div className="section-header">
                    <div className="section-label">Compute</div>
                    <h2 className="section-title">🧠 Core Brain</h2>
                    <div className="divider"></div>
                    <p className="section-desc">
                        A dual-processor distributed nervous system — heavy AI on the
                        Jetson, real-time sensor I/O on the STM32.
                    </p>
                </div>

                <div className="card-grid">
                    <div className="card">
                        <div className="card-icon">🟢</div>
                        <h3 className="card-title">Jetson Orin Nano Super 8GB</h3>
                        <p className="card-text">
                            The main AI brain. Runs all heavy computation:
                        </p>
                        <ul className="spec-list">
                            <li>Computer vision &amp; pose detection</li>
                            <li>SLAM (Simultaneous Localization and Mapping)</li>
                            <li>Nav2 autonomous navigation</li>
                            <li>Contextual reasoning &amp; AI inference</li>
                            <li>ROS 2 Humble master node</li>
                            <li>JetPack 6 (Ubuntu 22.04 ARM64)</li>
                        </ul>
                    </div>
                    <div className="card">
                        <div className="card-icon">🔵</div>
                        <h3 className="card-title">STM32L475 (B-L475E-IOT01A)</h3>
                        <p className="card-text">
                            The sensor aggregation MCU, communicating via micro-ROS:
                        </p>
                        <ul className="spec-list">
                            <li>Collects all environmental sensor data</li>
                            <li>Battery voltage &amp; current monitoring</li>
                            <li>Temperature, humidity, pressure readings</li>
                            <li>Real-time I/O at microsecond latency</li>
                            <li>micro-ROS agent → ROS 2 bridge</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* ========== PERCEPTION SENSORS ========== */}
            <section className="section">
                <div className="section-header">
                    <div className="section-label">Sensors</div>
                    <h2 className="section-title">👀 Perception Stack</h2>
                    <div className="divider"></div>
                </div>

                <div className="card-grid">
                    <div className="card">
                        <div className="card-icon">📡</div>
                        <h3 className="card-title">RPLidar A2M7</h3>
                        <ul className="spec-list">
                            <li>360° 2D laser scanner</li>
                            <li>12m range, 8000 samples/sec</li>
                            <li>Used for SLAM + real-time navigation</li>
                            <li>Mounted just above wheel plane</li>
                        </ul>
                    </div>
                    <div className="card">
                        <div className="card-icon">📷</div>
                        <h3 className="card-title">Intel RealSense D435i</h3>
                        <ul className="spec-list">
                            <li>Stereo RGB-D camera</li>
                            <li>Built-in IMU for motion tracking</li>
                            <li>Depth range: 0.2m – 10m</li>
                            <li>Human detection &amp; following</li>
                        </ul>
                    </div>
                    <div className="card">
                        <div className="card-icon">🎥</div>
                        <h3 className="card-title">RGB Camera</h3>
                        <ul className="spec-list">
                            <li>General-purpose vision</li>
                            <li>Pose detection via Jetson GPU</li>
                            <li>Context-aware AI inference</li>
                            <li>Publishing on ROS 2 image topic</li>
                        </ul>
                    </div>
                    <div className="card">
                        <div className="card-icon">🌡️</div>
                        <h3 className="card-title">Possible Thermal Camera</h3>
                        <ul className="spec-list">
                            <li>Thermal-based anomaly detection</li>
                            <li>Fever detection at distance</li>
                            <li>Night-time monitoring</li>
                            <li>Under evaluation for integration</li>
                        </ul>
                    </div>
                    <div className="card">
                        <div className="card-icon">🔊</div>
                        <h3 className="card-title">Ultrasonic Sensor</h3>
                        <ul className="spec-list">
                            <li>Close-range obstacle detection</li>
                            <li>Safety fallback for LiDAR blind spots</li>
                            <li>Works on transparent surfaces</li>
                        </ul>
                    </div>
                    <div className="card">
                        <div className="card-icon">📐</div>
                        <h3 className="card-title">3× IMU Sensors</h3>
                        <ul className="spec-list">
                            <li>Main IMU on base_link</li>
                            <li>Front IMU for tilt detection</li>
                            <li>Back IMU for stability monitoring</li>
                            <li>Fused with EKF for localization</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* ========== ENVIRONMENTAL ========== */}
            <section className="section">
                <div className="section-header">
                    <div className="section-label">Environment</div>
                    <h2 className="section-title">🌍 Environmental Sensors</h2>
                    <div className="divider"></div>
                </div>

                <div className="card-grid">
                    <div className="card">
                        <div className="card-icon">🌡️</div>
                        <h3 className="card-title">Climate Sensors</h3>
                        <ul className="spec-list">
                            <li>Temperature sensing</li>
                            <li>Humidity measurement</li>
                            <li>Barometric pressure</li>
                            <li>Indoor comfort monitoring</li>
                        </ul>
                    </div>
                    <div className="card">
                        <div className="card-icon">💨</div>
                        <h3 className="card-title">Air Quality</h3>
                        <ul className="spec-list">
                            <li>CO₂ concentration</li>
                            <li>CO (carbon monoxide) detection</li>
                            <li>PMS5003 particulate matter sensor</li>
                            <li>PM2.5 &amp; PM10 levels</li>
                        </ul>
                    </div>
                    <div className="card">
                        <div className="card-icon">⌚</div>
                        <h3 className="card-title">Health Wearable</h3>
                        <ul className="spec-list">
                            <li>Smart wristband integration</li>
                            <li>SpO2 (blood oxygen) tracking</li>
                            <li>Heart rate monitoring</li>
                            <li>Lifestyle metrics &amp; activity</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* ========== LOCOMOTION ========== */}
            <section className="section">
                <div className="section-header">
                    <div className="section-label">Drive</div>
                    <h2 className="section-title">🚗 Locomotion System</h2>
                    <div className="divider"></div>
                </div>

                <div className="feature-block">
                    <div
                        className="feature-visual"
                        style={{
                            padding: 0,
                            overflow: "hidden",
                            background: "transparent",
                            border: "none",
                        }}
                    >
                        <Image
                            src="/images/grace-cad-design.jpeg"
                            alt="GRACE locomotion - SolidWorks view showing hoverboard wheel"
                            width={500}
                            height={400}
                            style={{
                                objectFit: "cover",
                                borderRadius: "20px",
                                width: "100%",
                                height: "auto",
                            }}
                        />
                    </div>
                    <div className="feature-content">
                        <h3>Hoverboard BLDC Motors</h3>
                        <p>
                            GRACE uses repurposed hoverboard brushless DC motors for a
                            differential drive configuration. Robust, high-torque, and
                            energy-efficient.
                        </p>
                        <ul className="spec-list">
                            <li>Differential drive (2 powered wheels)</li>
                            <li>4 passive caster wheels for stability</li>
                            <li>5-bit magnetic encoders per wheel</li>
                            <li>Wheel separation: 454.68 mm</li>
                            <li>Wheel radius: 82.55 mm</li>
                            <li>Max linear velocity: 0.7 m/s</li>
                            <li>Max angular velocity: 8.5 rad/s</li>
                            <li>Separate battery system for drive vs electronics</li>
                        </ul>
                    </div>
                </div>

                <div className="stats-row">
                    <div className="stat-item">
                        <div className="stat-value">0.7</div>
                        <div className="stat-label">m/s Max Speed</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">8.5</div>
                        <div className="stat-label">rad/s Max Turn</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">454.68</div>
                        <div className="stat-label">mm Wheel Sep.</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">82.55</div>
                        <div className="stat-label">mm Wheel Radius</div>
                    </div>
                </div>
            </section>

            {/* ========== MECHANICAL ========== */}
            <section className="section">
                <div className="section-header">
                    <div className="section-label">Structure</div>
                    <h2 className="section-title">🏗️ Mechanical Design</h2>
                    <div className="divider"></div>
                </div>

                <div className="feature-block reverse">
                    <div
                        className="feature-visual"
                        style={{
                            padding: 0,
                            overflow: "hidden",
                            background: "transparent",
                            border: "none",
                        }}
                    >
                        <Image
                            src="/images/grace-physical-base.jpeg"
                            alt="GRACE physical robot chassis"
                            width={500}
                            height={400}
                            style={{
                                objectFit: "cover",
                                borderRadius: "20px",
                                width: "100%",
                                height: "auto",
                            }}
                        />
                    </div>
                    <div className="feature-content">
                        <h3>Weldment-Based Steel Frame</h3>
                        <p>
                            Designed for manufacturability (DFA + DFM optimized), not just
                            academic demonstration. A practical, production-oriented chassis.
                        </p>
                        <ul className="spec-list">
                            <li>20×20 mm mild steel square pipe frame</li>
                            <li>Weldment-based construction</li>
                            <li>Bottom-heavy layout (motors, batteries, drivers below)</li>
                            <li>LiDAR mounted just above wheel plane</li>
                            <li>Cameras &amp; sensors mounted higher</li>
                            <li>Circular aluminum base plate</li>
                            <li>DFA + DFM optimization in progress</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* ========== SOFTWARE ========== */}
            <section className="section">
                <div className="section-header">
                    <div className="section-label">Software</div>
                    <h2 className="section-title">💻 Software Architecture</h2>
                    <div className="divider"></div>
                </div>

                <div className="card-grid">
                    <div className="card">
                        <div className="card-icon">🤖</div>
                        <h3 className="card-title">ROS 2 Humble</h3>
                        <ul className="spec-list">
                            <li>Full robot middleware</li>
                            <li>DDS-based communication</li>
                            <li>diff_drive_controller</li>
                            <li>twist_mux for cmd_vel arbitration</li>
                            <li>robot_state_publisher + TF2</li>
                        </ul>
                    </div>
                    <div className="card">
                        <div className="card-icon">🗺️</div>
                        <h3 className="card-title">Nav2 + SLAM Toolbox</h3>
                        <ul className="spec-list">
                            <li>Autonomous navigation stack</li>
                            <li>Online async SLAM</li>
                            <li>DWB local planner</li>
                            <li>NavFn / Smac global planner</li>
                            <li>Behavior trees for recovery</li>
                        </ul>
                    </div>
                    <div className="card">
                        <div className="card-icon">📍</div>
                        <h3 className="card-title">Localization (EKF)</h3>
                        <ul className="spec-list">
                            <li>robot_localization package</li>
                            <li>IMU + wheel odometry fusion</li>
                            <li>Extended Kalman Filter</li>
                            <li>Reduces slip-based drift</li>
                        </ul>
                    </div>
                    <div className="card">
                        <div className="card-icon">🎮</div>
                        <h3 className="card-title">Control &amp; Safety</h3>
                        <ul className="spec-list">
                            <li>twist_mux priority-based arbitration</li>
                            <li>Joystick: priority 99</li>
                            <li>Web control: priority 95</li>
                            <li>Nav2: priority 80</li>
                            <li>Safety stop lock: priority 255</li>
                        </ul>
                    </div>
                </div>
            </section>
        </>
    );
}
