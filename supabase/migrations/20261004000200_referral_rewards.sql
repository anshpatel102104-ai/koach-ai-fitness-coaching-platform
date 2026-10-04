-- Referral rewards (port of base44 processReferralReward) as a DB trigger.
--
-- Base44 paid the reward from an entity automation when a referral reached its
-- trigger status. Here the same rule lives in a trigger on
-- public.referrals: when status becomes 'active_30_days' (the referred coach
-- stayed 30 days) the referrer is credited the tiered commission
-- ($50 for referrals 1-5, $75 for 6-10, $100 for 11+ — the tiers
-- ReferralProgram.jsx shows), their referral_programs balances are updated,
-- and an in-app notification is written.
--
-- Idempotent: the credit is CLAIMED by an atomic
--   update referrals set reward_credited_at = now() where reward_credited_at is null
-- so a referral pays out exactly once however many times its status is
-- re-written (retries, active_30_days -> paid -> active_30_days, concurrent
-- updates — the row lock serialises them and the loser sees a non-null claim).
-- Skipped (and NOT claimed, so it can fire later) when the referrer has no
-- active referral program; self-referrals never pay.
alter table public.referrals
  add column if not exists reward_credited_at timestamptz;

create or replace function app.process_referral_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program public.referral_programs%rowtype;
  v_n integer;
  v_amount numeric(12, 2);
  v_claimed uuid;
begin
  if new.status is distinct from 'active_30_days' or new.referrer_id = new.referred_coach_id then
    return null;
  end if;

  -- Lock the referrer's program first: serialises concurrent rewards for the
  -- same referrer so the tier count below is consistent.
  select * into v_program from public.referral_programs
   where coach_id = new.referrer_id and is_active for update;
  if not found then
    raise warning 'referral % not rewarded: referrer % has no active referral program', new.id, new.referrer_id;
    return null;
  end if;

  select count(*) + 1 into v_n from public.referrals
   where referrer_id = new.referrer_id and reward_credited_at is not null;
  v_amount := case when v_n <= 5 then 50 when v_n <= 10 then 75 else 100 end;

  -- The once-only claim.
  update public.referrals
     set reward_credited_at = now(),
         commission_amount = coalesce(commission_amount, v_amount),
         date_30_days_complete = coalesce(date_30_days_complete, now())
   where id = new.id and reward_credited_at is null
  returning id into v_claimed;
  if v_claimed is null then
    return null; -- already paid out
  end if;
  select commission_amount into v_amount from public.referrals where id = new.id;

  update public.referral_programs p
     set total_earned = p.total_earned + v_amount,
         pending_balance = p.pending_balance + v_amount,
         month_earnings = coalesce((
           select sum(r.commission_amount) from public.referrals r
            where r.referrer_id = new.referrer_id
              and r.reward_credited_at >= date_trunc('month', now())), 0),
         total_referrals = (select count(*) from public.referrals r where r.referrer_id = new.referrer_id),
         active_referrals = v_n,
         current_tier = case when v_n <= 5 then 1 when v_n <= 10 then 2 else 3 end
   where p.id = v_program.id;

  insert into public.notifications (recipient_id, category, type, title, body, link, priority, created_by)
  values (new.referrer_id, 'payment', 'referral_reward',
          'Referral reward earned 🎁',
          format('%s stayed 30 days — $%s added to your referral balance.',
                 coalesce(new.referred_coach_name, new.referred_coach_email), v_amount),
          '/referral-program', 'normal', null);
  return null;
end;
$$;

revoke all on function app.process_referral_reward() from public, anon, authenticated;

drop trigger if exists trg_referral_reward on public.referrals;
create trigger trg_referral_reward
  after insert or update of status on public.referrals
  for each row
  when (new.status = 'active_30_days')
  execute function app.process_referral_reward();
