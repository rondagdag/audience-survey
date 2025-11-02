import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a minimal production bundle for containers
  output: "standalone",
  // Ensure runtime picks up the assigned port in Azure Container Apps
  experimental: {
    // Keep turbopack for dev only via script
  },
};

export default nextConfig;
