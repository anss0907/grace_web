import type { Metadata, Viewport } from "next";
import Link from "next/link";
import ScrollToTop from "./components/ScrollToTop";
import MobileNav from "./components/MobileNav";
import { AuthWrapper, NavbarAuth } from "./components/AuthWrapper";
import { LANProvider } from "./components/LANProvider";
import LANSettings from "./components/LANSettings";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "GRACE — Digital Nurse Robot",
  description:
    "Geriatric Robotic Assistance for Care and Engagement. A mobile robot for intelligent monitoring, daily reminders, and dedicated care for elderly users.",
  keywords: ["GRACE", "robot", "ROS 2", "nurse", "elderly care", "Jetson"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthWrapper>
        <LANProvider>
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

          {/* Desktop nav links */}
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
              <Link href="/telemetry">Talk to GRACE</Link>
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
              <Link href="/terminal">Terminal</Link>
            </li>
            <li>
              <Link href="/viz">Visualization</Link>
            </li>
          </ul>

          {/* Admin login/logout & LAN settings */}
          <LANSettings />
          <NavbarAuth />

          {/* Mobile nav (hamburger + drawer) */}
          <MobileNav />
        </nav>

        {/* ========== MAIN CONTENT ========== */}
        <main className="main-content">{children}</main>

        {/* ========== FOOTER ========== */}
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <h3>GRACE</h3>
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
                  <Link href="/">Home</Link>
                </li>
                <li>
                  <Link href="/hardware">Hardware</Link>
                </li>
                <li>
                  <Link href="/viewer">3D Viewer</Link>
                </li>
                <li>
                  <Link href="/telemetry">Talk to GRACE</Link>
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
                  <Link href="/terminal">Terminal</Link>
                </li>
                <li>
                  <Link href="/viz">Visualization</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Project Info</h4>
              <ul>
                <li>FYP 2022 · Group 3</li>
                <li>Dept. of Mechatronics &amp; Control</li>
                <li>UET Lahore</li>
                <li>ROS 2 Humble · JetPack 6</li>
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
            <span className="footer-copyright">
              © 2022–{new Date().getFullYear()} GRACE Robot Project · All rights
              reserved
            </span>
            <span className="footer-author">
              Built by Group 3 ·{" "}
              <a href="mailto:muhammadanss0907@gmail.com">Muhammad Anss</a>,{" "}
              Anas Gulzar &amp; Alishba Ramzan · UET Lahore
            </span>
          </div>
        </footer>
        </LANProvider>
        </AuthWrapper>
      </body>
    </html>
  );
}
