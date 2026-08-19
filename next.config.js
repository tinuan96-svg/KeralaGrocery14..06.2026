/** @type {import('next').NextConfig} */
// Force Bolt Refresh: August 19, 2026 19:48
const nextConfig = {
  output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
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
  transpilePackages: ['lucide-react'],
  experimental: {
    // optimizePackageImports: ['lucide-react'],
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
  swcMinify: true,
  reactStrictMode: false,
};

module.exports = nextConfig;
