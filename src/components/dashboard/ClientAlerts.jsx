import React, { useState } from 'react';
import { db } from '@/api/supabaseClient';
import { Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';


export default function ClientAlerts({ clients, checkIns }) {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await db.functions.invoke('aiBusinessInsights', {
        action: 'clientAlerts', clients, checkIns,
      });
      setAlerts(res.data?.alerts || []);
    } finally {
      setLoading(false);
    }
  };

  const severityStyle = {
    high: 'bg-destructive/15 text-destructive border-destructive/20',
    medium: 'bg-warning/15 text-warning border-warning/20',
    low: 'bg-primary/15 text-primary border-primary/20',
  };

  return (
    <div className="bg-card border border-ai/30 rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-ai/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-ai" />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ai">AI Client Alerts</h2>
        </div>
        <div className="flex items-center gap-2">
          {alerts !== null && (
            <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="text-ai hover:text-ai disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {alerts === null && !loading && (
        <div className="text-center py-6">
          <Sparkles className="w-8 h-8 text-ai/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">AI will scan your clients for issues</p>
          <Button onClick={fetchAlerts} size="sm" className="bg-ai/20 text-ai hover:bg-ai/30 border border-ai/30">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Run Analysis
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-ai" />
          <p className="text-sm text-muted-foreground">Analyzing client data...</p>
        </div>
      )}

      {alerts !== null && expanded && !loading && (
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No issues detected ✓</p>
          ) : (
            alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${severityStyle[a.severity] || severityStyle.low}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold mb-0.5">{a.client_name} <span className="font-normal opacity-70">· {a.alert_type}</span></p>
                  <p className="text-xs opacity-90">{a.message}</p>
                </div>
                <span className="text-xs opacity-60 uppercase font-medium flex-shrink-0">{a.severity}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}