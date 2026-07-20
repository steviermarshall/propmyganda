-- ============================================================================
-- MIGRATION 014 — Functional audit trail (activity_log)
--
-- Replaces best-effort client-side logging with database-trigger auditing so
-- every INSERT / UPDATE / DELETE on CRM tables is recorded, no matter which
-- client or code path performed the write.
--
-- Design adapted from Supabase's reference implementation:
--   - "Postgres Auditing in 150 lines of SQL" (supabase.com/blog/postgres-audit)
--   - github.com/supabase/supa_audit (generic table auditing extension)
-- Adapted to write into the existing public.activity_log table shape
-- (team_member_id / entity_type / entity_id / action / payload) so existing
-- KPI queries keep working.
--
-- Idempotent: safe to run multiple times. Paste into Cloud → SQL Editor.
-- ============================================================================

-- ────────────────────────────────────────────
-- 1. Ensure activity_log exists (self-contained for fresh environments)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  entity_type    TEXT NOT NULL,
  entity_id      UUID NOT NULL,
  action         TEXT NOT NULL,
  payload        JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_entity_idx  ON public.activity_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS activity_log_member_idx  ON public.activity_log (team_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_created_idx ON public.activity_log (created_at DESC);

-- ────────────────────────────────────────────
-- 2. Expand CHECK constraints
--    The original entity_type list was missing sponsor_brand / sponsor_contact
--    / sponsor_deal / booking, so those audit inserts silently failed.
-- ────────────────────────────────────────────
ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_entity_type_check;
ALTER TABLE public.activity_log
  ADD CONSTRAINT activity_log_entity_type_check CHECK (entity_type IN (
    'crm_booking', 'artist_prospect', 'distro_artist', 'royalty_payment',
    'sponsor_pipeline', 'sponsor_brand', 'sponsor_contact', 'sponsor_deal',
    'store_order', 'shoot', 'deliverable', 'media_agency_project',
    'article', 'newsletter_send', 'booking'
  ));

ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_action_check;
ALTER TABLE public.activity_log
  ADD CONSTRAINT activity_log_action_check CHECK (action IN (
    'created', 'updated', 'status_changed', 'closed',
    'contacted', 'pitched', 'assigned', 'deleted'
  ));

-- ────────────────────────────────────────────
-- 3. Generic audit trigger function
--    entity_type is passed as the trigger argument (TG_ARGV[0]) so we never
--    have to guess it from the table name.
--    SECURITY DEFINER: inserts bypass RLS, so auditing works for every role
--    (including anon website form submissions → team_member_id NULL).
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_crm_activity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_entity_type TEXT := TG_ARGV[0];
  v_member_id   UUID;
  v_action      TEXT;
  v_payload     JSONB;
  v_row         JSONB;
  v_old         JSONB;
  v_new         JSONB;
  v_changed     JSONB := '{}'::jsonb;
  v_status_col  TEXT;
  v_entity_id   UUID;
  k             TEXT;
BEGIN
  SELECT id INTO v_member_id
  FROM public.team_members
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    v_action  := 'created';
    v_row     := to_jsonb(NEW);
    v_payload := v_row - 'id' - 'created_at' - 'updated_at';

  ELSIF TG_OP = 'DELETE' THEN
    v_action  := 'deleted';
    v_row     := to_jsonb(OLD);
    v_payload := v_row - 'id' - 'created_at' - 'updated_at';

  ELSE -- UPDATE: build a {column: {from, to}} diff of what actually changed
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_row := v_new;
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF k <> 'updated_at' AND (v_new -> k) IS DISTINCT FROM (v_old -> k) THEN
        v_changed := v_changed
          || jsonb_build_object(k, jsonb_build_object('from', v_old -> k, 'to', v_new -> k));
      END IF;
    END LOOP;

    -- No-op update (e.g. only updated_at touched): nothing worth logging
    IF v_changed = '{}'::jsonb THEN
      RETURN NEW;
    END IF;

    -- Detect pipeline transitions; payload keeps top-level from/to so the
    -- existing KPI queries (payload->>'to' = 'pitched') keep working.
    SELECT c INTO v_status_col
    FROM unnest(ARRAY['status', 'stage', 'outreach_status', 'onboarding_status']) c
    WHERE v_changed ? c
    LIMIT 1;

    IF v_status_col IS NOT NULL THEN
      v_action  := 'status_changed';
      v_payload := jsonb_build_object(
        'field',   v_status_col,
        'from',    v_old ->> v_status_col,
        'to',      v_new ->> v_status_col,
        'changes', v_changed
      );
    ELSE
      v_action  := 'updated';
      v_payload := jsonb_build_object('changes', v_changed);
    END IF;
  END IF;

  v_entity_id := COALESCE((v_row ->> 'id')::uuid, gen_random_uuid());

  INSERT INTO public.activity_log (team_member_id, entity_type, entity_id, action, payload)
  VALUES (v_member_id, v_entity_type, v_entity_id, v_action, v_payload);

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Auditing must never block the underlying business write
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ────────────────────────────────────────────
-- 4. enable_activity_tracking(table, entity_type)
--    Mirrors supa_audit's audit.enable_tracking(regclass) API.
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enable_activity_tracking(t regclass, entity TEXT)
RETURNS void
VOLATILE
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = t AND tgname = 'crm_audit_iud'
  ) THEN
    EXECUTE format(
      'CREATE TRIGGER crm_audit_iud
         AFTER INSERT OR UPDATE OR DELETE ON %s
         FOR EACH ROW EXECUTE FUNCTION public.log_crm_activity(%L);',
      t, entity
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.disable_activity_tracking(t regclass)
RETURNS void
VOLATILE
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS crm_audit_iud ON %s;', t);
END;
$$;

-- ────────────────────────────────────────────
-- 5. Attach triggers to every CRM table that exists in this environment
-- ────────────────────────────────────────────
DO $$
DECLARE
  pair TEXT[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY ARRAY[
    ['crm_bookings',          'crm_booking'],
    ['artist_prospects',      'artist_prospect'],
    ['distro_artists',        'distro_artist'],
    ['royalty_payments',      'royalty_payment'],
    ['sponsor_pipeline',      'sponsor_pipeline'],
    ['sponsor_brands',        'sponsor_brand'],
    ['sponsor_contacts',      'sponsor_contact'],
    ['sponsor_deals',         'sponsor_deal'],
    ['store_orders',          'store_order'],
    ['shoots',                'shoot'],
    ['deliverables',          'deliverable'],
    ['media_agency_projects', 'media_agency_project'],
    ['articles',              'article'],
    ['newsletter_sends',      'newsletter_send'],
    ['bookings',              'booking']
  ]
  LOOP
    IF to_regclass('public.' || pair[1]) IS NOT NULL THEN
      PERFORM public.enable_activity_tracking(('public.' || pair[1])::regclass, pair[2]);
    END IF;
  END LOOP;
END $$;

-- ────────────────────────────────────────────
-- 6. Harden: the audit log is append-only
--    Nobody (including admin, via the API) can rewrite history.
-- ────────────────────────────────────────────
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

REVOKE UPDATE, DELETE ON public.activity_log FROM anon, authenticated;

-- Replace the old FOR ALL admin policy with read-only
DROP POLICY IF EXISTS "activity_log_admin_all"      ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_admin_read"     ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_member_read"    ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_member_insert"  ON public.activity_log;

CREATE POLICY "activity_log_admin_read" ON public.activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "activity_log_member_read" ON public.activity_log
  FOR SELECT USING (
    team_member_id IN (
      SELECT id FROM public.team_members WHERE auth_user_id = auth.uid()
    )
  );

-- Inserts happen exclusively through the SECURITY DEFINER trigger; no client
-- INSERT policy is needed anymore.
