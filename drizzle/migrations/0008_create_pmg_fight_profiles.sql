create table public.pmg_fight_profiles (
  code text primary key check (code ~ '^[A-Z0-9]{8}$'),
  cred integer not null default 1200 check (cred >= 0),
  unlocks jsonb not null default '[]'::jsonb,
  keys jsonb,
  tutorial_done boolean not null default false,
  matches integer not null default 0,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.pmg_fight_profiles to anon, authenticated;
grant all on public.pmg_fight_profiles to service_role;
alter table public.pmg_fight_profiles enable row level security;
create policy "pmg fight profiles: anyone can read" on public.pmg_fight_profiles for select using (true);
create policy "pmg fight profiles: anyone can insert" on public.pmg_fight_profiles for insert with check (true);
create policy "pmg fight profiles: anyone can update" on public.pmg_fight_profiles for update using (true) with check (true);