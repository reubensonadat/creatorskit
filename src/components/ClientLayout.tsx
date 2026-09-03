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
];

const fullscreenApps = ["/teleprompter", "/space-planner", "/thumbnail-lab"];

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
