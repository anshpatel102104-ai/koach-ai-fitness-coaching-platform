/**
 * Shared weekly-digest data builder (Migration Step 5b).
 *
 * Replaces weeklyDigest's inline 0–10 priorityScore + churn logic with the
 * shared source-of-truth risk model (getAtRiskClients, 0–100). Pure function so
 * the edge function and the rehearsal run identical code — no local
 * reimplementation of scoring remains anywhere.
 *
 * Mapping of the old ad-hoc sections onto the shared model:
 *   - top_priority  → the top 3 at-risk clients by riskScore (0–100).
 *   - churn_risks   → at-risk clients whose flags include 'missed_checkin'
 *                     (the shared flag that fires at ≥14 days — same threshold
 *                     Base44 used for its churn list, now sourced from one model).
 * Non-scoring sections (wins, leads-to-convert, revenue) are preserved verbatim.
 */
import { differenceInDays } from 'date-fns';
import { getAtRiskClients } from './riskScoring.js';
import { escapeHtml } from './escapeHtml.js';

export function buildWeeklyDigest(clients, checkIns, now = new Date()) {
  const ciByClient = new Map();
  for (const ci of checkIns) {
    const a = ciByClient.get(ci.client_id) ?? [];
    a.push(ci);
    ciByClient.set(ci.client_id, a);
  }

  // Single source of truth for risk.
  const atRisk = getAtRiskClients(clients, checkIns, now); // sorted desc by riskScore

  const topPriority = atRisk.slice(0, 3).map((r) => ({
    name: r.client.name,
    risk_score: r.riskScore,             // 0–100
    flags: r.flags.map((f) => f.label),
  }));

  const churnRisks = atRisk
    .filter((r) => r.flags.some((f) => f.key === 'missed_checkin'))
    .map((r) => r.client.name);

  // ── non-scoring sections (verbatim from Base44) ──────────────────────────
  const lastWeekCI = checkIns.filter((ci) => differenceInDays(now, new Date(ci.date)) <= 7);
  const wins = lastWeekCI
    .filter((ci) => ci.compliance_training >= 90 || ci.mood === 'great')
    .map((ci) => {
      const client = clients.find((c) => c.id === ci.client_id);
      return client ? `${client.name}: ${ci.compliance_training || 0}% training compliance${ci.mood === 'great' ? ', great mood' : ''}` : null;
    })
    .filter(Boolean)
    .slice(0, 5);

  const staleLeads = clients.filter((c) => {
    if (c.lifecycle_status !== 'lead') return false;
    return differenceInDays(now, new Date(c.created_at || c.created_date || now)) >= 10;
  });

  const activeCount = clients.filter((c) => c.lifecycle_status === 'active' || c.status === 'active').length;
  const mrr = clients.reduce((sum, c) => sum + (Number(c.monthly_rate) || 0), 0);

  return {
    week_of: now.toISOString().split('T')[0],
    top_priority: topPriority,
    churn_risks: churnRisks,
    wins,
    leads_to_convert: staleLeads.map((c) => c.name),
    active_clients: activeCount,
    mrr,
  };
}

/** Email HTML — language adjusted for the 0–100 risk scale (no "X/10"). */
export function renderDigestEmail(digest, { tip, appUrl }) {
  const { week_of, top_priority, wins, churn_risks, leads_to_convert, active_clients, mrr } = digest;
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:32px;border-radius:16px;border:1px solid #e5e7eb;">
      <div style="background:#111827;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
        <h1 style="color:#fff;font-size:20px;margin:0 0 4px;">🧠 Your Weekly AI Coaching Digest</h1>
        <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">Week of ${escapeHtml(week_of)}</p>
      </div>
      <h2 style="color:#111827;font-size:15px;margin:0 0 12px;">🎯 Top 3 Clients to Prioritize</h2>
      ${top_priority.map((c, i) => `
        <div style="padding:12px;background:#f9fafb;border-radius:10px;margin-bottom:8px;border:1px solid #e5e7eb;">
          <span style="font-weight:700;color:#111827;">${i + 1}. ${escapeHtml(c.name)}</span>
          <span style="color:#6b7280;font-size:12px;margin-left:8px;">Risk score: ${escapeHtml(c.risk_score)}/100</span>
        </div>`).join('')}
      ${wins.length > 0 ? `
        <h2 style="color:#111827;font-size:15px;margin:24px 0 12px;">🏆 Biggest Wins Last Week</h2>
        ${wins.map((w) => `<div style="padding:10px 12px;background:#f0fdf4;border-radius:8px;margin-bottom:6px;color:#166534;font-size:13px;">✓ ${escapeHtml(w)}</div>`).join('')}
      ` : ''}
      ${churn_risks.length > 0 ? `
        <h2 style="color:#111827;font-size:15px;margin:24px 0 12px;">⚠️ Churn Risk Clients</h2>
        ${churn_risks.map((name) => `<div style="padding:10px 12px;background:#fff7ed;border-radius:8px;margin-bottom:6px;color:#9a3412;font-size:13px;">🔴 ${escapeHtml(name)} — hasn't checked in in 14+ days</div>`).join('')}
      ` : ''}
      ${leads_to_convert.length > 0 ? `
        <h2 style="color:#111827;font-size:15px;margin:24px 0 12px;">💡 Leads Ready to Convert</h2>
        ${leads_to_convert.map((name) => `<div style="padding:10px 12px;background:#f0f9ff;border-radius:8px;margin-bottom:6px;color:#0c4a6e;font-size:13px;">→ ${escapeHtml(name)}</div>`).join('')}
      ` : ''}
      <div style="margin:24px 0;padding:16px;background:#faf5ff;border-radius:10px;border:1px solid #e9d5ff;">
        <p style="margin:0 0 4px;font-weight:700;color:#6d28d9;font-size:13px;">💬 Coaching Tip of the Week</p>
        <p style="margin:0;color:#4c1d95;font-size:13px;">${escapeHtml(tip)}</p>
      </div>
      <div style="text-align:center;padding:16px;background:#f9fafb;border-radius:10px;">
        <p style="margin:0 0 8px;color:#6b7280;font-size:12px;">${escapeHtml(active_clients)} active clients · $${escapeHtml(Number(mrr).toLocaleString())}/mo MRR</p>
        <a href="${appUrl}/ai-insights" style="display:inline-block;background:#111827;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;">View Full Digest →</a>
      </div>
    </div>`;
}
