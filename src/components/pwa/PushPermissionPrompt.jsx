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
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-24 left-4 right-4 z-[60]">
        <div className="bg-card rounded-2xl p-4 shadow-lg border border-orange-200">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-foreground font-bold text-sm mb-1">
                Enable notifications in your device settings to stay connected
              </p>
              <p className="text-muted-foreground text-xs">You won't miss check-in reminders or coach messages</p>
            </div>
            <button onClick={onDismiss} className="flex-shrink-0">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <button
            onClick={handleSettings}
            className="mt-3 w-full py-2 rounded-lg font-bold text-sm text-primary-foreground"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
            Go to Settings
          </button>
        </div>
      </motion.div>
    );
  }

  if (step === 'denied') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-0 left-0 right-0 z-[60]">
        <motion.div
          initial={{ y: 400 }}
          animate={{ y: 0 }}
          className="bg-card rounded-t-3xl p-6 pt-5">
          <button onClick={onDismiss} className="absolute top-4 right-4">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--tc-warning)', border: '1px solid var(--tc-warning)' }}>
              <Bell className="w-6 h-6 text-warning" />
            </div>
            <p className="text-foreground font-black text-lg mb-1">Notifications Disabled</p>
            <p className="text-muted-foreground text-sm mb-4">
              To re-enable, go to your device settings and allow notifications for KOACH AI
            </p>
            <button
              onClick={handleSettings}
              className="w-full py-3 rounded-xl font-bold text-primary-foreground mb-2"
              style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
              Open Device Settings
            </button>
            <button onClick={onDismiss} className="w-full py-3 rounded-xl font-semibold text-muted-foreground">
              Got it
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end"
      style={{ background: 'color-mix(in srgb, black 30%, transparent)' }}
      onClick={onDismiss}>
      <motion.div
        initial={{ y: 400 }}
        animate={{ y: 0 }}
        exit={{ y: 400 }}
        onClick={e => e.stopPropagation()}
        className="w-full bg-card rounded-t-3xl p-6">

        {/* Icon */}
        <div className="text-center mb-4">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
            <Bell className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Headline */}
        <h2 className="text-foreground font-black text-2xl text-center mb-2">
          Stay on top of your coaching 🔔
        </h2>
        <p className="text-muted-foreground text-center text-sm mb-5">
          Get instant updates and never miss important moments with your coach
        </p>

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          {[
            { emoji: '💬', text: 'Get notified when coach messages you' },
            { emoji: '📋', text: 'Never miss a check-in reminder' },
            { emoji: '🎉', text: 'Celebrate achievements instantly' },
          ].map((benefit, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-accent border border-accent">
              <span className="text-lg">{benefit.emoji}</span>
              <p className="text-foreground font-semibold text-sm">{benefit.text}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleEnable}
          disabled={step === 'processing'}
          className="w-full py-4 rounded-2xl font-black text-primary-foreground text-base mb-2 transition-opacity disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', boxShadow: '0 4px 16px color-mix(in srgb, var(--tc-primary) 30%, transparent)' }}>
          {step === 'processing' ? 'Enabling...' : 'Enable Notifications'}
        </button>

        <button onClick={handleLater} className="w-full py-3 font-semibold text-muted-foreground text-sm">
          Maybe Later
        </button>
      </motion.div>
    </motion.div>
  );
}