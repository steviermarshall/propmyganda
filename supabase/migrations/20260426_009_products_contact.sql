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
