-- ── PMG Roadmap Board ──
create table if not exists public.pmg_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  status text not null default 'idea',
  priority text not null default 'medium',
  area text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

grant select, insert, update, delete on public.pmg_tasks to authenticated;
grant all on public.pmg_tasks to service_role;

alter table public.pmg_tasks enable row level security;

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

-- ── PMG Contact Inbox ──
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.contact_submissions TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_submissions TO authenticated;
GRANT ALL ON public.contact_submissions TO service_role;

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_anyone_submit" ON public.contact_submissions;
CREATE POLICY "contact_anyone_submit" ON public.contact_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "contact_team_read" ON public.contact_submissions;
CREATE POLICY "contact_team_read" ON public.contact_submissions
  FOR SELECT TO authenticated
  USING (public.has_crm_role('admin') OR public.has_crm_role('jay'));

DROP POLICY IF EXISTS "contact_team_update" ON public.contact_submissions;
CREATE POLICY "contact_team_update" ON public.contact_submissions
  FOR UPDATE TO authenticated
  USING (public.has_crm_role('admin') OR public.has_crm_role('jay'))
  WITH CHECK (public.has_crm_role('admin') OR public.has_crm_role('jay'));

DROP POLICY IF EXISTS "contact_team_delete" ON public.contact_submissions;
CREATE POLICY "contact_team_delete" ON public.contact_submissions
  FOR DELETE TO authenticated
  USING (public.has_crm_role('admin') OR public.has_crm_role('jay'));

-- ── PMG Wire — publication news bot (URL patched to the new backend) ──
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS credit text;

CREATE UNIQUE INDEX IF NOT EXISTS publications_source_url_key
  ON public.publications (source_url)
  WHERE source_url IS NOT NULL;

GRANT SELECT ON public.publications TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.publications TO authenticated;
GRANT ALL ON public.publications TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('pmg-scrape-news')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pmg-scrape-news');

SELECT cron.schedule(
  'pmg-scrape-news',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gfqcmtslhwkcwfkqjfqw.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_U9-8OD9ov1H0Wd4SIWwNBA_oQaNdSPu',
      'Authorization', 'Bearer sb_publishable_U9-8OD9ov1H0Wd4SIWwNBA_oQaNdSPu'
    ),
    body := '{}'::jsonb
  );
  $$
);