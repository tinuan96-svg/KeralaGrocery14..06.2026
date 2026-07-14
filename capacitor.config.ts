import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.keralagrocery.app',
  appName: 'KeralaGrocery',
  webDir: 'out',

  // Load the live production site inside WKWebView.
  // Capacitor still injects its native bridge.
  server: {
    url: 'https://keralagrocery.com',
    cleartext: false,
    allowNavigation: [
      'keralagrocery.com',
      '*.keralagrocery.com',
      '*.supabase.co',
      '*.google.com',
      '*.googleapis.com',
      '*.gstatic.com',
      '*.stripe.com',
      '*.google-analytics.com',
    ],
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0B5D3B',
    // Versioned UserAgent for mandatory update checks.
    // Increment this with every major release.
    appendUserAgent: 'KeralaGroceryApp/1.0.0',
    limitsNavigationsToAppBoundDomains: false,
    allowsLinkPreview: false,
  },

  android: {
    appendUserAgent: 'KeralaGroceryApp/1.0.0',
  },

  loggingBehavior: 'none',

  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
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
