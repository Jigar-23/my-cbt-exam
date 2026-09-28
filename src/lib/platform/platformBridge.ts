/**
 * Platform Abstraction Bridge
 * CBT Exam Master 2026
 * 
 * Provides unified, safe native hardware access across:
 * - Mobile Android / iOS (via Capacitor)
 * - Desktop macOS / Windows (via Electron)
 * - Modern Web Browsers
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';

export type PlatformType = 'android' | 'ios' | 'electron' | 'web';

class PlatformBridgeService {
  private isNative: boolean = false;
  private backButtonListenerRegistered: boolean = false;
  private backButtonHandlers: Array<() => boolean> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.isNative = Capacitor.isNativePlatform();
      this.initHardwareBackListener();
    }
  }

  /**
   * Identifies current execution runtime environment.
   */
  public getPlatform(): PlatformType {
    if (typeof window === 'undefined') return 'web';
    if (Capacitor.getPlatform() === 'android') return 'android';
    if (Capacitor.getPlatform() === 'ios') return 'ios';
    if (this.isElectron()) return 'electron';
    return 'web';
  }

  /**
   * Detects if running within Electron desktop wrapper.
   */
  public isElectron(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      (window as any).process?.type === 'renderer' ||
      navigator.userAgent.toLowerCase().includes('electron') ||
      !!(window as any).__electron
    );
  }

  /**
   * Detects if running natively on Mobile (Capacitor Android/iOS).
   */
  public isMobileNative(): boolean {
    return this.isNative;
  }

  /**
   * Tactile haptic feedback for user interactions.
   * Seamlessly triggers native phone haptic engine or falls back to web vibration.
   */
  public async triggerHaptic(
    type: 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'selection'
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      if (this.isNative) {
        switch (type) {
          case 'selection':
            await Haptics.selectionChanged();
            break;
          case 'light':
            await Haptics.impact({ style: ImpactStyle.Light });
            break;
          case 'medium':
            await Haptics.impact({ style: ImpactStyle.Medium });
            break;
          case 'heavy':
            await Haptics.impact({ style: ImpactStyle.Heavy });
            break;
          case 'success':
            await Haptics.notification({ type: NotificationType.Success });
            break;
          case 'warning':
            await Haptics.notification({ type: NotificationType.Warning });
            break;
          case 'error':
            await Haptics.notification({ type: NotificationType.Error });
            break;
        }
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        // Web fallback
        if (type === 'selection' || type === 'light') {
          navigator.vibrate(10);
        } else if (type === 'medium') {
          navigator.vibrate(20);
        } else if (type === 'heavy' || type === 'warning' || type === 'error') {
          navigator.vibrate([25, 40, 25]);
        } else if (type === 'success') {
          navigator.vibrate([15, 30, 20]);
        }
      }
    } catch {
      // Haptics should never throw unhandled
    }
  }

  /**
   * Configures native status bar colors and themes on mobile.
   */
  public async setStatusBarTheme(isDark: boolean): Promise<void> {
    if (!this.isNative) return;

    try {
      await StatusBar.setStyle({
        style: isDark ? Style.Dark : Style.Light,
      });

      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({
          color: isDark ? '#0f1015' : '#ffffff',
        });
      }
    } catch (e) {
      console.warn('Status bar styling error:', e);
    }
  }

  /**
   * Registers a hardware back button handler on Android.
   * If handler returns true, the event is considered consumed and app will NOT exit.
   */
  public registerBackHandler(handler: () => boolean): () => void {
    this.backButtonHandlers.push(handler);
    return () => {
      this.backButtonHandlers = this.backButtonHandlers.filter((h) => h !== handler);
    };
  }

  private initHardwareBackListener(): void {
    if (!this.isNative || this.backButtonListenerRegistered) return;
    this.backButtonListenerRegistered = true;

    try {
      App.addListener('backButton', ({ canGoBack }) => {
        // Execute handlers from newest to oldest
        for (let i = this.backButtonHandlers.length - 1; i >= 0; i--) {
          const consumed = this.backButtonHandlers[i]();
          if (consumed) {
            return;
          }
        }

        // If no handler consumed and can go back in browser history
        if (canGoBack && typeof window !== 'undefined' && window.history.length > 1) {
          window.history.back();
        } else {
          // If on home dashboard with nothing open, minimize app instead of killing
          App.minimizeApp().catch(() => {});
        }
      }).catch(console.warn);
    } catch (e) {
      console.warn('Could not register native back listener:', e);
    }
  }
}

export const platformBridge = new PlatformBridgeService();
