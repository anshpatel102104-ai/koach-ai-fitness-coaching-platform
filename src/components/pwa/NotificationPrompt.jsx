import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell } from 'lucide-react';

export default function NotificationPrompt({ isOpen, onEnable, onDismiss }) {
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onEnable();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
            className="fixed inset-0 z-40 bg-black/40" />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-50 w-full"
            onClick={e => e.stopPropagation()}>
            <div className="relative w-full rounded-t-2xl bg-card px-5 pt-6" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
              <button onClick={onDismiss} aria-label="Close"
                className="touch-compact absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>

              <div className="mx-auto max-w-md">
                <h2 className="pr-8 text-[26px] leading-tight text-foreground">Hear from your coach when it matters.</h2>
                <p className="mt-1 text-[15px] text-muted-foreground">Only these, nothing else.</p>

                <ul className="my-5 space-y-2.5">
                  {[
                    'Your coach sends you a message',
                    'Your weekly check-in is due',
                    'You hit a goal or a new best',
                  ].map(benefit => (
                    <li key={benefit} className="flex items-center gap-3 text-[15px] text-foreground">
                      <Bell className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      {benefit}
                    </li>
                  ))}
                </ul>

                <button onClick={handleEnable} disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity disabled:opacity-60">
                  {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />}
                  {loading ? 'Turning on' : 'Turn on notifications'}
                </button>

                <button onClick={onDismiss} className="mt-2 h-11 w-full text-sm font-semibold text-muted-foreground">
                  Not now
                </button>

                <p className="mt-2 text-center text-[13px] text-muted-foreground">
                  Change these any time in Settings.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
