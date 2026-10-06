import React, { useState } from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { money } from '@/components/business/ui';

export default function ShareLinkModal({ pkg, onClose }) {
  const [copied, setCopied] = useState(false);
  const slug = pkg.slug || pkg.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'package';
  const url = `${window.location.origin}/packages/${slug}`;
  const per = pkg.billing_type && pkg.billing_type !== 'one_time'
    ? ` / ${pkg.billing_type === 'monthly' ? 'month' : pkg.billing_type === 'quarterly' ? 'quarter' : 'year'}`
    : ' once';

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <div>
          <DialogTitle>Share {pkg.name}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Anyone with the link can read the details and sign up.</p>
        </div>

        <div className="rounded-lg bg-secondary px-4 py-3.5">
          <p className="text-[15px] font-semibold text-foreground">{pkg.name}</p>
          {pkg.description && <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-2">{pkg.description}</p>}
          <p className="mt-2">
            <span className="num text-[22px] text-foreground">{money(pkg.price)}</span>
            <span className="text-[13px] text-muted-foreground">{per}</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="text-[13px] text-muted-foreground">Link</p>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0 h-10 flex items-center rounded-md border border-input bg-card px-3 text-sm text-foreground">
              <span className="truncate">{url}</span>
            </div>
            <Button variant={copied ? 'outline' : 'default'} onClick={copy}>
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2"
        >
          Open the landing page <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </DialogContent>
    </Dialog>
  );
}
