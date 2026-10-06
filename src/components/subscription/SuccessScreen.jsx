import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { KeyValue } from '@/components/kit';

const PLAN_NAMES = {
  starter: 'Starter', pro: 'Pro', elite: 'Elite', enterprise: 'Enterprise',
};

export default function SuccessScreen({ tier, price, billing, nextDate, email, onClose }) {
  const navigate = useNavigate();
  const tierName = PLAN_NAMES[tier] || tier;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <div>
          <DialogTitle>You're on {tierName}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">The new features are switched on now.</p>
        </div>

        <div className="rounded-lg bg-secondary px-4 py-1">
          <KeyValue label="Plan" value={tierName} />
          <KeyValue label="Amount" value={`$${price} a month, billed ${billing === 'annual' ? 'yearly' : 'monthly'}`} />
          <KeyValue label="Next bill" value={nextDate} />
          {email && <KeyValue label="Receipt sent to" value={email} />}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>View receipt</Button>
          <Button onClick={() => navigate('/')}>Back to Today</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
