import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseISO, startOfWeek, subWeeks } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Panel, Stat, PersonRow, TextLink } from '@/components/kit';
import { checkInScore } from '@/lib/adherence';

const MOOD_SCORE = { great: 5, good: 4, okay: 3, tired: 2, stressed: 1 };

function weekRange(weeksAgo) {
  const start = startOfWeek(subWeeks(new Date(), weeksAgo), { weekStartsOn: 1 });
  const end = startOfWeek(subWeeks(new Date(), weeksAgo - 1), { weekStartsOn: 1 });
  return { start, end };
}

function avg(arr) {
  if (!arr.length) return null;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}

export default function CheckInAnalyticsSidebar({ checkIns, clients, latestPerClient, clientMap }) {
  const navigate = useNavigate();

  // ── Section A: Weekly overview ──
  const thisWeek = useMemo(() => {
    const { start, end } = weekRange(0);
    return checkIns.filter(ci => {
      const d = parseISO(ci.date);
      return d >= start && d < end;
    });
  }, [checkIns]);

  const lastWeek = useMemo(() => {
    const { start, end } = weekRange(1);
    return checkIns.filter(ci => {
      const d = parseISO(ci.date);
      return d >= start && d < end;
    });
  }, [checkIns]);

  const weeklyStats = useMemo(() => {
    const ciCount = thisWeek.length;
    const lastCount = lastWeek.length;
    const countChange = lastCount > 0 ? Math.round(((ciCount - lastCount) / lastCount) * 100) : null;

    const complianceVals = thisWeek
      .map(ci => avg([ci.compliance_training, ci.compliance_nutrition].filter(v => v != null)))
      .filter(v => v != null);
    const avgCompliance = avg(complianceVals);

    const sleepVals = thisWeek.map(ci => ci.sleep_hours).filter(v => v != null);
    const avgSleep = sleepVals.length ? (sleepVals.reduce((s, v) => s + v, 0) / sleepVals.length).toFixed(1) : null;

    const moodVals = thisWeek.map(ci => MOOD_SCORE[ci.mood]).filter(v => v != null);
    const avgMood = moodVals.length ? (moodVals.reduce((s, v) => s + v, 0) / moodVals.length).toFixed(1) : null;

    return { ciCount, lastCount, countChange, avgCompliance, avgSleep, avgMood };
  }, [thisWeek, lastWeek]);

  // ── Section B: 4-week trend ──
  const weeklyTrend = useMemo(() => {
    return [3, 2, 1, 0].map((weeksAgo) => {
      const { start, end } = weekRange(weeksAgo);
      const wCIs = checkIns.filter(ci => {
        const d = parseISO(ci.date);
        return d >= start && d < end;
      });
      const vals = wCIs
        .map(ci => avg([ci.compliance_training, ci.compliance_nutrition].filter(v => v != null)))
        .filter(v => v != null);
      return { name: weeksAgo === 0 ? 'This week' : `${weeksAgo} wk ago`, value: avg(vals) ?? 0 };
    });
  }, [checkIns]);

  // ── Section C: At-risk clients ──
  const atRiskClients = useMemo(() => {
    return latestPerClient
      .map(ci => {
        const score = checkInScore(ci);
        const flags = [];
        if (ci.compliance_training != null && ci.compliance_training < 60) flags.push('missed workouts');
        if (ci.compliance_nutrition != null && ci.compliance_nutrition < 60) flags.push('nutrition off');
        if (ci.sleep_hours != null && ci.sleep_hours < 6) flags.push('poor sleep');
        if (ci.mood === 'stressed' || ci.mood === 'tired') flags.push(`mood: ${ci.mood}`);
        return { ci, client: clientMap[ci.client_id], score, flags };
      })
      .filter(x => x.flags.length > 0 || (x.score !== null && x.score < 60))
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
      .slice(0, 3);
  }, [latestPerClient, clientMap]);

  // ── Section D: Top performers (this week) ──
  const topPerformers = useMemo(() => {
    return latestPerClient
      .map(ci => {
        const compVals = [ci.compliance_training, ci.compliance_nutrition].filter(v => v != null);
        const score = compVals.length ? avg(compVals) : checkInScore(ci);
        const client = clientMap[ci.client_id];
        const allCIs = checkIns.filter(x => x.client_id === ci.client_id);
        // streak = consecutive days with compliance >= 80
        let streak = 0;
        for (const x of allCIs) {
          const s = checkInScore(x);
          if (s !== null && s >= 70) streak++;
          else break;
        }
        return { ci, client, score, streak };
      })
      .filter(x => x.score !== null && x.score >= 75)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3);
  }, [latestPerClient, clientMap, checkIns]);

  const changeText = weeklyStats.countChange === null
    ? null
    : weeklyStats.countChange === 0
      ? 'Same as last week'
      : `${weeklyStats.countChange > 0 ? 'Up' : 'Down'} ${Math.abs(weeklyStats.countChange)}% on last week`;

  return (
    <div className="grid gap-4 lg:grid-cols-2">

      {/* ── This week ── */}
      <Panel className="p-5 sm:p-6">
        <h2 className="text-[20px] text-foreground">This week</h2>
        {changeText && <p className="text-sm text-muted-foreground mt-1">{changeText}</p>}
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 mt-5">
          <Stat label="Check-ins" value={weeklyStats.ciCount} sub={weeklyStats.lastCount > 0 ? `${weeklyStats.lastCount} last week` : undefined} />
          <Stat label="Average compliance" value={weeklyStats.avgCompliance != null ? `${weeklyStats.avgCompliance}%` : '–'} />
          <Stat label="Average sleep" value={weeklyStats.avgSleep ?? '–'} unit={weeklyStats.avgSleep ? 'h' : undefined} size="sm" />
          <Stat label="Average mood" value={weeklyStats.avgMood ?? '–'} unit={weeklyStats.avgMood ? 'of 5' : undefined} size="sm" />
        </div>
      </Panel>

      {/* ── 4-week compliance trend ── */}
      <Panel className="p-5 sm:p-6">
        <h2 className="text-[20px] text-foreground">Compliance, last 4 weeks</h2>
        <p className="text-sm text-muted-foreground mt-1">Average of training and nutrition across every check-in.</p>
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeklyTrend} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'rgb(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'rgb(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                cursor={{ fill: 'rgb(var(--accent))' }}
                contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid rgb(var(--border))', boxShadow: 'none', background: 'rgb(var(--card))', color: 'rgb(var(--foreground))' }}
                formatter={(v) => [`${v}%`, 'Compliance']}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]} fill="rgb(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* ── Needs a look ── */}
      <Panel className="p-5 sm:p-6">
        <h2 className="text-[20px] text-foreground">Needs a look</h2>
        {atRiskClients.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">Everyone's latest check-in looks on track.</p>
        ) : (
          <div className="mt-2">
            {atRiskClients.map(({ ci, client, score, flags }) => (
              <PersonRow
                key={ci.id}
                name={client?.name || ci.client_name || 'Client'}
                detail={flags.slice(0, 2).join(', ') || 'Low score'}
                tone="alert"
                className="border-b border-border last:border-b-0"
                right={
                  <span className="flex items-center gap-3 flex-shrink-0">
                    {score !== null && <span className="num text-[17px] text-destructive">{score}%</span>}
                    <TextLink onClick={() => navigate(`/messages?clientId=${ci.client_id}`)}>Message</TextLink>
                  </span>
                }
              />
            ))}
          </div>
        )}
      </Panel>

      {/* ── Doing well ── */}
      <Panel className="p-5 sm:p-6">
        <h2 className="text-[20px] text-foreground">Doing well</h2>
        {topPerformers.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">No one is above 75% yet this week.</p>
        ) : (
          <div className="mt-2">
            {topPerformers.map(({ ci, client, score, streak }) => (
              <PersonRow
                key={ci.id}
                name={client?.name || ci.client_name || 'Client'}
                detail={streak > 1 ? `${streak} strong check-ins in a row` : 'Strong latest check-in'}
                className="border-b border-border last:border-b-0"
                right={score !== null ? <span className="num text-[17px] text-success flex-shrink-0">{score}%</span> : null}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
