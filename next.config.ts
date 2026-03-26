import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: '/api/media/:path*',
      },
    ]
  },
};

export default nextConfig;
