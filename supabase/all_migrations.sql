-- Roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'distribution', 'marketing', 'sponsorships');

-- Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  full_name    TEXT,
  role         public.user_role NOT NULL DEFAULT 'marketing',
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Role permissions matrix
CREATE TABLE public.role_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role        public.user_role NOT NULL,
  resource    TEXT NOT NULL,
  can_read    BOOLEAN NOT NULL DEFAULT FALSE,
  can_write   BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (role, resource)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Seed permissions
INSERT INTO public.role_permissions (role, resource, can_read, can_write, can_delete) VALUES
  -- Admin: full access
  ('admin', 'artists',                   TRUE, TRUE, TRUE),
  ('admin', 'releases',                  TRUE, TRUE, TRUE),
  ('admin', 'events',                    TRUE, TRUE, TRUE),
  ('admin', 'publications',              TRUE, TRUE, TRUE),
  ('admin', 'distribution_applications', TRUE, TRUE, TRUE),
  ('admin', 'sponsorship_leads',         TRUE, TRUE, TRUE),
  ('admin', 'social_metrics',            TRUE, TRUE, TRUE),
  ('admin', 'profiles',                  TRUE, TRUE, TRUE),
  ('admin', 'role_permissions',          TRUE, TRUE, TRUE),
  -- Distribution
  ('distribution', 'artists',                   TRUE,  TRUE,  FALSE),
  ('distribution', 'releases',                  TRUE,  TRUE,  FALSE),
  ('distribution', 'distribution_applications', TRUE,  TRUE,  FALSE),
  ('distribution', 'events',                    TRUE,  FALSE, FALSE),
  ('distribution', 'publications',              TRUE,  FALSE, FALSE),
  -- Marketing
  ('marketing', 'artists',        TRUE,  FALSE, FALSE),
  ('marketing', 'releases',       TRUE,  FALSE, FALSE),
  ('marketing', 'events',         TRUE,  TRUE,  FALSE),
  ('marketing', 'publications',   TRUE,  TRUE,  FALSE),
  ('marketing', 'social_metrics', TRUE,  TRUE,  FALSE),
  -- Sponsorships
  ('sponsorships', 'sponsorship_leads', TRUE, TRUE, FALSE),
  ('sponsorships', 'artists',           TRUE, FALSE, FALSE),
  ('sponsorships', 'events',            TRUE, FALSE, FALSE);
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
CREATE TABLE public.publications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  excerpt      TEXT,
  body         TEXT,
  cover_url    TEXT,
  category     TEXT NOT NULL DEFAULT 'Culture' CHECK (category IN ('Business','Artists','Culture','Milestones','Industry')),
  author       TEXT,
  featured     BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER publications_updated_at
  BEFORE UPDATE ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX publications_published_idx ON public.publications (published_at DESC NULLS LAST);
CREATE INDEX publications_category_idx  ON public.publications (category);

-- Seed from static newsArticles in data.ts
INSERT INTO public.publications (title, slug, excerpt, category, featured, published_at) VALUES
  (
    'PMG Announces New Distribution Partnership',
    'pmg-distribution-partnership',
    'Expanding reach across all major digital platforms with a new strategic alliance.',
    'Business', TRUE, NOW() - INTERVAL '2 days'
  ),
  (
    'ElCamino Signs Exclusive Content Deal with PMG',
    'elcamino-content-deal',
    'A new chapter in independent hip-hop distribution.',
    'Artists', FALSE, NOW() - INTERVAL '5 days'
  ),
  (
    'Inside the PMG Studio: Brooklyn''s Independent Powerhouse',
    'inside-pmg-studio',
    'A look behind the scenes at the heart of independent music.',
    'Culture', FALSE, NOW() - INTERVAL '10 days'
  ),
  (
    'Max B Catalog Surpasses 100M Streams',
    'max-b-100m-streams',
    'The wave continues to grow across all platforms.',
    'Milestones', FALSE, NOW() - INTERVAL '14 days'
  );
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
CREATE TABLE public.sponsorship_leads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name   TEXT NOT NULL,
  contact_name   TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  website        TEXT,
  budget_range   TEXT,
  campaign_type  TEXT,
  message        TEXT,
  stage          TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new','contacted','proposal','negotiating','closed_won','closed_lost')),
  assigned_to    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  value_estimate NUMERIC(12,2),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sponsorship_leads ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER sponsorship_leads_updated_at
  BEFORE UPDATE ON public.sponsorship_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX sponsorship_stage_idx ON public.sponsorship_leads (stage);
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
-- Helper: get the calling user's role
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ── profiles ──────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.my_role() = 'admin');

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.my_role() = 'admin');

-- ── role_permissions ──────────────────────────────────────────────────────────
CREATE POLICY "rp_admin_all" ON public.role_permissions
  FOR ALL USING (public.my_role() = 'admin');

CREATE POLICY "rp_auth_read" ON public.role_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── artists ───────────────────────────────────────────────────────────────────
CREATE POLICY "artists_public_read" ON public.artists
  FOR SELECT USING (active = TRUE);

CREATE POLICY "artists_auth_read_all" ON public.artists
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "artists_write" ON public.artists
  FOR ALL USING (public.my_role() IN ('admin', 'distribution'));

-- ── releases ──────────────────────────────────────────────────────────────────
CREATE POLICY "releases_public_read" ON public.releases
  FOR SELECT USING (TRUE);

CREATE POLICY "releases_write" ON public.releases
  FOR ALL USING (public.my_role() IN ('admin', 'distribution'));

-- ── social_metrics ────────────────────────────────────────────────────────────
CREATE POLICY "metrics_auth_read" ON public.social_metrics
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "metrics_write" ON public.social_metrics
  FOR ALL USING (public.my_role() IN ('admin', 'marketing'));

