"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/Navbar";
import ToolLayout from "@/components/ToolLayout";
import AdBlockDetector from "@/components/AdBlockDetector";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";
import { ExternalAdGateHost } from "@/components/ExternalAdGate";
import { AdGateHost } from "@/components/AdGate";
import { TOOL_CHROME } from "@/data/tools";
import { recordVisitForPath } from "@/lib/app-home";
import { installGlobalMediaSafetyNet, forceStopAllMediaStreams } from "@/lib/media-cleanup";

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

  // Install global media safety net once on mount
  useEffect(() => {
    installGlobalMediaSafetyNet();
  }, []);

  // App-home quick tools + route transition mic/cam leak guard:
  // When navigating away from any tool (e.g. /teleprompter -> /match-cut),
  // immediately force-stop any active microphone or camera streams.
  useEffect(() => {
    recordVisitForPath(pathname);
    return () => {
      forceStopAllMediaStreams();
    };
  }, [pathname]);

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
      <ExternalAdGateHost />
      <AdGateHost />
    </>
  );
}
