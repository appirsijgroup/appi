import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Suppress hydration mismatch warnings caused by browser extensions
  serverExternalPackages: [],

  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Enable React Strict Mode for better development experience
  reactStrictMode: true,

  // Enable ESLint during builds (STANDARD: Check for errors)
  eslint: {
    ignoreDuringBuilds: false, // ❌ DISABLED: Enforce linting for production
  },

  // Enable TypeScript checks during builds (STANDARD: Check for type safety)
  typescript: {
    ignoreBuildErrors: false, // ❌ DISABLED: Enforce type checking for production
  },

  // ⚡ PERFORMANCE OPTIMIZATIONS

  // Enable gzip compression for production
  compress: true,

  // Disable source maps in production to reduce build size
  // Comment this out if you need production debugging
  productionBrowserSourceMaps: false,

  // Optimize images automatically
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [],
  },

  // 🔒 SECURITY HEADERS
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // DNS Prefetch for performance
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Enable XSS filter
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self';",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net;",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com;",
              "img-src 'self' data: https: blob:;",
              "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com;",
              "connect-src 'self' data: blob: https://cdnjs.cloudflare.com https://equran.id https://cdn.equran.id https://api.myquran.com;",
              "frame-src 'self' data: blob:;",
              "object-src 'none';",
              "base-uri 'self';",
              "form-action 'self';",
              "frame-ancestors 'self';"
            ].join(' ')
          },
          // Strict Transport Security removed to allow local network testing over HTTP
        ]
      }
    ];
  },

  // Note: swcMinify is default in Next.js 16+ (no need to specify)
  // Note: modularizeImports removed - causing build errors with recharts
  // Note: webpack config removed - Turbopack uses different config

  // Bundle analysis with Turbopack (uncomment to analyze bundle size)
  // experimental: {
  //   turbo: {
  //     rules: {
  //       '*.svg': {
  //         loaders: ['@svgr/webpack'],
  //         as: '*.js',
  //       },
  //     },
  //   },
  // },
};

export default nextConfig;
