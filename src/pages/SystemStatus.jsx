import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { getSupabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Page, PageHeader, Panel, PanelHeader, Stat, KeyValue, EmptyState } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { RELEASE } from '@/lib/release';
import PageNotFound from '@/lib/PageNotFound';

/**
 * Internal diagnostics — platform admins only (profiles.role = 'admin'; the
 * tables below are admin-readable by RLS, so a non-admin sees nothing either way).
 * Every status is computed from real data at load time. Nothing is hard-coded
 * "healthy": if a source can't be read, it says so.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function pct(n, d) { return d ? Math.round((n / d) * 1000) / 10 : 0; }
function p95(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
}
const when = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

async function loadStatus() {
  const sb = getSupabase();
  const since = new Date(Date.now() - DAY_MS).toISOString();

  const t0 = performance.now();
  const ping = await sb.from('profiles').select('id').limit(1);
  const dbLatency = Math.round(performance.now() - t0);

  const [ai, errs, hooks] = await Promise.all([
    sb.from('ai_usage_events')
      .select('created_at, request_id, kind, feature, model, status, error_type, latency_ms, input_tokens, output_tokens, estimated_cost_usd, credits')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(5000),
    sb.from('client_error_events')
      .select('created_at, source, error_type, message, route, fn, request_id, release, http_status')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(500),
    sb.from('processed_stripe_events')
      .select('event_type, processed_at').order('processed_at', { ascending: false }).limit(5),
  ]);

  return {
    db: { ok: !ping.error, latency: dbLatency, error: ping.error?.message },
    ai: ai.error ? { error: ai.error.message } : { rows: ai.data ?? [] },
    errors: errs.error ? { error: errs.error.message } : { rows: errs.data ?? [] },
    webhooks: hooks.error ? { error: hooks.error.message } : { rows: hooks.data ?? [] },
  };
}

function Unreadable({ what, error }) {
  return <p className="px-5 pb-5 sm:px-6 text-sm text-destructive">Couldn't read {what}: {error}</p>;
}

export default function SystemStatus() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['system-status'],
    queryFn: loadStatus,
    enabled: isAdmin,
    staleTime: 0,
  });

  if (!isAdmin) return <PageNotFound />;

  const calls = data?.ai.rows?.filter((r) => r.kind === 'llm_call') ?? [];
  const failed = calls.filter((r) => r.status === 'error');
  const latencies = calls.filter((r) => r.status === 'ok' && r.latency_ms != null).map((r) => r.latency_ms);
  const cost = calls.reduce((s, r) => s + Number(r.estimated_cost_usd || 0), 0);
  const tokens = calls.reduce((s, r) => s + (r.input_tokens || 0) + (r.output_tokens || 0), 0);
  const ledger = data?.ai.rows ?? [];
  const charged = ledger.filter((r) => r.kind === 'charge').length;
  const refunded = ledger.filter((r) => r.kind === 'refund').length;
  const blocked = ledger.filter((r) => r.kind === 'blocked').length;
  const lastOk = calls.find((r) => r.status === 'ok')?.created_at;

  return (
    <Page>
      <PageHeader
        eyebrow="Internal"
        title="System"
        subtitle="Live health from the database, the AI usage ledger and frontend error reports. Last 24 hours."
        actions={<Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={isFetching ? 'animate-spin' : undefined} /> Refresh</Button>}
      />

      <div className="grid gap-4">
        <Panel>
          <PanelHeader title="Release" />
          <div className="px-5 pb-5 sm:px-6 grid sm:grid-cols-2 sm:gap-x-8">
            <KeyValue label="Commit" value={<span className="font-mono text-[13px]">{RELEASE.commit}</span>} />
            <KeyValue label="Branch" value={RELEASE.branch || '—'} />
            <KeyValue label="Built" value={when(RELEASE.builtAt)} />
            <KeyValue label="Environment" value={RELEASE.environment} />
            <KeyValue label="Build id" value={RELEASE.buildId || '—'} />
            <KeyValue label="Checked" value={dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'} />
          </div>
        </Panel>

        {isLoading ? (
          <p className="text-sm text-muted-foreground" role="status">Checking…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Database" value={data.db.ok ? `${data.db.latency} ms` : 'Down'} sub={data.db.ok ? 'Round trip from this browser' : data.db.error} tone={data.db.ok ? undefined : 'danger'} />
              <Stat label="AI calls" value={calls.length} sub={`${pct(failed.length, calls.length)}% failed · last success ${lastOk ? new Date(lastOk).toLocaleTimeString() : 'none'}`} tone={failed.length && pct(failed.length, calls.length) > 10 ? 'danger' : undefined} />
              <Stat label="AI latency (p95)" value={p95(latencies) != null ? `${(p95(latencies) / 1000).toFixed(1)} s` : '—'} sub={`${tokens.toLocaleString()} tokens · ~$${cost.toFixed(2)}`} />
              <Stat label="AI credits" value={charged - refunded} sub={`${charged} charged · ${refunded} refunded · ${blocked} refused`} />
            </div>

            <Panel>
              <PanelHeader title="Recent AI failures" subtitle="From ai_usage_events. Match a request id against Supabase → Logs → Edge Functions." />
              {data.ai.error ? <Unreadable what="the AI ledger" error={data.ai.error} /> : failed.length === 0 ? (
                <EmptyState title="No AI failures in the last 24 hours" className="px-5 pb-5 sm:px-6" />
              ) : (
                <ul className="divide-y divide-border px-5 pb-3 sm:px-6">
                  {failed.slice(0, 20).map((r) => (
                    <li key={`${r.request_id}-${r.created_at}`} className="py-2.5 text-sm">
                      <span className="font-semibold text-foreground">{r.feature}</span>{' · '}
                      <span className="text-destructive">{r.error_type}</span>{' · '}
                      <span className="text-muted-foreground">{when(r.created_at)} · {r.model} · {r.latency_ms ?? '—'} ms · </span>
                      <span className="font-mono text-[12px] text-muted-foreground">{r.request_id}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel>
              <PanelHeader title="Frontend errors" subtitle="Crashes, failed calls and failed chunk loads reported by browsers (signed-in users)." />
              {data.errors.error ? <Unreadable what="client error reports" error={data.errors.error} /> : data.errors.rows.length === 0 ? (
                <EmptyState title="No frontend errors reported in the last 24 hours" className="px-5 pb-5 sm:px-6" />
              ) : (
                <ul className="divide-y divide-border px-5 pb-3 sm:px-6">
                  {data.errors.rows.slice(0, 30).map((e, i) => (
                    <li key={i} className="py-2.5 text-sm">
                      <span className="font-semibold text-foreground">{e.source}{e.fn ? `:${e.fn}` : ''}</span>{' · '}
                      <span className="text-muted-foreground">{e.route} · {when(e.created_at)} · {e.release?.slice(0, 7)}</span>
                      <p className="mt-0.5 break-words text-[13px] text-foreground">{e.message}</p>
                      {e.request_id && <p className="font-mono text-[12px] text-muted-foreground">{e.request_id}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel>
              <PanelHeader title="Stripe webhook" subtitle="Last events processed successfully (a failed event is retried by Stripe and logged as WEBHOOK_ERROR in the edge logs)." />
              {data.webhooks.error ? <Unreadable what="the webhook ledger" error={data.webhooks.error} /> : data.webhooks.rows.length === 0 ? (
                <EmptyState title="No webhook events processed yet" className="px-5 pb-5 sm:px-6" />
              ) : (
                <div className="px-5 pb-5 sm:px-6">
                  {data.webhooks.rows.map((w, i) => <KeyValue key={i} label={w.event_type} value={when(w.processed_at)} />)}
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </Page>
  );
}
