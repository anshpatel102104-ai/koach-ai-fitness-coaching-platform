import { db } from '@/api/supabaseClient';

const PERMISSION_KEY = 'koach_notification_permission';
const DENIED_TIME_KEY = 'koach_notification_denied_at';
const SHOW_HOME_SCREEN_KEY = 'koach_add_to_home_screen_shown';
const VISIT_COUNT_KEY = 'koach_portal_visits';
const WAIT_DAYS = 14;

export const pushNotificationManager = {
  // Check if notifications are supported
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  },

  // Check if we're on iOS
  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  // Determine if we should ask for permission
  shouldAskPermission() {
    if (!this.isSupported()) return false;
    if (Notification.permission !== 'default') return false;

    const deniedAt = localStorage.getItem(DENIED_TIME_KEY);
    if (deniedAt) {
      const daysPassed = (Date.now() - parseInt(deniedAt)) / (1000 * 60 * 60 * 24);
      if (daysPassed < WAIT_DAYS) return false;
    }

    return true;
  },

  // Show permission prompt (called after onboarding)
  async showPermissionPrompt() {
    if (!this.shouldAskPermission()) return false;

    // This would return true if user clicked "Enable"
    // The component will handle showing the actual prompt
    return true;
  },

  // Handle permission denial
  recordDenial() {
    localStorage.setItem(DENIED_TIME_KEY, Date.now().toString());
  },

  // Check if should show iOS add-to-home-screen prompt
  shouldShowAddToHomeScreen() {
    if (!this.isIOS()) return false;
    if (localStorage.getItem(SHOW_HOME_SCREEN_KEY) === 'true') return false;
    if (window.navigator.standalone === true) return false; // Already installed

    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0');
    return visitCount >= 3;
  },

  // Increment portal visit count
  trackPortalVisit() {
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0');
    localStorage.setItem(VISIT_COUNT_KEY, (visitCount + 1).toString());
  },

  // Record that we showed add-to-home prompt
  recordAddToHomeScreenShown() {
    localStorage.setItem(SHOW_HOME_SCREEN_KEY, 'true');
  },

  // Register service worker
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      return registration;
    } catch (err) {
      console.error('Service worker registration failed:', err);
      return null;
    }
  },

  // Subscribe to push notifications
  async subscribeToPush(swRegistration) {
    try {
      if (Notification.permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: await this.getPublicKey(),
      });

      // Send subscription to backend
      await db.functions.invoke('storePushSubscription', {
        subscription: JSON.stringify(subscription),
      });

      return subscription;
    } catch (err) {
      console.error('Push subscription failed:', err);
      throw err;
    }
  },

  // Get public VAPID key from backend
  async getPublicKey() {
    const response = await db.functions.invoke('getPushPublicKey', {});
    return this.urlBase64ToUint8Array(response.data.publicKey);
  },

  // Helper: convert base64 to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },

  // Unsubscribe from push
  async unsubscribeFromPush() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
  },
};