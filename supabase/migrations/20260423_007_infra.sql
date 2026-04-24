-- Social API tokens (admin-only, stores encrypted tokens for Meta/YouTube)
CREATE TABLE public.social_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      TEXT NOT NULL UNIQUE,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,
  scope         TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.social_tokens ENABLE ROW LEVEL SECURITY;

-- Cron run log
CREATE TABLE public.cron_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name    TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('success','error','running')),
  message     TEXT,
  duration_ms INTEGER,
  ran_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cron_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX cron_logs_job_idx ON public.cron_logs (job_name, ran_at DESC);
