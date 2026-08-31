import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile shared workspace packages
  transpilePackages: ["@tillu/schemas"],
  experimental: {
    // Enables server component imports from workspace packages
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
