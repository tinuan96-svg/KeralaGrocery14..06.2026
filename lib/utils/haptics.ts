import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const haptics = {
  impact: async (style: ImpactStyle = ImpactStyle.Light) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style });
      } catch (e) {
        // Silently fail if not available
      }
    }
  },
  notification: async (type: NotificationType = NotificationType.Success) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.notification({ type });
      } catch (e) {
        // Silently fail
      }
    }
  },
  vibrate: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.vibrate();
      } catch (e) {
        // Silently fail
      }
    }
  },
  selectionStart: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.selectionStart();
      } catch (e) {
        // Silently fail
      }
    }
  },
  selectionChanged: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.selectionChanged();
      } catch (e) {
        // Silently fail
      }
    }
  },
  selectionEnd: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.selectionEnd();
      } catch (e) {
        // Silently fail
      }
    }
  }
};
