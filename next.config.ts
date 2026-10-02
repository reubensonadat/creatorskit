import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async redirects() {
    return [
      // Scrapped tools (owner ruling 2026-10-02 — docs/TOOL_INTEGRATION_PLAN.md §5).
      // NOTE: /overlay stays — it is the refresh-proof URL for the Auto Captions
      // overlay deck (renders the captions app with initialDeck="overlay").
      { source: "/exposure-monitor", destination: "/", permanent: true },
      // Space Planner sunset — route deleted, tool archived (docs/BUSINESS_MODEL_PLAN.md post-mortem).
      { source: "/space-planner", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
