-- PHASE 6 — Bookings expansion (defensive rewrite)
DO $$
DECLARE
  pol record;
  trg record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', pol.policyname);
  END LOOP;
  FOR trg IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'public.bookings'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.bookings', trg.tgname);
  END LOOP;
END $$;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_service_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_service_check
  CHECK (service IN (
    'security','dj','venue','promoter',
    'event_recap','artist','bartender',
    'jv','distro'
  ));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_free          BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_name     TEXT,
  ADD COLUMN IF NOT EXISTS deal_type        TEXT,
  ADD COLUMN IF NOT EXISTS revenue_split    TEXT,
  ADD COLUMN IF NOT EXISTS artist_name      TEXT,
  ADD COLUMN IF NOT EXISTS release_title    TEXT,
  ADD COLUMN IF NOT EXISTS release_date     TEXT,
  ADD COLUMN IF NOT EXISTS platforms        TEXT,
  ADD COLUMN IF NOT EXISTS marketing_budget TEXT,
  ADD COLUMN IF NOT EXISTS event_at         TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS bookings_event_at_idx ON public.bookings (event_at);
CREATE INDEX IF NOT EXISTS bookings_service_idx  ON public.bookings (service);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_crm_role(_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.auth_user_id = auth.uid()
      AND tm.role::text = _role
  );
$$;

CREATE POLICY "bookings_read_team" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    public.has_crm_role('admin')
    OR public.has_crm_role('mike')
    OR public.has_crm_role('steven')
    OR public.has_crm_role('jay')
    OR public.has_crm_role('editor')
  );

CREATE POLICY "bookings_insert_team" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_crm_role('admin')
    OR public.has_crm_role('mike')
    OR public.has_crm_role('steven')
    OR public.has_crm_role('jay')
    OR public.has_crm_role('editor')
  );

CREATE POLICY "bookings_update_team" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_crm_role('admin') OR public.has_crm_role('mike'));

CREATE POLICY "bookings_insert_public" ON public.bookings
  FOR INSERT TO anon
  WITH CHECK (true);

-- ============================================================
-- 011 — team_members RLS recursion fix (re-assert final state)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_crm_role(_role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE role = _role
      AND (
        auth_user_id = auth.uid()
        OR lower(coalesce(email, '')) = lower(coalesce(auth.email(), ''))
      )
  );
END;
$$;

DROP POLICY IF EXISTS "tm_admin_all" ON public.team_members;
DROP POLICY IF EXISTS "tm_self_read" ON public.team_members;
DROP POLICY IF EXISTS "tm_authenticated_read" ON public.team_members;
DROP POLICY IF EXISTS "tm_self_update" ON public.team_members;
DROP POLICY IF EXISTS "tm_self_or_admin_read" ON public.team_members;
DROP POLICY IF EXISTS "tm_self_link_update" ON public.team_members;

CREATE POLICY "tm_self_or_admin_read" ON public.team_members
  FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR lower(coalesce(email, '')) = lower(coalesce(auth.email(), ''))
    OR public.has_crm_role('admin')
  );

CREATE POLICY "tm_self_link_update" ON public.team_members
  FOR UPDATE
  USING (
    auth_user_id = auth.uid()
    OR lower(coalesce(email, '')) = lower(coalesce(auth.email(), ''))
    OR public.has_crm_role('admin')
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR lower(coalesce(email, '')) = lower(coalesce(auth.email(), ''))
    OR public.has_crm_role('admin')
  );

CREATE POLICY "tm_admin_all" ON public.team_members
  FOR ALL
  USING (public.has_crm_role('admin'))
  WITH CHECK (public.has_crm_role('admin'));

CREATE OR REPLACE FUNCTION public.my_crm_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.team_members
  WHERE auth_user_id = auth.uid()
     OR lower(coalesce(email, '')) = lower(coalesce(auth.email(), ''))
  LIMIT 1;
$$;

-- ============================================================
-- 012 — calendar + role consistency fixes
-- ============================================================
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('admin', 'mike', 'steven', 'jay', 'editor'));

ALTER TABLE public.calendar_sync
  DROP CONSTRAINT IF EXISTS calendar_sync_entity_type_check;

ALTER TABLE public.calendar_sync
  ADD CONSTRAINT calendar_sync_entity_type_check
  CHECK (entity_type IN ('shoot', 'deliverable', 'booking', 'crm_booking'));

ALTER TABLE public.shoots
  ADD COLUMN IF NOT EXISTS scheduled_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_hours      INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS assigned_editor_id  UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title               TEXT;

CREATE INDEX IF NOT EXISTS shoots_scheduled_idx ON public.shoots (scheduled_at);

ALTER TABLE public.crm_bookings
  ADD COLUMN IF NOT EXISTS shoot_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "crm_bookings_team_insert" ON public.crm_bookings;
CREATE POLICY "crm_bookings_team_insert" ON public.crm_bookings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "artist_prospects_team_insert" ON public.artist_prospects;
CREATE POLICY "artist_prospects_team_insert" ON public.artist_prospects
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "distro_artists_team_insert" ON public.distro_artists;
CREATE POLICY "distro_artists_team_insert" ON public.distro_artists
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "sponsor_brands_team_insert" ON public.sponsor_brands;
CREATE POLICY "sponsor_brands_team_insert" ON public.sponsor_brands
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "sponsor_brands_team_read" ON public.sponsor_brands;
CREATE POLICY "sponsor_brands_team_read" ON public.sponsor_brands
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "shoots_team_insert" ON public.shoots;
CREATE POLICY "shoots_team_insert" ON public.shoots
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "deliverables_team_insert" ON public.deliverables;
CREATE POLICY "deliverables_team_insert" ON public.deliverables
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 013 — Instagram post URL fix
-- ============================================================
INSERT INTO public.instagram_posts (instagram_url, label, display_order, active)
VALUES ('https://www.instagram.com/p/DDFwiTKSdWm/', NULL, 0, true)
ON CONFLICT (instagram_url) DO UPDATE
  SET active = true,
      display_order = 0;

-- ============================================================
-- Data API grants — new Cloud projects ship no default privileges on public
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Team-wide: authenticated users get full DML on CRM tables (RLS scopes the rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Anonymous visitors: only the tables the public website actually reads/writes
GRANT SELECT ON public.artists, public.releases, public.social_metrics,
  public.events, public.publications, public.instagram_posts TO anon;
GRANT INSERT ON public.newsletter_subscribers, public.distribution_applications,
  public.sponsorship_leads, public.bookings TO anon;

-- Service role: edge functions + admin paths
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;