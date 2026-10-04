import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { sendEmail, isResendEnabled } from '@/lib/sendgrid';
import { useAuth } from '@/lib/AuthContext';

export default function SendGridConnectModal({ open, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState(false);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['coach-settings'],
    queryFn: () => db.entities.CoachSettings.list(),
  });
  const settings = settingsList[0];
  const isConnected = !!settings?.resend_connected;

  const saveMutation = useMutation({
    mutationFn: (data) =>
      settings?.id
        ? db.entities.CoachSettings.update(settings.id, data)
        : db.entities.CoachSettings.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coach-settings'] }),
  });

  const handleTest = async () => {
    if (!isResendEnabled()) {
      return toast.error('VITE_RESEND_API_KEY not set in secrets');
    }
    setTesting(true);
    try {
      const result = await sendEmail({
        to: user?.email,
        toName: user?.full_name || 'Coach',
        subject: 'Resend Test — KOACH AI ✅',
        html: `<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;"><div style="background:var(--tc-foreground);border-radius:12px;padding:32px;text-align:center;"><h1 style="color:white;font-size:24px;margin:0;">✅ Resend Connected!</h1><p style="color:color-mix(in srgb, white 60%, transparent);margin:8px 0 0;">KOACH AI can now send emails to your clients.</p></div></div>`,
      });
      if (!result?.error) {
        setTestOk(true);
        toast.success('Test email sent! Check your inbox.');
      } else {
        toast.error(result.error || 'Test failed');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      resend_connected: true,
      resend_from_email: import.meta.env.VITE_FROM_EMAIL || '',
      resend_from_name: import.meta.env.VITE_FROM_NAME || 'KOACH AI',
    });
    toast.success('Resend connected!');
  };

  const handleDisconnect = async () => {
    await saveMutation.mutateAsync({ resend_connected: false });
    toast.success('Resend disconnected');
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-bold text-sm">R</div>
            Connect Resend
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-success/10 border border-success rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-success">Connected</p>
                  {settings?.resend_from_email && (
                    <p className="text-xs text-success">From: {settings.resend_from_email}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <a href="https://resend.com/emails" target="_blank" rel="noreferrer" className="flex-1">
                  <Button variant="outline" className="w-full gap-1.5 text-xs">
                    <ExternalLink className="w-3.5 h-3.5" /> Resend Dashboard
                  </Button>
                </a>
                <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:border-destructive text-xs"
                  onClick={handleDisconnect} disabled={saveMutation.isPending}>
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted border border-border rounded-xl p-4">
                <p className="text-xs font-semibold text-foreground mb-2">Setup Instructions</p>
                <ol className="text-xs text-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Get your free API key at <a href="https://resend.com" target="_blank" className="text-black underline font-medium">resend.com</a></li>
                  <li>Add <code className="bg-card border border-border px-1 rounded font-mono text-[10px]">VITE_RESEND_API_KEY</code> to your app secrets</li>
                  <li>Optionally set <code className="bg-card border border-border px-1 rounded font-mono text-[10px]">VITE_FROM_EMAIL</code> and <code className="bg-card border border-border px-1 rounded font-mono text-[10px]">VITE_FROM_NAME</code></li>
                </ol>
                <a href="https://resend.com/api-keys" target="_blank"
                  className="flex items-center gap-1 text-xs text-black font-semibold mt-2.5 hover:underline">
                  Open API Keys <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {testOk && (
                <div className="flex items-center gap-2 p-3 bg-success/10 border border-success rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <p className="text-sm font-semibold text-success">Test email sent successfully!</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1 bg-black hover:bg-[var(--kc-222222)]" onClick={handleTest} disabled={testing}>
                  {testing ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Sending test...</> : 'Test Connection'}
                </Button>
                {testOk && (
                  <Button className="flex-1 bg-sidebar hover:bg-sidebar" onClick={handleSave}
                    disabled={saveMutation.isPending}>
                    Save & Connect
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}