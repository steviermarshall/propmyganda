-- ============================================================
-- PMG Roadmap Board — brainstorm / task tracking for the team
-- Run in Supabase SQL Editor. Idempotent.
-- ============================================================

create table if not exists public.pmg_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  -- idea | todo | in_progress | done
  status text not null default 'idea',
  -- low | medium | high
  priority text not null default 'medium',
  area text,                          -- e.g. website | backend | content | other
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Data API access (required — not granted by default)
grant select, insert, update, delete on public.pmg_tasks to authenticated;
grant all on public.pmg_tasks to service_role;

alter table public.pmg_tasks enable row level security;

-- Any signed-in PMG team member can use the board
drop policy if exists "Team can read tasks"   on public.pmg_tasks;
drop policy if exists "Team can create tasks" on public.pmg_tasks;
drop policy if exists "Team can update tasks" on public.pmg_tasks;
drop policy if exists "Team can delete tasks" on public.pmg_tasks;

create policy "Team can read tasks"
  on public.pmg_tasks for select to authenticated
  using (true);

create policy "Team can create tasks"
  on public.pmg_tasks for insert to authenticated
  with check (true);

create policy "Team can update tasks"
  on public.pmg_tasks for update to authenticated
  using (true) with check (true);

create policy "Team can delete tasks"
  on public.pmg_tasks for delete to authenticated
  using (true);

-- keep updated_at fresh
create or replace function public.pmg_tasks_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'done' and old.status <> 'done' then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end $$;

drop trigger if exists pmg_tasks_touch on public.pmg_tasks;
create trigger pmg_tasks_touch
  before update on public.pmg_tasks
  for each row execute function public.pmg_tasks_touch_updated_at();
