-- ============================================================================
-- PHASE 5 — Google Calendar Sync support
-- Run in: Cloud → Database → SQL Editor (idempotent)
-- ============================================================================

ALTER TABLE public.calendar_sync
  ADD COLUMN IF NOT EXISTS last_error      TEXT,
  ADD COLUMN IF NOT EXISTS event_html_link TEXT;

CREATE TABLE IF NOT EXISTS public.crm_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_settings_read" ON public.crm_settings;
CREATE POLICY "crm_settings_read" ON public.crm_settings
  FOR SELECT TO authenticated
  USING (
    public.has_crm_role('admin')
    OR public.has_crm_role('jay')
    OR public.has_crm_role('mike')
    OR public.has_crm_role('steven')
  );

DROP POLICY IF EXISTS "crm_settings_write" ON public.crm_settings;
CREATE POLICY "crm_settings_write" ON public.crm_settings
  FOR ALL TO authenticated
  USING (public.has_crm_role('admin') OR public.has_crm_role('jay'))
  WITH CHECK (public.has_crm_role('admin') OR public.has_crm_role('jay'));

INSERT INTO public.crm_settings (key, value)
VALUES ('gcal', '{"calendar_id": "primary", "last_pull_at": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Optional: schedule pull every 5 min via pg_cron (uncomment if pg_cron + pg_net installed)
--
-- SELECT cron.schedule('gcal-pull', '*/5 * * * *', $$
--   SELECT net.http_post(
--     url:='https://trwnqtgywfsalvismioi.supabase.co/functions/v1/gcal-pull',
--     headers:='{"Content-Type":"application/json"}'::jsonb,
--     body:='{}'::jsonb
--   );
-- $$);
