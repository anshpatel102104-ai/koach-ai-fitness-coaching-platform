import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Bell } from 'lucide-react';
import { db } from '@/api/supabaseClient';

export default function PushPermissionPrompt({ onDismiss }) {
  const [step, setStep] = useState('initial'); // initial | denied | processing
  const [denialCount, setDenialCount] = useState(0);

  useEffect(() => {
    const count = parseInt(localStorage.getItem('push_denial_count') || '0');
    setDenialCount(count);
  }, []);

  const handleEnable = async () => {
    setStep('processing');
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Subscribe to push
        const registration = await navigator.serviceWorker.ready;
        if (registration.pushManager) {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
          });
          // Send subscription to backend
          await db.functions.invoke('savePushSubscription', {
            subscription: JSON.stringify(subscription),
          });
          localStorage.removeItem('push_denial_count');
          onDismiss?.();
        }
      } else if (permission === 'denied') {
        const newCount = denialCount + 1;
        localStorage.setItem('push_denial_count', String(newCount));
        setDenialCount(newCount);
        setStep(newCount >= 2 ? 'denied_final' : 'denied');
      }
    } catch (err) {
      console.error('Push permission error:', err);
      setStep('initial');
    }
  };

  const handleLater = () => {
    localStorage.setItem('push_prompt_dismissed', String(Date.now()));
    onDismiss?.();
  };

  const handleSettings = () => {
    if (navigator.userAgent.includes('iPhone')) {
      window.location.href = 'App-Prefs:root=NOTIFICATIONS_ID';
    } else if (navigator.userAgent.includes('Android')) {
      window.location.href = 'intent://com.android.settings/action_notification_settings#Intent;end';
    }
  };

  if (step === 'denied_final') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="fixed bottom-24 left-4 right-4 z-[60] mx-auto max-w-md">
        <div className="panel p-4">
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-foreground">Notifications are off in your phone's settings</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Turn them on there to get check-in reminders and messages from your coach.</p>
            </div>
            <button onClick={onDismiss} aria-label="Close" className="touch-compact flex-shrink-0 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <button onClick={handleSettings} className="mt-3 h-10 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            Open settings
          </button>
        </div>
      </motion.div>
    );
  }

  if (step === 'denied') {
    return (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
        className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-2xl bg-card p-5"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        <button onClick={onDismiss} aria-label="Close" className="touch-compact absolute right-4 top-4 text-muted-foreground">
          <X className="h-5 w-5" />
        </button>
        <div className="mx-auto max-w-md">
          <p className="display text-[24px] text-foreground">Notifications are off.</p>
          <p className="mt-1 text-[15px] text-muted-foreground">
            To turn them back on, allow notifications for KOACH in your phone's settings.
          </p>
          <button onClick={handleSettings} className="mt-5 h-12 w-full rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground">
            Open phone settings
          </button>
          <button onClick={onDismiss} className="mt-2 h-11 w-full text-sm font-semibold text-muted-foreground">
            Got it
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end bg-black/40"
      onClick={onDismiss}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
        onClick={e => e.stopPropagation()}
        className="w-full rounded-t-2xl bg-card px-5 pt-6"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto max-w-md">
          <p className="display text-[28px] leading-tight text-foreground">Hear from your coach when it matters.</p>
          <p className="mt-2 text-[15px] text-muted-foreground">Three kinds of alerts, nothing else.</p>

          <ul className="my-5 divide-y divide-border rounded-xl bg-secondary px-4">
            {[
              'Your coach sends you a message',
              'Your weekly check-in is due',
              'You hit a goal or a new best',
            ].map(text => (
              <li key={text} className="py-3 text-[15px] text-foreground">{text}</li>
            ))}
          </ul>

          <button
            onClick={handleEnable}
            disabled={step === 'processing'}
            className="h-12 w-full rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity disabled:opacity-50">
            {step === 'processing' ? 'Turning on' : 'Turn on notifications'}
          </button>

          <button onClick={handleLater} className="mt-2 h-11 w-full text-sm font-semibold text-muted-foreground">
            Not now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
