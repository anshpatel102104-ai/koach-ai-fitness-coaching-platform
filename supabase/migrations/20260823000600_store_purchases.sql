-- FIX (BUG_REPORT B-STORE): store purchases took money but delivered nothing.
--
-- storeCheckout creates a one-time (mode:'payment') Checkout Session, but the
-- webhook's checkout.session.completed handler acted only `if (subId)`. A
-- one-time payment has no subscription, so nothing was recorded, sales_count
-- never incremented, and no purchase/access existed. This adds a purchases
-- ledger and an idempotent fulfillment function the webhook calls.

create table if not exists public.store_purchases (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  listing_id uuid references public.plan_listings(id) on delete set null,
  coach_id uuid,
  buyer_email text,
  amount numeric,
  currency text not null default 'usd',
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

alter table public.store_purchases enable row level security;

-- The selling coach sees their own sales; platform admins see all. No user
-- writes — rows are created only by the webhook via the function below.
drop policy if exists "store_purchases select own coach or admin" on public.store_purchases;
create policy "store_purchases select own coach or admin" on public.store_purchases
  for select to authenticated
  using (coach_id = (select auth.uid()) or app.is_admin());

-- Idempotent fulfillment: insert the purchase (dedup on the Stripe session id)
-- and bump sales_count only when a NEW row was actually inserted.
create or replace function app.record_store_purchase(
  p_session text, p_listing uuid, p_coach uuid, p_email text, p_amount numeric
) returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $$
declare cnt int;
begin
  insert into public.store_purchases (stripe_session_id, listing_id, coach_id, buyer_email, amount)
    values (p_session, p_listing, p_coach, p_email, p_amount)
    on conflict (stripe_session_id) do nothing;
  get diagnostics cnt = row_count;
  if cnt > 0 and p_listing is not null then
    update public.plan_listings set sales_count = coalesce(sales_count, 0) + 1 where id = p_listing;
  end if;
end $$;

revoke all on function app.record_store_purchase(text, uuid, uuid, text, numeric) from public, anon, authenticated;
