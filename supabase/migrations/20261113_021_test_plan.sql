-- A hidden $2 test plan (invite link only) so the live payment path can be exercised for a dollar.
alter table public.onboarding_orders drop constraint if exists onboarding_orders_tier_check;
alter table public.onboarding_orders add constraint onboarding_orders_tier_check
  check (tier in ('dsp','basic','mid','viral','comp','test'));
