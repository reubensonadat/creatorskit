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

const fullscreenApps = ["/teleprompter", "/space-planner", "/thumbnail-lab", "/video-grabber", "/bouquet"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreen = fullscreenApps.some(
    (app) => pathname === app || pathname.startsWith(app + "/")
  );
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
