-- Custom check-in form answers.
--
-- Coaches build check-in forms with their own questions (CheckInFormEditor),
-- but check_ins had nowhere to store an answer that isn't one of the fixed
-- columns: the portal spread question ids straight into the insert, so every
-- submission of a form with a custom question was rejected (and the client saw
-- nothing happen). Answers now go in `responses`:
--   [{ "question_id", "label", "type", "value" }, ...]
-- (label is copied so answers stay readable if the coach edits the form later).
-- Preset questions (weight, energy, stress, ...) still fill their real columns,
-- which charts and risk scoring read.

alter table public.check_ins
  add column if not exists responses jsonb;

-- Same definition, options and grants as before (20260709000700), plus `responses`.
create or replace view public.check_ins_portal_view
  with (security_barrier = true)
as
select id, client_id, client_name, date, review_status, weight, body_fat_pct,
       measurements, photo_urls, mood, energy_level, stress_level, sleep_hours,
       compliance_training, compliance_nutrition, notes, coach_notes,
       coach_responded, ai_summary, form_id, created_by, created_at, updated_at,
       responses
  from public.check_ins
 where app.is_portal_client(client_id)
  with cascaded check option;
