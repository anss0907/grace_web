"use client";

import dynamic from "next/dynamic";

const InteractiveViewer = dynamic(
    () => import("../components/InteractiveViewer"),
    { ssr: false }
);

export default function ViewerPage() {
    return <InteractiveViewer />;
}
