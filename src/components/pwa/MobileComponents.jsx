/**
 * Reusable mobile-first UI primitives for KOACH AI portal
 */
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { ChevronLeft, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Haptic feedback ── */
export function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30],
    success: [10, 50, 10],
    warning: [50, 30, 50],
    error: [100],
  };
  navigator.vibrate(patterns[type] || patterns.light);
}

/* ── Safe Area Wrapper ── */
export function SafeAreaWrapper({ children, className = '', top = true, bottom = true }) {
  return (
    <div
      className={cn('flex flex-col', className)}
      style={{
        paddingTop: top ? 'env(safe-area-inset-top, 0px)' : undefined,
        paddingBottom: bottom ? 'env(safe-area-inset-bottom, 0px)' : undefined,
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {children}
    </div>
  );
}

/* ── Mobile Card ── */
export function MobileCard({ children, className = '', onClick, style = {} }) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn('panel p-4', className)}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ── Mobile Button ── */
export function MobileButton({
  children, onClick, variant = 'primary', loading = false,
  disabled = false, className = '', type = 'button', fullWidth = true,
}) {
  const base = 'flex items-center justify-center gap-2 rounded-lg font-semibold text-[15px] transition-colors min-h-[48px] px-6 py-3';
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/85',
    secondary: 'border border-input bg-card text-foreground hover:bg-accent',
    ghost: 'text-muted-foreground hover:text-foreground',
    danger: 'bg-destructive/10 text-destructive hover:bg-destructive/10',
  };

  return (
    <motion.button
      type={type}
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
      onClick={() => { if (!disabled && !loading) { haptic('medium'); onClick?.(); } }}
      disabled={disabled || loading}
      className={cn(base, variants[variant], fullWidth ? 'w-full' : '', disabled || loading ? 'opacity-50' : '', className)}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </motion.button>
  );
}

/* ── Mobile Input ── */
export function MobileInput({
  label, value, onChange, placeholder = '', type = 'text',
  inputMode, autoComplete, required = false, className = '', error,
}) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  const inputModeMap = {
    email: 'email',
    number: 'decimal',
    phone: 'tel',
    text: 'text',
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <label className="text-sm font-medium text-foreground">{label}{required && <span className="text-destructive ml-0.5">*</span>}</label>}
      <div className={cn(
        'flex items-center bg-card rounded-lg border transition-shadow min-h-[48px] px-4',
        focused ? 'border-foreground ring-1 ring-foreground' : error ? 'border-destructive' : 'border-input',
      )}>
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode || inputModeMap[type] || 'text'}
          autoComplete={autoComplete}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          style={{ fontSize: 16, minHeight: 48 }} // prevents iOS zoom
        />
        {value && (
          <button type="button" onClick={() => { onChange?.(''); inputRef.current?.focus(); }}
            className="w-5 h-5 rounded-full bg-border flex items-center justify-center ml-2 flex-shrink-0">
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}

/* ── Mobile Header ── */
export function MobileHeader({ title, onBack, rightAction, rightLabel, transparent = false }) {
  return (
    <div
      className="flex items-center justify-between px-4 h-14 flex-shrink-0"
      style={{
        background: transparent ? 'transparent' : 'rgb(var(--card))',
        borderBottom: transparent ? 'none' : '1px solid rgb(var(--border))',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {onBack ? (
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { haptic('light'); onBack(); }}
          className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </motion.button>
      ) : <div className="w-9" />}

      <h1 className="text-foreground text-lg text-center flex-1 px-4 truncate">{title}</h1>

      {rightAction ? (
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { haptic('light'); rightAction(); }}
          className="flex-shrink-0 text-foreground font-semibold text-sm underline underline-offset-4">
          {rightLabel || 'Done'}
        </motion.button>
      ) : <div className="w-9" />}
    </div>
  );
}

/* ── Mobile Bottom Sheet ── */
export function MobileSheet({ open, onClose, children, title, snapPoints = ['50%', '90%'] }) {
  const dragControls = useDragControls();

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl overflow-hidden"
            style={{ maxHeight: '90vh', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
          >
            {/* Drag handle */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab"
              onPointerDown={e => dragControls.start(e)}
            >
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {title && (
              <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
                <h2 className="text-foreground text-xl">{title}</h2>
                <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
                  className="w-8 h-8 rounded-md hover:bg-accent flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              </div>
            )}

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 60px)' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Skeleton Loader ── */
export function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={cn('rounded-md bg-secondary animate-pulse', className)}
      style={style}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="panel p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}