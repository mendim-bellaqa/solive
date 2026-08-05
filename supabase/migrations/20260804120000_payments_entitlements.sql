-- Crypto payments (NOWPayments) + server-trusted plan entitlements.
-- Run in the Supabase dashboard → SQL Editor, or let the GitHub integration
-- apply it from supabase/migrations.
--
-- Design notes:
--   * `payments` is one row per payment attempt. The row is created BEFORE the
--     NOWPayments call so its uuid can be sent as order_id — that uuid is the
--     join key between the NOWPayments dashboard and this table.
--   * Clients may only READ their own rows. Every write goes through the
--     service-role key on the server (webhook / API routes), which bypasses
--     RLS — so there are deliberately no insert/update/delete policies.
--   * `entitlements` is what the app trusts for a user's plan. Crypto cannot
--     auto-renew, so a payment buys a fixed window: 30 days (monthly) or
--     365 days (annual). No row, or an expired row, means the free plan.

create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),  -- sent to NOWPayments as order_id
  user_id          uuid not null references auth.users (id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  plan_id          text not null check (plan_id in ('plus', 'pro')),
  billing          text not null check (billing in ('monthly', 'annual')),
  price_usd        numeric(8,2) not null,           -- computed server-side, never client input

  pay_currency     text,                            -- 'btc', 'usdttrc20', ...
  pay_amount       numeric(30,12),                  -- crypto amount NOWPayments asks for
  pay_address      text,                            -- deposit address shown to the user
  np_payment_id    text unique,                     -- NOWPayments payment_id (kept as text)
  np_expires_at    timestamptz,                     -- payment window end (expiration_estimate_date)

  status           text not null default 'created'
                   check (status in ('created', 'waiting', 'confirming', 'confirmed',
                                     'sending', 'partially_paid', 'finished',
                                     'failed', 'refunded', 'expired')),
  actually_paid    numeric(30,12),                  -- what the user really sent
  outcome_amount   numeric(30,12),                  -- what lands in the payout wallet
  outcome_currency text,
  last_ipn         jsonb,                           -- last raw NOWPayments payload, for audit
  paid_at          timestamptz                      -- set exactly once by the grant function
);

create index if not exists payments_user_created_idx
  on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;

drop policy if exists "Users read own payments" on public.payments;

create policy "Users read own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.entitlements (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  plan_id          text not null check (plan_id in ('plus', 'pro')),
  plan_expires_at  timestamptz not null,
  last_payment_id  uuid references public.payments (id),
  updated_at       timestamptz not null default now()
);

alter table public.entitlements enable row level security;

drop policy if exists "Users read own entitlement" on public.entitlements;

create policy "Users read own entitlement"
  on public.entitlements for select
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic claim-and-grant. NOWPayments retries webhooks and the app also polls,
-- so the same "finished" payment can arrive several times concurrently. The
-- `paid_at is null` condition inside a single UPDATE means exactly one caller
-- claims the payment; everyone else gets `false` and does nothing.

create or replace function public.grant_entitlement_for_payment(p_payment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  pay      public.payments%rowtype;
  add_days integer;
begin
  update public.payments
     set paid_at = now(), updated_at = now()
   where id = p_payment_id
     and status = 'finished'
     and paid_at is null
  returning * into pay;

  if not found then
    return false;  -- not finished yet, or already granted
  end if;

  add_days := case pay.billing when 'annual' then 365 else 30 end;

  insert into public.entitlements as e
    (user_id, plan_id, plan_expires_at, last_payment_id, updated_at)
  values
    (pay.user_id, pay.plan_id, now() + make_interval(days => add_days), pay.id, now())
  on conflict (user_id) do update
     set plan_id = excluded.plan_id,
         -- Renewing the same plan while it is still active extends the current
         -- expiry; switching plans (or renewing after a lapse) starts a fresh
         -- window from now. No proration between plus and pro.
         plan_expires_at = case
           when e.plan_id = excluded.plan_id and e.plan_expires_at > now()
             then e.plan_expires_at + make_interval(days => add_days)
           else now() + make_interval(days => add_days)
         end,
         last_payment_id = excluded.last_payment_id,
         updated_at = now();

  return true;
end;
$$;

-- The function runs with definer rights, so only the server may call it.
revoke execute on function public.grant_entitlement_for_payment(uuid) from public, anon, authenticated;
grant execute on function public.grant_entitlement_for_payment(uuid) to service_role;
