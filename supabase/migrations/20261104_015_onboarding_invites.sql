-- Three populations in one flow: paying tiers, the DSP Release (split on streams),
-- and artists let on for free via a single-use invite link.
create table if not exists public.onboarding_invites (
  code text primary key,
  label text,
  tier text not null default 'comp',
  max_uses integer not null default 1,
  used_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid
);
alter table public.onboarding_invites enable row level security;
drop policy if exists "staff manage invites" on public.onboarding_invites;
create policy "staff manage invites" on public.onboarding_invites
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.onboarding_invites to authenticated;
grant all on public.onboarding_invites to service_role;

alter table public.onboarding_orders add column if not exists invite_code text references public.onboarding_invites(code);
alter table public.onboarding_orders drop constraint if exists onboarding_orders_tier_check;
alter table public.onboarding_orders add constraint onboarding_orders_tier_check
  check (tier in ('dsp','basic','mid','viral','comp'));
