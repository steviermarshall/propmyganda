CREATE TABLE public.distribution_applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_name         TEXT NOT NULL,
  contact_name        TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  genre               TEXT,
  monthly_listeners   TEXT,
  current_distributor TEXT,
  message             TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','approved','rejected')),
  notes               TEXT,
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.distribution_applications ENABLE ROW LEVEL SECURITY;

CREATE INDEX dist_apps_status_idx ON public.distribution_applications (status);
CREATE INDEX dist_apps_submitted_idx ON public.distribution_applications (submitted_at DESC);
