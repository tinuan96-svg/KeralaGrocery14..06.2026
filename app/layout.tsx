import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/lib/context/AuthContext';
import { CartProvider } from '@/lib/context/CartContext';
import { WishlistProvider } from '@/lib/context/WishlistContext';
import { RealtimeSyncProvider } from '@/lib/context/RealtimeSyncContext';
import PerformanceHead from '@/components/layout/PerformanceHead';
import { OrganizationSchema, WebSiteSchema } from '@/components/seo/StructuredData';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import ServiceWorkerRegistration from '@/components/layout/ServiceWorkerRegistration';
import { CapacitorProvider } from '@/components/native/CapacitorProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

export const metadata: Metadata = {
  metadataBase: new URL('https://keralagrocery.com'),

  manifest: '/manifest.json',

  icons: {
    icon: [
      { url: '/icons/icon-32x32.png',  sizes: '32x32',  type: 'image/png' },
      { url: '/icons/icon-96x96.png',  sizes: '96x96',  type: 'image/png' },
      { url: '/icons/icon-192x192.png',sizes: '192x192',type: 'image/png' },
    ],
    shortcut:  '/icons/icon-192x192.png',
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'apple-touch-icon-precomposed', url: '/icons/apple-touch-icon.png' },
      { rel: 'mask-icon', url: '/icons/icon-512x512.png', color: '#0B5D3B' },
    ],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kerala Groceries',
    startupImage: [
      {
        url: '/icons/apple-splash-2048-2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/icons/apple-splash-1668-2388.png',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/icons/apple-splash-1290-2796.png',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/icons/apple-splash-1179-2556.png',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/icons/apple-splash-1170-2532.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/icons/apple-splash-1125-2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/icons/apple-splash-828-1792.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/icons/apple-splash-750-1334.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
    ],
  },

  applicationName: 'Kerala Groceries',
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',

  title: {
    default: 'Kerala Groceries UK | Buy Authentic Kerala & Indian Groceries Online',
    template: '%s | Kerala Groceries UK',
  },

  description:
    'Buy authentic Kerala groceries online in the UK. Fresh spices, rice, snacks, pickles, and traditional South Indian essentials. Fast UK delivery from Tasty Kerala Ltd.',

  keywords: [
    'Kerala groceries UK',
    'buy Kerala groceries online',
    'Indian groceries UK delivery',
    'authentic Kerala food UK',
    'Kerala spices online UK',
    'South Indian groceries UK',
    'Indian grocery delivery UK',
    'buy Indian groceries online UK',
    'Kerala snacks UK',
    'Kerala rice UK',
    'Kerala masala UK',
    'Indian food delivery UK',
    'online Indian grocery store UK',
    'Kerala pickles UK',
    'Kerala tea UK',
  ],

  authors:   [{ name: 'Tasty Kerala Ltd', url: 'https://keralagrocery.com' }],
  creator:   'Tasty Kerala Ltd',
  publisher: 'Tasty Kerala Ltd',

  category: 'ecommerce grocery',

  formatDetection: {
    email:     false,
    address:   false,
    telephone: false,
  },

  alternates: {
    canonical: 'https://keralagrocery.com',
    languages: { 'en-GB': 'https://keralagrocery.com' },
  },

  openGraph: {
    title:       'Kerala Groceries UK | Authentic Kerala & Indian Grocery Delivery',
    description: 'Buy authentic Kerala and Indian groceries online. Spices, rice, snacks, and traditional essentials delivered fast across the UK.',
    url:         'https://keralagrocery.com',
    siteName:    'Kerala Groceries UK',
    images: [
      {
        url:    '/logo_KG_Trans.png',
        width:  800,
        height: 951,
        alt:    'Kerala Groceries UK – Authentic Kerala Food Delivered',
      },
    ],
    locale:      'en_GB',
    type:        'website',
    countryName: 'United Kingdom',
  },

  twitter: {
    card:        'summary_large_image',
    title:       'Kerala Groceries UK | Buy Authentic Kerala Food Online',
    description: 'Authentic Kerala spices, snacks, rice, and groceries delivered fast across the UK.',
    images:      ['/logo_KG_Trans.png'],
  },

  robots: {
    index:   true,
    follow:  true,
    nocache: false,
    googleBot: {
      index:            true,
      follow:           true,
      noimageindex:     false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet':       -1,
    },
  },

  verification: {
    google: 'verification_token',
  },

  other: {
    'mobile-web-app-capable':         'yes',
    'msapplication-TileColor':        '#0B5D3B',
    'msapplication-TileImage':        '/icons/icon-144x144.png',
    'msapplication-config':           '/browserconfig.xml',
    'geo.region':    'GB',
    'geo.placename': 'United Kingdom',
    'DC.language':   'en-GB',
    'DC.publisher':  'Tasty Kerala Ltd',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" suppressHydrationWarning className="antialiased">
      <head>
        <PerformanceHead />
        <OrganizationSchema />
        <WebSiteSchema />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        <ServiceWorkerRegistration />
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_ID} />
        <OfflineBanner />
        <ErrorBoundary>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <RealtimeSyncProvider>
                  <CapacitorProvider>
                    {children}
                    <Toaster />
                  </CapacitorProvider>
                </RealtimeSyncProvider>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
