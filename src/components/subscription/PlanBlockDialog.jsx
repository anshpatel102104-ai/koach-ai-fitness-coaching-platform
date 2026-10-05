import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const TITLES = {
  monthly_ai_limit_reached: 'AI generation limit reached',
  feature_not_in_plan: 'Not included in your plan',
  billing_required: 'Subscription needed',
};

/**
 * Never a silent failure: when the server refuses an AI call (monthly limit,
 * feature not in the plan, no active subscription) the API facade emits
 * `koach:plan-block`; this dialog explains why and offers the upgrade.
 */
export default function PlanBlockDialog() {
  const [block, setBlock] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onBlock = (e) => setBlock(e.detail);
    window.addEventListener('koach:plan-block', onBlock);
    return () => window.removeEventListener('koach:plan-block', onBlock);
  }, []);

  if (!block) return null;
  const upgrade = block.upgrade_required !== false;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) setBlock(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />{TITLES[block.error] || 'Action not available'}</DialogTitle>
          <DialogDescription>{block.message || 'This action is not available on your current plan.'}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setBlock(null)}>Close</Button>
          {upgrade && (
            <Button onClick={() => { setBlock(null); navigate('/subscription'); }}>
              {block.error === 'billing_required' ? 'Subscribe' : 'Upgrade plan'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
