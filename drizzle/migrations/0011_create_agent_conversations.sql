create table if not exists public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ip text,
  page text,
  visitor_name text,
  email text,
  instagram text,
  spotify text,
  intent text,
  metrics jsonb,
  qualified boolean,
  notes text,
  stage text not null default 'chatting',
  notified_at timestamptz,
  turns int not null default 0,
  messages jsonb not null default '[]'::jsonb,
  transcript text not null default ''
);
revoke all on public.agent_conversations from anon;
grant select, update, delete on public.agent_conversations to authenticated;
grant all on public.agent_conversations to service_role;
alter table public.agent_conversations enable row level security;
create index if not exists agent_conversations_ip_created on public.agent_conversations (ip, created_at desc);

drop policy if exists "agent_team_read" on public.agent_conversations;
create policy "agent_team_read" on public.agent_conversations
  for select to authenticated using (public.has_crm_role('admin') or public.has_crm_role('jay'));
drop policy if exists "agent_team_update" on public.agent_conversations;
create policy "agent_team_update" on public.agent_conversations
  for update to authenticated using (public.has_crm_role('admin') or public.has_crm_role('jay'))
  with check (public.has_crm_role('admin') or public.has_crm_role('jay'));
drop policy if exists "agent_team_delete" on public.agent_conversations;
create policy "agent_team_delete" on public.agent_conversations
  for delete to authenticated using (public.has_crm_role('admin') or public.has_crm_role('jay'));