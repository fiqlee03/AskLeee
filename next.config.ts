import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow mobile devices on the local network to load dev resources
  allowedDevOrigins: ['192.168.1.129'],
};

export default nextConfig;

