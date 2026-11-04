-- Artist onboarding: tier → details → upload → schedule → pay. One row per order.
create table if not exists public.onboarding_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_token uuid not null default gen_random_uuid(),
  catalogue_no text,
  tier text not null check (tier in ('basic','mid','viral')),
  ad_budget_cents integer not null default 0,
  total_cents integer not null default 0,
  payment_plan text not null default 'full' check (payment_plan in ('full','deposit')),
  due_now_cents integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft','pending_payment','paid','deposit_paid','scheduled','done','cancelled')),
  artist_name text not null,
  legal_name text not null,
  email text not null,
  phone text,
  instagram_handle text,
  instagram_url text,
  instagram_followers integer,
  tiktok_url text,
  youtube_url text,
  track_title text,
  explicit boolean not null default false,
  wants_distribution boolean not null default false,
  pro_affiliation text,
  ipi_number text,
  distro_email text,
  producer_name text,
  producer_stage_name text,
  producer_pro text,
  producer_ipi text,
  producer_email text,
  report_preference text check (report_preference in ('email','dashboard','both')),
  notes text,
  uploads jsonb not null default '[]'::jsonb,
  post_at timestamptz,
  session_at timestamptz,
  google_post_event_id text,
  google_session_event_id text,
  stripe_session_id text,
  stripe_payment_intent text,
  paid_at timestamptz,
  agreement_accepted boolean not null default false,
  signature text,
  sheet_synced_at timestamptz,
  sync_errors text
);

create index if not exists onboarding_orders_email_idx on public.onboarding_orders (email);
create index if not exists onboarding_orders_post_at_idx on public.onboarding_orders (post_at);
create unique index if not exists onboarding_orders_stripe_session_key on public.onboarding_orders (stripe_session_id) where stripe_session_id is not null;

alter table public.onboarding_orders enable row level security;
drop policy if exists "staff read onboarding" on public.onboarding_orders;
create policy "staff read onboarding" on public.onboarding_orders
  for select to authenticated using (public.is_staff());
drop policy if exists "staff update onboarding" on public.onboarding_orders;
create policy "staff update onboarding" on public.onboarding_orders
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
grant select, update on public.onboarding_orders to authenticated;
grant all on public.onboarding_orders to service_role;

-- Invite links for artists let on for free; DSP and Invited added to the tier check.
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
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
grant select, insert, update, delete on public.onboarding_invites to authenticated;
grant all on public.onboarding_invites to service_role;

alter table public.onboarding_orders add column if not exists invite_code text references public.onboarding_invites(code);
alter table public.onboarding_orders drop constraint if exists onboarding_orders_tier_check;
alter table public.onboarding_orders add constraint onboarding_orders_tier_check
  check (tier in ('dsp','basic','mid','viral','comp'));