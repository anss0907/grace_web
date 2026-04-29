"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
    { href: "/", label: "Home" },
    { href: "/hardware", label: "Hardware" },
    { href: "/viewer", label: "3D Viewer" },
    { href: "/telemetry", label: "Telemetry" },
    { href: "/teleop", label: "Teleop" },
    { href: "/map", label: "Map" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/terminal", label: "Terminal" },
    { href: "/viz", label: "Visualization" },
];

export default function MobileNav() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Close drawer on route change
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Lock body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    return (
        <>
            {/* Hamburger button - visible only on mobile via CSS */}
            <button
                className="hamburger-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
                aria-expanded={isOpen}
            >
                <span className={`hamburger-line ${isOpen ? "open" : ""}`} />
                <span className={`hamburger-line ${isOpen ? "open" : ""}`} />
                <span className={`hamburger-line ${isOpen ? "open" : ""}`} />
            </button>

            {/* Overlay */}
            <div
                className={`mobile-nav-overlay ${isOpen ? "visible" : ""}`}
                onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <nav className={`mobile-nav-drawer ${isOpen ? "open" : ""}`}>
                <div className="mobile-nav-header">
                    <div className="navbar-logo">G</div>
                    <div>
                        <div className="navbar-title" style={{ fontSize: "1.1rem" }}>GRACE</div>
                        <div className="navbar-subtitle">Digital Nurse</div>
                    </div>
                </div>
                <ul className="mobile-nav-links">
                    {NAV_LINKS.map((link) => (
                        <li key={link.href}>
                            <Link
                                href={link.href}
                                className={pathname === link.href ? "active" : ""}
                                onClick={() => setIsOpen(false)}
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </>
    );
}