-- ── events ────────────────────────────────────────────────────────────────────
CREATE POLICY "events_public_read" ON public.events
  FOR SELECT USING (status != 'cancelled' OR public.my_role() = 'admin');

CREATE POLICY "events_write" ON public.events
  FOR ALL USING (public.my_role() IN ('admin', 'marketing'));

-- ── publications ──────────────────────────────────────────────────────────────
CREATE POLICY "publications_public_read" ON public.publications
  FOR SELECT USING (published_at IS NOT NULL AND published_at <= NOW());

CREATE POLICY "publications_auth_read_all" ON public.publications
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "publications_write" ON public.publications
  FOR ALL USING (public.my_role() IN ('admin', 'marketing'));

-- ── distribution_applications ────────────────────────────────────────────────
-- Anyone can submit (INSERT), only staff can read
CREATE POLICY "dist_apps_insert_anon" ON public.distribution_applications
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "dist_apps_read_staff" ON public.distribution_applications
  FOR SELECT USING (public.my_role() IN ('admin', 'distribution'));

CREATE POLICY "dist_apps_update_staff" ON public.distribution_applications
  FOR UPDATE USING (public.my_role() IN ('admin', 'distribution'));

-- ── sponsorship_leads ─────────────────────────────────────────────────────────
CREATE POLICY "sponsors_insert_anon" ON public.sponsorship_leads
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "sponsors_read_staff" ON public.sponsorship_leads
  FOR SELECT USING (public.my_role() IN ('admin', 'sponsorships'));

CREATE POLICY "sponsors_update_staff" ON public.sponsorship_leads
  FOR UPDATE USING (public.my_role() IN ('admin', 'sponsorships'));

-- ── social_tokens ─────────────────────────────────────────────────────────────
CREATE POLICY "tokens_admin_only" ON public.social_tokens
  FOR ALL USING (public.my_role() = 'admin');

-- ── cron_logs ─────────────────────────────────────────────────────────────────
CREATE POLICY "cron_logs_admin_only" ON public.cron_logs
  FOR ALL USING (public.my_role() = 'admin');
-- ── products ─────────────────────────────────────────────────────────────────
CREATE TABLE public.products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  artist        TEXT NOT NULL DEFAULT 'PMG',
  price_cents   INTEGER NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('Music', 'Clothing', 'Accessories')),
  description   TEXT,
  image_url     TEXT,
  inventory     INTEGER,
  sizes         TEXT[] NOT NULL DEFAULT '{}',
  external_url  TEXT,
  featured      BOOLEAN NOT NULL DEFAULT FALSE,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX products_category_idx ON public.products (category);
CREATE INDEX products_featured_idx ON public.products (featured);

CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (active = TRUE);

CREATE POLICY "products_admin_read_all" ON public.products
  FOR SELECT USING (public.my_role() = 'admin');

CREATE POLICY "products_write" ON public.products
  FOR ALL USING (public.my_role() = 'admin');

INSERT INTO public.products (slug, name, artist, price_cents, category, description, featured) VALUES
  ('hoodie',   'PMG Logo Hoodie',     'PMG',      6500, 'Clothing',    'Heavyweight cotton hoodie with embroidered PMG logo.', TRUE),
  ('tee',      'PMG Logo Tee',        'PMG',      3500, 'Clothing',    'Soft-touch cotton tee with PMG signature print.', FALSE),
  ('vinyl-1',  'Albee Al Vinyl',      'Albee Al', 2500, 'Music',       'Limited edition 12" vinyl pressing.', FALSE),
  ('snapback', 'PMG Snapback',        'PMG',      3000, 'Accessories', 'Structured 6-panel snapback with embroidered logo.', FALSE),
  ('cd-1',     'ElCamino Limited CD', 'ElCamino', 1500, 'Music',       'Limited collector''s edition CD with bonus tracks.', FALSE),
  ('poster',   'Max B Poster',        'Max B',    2000, 'Accessories', 'Premium 18x24 wall poster.', FALSE);

-- ── contact_messages ─────────────────────────────────────────────────────────
CREATE TABLE public.contact_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  subject      TEXT,
  message      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX contact_status_idx  ON public.contact_messages (status);
CREATE INDEX contact_created_idx ON public.contact_messages (created_at DESC);

-- Anyone can submit, only admin can read/manage
CREATE POLICY "contact_insert_anon" ON public.contact_messages
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "contact_read_admin" ON public.contact_messages
  FOR SELECT USING (public.my_role() = 'admin');

CREATE POLICY "contact_update_admin" ON public.contact_messages
  FOR UPDATE USING (public.my_role() = 'admin');

-- ── site_settings (singleton config) ─────────────────────────────────────────
CREATE TABLE public.site_settings (
  id                  INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  discord_invite_url  TEXT,
  discord_server_id   TEXT,
  instagram_url       TEXT,
  twitter_url         TEXT,
  youtube_url         TEXT,
  tiktok_url          TEXT,
  contact_email       TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public can read; only admin can write
CREATE POLICY "site_settings_public_read" ON public.site_settings
  FOR SELECT USING (TRUE);

CREATE POLICY "site_settings_admin_write" ON public.site_settings
  FOR ALL USING (public.my_role() = 'admin');

INSERT INTO public.site_settings (id, contact_email) VALUES (1, 'info@propmyganda.com');
-- Public media bucket for artist images, product images, event flyers, etc.
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Public read of any object in `media`
CREATE POLICY "media_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

-- Authenticated users (staff with role) can upload/update/delete
CREATE POLICY "media_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media');

CREATE POLICY "media_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media');

CREATE POLICY "media_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media');
