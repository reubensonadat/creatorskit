"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/Navbar";
import ToolLayout from "@/components/ToolLayout";
import AdBlockDetector from "@/components/AdBlockDetector";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";

const toolPaths = [
  "/business",
  "/match-cut",
  "/text-highlighter",
  "/sync-slate",
  "/exposure-monitor",
  "/carousel-slicer",
  "/quote-card",
  "/resizer",
  "/palette-extractor",
  "/compressor",
  "/watermark",
  "/color-gradient",
  "/captions",
  "/auto-captions",
];

// tree-qr is a full-page living diorama — the canvas owns the viewport and
// the studio controls dock over it as a toggleable side panel.
const fullscreenApps = ["/teleprompter", "/space-planner", "/thumbnail-lab", "/tree-qr"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreen = fullscreenApps.includes(pathname);
  const isTool = toolPaths.includes(pathname);

  return (
    <>
      <AdBlockDetector />
      {isFullscreen ? (
        <>{children}</>
      ) : isTool ? (
        <ToolLayout>{children}</ToolLayout>
      ) : (
        <>
          <Navbar />
          {children}
        </>
      )}
      <Toaster />
      <PwaInstallPrompt />
    </>
  );
}
