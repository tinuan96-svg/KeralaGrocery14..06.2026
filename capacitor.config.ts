import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.keralagrocery.app',
  appName: 'KeralaGrocery',
  webDir: 'out',

  // Load the live production site inside WKWebView so SSR and API routes
  // continue to work. Capacitor still injects its native bridge, making all
  // plugins available (haptics, push, network, share, etc.).
  server: {
    url: 'https://keralagrocery.com',
    cleartext: false,
    // Note: Do NOT set androidScheme/iosScheme to 'https' when using a remote
    // server.url, as it can cause asset loading issues in some Capacitor versions.
    allowNavigation: [
      'keralagrocery.com',
      '*.keralagrocery.com',
      '*.supabase.co',
      '*.google.com',
      '*.googleapis.com',
      '*.gstatic.com',
    ],
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0B5D3B',
    // appendUserAgent preserves the standard WKWebView/Safari UA so the server
    // can still detect iOS correctly.
    appendUserAgent: 'KeralaGroceryApp',
    limitsNavigationsToAppBoundDomains: false,
    allowsLinkPreview: false,
  },

  loggingBehavior: 'none',

  plugins: {
    SplashScreen: {
      // launchAutoHide is true for App Store compliance: the splash will
      // disappear after a timeout even if the remote site fails to load.
      // We still call hide() programmatically for a faster transition.
      launchAutoHide: true,
      launchShowDuration: 8000,
      backgroundColor: '#0B5D3B',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B5D3B',
      overlaysWebView: false,
    },

    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
};

export default config;
