"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
    const pathname = usePathname();

    // Hide footer on the AI Chat page
    if (pathname === "/telemetry") {
        return null;
    }

    return (
        <footer className="site-footer">
          <div className="footer-content">
            <div className="footer-col">
              <h4>GRACE</h4>
              <p>
                An innovative robotics project redefining elderly care through
                non-invasive monitoring, proactive reminders, and autonomous
                assistance.
              </p>
            </div>

            <div className="footer-col">
              <h4>Navigation</h4>
              <ul>
                <li>
                  <a href="/">Home</a>
                </li>
                <li>
                  <a href="/hardware">Hardware</a>
                </li>
                <li>
                  <a href="/viewer">3D Viewer</a>
                </li>
                <li>
                  <a href="/telemetry">Talk to GRACE</a>
                </li>
                <li>
                  <a href="/teleop">Teleop</a>
                </li>
                <li>
                  <a href="/map">Map</a>
                </li>
                <li>
                  <a href="/dashboard">Dashboard</a>
                </li>
                <li>
                  <a href="/terminal">Terminal</a>
                </li>
                <li>
                  <a href="/viz">Visualization</a>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Project Info</h4>
              <ul>
                <li>FYP 2022 &middot; Group 3</li>
                <li>Dept. of Mechatronics &amp; Control</li>
                <li>UET Lahore</li>
                <li>ROS 2 Humble &middot; JetPack 6</li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Team Members</h4>
              <ul>
                <li>Muhammad Anss (2022-MC-01)</li>
                <li>Anas Gulzar (2022-MC-07)</li>
                <li>Alishba Ramzan (2022-MC-35)</li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2022-2026 GRACE Robot Project - All rights reserved</p>
            <p className="footer-credits">
              Built by Group 3 &middot; <strong>Muhammad Anss</strong>, Anas Gulzar &amp; Alishba Ramzan - UET Lahore
            </p>
          </div>
        </footer>
    );
}
