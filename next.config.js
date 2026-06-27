/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'malluspices.com' },
      { protocol: 'https', hostname: '**.malluspices.com' },
      { protocol: 'https', hostname: 'keralagrocery.com' },
      { protocol: 'https', hostname: '*.keralagrocery.com' },
      { protocol: 'https', hostname: '**.webcontainer-api.io' },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes:  [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
  },
  experimental: {
    serverActions: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = { poll: 2000, aggregateTimeout: 500 };
    }
    config.parallelism = 1;
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /node_modules\/@supabase\/realtime-js/ },
    ];
    return config;
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  swcMinify:        true,
  poweredByHeader:  false,
  compress:         true,
  reactStrictMode:  true,
  async rewrites() {
    return [
      {
        source:      '/supabase-api/:path*',
        destination: 'https://vnqjqopzoeunojomssmq.supabase.co/:path*',
      },
    ];
  },
  async headers() {
    return [
      // ── Service worker: no cache, served from root scope ──────────────────
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      // ── Web manifest ──────────────────────────────────────────────────────
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
      // ── Apple App Site Association (Universal Links) ──────────────────────
      {
        source: '/.well-known/apple-app-site-association',
        headers: [
          { key: 'Cache-Control',  value: 'public, max-age=3600' },
          { key: 'Content-Type',   value: 'application/json' },
        ],
      },
      // ── Digital Asset Links (TWA verification) ────────────────────────────
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
          { key: 'Content-Type', value: 'application/json' },
        ],
      },
      // ── Icons and static assets: long-lived cache ─────────────────────────
      {
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // ── Global security headers ────────────────────────────────────────────
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'ALLOWALL' },
          { key: 'Content-Security-Policy',   value: "frame-ancestors *" },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
