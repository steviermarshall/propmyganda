-- Deposits that lock the date, with the balance pulled the day before the shoot,
-- paid by link any time, or in cash on the day.
alter table public.onboarding_orders
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_payment_method_id text,
  add column if not exists balance_paid_at timestamptz,
  add column if not exists balance_method text check (balance_method in ('card','link','cash') or balance_method is null),
  add column if not exists balance_note text;
