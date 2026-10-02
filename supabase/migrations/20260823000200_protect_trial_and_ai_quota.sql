-- SECURITY (B-TRIAL / AI-quota): extend the privileged-column guard.
--
-- profiles has a permissive self-update policy backstopped by
-- app.protect_profile_privileged_columns(). That trigger already blocks a user
-- from editing their own role / subscription_tier / billing_status / stripe_*,
-- but it OMITTED:
--   * had_trial            -> a user could `update profiles set had_trial=false`
--                             and receive a fresh 30-day Stripe trial each time
--                             (infinite free trials).
--   * ai_generation_count  -> a user could reset their own AI usage quota.
--   * ai_generation_month
--
-- Service-role writers (Stripe webhook, AI metering) run as `service_role` and
-- are explicitly exempted by the guard, so adding these columns does NOT break
-- legitimate server-side updates.
create or replace function app.protect_profile_privileged_columns()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if current_user in ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role')
     or app.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.subscription_tier is distinct from old.subscription_tier
     or new.billing_status is distinct from old.billing_status
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.stripe_price_id is distinct from old.stripe_price_id
     or new.subscription_renewal_date is distinct from old.subscription_renewal_date
     or new.subscription_cancel_at_period_end is distinct from old.subscription_cancel_at_period_end
     or new.had_trial is distinct from old.had_trial
     or new.ai_generation_count is distinct from old.ai_generation_count
     or new.ai_generation_month is distinct from old.ai_generation_month
  then
    raise exception 'not allowed to modify privileged profile columns';
  end if;
  return new;
end;
$function$;
