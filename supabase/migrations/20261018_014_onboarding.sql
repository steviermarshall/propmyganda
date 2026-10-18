-- Artist onboarding: tier → details → upload → schedule → pay. One row per order.
create table if not exists public.onboarding_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_token uuid not null default gen_random_uuid(),
  catalogue_no text,
  -- what they bought
  tier text not null check (tier in ('basic','mid','viral')),
  ad_budget_cents integer not null default 0,
  total_cents integer not null default 0,
  payment_plan text not null default 'full' check (payment_plan in ('full','deposit')),
  due_now_cents integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft','pending_payment','paid','deposit_paid','scheduled','done','cancelled')),
  -- who
  artist_name text not null,
  legal_name text not null,
  email text not null,
  phone text,
  instagram_handle text,
  instagram_url text,
  instagram_followers integer,
  tiktok_url text,
  youtube_url text,
  -- the record
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
  -- schedule
  post_at timestamptz,
  session_at timestamptz,
  google_post_event_id text,
  google_session_event_id text,
  -- payment
  stripe_session_id text,
  stripe_payment_intent text,
  paid_at timestamptz,
  -- sync
  agreement_accepted boolean not null default false,
  signature text,
  sheet_synced_at timestamptz,
  sync_errors text
);

create index if not exists onboarding_orders_email_idx on public.onboarding_orders (email);
create index if not exists onboarding_orders_post_at_idx on public.onboarding_orders (post_at);
create unique index if not exists onboarding_orders_stripe_session_key on public.onboarding_orders (stripe_session_id) where stripe_session_id is not null;

alter table public.onboarding_orders enable row level security;
-- The public site never touches this table directly: the onboarding edge function
-- (service role) does all reads and writes, keyed by id + client_token.
drop policy if exists "staff read onboarding" on public.onboarding_orders;
create policy "staff read onboarding" on public.onboarding_orders
  for select to authenticated using (true);
drop policy if exists "staff update onboarding" on public.onboarding_orders;
create policy "staff update onboarding" on public.onboarding_orders
  for update to authenticated using (true) with check (true);
grant select, update on public.onboarding_orders to authenticated;
grant all on public.onboarding_orders to service_role;

-- Private bucket for masters and video; the function hands out signed upload / download URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('onboarding-uploads', 'onboarding-uploads', false, 2147483648,
  array['audio/wav','audio/x-wav','audio/mpeg','audio/flac','audio/aiff','audio/x-aiff','audio/mp4','video/mp4','video/quicktime','image/jpeg','image/png','application/zip'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
