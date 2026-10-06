import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createPaymentLink } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check, Loader2 } from 'lucide-react';
import { Panel } from '@/components/kit';
import { toast } from 'sonner';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Link copied');
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

export default function PaymentLinksPanel() {
  const [form, setForm] = useState({ name: '', amount: '', description: '' });
  const [generatedLink, setGeneratedLink] = useState(null);

  const mutation = useMutation({
    mutationFn: () => createPaymentLink(form.name, parseFloat(form.amount), form.description),
    onSuccess: (data) => {
      if (data?.url) {
        setGeneratedLink(data.url);
        toast.success('Payment link ready');
      } else {
        toast.error(data?.error || 'Failed to create link');
      }
    },
    onError: () => toast.error('Failed to create payment link'),
  });

  const isValid = form.name.trim() && parseFloat(form.amount) > 0;

  return (
    <Panel className="px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="text-[22px] text-foreground">Payment link</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-4">A Stripe checkout link for a one-off charge. Send it in Messages.</p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>What it's for</Label>
          <Input
            placeholder="Single coaching call"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Amount (USD)</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            className="resize-none"
            rows={2}
            placeholder="Shown on the payment page"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        <Button
          onClick={() => mutation.mutate()}
          disabled={!isValid || mutation.isPending}
        >
          {mutation.isPending && <Loader2 className="animate-spin" />}
          {mutation.isPending ? 'Creating…' : 'Create link'}
        </Button>

        {generatedLink && (
          <div className="mt-2 flex items-center gap-3 rounded-lg bg-secondary px-3 py-2.5">
            <a
              href={generatedLink}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-foreground truncate flex-1 underline underline-offset-4 decoration-1"
            >
              {generatedLink}
            </a>
            <CopyButton text={generatedLink} />
          </div>
        )}
      </div>
    </Panel>
  );
}
