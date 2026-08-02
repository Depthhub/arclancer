import type { NextConfig } from "next";

function mcpInternalOrigin() {
  const configured = process.env.MCP_INTERNAL_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return "http://mcp-server:3100";
  return "http://127.0.0.1:3100";
}

const nextConfig: NextConfig = {
  // Improve performance
  reactStrictMode: true,

  async rewrites() {
    const target = mcpInternalOrigin();
    return [
      { source: "/.well-known/:path*", destination: `${target}/.well-known/:path*` },
      { source: "/oauth/:path*", destination: `${target}/oauth/:path*` },
      { source: "/creator-tickets/:path*", destination: `${target}/creator-tickets/:path*` },
      { source: "/health", destination: `${target}/health` },
      { source: "/mcp", destination: `${target}/mcp` },
      { source: "/mcp/:path*", destination: `${target}/mcp/:path*` },
    ];
  },

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
    externalDir: true,
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
