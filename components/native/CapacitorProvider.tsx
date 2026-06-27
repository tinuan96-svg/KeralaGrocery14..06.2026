'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNetworkStatus } from '@/hooks/useNative';

interface CapacitorContextValue {
  isNative: boolean;
  platform: 'ios' | 'android' | 'web';
  isOnline: boolean;
  connectionType: string;
}

const CapacitorContext = createContext<CapacitorContextValue>({
  isNative: false,
  platform: 'web',
  isOnline: true,
  connectionType: 'unknown',
});

export function useCapacitorContext() {
  return useContext(CapacitorContext);
}

export function CapacitorProvider({ children }: { children: ReactNode }) {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');
  const { isOnline, connectionType } = useNetworkStatus();

  useEffect(() => {
    async function init() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        const native = Capacitor.isNativePlatform();
        const plat   = Capacitor.getPlatform() as 'ios' | 'android' | 'web';

        setIsNative(native);
        setPlatform(plat);

        if (native) {
          // Mark <html> so CSS can target the native shell
          document.documentElement.classList.add('is-native', `is-${plat}`);

          // Set status bar style first (doesn't need page to load)
          const { StatusBar, Style } = await import('@capacitor/status-bar');
          await StatusBar.setStyle({ style: Style.Light });
          if (plat === 'android') {
            await StatusBar.setBackgroundColor({ color: '#0B5D3B' });
          }

          // Hide the splash screen only after the web content is fully painted.
          // Since server.url loads a remote page, we wait for window 'load'
          // (all resources fetched) + a short paint delay, so the reviewer
          // never sees a blank WKWebView between splash and real content.
          // A 10-second hard timeout ensures the splash never gets stuck.
          const { SplashScreen } = await import('@capacitor/splash-screen');
          const hideSplash = async () => {
            await new Promise<void>((r) => setTimeout(r, 350));
            try { await SplashScreen.hide({ fadeOutDuration: 300 }); } catch { /* already hidden */ }
          };

          if (document.readyState === 'complete') {
            hideSplash();
          } else {
            window.addEventListener('load', hideSplash, { once: true });
          }
          // Fallback: always hide within 10 seconds
          setTimeout(() => {
            try { SplashScreen.hide({ fadeOutDuration: 200 }); } catch { /* ignore */ }
          }, 10000);

          // Resize body when keyboard shows/hides
          const { Keyboard } = await import('@capacitor/keyboard');
          await Keyboard.setScroll({ isDisabled: false });
        }
      } catch (e) {
        console.warn('[Capacitor] init error', e);
      }
    }

    init();
  }, []);

  return (
    <CapacitorContext.Provider value={{ isNative, platform, isOnline, connectionType }}>
      {children}
      {!isOnline && <OfflineBanner />}
    </CapacitorContext.Provider>
  );
}

function OfflineBanner() {
  return (
    <div
      role="alert"
      className="fixed bottom-16 left-0 right-0 z-[9999] mx-4 rounded-xl bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white shadow-2xl"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      No internet connection — some features may be unavailable
    </div>
  );
}
