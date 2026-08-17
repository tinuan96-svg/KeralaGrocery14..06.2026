export const haptics = {
  impact: async (style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        const styleMap = {
          light: ImpactStyle.Light,
          medium: ImpactStyle.Medium,
          heavy: ImpactStyle.Heavy,
        };
        await Haptics.impact({ style: styleMap[style] || ImpactStyle.Light });
      }
    } catch (e) {
      // Silently fail
    }
  },
  notification: async (type: 'success' | 'warning' | 'error' = 'success') => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Haptics, NotificationType } = await import('@capacitor/haptics');
        const typeMap = {
          success: NotificationType.Success,
          warning: NotificationType.Warning,
          error: NotificationType.Error,
        };
        await Haptics.notification({ type: typeMap[type] || NotificationType.Success });
      }
    } catch (e) {
      // Silently fail
    }
  },
  vibrate: async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.vibrate();
      }
    } catch (e) {
      // Silently fail
    }
  },
  selectionStart: async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.selectionStart();
      }
    } catch (e) {
      // Silently fail
    }
  },
  selectionChanged: async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.selectionChanged();
      }
    } catch (e) {
      // Silently fail
    }
  },
  selectionEnd: async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.selectionEnd();
      }
    } catch (e) {
      // Silently fail
    }
  }
};
