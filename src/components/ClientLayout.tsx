"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/Navbar";
import ToolLayout from "@/components/ToolLayout";
import AdBlockDetector from "@/components/AdBlockDetector";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";
import { TOOL_CHROME } from "@/data/tools";

/**
 * Chrome router. The single source of truth for which routes get which
 * navigation chrome is src/data/tools.ts (TOOL_CHROME map). No hardcoded
 * route lists live here anymore (docs/TOOL_INTEGRATION_PLAN.md §3).
 */
function chromeFor(pathname: string): "embedded" | "fullscreen" | undefined {
  const hit = Object.entries(TOOL_CHROME).find(
    ([href]) => pathname === href || pathname.startsWith(href + "/")
  );
  return hit?.[1];
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chrome = chromeFor(pathname);

  return (
    <>
      <AdBlockDetector />
      {chrome === "fullscreen" ? (
        <>{children}</>
      ) : chrome === "embedded" ? (
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
