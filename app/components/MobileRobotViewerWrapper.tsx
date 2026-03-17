"use client";

import dynamic from "next/dynamic";

const MobileFullBodyScrollStory = dynamic(
    () => import("./MobileRobotViewer3D").then((mod) => ({ default: mod.MobileFullBodyScrollStory })),
    { ssr: false }
);

const MobileURDFBaseScrollStory = dynamic(
    () => import("./MobileRobotViewer3D").then((mod) => ({ default: mod.MobileURDFBaseScrollStory })),
    { ssr: false }
);

export { MobileFullBodyScrollStory, MobileURDFBaseScrollStory };
