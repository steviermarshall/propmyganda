-- ════════════════════════════════════════════════════════════════
-- PMG WIRE — publication news bot
-- Run this in Cloud → Database → SQL Editor. Idempotent.
-- 1. Adds source columns to publications (dedupe + credit line)
-- 2. Fixes Data API grants on publications
-- 3. Schedules the scrape-news edge function every 4 hours (pg_cron)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS credit text;

CREATE UNIQUE INDEX IF NOT EXISTS publications_source_url_key
  ON public.publications (source_url)
  WHERE source_url IS NOT NULL;

-- Data API access: the public site reads; the edge function writes
-- with the service role; staff manage via the CRM.
GRANT SELECT ON public.publications TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.publications TO authenticated;
GRANT ALL ON public.publications TO service_role;

-- ── Scheduler ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('pmg-scrape-news')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pmg-scrape-news');

SELECT cron.schedule(
  'pmg-scrape-news',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://trwnqtgywfsalvismioi.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_xlw7vV9SYkSP3odres8gnA_BkOAYxk6',
      'Authorization', 'Bearer sb_publishable_xlw7vV9SYkSP3odres8gnA_BkOAYxk6'
    ),
    body := '{}'::jsonb
  );
  $$
);
