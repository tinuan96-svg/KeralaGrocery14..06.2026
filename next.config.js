/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export' is required for Capacitor. This ensures the app
  // is bundled into a set of static files that can be run natively on iOS.
  output: 'export',
  // trailingSlash ensures that navigation works correctly in the local file system.
  trailingSlash: true,
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
  },
  experimental: {
    // serverActions MUST be disabled for 'output: export'.
    // The build will fail if this is set to true.
    serverActions: false,
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
};

module.exports = nextConfig;
