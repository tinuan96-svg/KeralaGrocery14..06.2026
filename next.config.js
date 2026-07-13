/** @type {import('next').NextConfig} */
// Force Bolt Refresh: July 08, 2026 06:45
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  output: 'export',
  images: {
    loader: 'custom',
    loaderFile: './lib/utils/supabaseImageLoader.ts',
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
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
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
  swcMinify: true, // Re-enabled for production
  reactStrictMode: true, // Re-enabled for quality
};

module.exports = nextConfig;
