import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, ExternalLink, Video, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';

export default function ZoomConnectModal({ open, onClose, settings }) {
  const queryClient = useQueryClient();
  const zoomConnected = !!settings?.zoom_connected && !!settings?.zoom_access_token;

  const [accessToken, setAccessToken] = useState('');
  const [defaultDuration, setDefaultDuration] = useState(String(settings?.zoom_default_duration || 60));
  const [waitingRoom, setWaitingRoom] = useState(settings?.zoom_waiting_room !== false);
  const [autoRecord, setAutoRecord] = useState(!!settings?.zoom_auto_record);

  const saveMutation = useMutation({
    mutationFn: (data) =>
      settings?.id
        ? db.entities.CoachSettings.update(settings.id, data)
        : db.entities.CoachSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-settings'] });
      toast.success('Zoom settings saved!');
      onClose();
    },
  });

  const handleConnect = () => {
    if (!accessToken.trim()) {
      toast.error('Please enter your Zoom OAuth Access Token');
      return;
    }
    // Validate token by calling Zoom /users/me
    fetch('https://api.zoom.us/v2/users/me', {
      headers: { Authorization: `Bearer ${accessToken.trim()}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.id) {
          saveMutation.mutate({
            zoom_connected: true,
            zoom_access_token: accessToken.trim(),
            zoom_user_email: data.email || '',
            zoom_default_duration: Number(defaultDuration),
            zoom_waiting_room: waitingRoom,
            zoom_auto_record: autoRecord,
          });
          toast.success(`Connected as ${data.email}`);
        } else {
          toast.error('Invalid token — could not authenticate with Zoom');
        }
      })
      .catch(() => toast.error('Failed to connect. Check your token.'));
  };

  const handleSaveSettings = () => {
    saveMutation.mutate({
      zoom_default_duration: Number(defaultDuration),
      zoom_waiting_room: waitingRoom,
      zoom_auto_record: autoRecord,
    });
  };

  const handleDisconnect = () => {
    saveMutation.mutate({
      zoom_connected: false,
      zoom_access_token: '',
      zoom_user_email: '',
    });
    toast.success('Zoom disconnected');
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--kc-2d8cff)]/10 flex items-center justify-center">
              <Video className="w-4 h-4 text-[var(--kc-2d8cff)]" />
            </div>
            {zoomConnected ? 'Zoom Settings' : 'Connect Zoom'}
          </DialogTitle>
        </DialogHeader>

        {zoomConnected ? (
          <div className="space-y-4 mt-1">
            {/* Connected badge */}
            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-success">Connected</p>
                {settings?.zoom_user_email && (
                  <p className="text-xs text-success">{settings.zoom_user_email}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Default Meeting Duration</Label>
              <Select value={defaultDuration} onValueChange={setDefaultDuration}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
              <div>
                <p className="text-sm font-semibold text-foreground">Waiting Room</p>
                <p className="text-xs text-muted-foreground">Clients wait until you admit them</p>
              </div>
              <Switch checked={waitingRoom} onCheckedChange={setWaitingRoom} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
              <div>
                <p className="text-sm font-semibold text-foreground">Auto-record Sessions</p>
                <p className="text-xs text-muted-foreground">Automatically record to Zoom cloud</p>
              </div>
              <Switch checked={autoRecord} onCheckedChange={setAutoRecord} />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
                onClick={handleDisconnect}
                disabled={saveMutation.isPending}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Disconnect
              </Button>
              <Button
                className="flex-1 bg-[var(--kc-2d8cff)] hover:bg-[var(--kc-2681f2)]"
                onClick={handleSaveSettings}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-1">
            {/* Setup instructions */}
            <div className="bg-accent/10 border border-accent rounded-xl p-4">
              <p className="text-xs font-semibold text-primary mb-2">Setup Instructions</p>
              <ol className="text-xs text-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Go to <a href="https://marketplace.zoom.us" target="_blank" className="text-[var(--kc-2d8cff)] underline font-medium">marketplace.zoom.us</a></li>
                <li>Sign in → click <strong>Develop</strong> → <strong>Build App</strong></li>
                <li>Choose <strong>OAuth</strong> app type</li>
                <li>Set redirect URL and authorize your app</li>
                <li>Copy your OAuth <strong>Access Token</strong> below</li>
              </ol>
              <a
                href="https://marketplace.zoom.us/develop/create"
                target="_blank"
                className="flex items-center gap-1 text-xs text-[var(--kc-2d8cff)] font-semibold mt-2.5 hover:underline"
              >
                Open Zoom Marketplace <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div>
              <Label>Zoom OAuth Access Token *</Label>
              <Input
                className="mt-1.5 font-mono text-xs"
                placeholder="Paste your access token here..."
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                type="password"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Token is stored securely and used only to create meeting links.
              </p>
            </div>

            <Button
              className="w-full bg-[var(--kc-2d8cff)] hover:bg-[var(--kc-2681f2)]"
              onClick={handleConnect}
              disabled={saveMutation.isPending || !accessToken.trim()}
            >
              {saveMutation.isPending ? 'Connecting...' : 'Connect Zoom Account'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}