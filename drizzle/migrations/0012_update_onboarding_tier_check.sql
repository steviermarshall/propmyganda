alter table public.onboarding_orders drop constraint if exists onboarding_orders_tier_check;

alter table public.onboarding_orders add constraint onboarding_orders_tier_check
  check (tier in ('dsp','basic','mid','viral','comp','test'));