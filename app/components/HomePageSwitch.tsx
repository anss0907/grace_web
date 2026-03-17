"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const MobileHome = dynamic(() => import("./MobileHome"), { ssr: false });

export default function HomePageSwitch({ desktopChildren }: { desktopChildren: React.ReactNode }) {
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        setMounted(true);
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // Before mount, render desktop (SSR-safe)
    if (!mounted) return <>{desktopChildren}</>;

    if (isMobile) return <MobileHome />;
    return <>{desktopChildren}</>;
}
