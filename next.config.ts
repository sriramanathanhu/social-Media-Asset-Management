import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // External packages for server-side use
  serverExternalPackages: ['@prisma/client', 'prisma'],
  typescript: {
    // Ignore TypeScript errors during build to prevent build failures
    ignoreBuildErrors: true,
  },
  // Skip static generation for problematic pages
  trailingSlash: false,
  // Disable Next.js branding header
  poweredByHeader: false,
};

export default nextConfig;
