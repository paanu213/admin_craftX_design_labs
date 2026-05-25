import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // Silence Prisma driver warnings in edge runtime
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
};

export default nextConfig;
