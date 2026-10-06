import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2 } from 'lucide-react';

export default function AddToHomeScreenPrompt({ isOpen, onDismiss, isIOS }) {
  if (!isOpen || !isIOS) return null;

  const steps = [
    { title: 'Tap Share', body: <>The <Share2 className="inline h-3.5 w-3.5 align-[-2px]" /> icon at the bottom of Safari.</> },
    { title: 'Tap Add to Home Screen', body: 'Scroll down the menu to find it.' },
    { title: 'Tap Add', body: 'KOACH appears on your home screen.' },
  ];

  return (
    <AnimatePresence>
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
            <h2 className="text-[26px] text-foreground">Put KOACH on your home screen</h2>
            <p className="mt-1 text-[15px] text-muted-foreground">Quicker to open, and it can send you notifications.</p>

            <ol className="my-5 divide-y divide-border rounded-xl bg-secondary px-4">
              {steps.map((st, i) => (
                <li key={st.title} className="flex items-start gap-3 py-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-foreground text-[13px] font-bold text-foreground">{i + 1}</span>
                  <div>
                    <p className="text-[15px] font-semibold text-foreground">{st.title}</p>
                    <p className="text-sm text-muted-foreground">{st.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <button onClick={onDismiss} className="h-12 w-full rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground">
              Got it
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
