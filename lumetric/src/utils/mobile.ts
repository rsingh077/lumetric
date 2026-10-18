'use client';

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const isNativePlatform = (): boolean => {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
};

export const getMobilePlatform = (): 'ios' | 'android' | 'web' => {
  if (typeof window === 'undefined') return 'web';
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
};

export const triggerHapticFeedback = async (style: ImpactStyle = ImpactStyle.Light) => {
  try {
    if (Capacitor.isPluginAvailable('Haptics')) {
      await Haptics.impact({ style });
    }
  } catch {
    // Silently ignore in unsupported desktop browser environments
  }
};

export const initMobileApp = async () => {
  if (!isNativePlatform()) return;

  try {
    if (Capacitor.isPluginAvailable('StatusBar')) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setOverlaysWebView({ overlay: true });
    }
  } catch (err) {
    console.debug('StatusBar initialization fallback:', err);
  }

  try {
    if (Capacitor.isPluginAvailable('SplashScreen')) {
      await SplashScreen.hide();
    }
  } catch (err) {
    console.debug('SplashScreen initialization fallback:', err);
  }
};
