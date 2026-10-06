import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/portal/PortalUI';

export default function SignOutModal({ onCancel }) {
  const { logout } = useAuth();
  return (
    <Sheet open onClose={onCancel} title="Sign out?"
      footer={(
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" size="lg" className="flex-1" onClick={() => logout()}>Sign out</Button>
        </div>
      )}>
      <p className="text-[15px] text-muted-foreground">You'll need to sign in again to see your plan and messages.</p>
    </Sheet>
  );
}
