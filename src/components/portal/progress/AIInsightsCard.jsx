import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIInsightsCard({ client }) {
  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['progress-analysis-portal', client?.id],
    queryFn: () => portalDb.entities.ProgressAnalysis.filter({ client_id: client.id }, '-generated_at', 1),
    enabled: !!client?.id,
  });

  const latest = analyses[0];
  const insights = latest?.client_insights || [];

  return (
    <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgb(var(--ai) / 0.1), rgb(var(--primary) / 0.1))', border: '1px solid rgb(var(--ai) / 0.2)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-ai" />
        <p className="text-white font-bold text-sm">AI Progress Insights</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4 justify-center">
          <div className="w-4 h-4 border-2 border-ai/30 border-t-purple-400 rounded-full animate-spin" />
          <p className="text-white/40 text-xs">Loading insights...</p>
        </div>
      ) : insights.length === 0 ? (
        <p className="text-white/30 text-xs text-center py-3">
          Keep logging check-ins! AI insights unlock after a few weeks of data. 🎯
        </p>
      ) : (
        <div className="space-y-2.5">
          {insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex gap-2.5"
            >
              <span className="text-sm flex-shrink-0 mt-0.5">{['💡', '🎯', '🏆'][i] || '✨'}</span>
              <p className="text-white/70 text-sm leading-relaxed">{insight}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}