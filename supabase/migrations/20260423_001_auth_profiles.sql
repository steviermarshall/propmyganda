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
