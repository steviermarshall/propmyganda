CREATE TABLE public.artists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  genre           TEXT,
  bio             TEXT,
  image_url       TEXT,
  spotify_url     TEXT,
  apple_music_url TEXT,
  youtube_url     TEXT,
  soundcloud_url  TEXT,
  instagram_url   TEXT,
  featured        BOOLEAN NOT NULL DEFAULT FALSE,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER artists_updated_at
  BEFORE UPDATE ON public.artists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.releases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('album', 'ep', 'single', 'mixtape')),
  release_date    DATE,
  cover_url       TEXT,
  spotify_url     TEXT,
  apple_music_url TEXT,
  stream_count    BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.social_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'spotify', 'tiktok', 'twitter')),
  followers       BIGINT NOT NULL DEFAULT 0,
  views_30d       BIGINT,
  streams_30d     BIGINT,
  engagement_rate NUMERIC(5,2),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.social_metrics ENABLE ROW LEVEL SECURITY;

-- Seed artists from existing static data
INSERT INTO public.artists (slug, name, genre, featured, active) VALUES
  ('albee-al',    'Albee Al',    'Hip-Hop',       TRUE,  TRUE),
  ('elcamino',    'ElCamino',    'Hip-Hop',        TRUE,  TRUE),
  ('max-b',       'Max B',       'Hip-Hop / Wave', TRUE,  TRUE),
  ('curly-gen',   'Curly Gen',   'Hip-Hop',        FALSE, TRUE),
  ('mercy-porter','Mercy Porter','R&B / Hip-Hop',  FALSE, TRUE),
  ('dex-osama',   'Dex Osama',   'Hip-Hop',        FALSE, TRUE);
