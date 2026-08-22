"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/Navbar";
import ToolLayout from "@/components/ToolLayout";

const toolPaths = [
  "/text-behind",
  "/match-cut",
  "/text-highlighter",
  "/sync-slate",
  "/exposure-monitor",
  "/auto-captions",
  "/carousel-slicer",
  "/quote-card",
  "/resizer",
  "/palette-extractor",
  "/compressor",
  "/watermark",
  "/background-replace",
  "/silence-trimmer",
  "/color-gradient",
];

const fullscreenApps = ["/teleprompter", "/space-planner"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreen = fullscreenApps.includes(pathname);
  const isTool = toolPaths.includes(pathname);

  return (
    <>
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
    </>
  );
}
