import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Loader2 } from 'lucide-react';
import CheckInSubmitForm from '@/components/checkin/CheckInSubmitForm';

export default function SubmitCheckIn() {
  const { me } = useAuth();
  const [user, setUser] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');

  useEffect(() => {
    me().then(setUser).catch(() => {});
  }, []);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients-submit'],
    queryFn: () => db.entities.Client.list('name'),
  });

  const activeClients = clients.filter(c => c.status === 'active' || c.lifecycle_status === 'active');
  const resolvedClientId = selectedClientId || (activeClients.length === 1 ? activeClients[0]?.id : null);
  const selectedClient = clients.find(c => c.id === resolvedClientId);

  const { data: recentCheckIns = [] } = useQuery({
    queryKey: ['last-checkin', resolvedClientId],
    queryFn: () => db.entities.CheckIn.filter({ client_id: resolvedClientId }, '-date', 1),
    enabled: !!resolvedClientId,
  });

  const lastCheckIn = recentCheckIns[0] ?? null;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pt-2">
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold">Weekly Check-In</h1>
            <p className="text-sm text-muted-foreground">
              {selectedClient ? `For ${selectedClient.name}` : "How's this week been?"}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : !resolvedClientId ? (
          /* Client picker */
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground mb-4">Select your profile:</p>
            {activeClients.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 active:scale-[0.98] transition-all text-left"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base flex-shrink-0">
                  {c.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
              </button>
            ))}
            {activeClients.length === 0 && (
              <p className="text-center text-muted-foreground py-10 text-sm">No active clients found.</p>
            )}
          </div>
        ) : (
          <CheckInSubmitForm
            clientId={resolvedClientId}
            clientName={selectedClient?.name}
            lastCheckIn={lastCheckIn}
            onSuccess={() => {}}
          />
        )}
      </div>
    </div>
  );
}