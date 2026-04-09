import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Improve performance
  reactStrictMode: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Reduce bundle size by externalizing large packages on server
  serverExternalPackages: ['viem'],

  // Set explicit Turbopack root to silence workspace root warning
  turbopack: {
    root: __dirname,
  },

  // Experimental optimizations
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      'lucide-react',
      '@rainbow-me/rainbowkit',
      '@iconify/react',
      'date-fns',
    ],
  },
};

export default nextConfig;
