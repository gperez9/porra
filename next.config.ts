import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        hostname: "flagcdn.com",
        protocol: "https"
      }
    ]
  },
  reactStrictMode: true
};

export default nextConfig;
