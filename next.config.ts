import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options */
  reactCompiler: true,
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: { root: process.cwd() },
};

export default nextConfig;
