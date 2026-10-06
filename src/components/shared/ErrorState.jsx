import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Reusable inline error state for failed data loads. Explains what failed and
 * offers a retry — never a silent empty screen.
 */
export default function ErrorState({
  title = "This didn't load",
  message = 'Check your connection and try again.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-start gap-2 px-5 py-8 sm:px-6 ${className}`} role="alert">
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <RefreshCw /> Try again
        </Button>
      )}
    </div>
  );
}
