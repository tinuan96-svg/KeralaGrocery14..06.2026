'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNetworkStatus, usePushNotifications } from '@/hooks/useNative';
import { useAuth } from '@/lib/context/AuthContext';
import { getSupabase } from '@/lib/supabase/client';

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
  const { token, requestPermission } = usePushNotifications();
  const { user } = useAuth();

  // ── 1. App initialization ──────────────────────────────────────────────────
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

          try {
            // Set status bar style to Dark (Light text) for the dark green background
            const { StatusBar, Style } = await import('@capacitor/status-bar');
            await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
            if (plat === 'android') {
              await StatusBar.setBackgroundColor({ color: '#0B5D3B' }).catch(() => {});
            }
          } catch (e) {
            console.warn('[StatusBar] init error', e);
          }

          // Hide the splash screen only after the web content is fully painted.
          try {
            const { SplashScreen } = await import('@capacitor/splash-screen');
            const hideSplash = async () => {
              await new Promise<void>((r) => setTimeout(r, 400));
              try { await SplashScreen.hide({ fadeOutDuration: 400 }); } catch { /* ignore */ }
            };

            if (document.readyState === 'complete') {
              hideSplash();
            } else {
              window.addEventListener('load', hideSplash, { once: true });
            }
            // Fallback: always hide within 10 seconds
            setTimeout(() => {
              try { SplashScreen.hide({ fadeOutDuration: 300 }); } catch { /* ignore */ }
            }, 10000);
          } catch (e) {
            console.warn('[SplashScreen] init error', e);
          }

          try {
            // Resize body when keyboard shows/hides
            const { Keyboard } = await import('@capacitor/keyboard');
            await Keyboard.setScroll({ isDisabled: false }).catch(() => {});
          } catch (e) {
            console.warn('[Keyboard] init error', e);
          }
        }
      } catch (e) {
        console.warn('[Capacitor] init error', e);
      }
    }

    init();
  }, []);

  // ── 2. Handle Push Token registration ──────────────────────────────────────
  useEffect(() => {
    if (!isNative || !user || !token) return;

    const syncToken = async () => {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('user_profiles')
        .update({ fcm_token: token })
        .eq('id', user.id);

      if (error) {
        console.error('[Push] Token sync failed:', error.message);
      } else {
        console.log('[Push] Token synced to profile successfully');
      }
    };

    syncToken();
  }, [isNative, user, token]);

  // Prompt for push permissions on first native launch after login
  useEffect(() => {
    if (isNative && user) {
      requestPermission();
    }
  }, [isNative, user, requestPermission]);

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
