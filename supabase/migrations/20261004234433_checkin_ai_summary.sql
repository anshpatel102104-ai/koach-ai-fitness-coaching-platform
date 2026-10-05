-- Auto progress analysis (checkin.analyze): onEntityEvent stores the AI
-- check-in summary here when a check-in is created; AICheckInSummaryCard reads
-- it instead of regenerating. Separate from check_ins.ai_summary, which holds
-- the different-shaped aiCheckInInsights review. Coach-only: check_ins_portal_view
-- lists its columns explicitly, so this never reaches portal clients.
alter table public.check_ins
  add column if not exists ai_checkin_summary jsonb,
  add column if not exists ai_checkin_summary_at timestamptz;
