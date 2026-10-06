import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BADGE_CONFIG, TIER_STYLES } from '@/lib/badges';

/** Quiet confirmation after a badge is awarded. Closes itself. */
export default function BadgeUnlockToast({ badgeKey, clientName, onClose }) {
  const cfg = BADGE_CONFIG[badgeKey];
  const tier = cfg ? TIER_STYLES[cfg.tier] : null;

  useEffect(() => {
    if (!cfg) return undefined;
    if (navigator.vibrate) navigator.vibrate(60);
    const t = setTimeout(onClose, 3800);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cfg || !tier) return null;

  return (
    <AnimatePresence>
      <motion.div
        role="status"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed bottom-20 right-4 z-50 w-[300px] cursor-pointer rounded-xl bg-ai p-4 text-ai-foreground lg:bottom-6 lg:right-6"
      >
        <p className="text-[13px] text-ai-foreground/60">Badge awarded{clientName ? ` to ${clientName}` : ''}</p>
        <p className="mt-1 text-[18px] font-semibold">{cfg.label}</p>
        <p className="mt-0.5 text-sm text-ai-foreground/80">{cfg.desc} · {tier.label}</p>
      </motion.div>
    </AnimatePresence>
  );
}
