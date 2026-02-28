"use client";

import dynamic from "next/dynamic";

const FullBodyScrollStory = dynamic(
    () => import("./RobotViewer3D").then((mod) => ({ default: mod.FullBodyScrollStory })),
    { ssr: false }
);

const URDFBaseScrollStory = dynamic(
    () => import("./RobotViewer3D").then((mod) => ({ default: mod.URDFBaseScrollStory })),
    { ssr: false }
);

export { FullBodyScrollStory, URDFBaseScrollStory };

// Props-driven wrapper for embedding in any page
export default function RobotViewerWrapper({
    model = "fullbody",
    mode = "scroll",
}: {
    model?: "fullbody" | "base";
    mode?: "scroll" | "interactive";
}) {
    if (mode === "interactive") {
        // Interactive mode is handled by InteractiveViewer component directly
        return null;
    }

    // Scroll-driven story mode
    if (model === "base") {
        return <URDFBaseScrollStory />;
    }
    return <FullBodyScrollStory />;
}
