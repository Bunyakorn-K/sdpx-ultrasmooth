import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options */
  reactCompiler: true,
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  // Bundle HeroUI instead of loading it as an external module; Turbopack's
  // external-module symlinks fail on Windows without symlink permission.
  transpilePackages: ["@heroui/react", "@heroui/styles"],
};

export default nextConfig;
