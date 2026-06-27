'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Returns true when the code is running inside a Capacitor native shell
 * (iOS or Android). Safe to call during SSR — returns false on the server.
 */
export function useIsNative(): boolean {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => {
      setIsNative(Capacitor.isNativePlatform());
    });
  }, []);

  return isNative;
}

/**
 * Returns the current platform string: 'ios' | 'android' | 'web'
 */
export function usePlatform(): 'ios' | 'android' | 'web' {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');

  useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => {
      setPlatform(Capacitor.getPlatform() as 'ios' | 'android' | 'web');
    });
  }, []);

  return platform;
}

/**
 * Triggers a medium-impact haptic vibration.
 * No-ops silently on web.
 */
export function useHaptics() {
  const trigger = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const styleMap = {
        light:  ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy:  ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: styleMap[style] });
    } catch {
      // not available on web
    }
  }, []);

  const notification = useCallback(async (type: 'success' | 'warning' | 'error' = 'success') => {
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      const typeMap = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error:   NotificationType.Error,
      };
      await Haptics.notification({ type: typeMap[type] });
    } catch {
      // not available on web
    }
  }, []);

  return { trigger, notification };
}

/**
 * Native share sheet. Falls back to navigator.share on web.
 */
export function useNativeShare() {
  const share = useCallback(async (options: {
    title?: string;
    text?: string;
    url?: string;
  }) => {
    try {
      const { Share } = await import('@capacitor/share');
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share(options);
        return;
      }
    } catch {
      // fall through to web
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share(options);
    }
  }, []);

  return { share };
}

/**
 * Monitors online/offline status using the Capacitor Network plugin.
 * Falls back to navigator.onLine on web.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function init() {
      try {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);

        const listener = await Network.addListener('networkStatusChange', (s) => {
          setIsOnline(s.connected);
          setConnectionType(s.connectionType);
        });

        cleanup = () => listener.remove();
      } catch {
        // web fallback
        setIsOnline(navigator.onLine);
        const online  = () => setIsOnline(true);
        const offline = () => setIsOnline(false);
        window.addEventListener('online',  online);
        window.addEventListener('offline', offline);
        cleanup = () => {
          window.removeEventListener('online',  online);
          window.removeEventListener('offline', offline);
        };
      }
    }

    init();
    return () => cleanup?.();
  }, []);

  return { isOnline, connectionType };
}

/**
 * Registers for push notifications and returns the FCM/APNS device token.
 * Call requestPermission() to prompt the user.
 */
export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  useEffect(() => {
    async function init() {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        const current = await PushNotifications.checkPermissions();
        setPermissionState(current.receive as 'prompt' | 'granted' | 'denied');

        if (current.receive === 'granted') {
          await PushNotifications.register();
        }

        const regListener = await PushNotifications.addListener('registration', (t) => {
          setToken(t.value);
          // TODO: store token in Supabase user_profiles for targeted sends
          console.log('[Push] Device token:', t.value);
        });

        const errListener = await PushNotifications.addListener('registrationError', (e) => {
          console.error('[Push] Registration error:', e);
        });

        return () => {
          regListener.remove();
          errListener.remove();
        };
      } catch {
        // web — push not available
      }
    }

    init();
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const result = await PushNotifications.requestPermissions();
      setPermissionState(result.receive as 'prompt' | 'granted' | 'denied');
      if (result.receive === 'granted') {
        await PushNotifications.register();
      }
      return result.receive;
    } catch {
      return 'denied';
    }
  }, []);

  return { token, permissionState, requestPermission };
}

/**
 * Pull-to-refresh using native Capacitor scroll detection.
 * Returns { isRefreshing, triggerRefresh } — wire `onRefresh` to your
 * data-reload function.
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const THRESHOLD = 80;

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);

  useEffect(() => {
    const el = document.documentElement;

    const onTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY.current;
      if (dy > THRESHOLD && window.scrollY === 0) {
        triggerRefresh();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [triggerRefresh]);

  return { isRefreshing, triggerRefresh };
}
