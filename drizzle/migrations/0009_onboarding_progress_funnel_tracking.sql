alter table public.onboarding_orders
  add column if not exists last_step int not null default 2,
  add column if not exists step_at timestamptz not null default now(),
  add column if not exists followups jsonb not null default '{}'::jsonb,
  add column if not exists visitor text;

create table if not exists public.funnel_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  visitor text not null,
  step int not null,
  tier text,
  invite boolean not null default false,
  order_id uuid
);
revoke all on public.funnel_events from anon;
grant select on public.funnel_events to authenticated;
grant all on public.funnel_events to service_role;
grant usage, select on sequence public.funnel_events_id_seq to service_role;
create index if not exists funnel_events_created on public.funnel_events (created_at desc);
create index if not exists funnel_events_visitor on public.funnel_events (visitor, step);

alter table public.funnel_events enable row level security;
drop policy if exists "staff read funnel" on public.funnel_events;
create policy "staff read funnel" on public.funnel_events for select to authenticated using (public.is_staff());