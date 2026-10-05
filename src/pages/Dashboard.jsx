import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import TodayView from '@/components/dashboard/TodayView';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import ErrorState from '@/components/shared/ErrorState';

export default function Dashboard() {
  const { me } = useAuth();
  const queryClient = useQueryClient();

  // Real-time subscriptions — invalidate on any change
  useEffect(() => {
    const unsubCI = db.entities.CheckIn.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
      queryClient.invalidateQueries({ queryKey: ['checkins-review'] });
    });
    const unsubMsg = db.entities.Message.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['messages-unread'] });
    });
    const unsubClient = db.entities.Client.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    });
    return () => { unsubCI(); unsubMsg(); unsubClient(); };
  }, [queryClient]);

  const {
    data: clients = [],
    isLoading: clientsLoading,
    isError: clientsError,
    refetch: refetchClients,
  } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('-created_date'),
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkins'],
    queryFn: () => db.entities.CheckIn.list('-date', 100),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages-unread'],
    queryFn: () => db.entities.Message.filter({ is_read: false }, '-created_date', 30),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments-dashboard'],
    queryFn: () => db.entities.Payment.filter({ status: 'pending' }, '-created_date', 50).then(pending =>
      db.entities.Payment.filter({ status: 'failed' }, '-created_date', 50).then(failed => [...pending, ...failed])
    ),
  });

  const [dashUser, setDashUser] = useState(null);
  useEffect(() => { me().then(setDashUser).catch(() => {}); }, []);

  return (
    <>
      {clientsError ? (
        <ErrorState
          title="Couldn't load your dashboard"
          message="We hit a problem loading your clients. Try again in a moment."
          onRetry={() => refetchClients()}
          className="min-h-[60vh]"
        />
      ) : clientsLoading && clients.length === 0 ? (
        <DashboardSkeleton />
      ) : (
        <TodayView clients={clients} checkIns={checkIns} messages={messages} payments={payments} />
      )}
    </>
  );
}