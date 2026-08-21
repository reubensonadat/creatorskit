"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/Navbar";
import ToolLayout from "@/components/ToolLayout";

const toolPaths = [
  "/text-behind", "/match-cut", "/auto-captions",
  "/carousel-slicer", "/quote-card", "/resizer", "/palette-extractor",
  "/compressor", "/watermark", "/background-replace", "/silence-trimmer",
  "/color-gradient",
];

const fullscreenApps = ["/space-planner", "/teleprompter"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTool = toolPaths.some((p) => pathname === p);
  const isFullscreen = fullscreenApps.some((p) => pathname === p);

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
