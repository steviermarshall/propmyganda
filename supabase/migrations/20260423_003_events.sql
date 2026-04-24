CREATE TABLE public.events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  venue               TEXT,
  city                TEXT,
  event_date          TIMESTAMPTZ NOT NULL,
  doors_time          TEXT,
  ticket_url          TEXT,
  flyer_url           TEXT,
  description         TEXT,
  featured_artist_ids UUID[] NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'past', 'cancelled')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX events_date_idx ON public.events (event_date DESC);
CREATE INDEX events_status_idx ON public.events (status);
