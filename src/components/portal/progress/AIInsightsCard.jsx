import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
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
    <section className="rounded-xl bg-ai p-5 text-ai-foreground">
      <h2 className="mb-3 text-[22px]">What the AI sees</h2>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4 justify-center">
          <p className="text-sm text-ai-foreground/70">Reading your check-ins</p>
        </div>
      ) : insights.length === 0 ? (
        <p className="py-1 text-sm text-ai-foreground/80">
          Nothing yet. This fills in after a few weeks of check-ins.
        </p>
      ) : (
        <div className="space-y-2.5">
          {insights.map((insight, i) => (
            <motion.div
              key={i}
              className="flex gap-2.5"
            >
              <p className="text-[15px] leading-relaxed text-ai-foreground/90">{insight}</p>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}