import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.microcms-assets.io",
      },
    ],
  },
  outputFileTracingIncludes: {
    "/api/cron/new-camping-gear": [
      "./src/lib/camping-gear/assets/yurutto-weekly-eyecatch.jpg",
    ],
  },
};

export default nextConfig;
