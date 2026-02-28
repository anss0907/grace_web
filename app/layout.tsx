import type { Metadata } from "next";
import Link from "next/link";
import ScrollToTop from "./components/ScrollToTop";
import "./globals.css";

export const metadata: Metadata = {
  title: "GRACE — Digital Nurse Robot",
  description:
    "Geriatric Robotic Assistance for Care and Engagement. A mobile companion robot for intelligent monitoring, interaction, and emotional support for elderly users.",
  keywords: ["GRACE", "robot", "ROS 2", "nurse", "elderly care", "Jetson"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ScrollToTop />
        {/* ========== NAVBAR ========== */}
        <nav className="navbar">
          <Link href="/" className="navbar-brand">
            <div className="navbar-logo">G</div>
            <div>
              <div className="navbar-title">GRACE</div>
              <div className="navbar-subtitle">Digital Nurse</div>
            </div>
          </Link>
          <ul className="navbar-links">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/hardware">Hardware</Link>
            </li>
            <li>
              <Link href="/viewer">3D Viewer</Link>
            </li>
            <li>
              <Link href="/telemetry">Telemetry</Link>
            </li>
            <li>
              <Link href="/teleop">Teleop</Link>
            </li>
            <li>
              <Link href="/map">Map</Link>
            </li>
            <li>
              <Link href="/dashboard">Dashboard</Link>
            </li>
            <li>
              <Link href="/viz">Visualization</Link>
            </li>
          </ul>
        </nav>

        {/* ========== MAIN CONTENT ========== */}
        <main className="main-content">{children}</main>

        {/* ========== FOOTER ========== */}
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <h3>GRACE</h3>
              <p>
                Geriatric Robotic Assistance for Care and Engagement — a mobile,
                non-physical companion robot focused on intelligent monitoring,
                interaction, and emotional support for elderly users.
              </p>
            </div>

            <div className="footer-col">
              <h4>Navigation</h4>
              <ul>
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li>
                  <Link href="/hardware">Hardware</Link>
                </li>
                <li>
                  <Link href="/viewer">3D Viewer</Link>
                </li>
                <li>
                  <Link href="/telemetry">Telemetry</Link>
                </li>
                <li>
                  <Link href="/teleop">Teleop</Link>
                </li>
                <li>
                  <Link href="/map">Map</Link>
                </li>
                <li>
                  <Link href="/dashboard">Dashboard</Link>
                </li>
                <li>
                  <Link href="/viz">Visualization</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Project Info</h4>
              <ul>
                <li>FYP 2022</li>
                <li>Dept. of Mechatronics &amp; Control</li>
                <li>UET Lahore</li>
                <li>ROS 2 Humble · JetPack 6</li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="footer-copyright">
              © 2022–{new Date().getFullYear()} GRACE Robot Project · All rights
              reserved
            </span>
            <span className="footer-author">
              Built by{" "}
              <a href="mailto:muhammadanss0907@gmail.com">Muhammad Anss</a> ·
              UET Lahore
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
