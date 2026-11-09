-- ════════════════════════════════════════════════════════════════
-- /start follow-ups — hourly recovery emails and shoot/release reminders
-- Run in Cloud → Database → SQL Editor after deploying the
-- onboarding-followups edge function. Idempotent.
-- ════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('pmg-onboarding-followups')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pmg-onboarding-followups');

SELECT cron.schedule(
  'pmg-onboarding-followups',
  '17 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gfqcmtslhwkcwfkqjfqw.supabase.co/functions/v1/onboarding-followups',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_U9-8OD9ov1H0Wd4SIWwNBA_oQaNdSPu',
      'Authorization', 'Bearer sb_publishable_U9-8OD9ov1H0Wd4SIWwNBA_oQaNdSPu'
    ),
    body := '{}'::jsonb
  );
  $$
);
