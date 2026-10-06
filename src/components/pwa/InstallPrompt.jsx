import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, WifiOff, Smartphone, Share } from 'lucide-react';

const STORAGE_KEY = 'pwa_install_dismissed';
const VISIT_KEY = 'pwa_visit_count';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

const SHEET_TRANSITION = { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 };

function Sheet({ children, onClose }) {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={SHEET_TRANSITION}
      className="fixed bottom-0 left-0 right-0 z-[9999] rounded-t-2xl bg-card"
      style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      role="dialog"
    >
      <div className="flex justify-center pb-1 pt-3">
        <div className="h-1 w-10 rounded-full bg-border" />
      </div>
      <button onClick={onClose} aria-label="Close" className="touch-compact absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
        <X className="h-4 w-4" />
      </button>
      <div className="mx-auto max-w-md px-5 pb-2 pt-3">{children}</div>
    </motion.div>
  );
}

function AppTitle({ title, subtitle }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <img src="/favicon-180.png" alt="" className="h-14 w-14 rounded-[14px]" />
      <div>
        <p className="display text-[22px] text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function IOSInstructions({ onClose }) {
  return (
    <Sheet onClose={onClose}>
      <AppTitle title="Add KOACH to your home screen" subtitle="Opens full screen, like an app." />
      <ol className="divide-y divide-border rounded-xl bg-secondary px-4">
        {[
          <>Tap <Share className="mx-0.5 inline h-4 w-4 align-[-2px]" /> Share in Safari's toolbar</>,
          <>Scroll down and tap <strong className="font-semibold">Add to Home Screen</strong></>,
          <>Tap <strong className="font-semibold">Add</strong></>,
        ].map((text, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-foreground text-[13px] font-bold text-foreground">{i + 1}</span>
            <p className="text-[15px] text-foreground">{text}</p>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}

function AndroidPrompt({ onInstall, onClose }) {
  return (
    <Sheet onClose={onClose}>
      <AppTitle title="Install KOACH" subtitle="Add it to your home screen." />
      <ul className="mb-5 space-y-2 text-[15px] text-foreground">
        <li className="flex items-center gap-3"><WifiOff className="h-4 w-4 text-muted-foreground" /> Opens even with a weak signal</li>
        <li className="flex items-center gap-3"><Smartphone className="h-4 w-4 text-muted-foreground" /> Full screen, no browser bar</li>
      </ul>
      <button onClick={onInstall} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground">
        <Download className="h-4 w-4" /> Install
      </button>
      <button onClick={onClose} className="mt-2 h-11 w-full text-sm font-semibold text-muted-foreground">
        Not now
      </button>
    </Sheet>
  );
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Don't show if already installed
    if (isInStandaloneMode()) return;

    // Don't show if dismissed twice
    const dismissed = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
    if (dismissed >= 2) return;

    // Only show after 3rd visit
    const visits = parseInt(localStorage.getItem(VISIT_KEY) || '0') + 1;
    localStorage.setItem(VISIT_KEY, String(visits));
    if (visits < 3) return;

    setIsIOSDevice(isIOS());

    // Android: listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS: show after delay
    if (isIOS()) {
      setTimeout(() => setShow(true), 4000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
        localStorage.setItem(STORAGE_KEY, '2'); // don't show again
      }
      setDeferredPrompt(null);
    }
    setShow(false);
  };

  const handleClose = () => {
    setShow(false);
    const dismissed = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
    localStorage.setItem(STORAGE_KEY, String(dismissed + 1));
  };

  return (
    <>
      <AnimatePresence>
        {show && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/40"
              onClick={handleClose}
            />
            {isIOSDevice
              ? <IOSInstructions onClose={handleClose} />
              : <AndroidPrompt onInstall={handleInstall} onClose={handleClose} />
            }
          </>
        )}
      </AnimatePresence>
    </>
  );
}