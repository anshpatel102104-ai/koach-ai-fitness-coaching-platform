import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Panel, PersonRow, EmptyState } from '@/components/kit';
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
    <div className="px-4 py-6 sm:px-6 lg:py-10">
      <div className="max-w-lg mx-auto">
        {!resolvedClientId && (
          <div className="mb-6">
            <h1 className="text-[32px] sm:text-[40px] leading-none text-foreground">Weekly check-in</h1>
            <p className="text-[15px] text-muted-foreground mt-2">Who is checking in?</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !resolvedClientId ? (
          <Panel className="overflow-hidden">
            {activeClients.map(c => (
              <PersonRow
                key={c.id}
                name={c.name}
                detail={c.email}
                src={c.avatar_url}
                onClick={() => setSelectedClientId(c.id)}
                className="mx-0 px-5 rounded-none border-b border-border last:border-b-0"
              />
            ))}
            {activeClients.length === 0 && (
              <EmptyState title="No active clients." body="Invite a client first, then they can check in here." />
            )}
          </Panel>
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
