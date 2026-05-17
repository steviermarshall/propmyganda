-- ============================================================================
-- Calendar + role consistency fixes
-- Run this once in: Supabase → SQL Editor → New Query → paste → Run
-- Safe to re-run (idempotent).
-- ============================================================================

-- ---------- 1) Allow `editor` as a team_members.role ------------------------
-- The base schema check constraint only allowed ('admin','mike','steven','jay').
-- Jay's dashboard queries .in("role", ["editor","jay"]) so editors must be a
-- valid role for them to show up in the workload tab.

ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('admin', 'mike', 'steven', 'jay', 'editor'));


-- ---------- 2) Allow booking / crm_booking in calendar_sync -----------------
-- gcal-push now syncs bookings and crm_bookings as well as shoots and
-- deliverables — but the check constraint blocks the insert.

ALTER TABLE public.calendar_sync
  DROP CONSTRAINT IF EXISTS calendar_sync_entity_type_check;

ALTER TABLE public.calendar_sync
  ADD CONSTRAINT calendar_sync_entity_type_check
  CHECK (entity_type IN ('shoot', 'deliverable', 'booking', 'crm_booking'));


-- ---------- 3) Add scheduled_at to shoots (used for GCal time precision) ----
-- The base shoots table only has shoot_date (DATE). gcal-push prefers
-- scheduled_at (TIMESTAMPTZ) so we get the actual time of the shoot.

ALTER TABLE public.shoots
  ADD COLUMN IF NOT EXISTS scheduled_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_hours      INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS assigned_editor_id  UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title               TEXT;

CREATE INDEX IF NOT EXISTS shoots_scheduled_idx ON public.shoots (scheduled_at);


-- ---------- 4) Make sure crm_bookings can hold a full timestamp -------------
-- crm_bookings.shoot_date is DATE; that's fine for the kanban but if someone
-- syncs a precise time from GCal we want to preserve it. Add a companion column.

ALTER TABLE public.crm_bookings
  ADD COLUMN IF NOT EXISTS shoot_at TIMESTAMPTZ;


-- ---------- 5) RLS: let any authenticated team_member insert into the
--                   tables QuickAdd writes to. Without this, even admin
--                   users hit "permission denied" because the existing
--                   policies are SELECT-focused.

-- crm_bookings: any team member can insert (Mike's quick add)
DROP POLICY IF EXISTS "crm_bookings_team_insert" ON public.crm_bookings;
CREATE POLICY "crm_bookings_team_insert" ON public.crm_bookings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()));

-- artist_prospects: any team member can insert
DROP POLICY IF EXISTS "artist_prospects_team_insert" ON public.artist_prospects;
CREATE POLICY "artist_prospects_team_insert" ON public.artist_prospects
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()));

-- distro_artists: any team member can insert
DROP POLICY IF EXISTS "distro_artists_team_insert" ON public.distro_artists;
CREATE POLICY "distro_artists_team_insert" ON public.distro_artists
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()));

-- sponsor_brands: any team member can insert (Steven's quick add)
DROP POLICY IF EXISTS "sponsor_brands_team_insert" ON public.sponsor_brands;
CREATE POLICY "sponsor_brands_team_insert" ON public.sponsor_brands
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()));

-- sponsor_brands: any team member can read so the brands tab loads
DROP POLICY IF EXISTS "sponsor_brands_team_read" ON public.sponsor_brands;
CREATE POLICY "sponsor_brands_team_read" ON public.sponsor_brands
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()));

-- shoots: any team member can insert (Jay's quick add)
DROP POLICY IF EXISTS "shoots_team_insert" ON public.shoots;
CREATE POLICY "shoots_team_insert" ON public.shoots
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()));

-- deliverables: any team member can insert (afterInsert hook on shoots)
DROP POLICY IF EXISTS "deliverables_team_insert" ON public.deliverables;
CREATE POLICY "deliverables_team_insert" ON public.deliverables
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()));
