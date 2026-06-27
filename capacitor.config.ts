import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.keralagrocery.app',
  appName: 'KeralaGrocery',
  webDir: 'out',

  // We are now using a static export (output: 'export' in next.config.js).
  // This bundles the entire UI into the app binary, making it much more
  // reliable, faster, and compliant with App Store guidelines.
  // The 'server' block with a 'url' has been removed so the app loads
  // the bundled static files from the 'out' directory.

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0B5D3B',
    appendUserAgent: 'KeralaGroceryApp',
    limitsNavigationsToAppBoundDomains: false,
    allowsLinkPreview: false,
  },

  loggingBehavior: 'none',

  plugins: {
    SplashScreen: {
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
