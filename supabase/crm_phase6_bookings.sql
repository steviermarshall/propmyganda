-- ============================================================================
-- PHASE 6 — Bookings expansion for CRM-wide scheduling
-- Run in: Cloud → Database → SQL Editor (idempotent)
-- ============================================================================

-- Broaden the service whitelist + add CRM-only services
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
  -- JV
  ADD COLUMN IF NOT EXISTS partner_name     TEXT,
  ADD COLUMN IF NOT EXISTS deal_type        TEXT,
  ADD COLUMN IF NOT EXISTS revenue_split    TEXT,
  -- Distro
  ADD COLUMN IF NOT EXISTS artist_name      TEXT,
  ADD COLUMN IF NOT EXISTS release_title    TEXT,
  ADD COLUMN IF NOT EXISTS release_date     TEXT,
  ADD COLUMN IF NOT EXISTS platforms        TEXT,
  ADD COLUMN IF NOT EXISTS marketing_budget TEXT,
  -- Shared scheduling
  ADD COLUMN IF NOT EXISTS event_at         TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS bookings_event_at_idx ON public.bookings (event_at);
CREATE INDEX IF NOT EXISTS bookings_service_idx  ON public.bookings (service);

-- Team-wide read + insert so the shared calendar works for every CRM role.
DROP POLICY IF EXISTS "bookings_read_team" ON public.bookings;
CREATE POLICY "bookings_read_team" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    public.has_crm_role('admin')
    OR public.has_crm_role('mike')
    OR public.has_crm_role('steven')
    OR public.has_crm_role('jay')
    OR public.has_crm_role('editor')
  );

DROP POLICY IF EXISTS "bookings_insert_team" ON public.bookings;
CREATE POLICY "bookings_insert_team" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_crm_role('admin')
    OR public.has_crm_role('mike')
    OR public.has_crm_role('steven')
    OR public.has_crm_role('jay')
    OR public.has_crm_role('editor')
  );

DROP POLICY IF EXISTS "bookings_update_team" ON public.bookings;
CREATE POLICY "bookings_update_team" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_crm_role('admin') OR public.has_crm_role('mike'));
