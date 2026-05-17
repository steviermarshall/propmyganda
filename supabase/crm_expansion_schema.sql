-- ============================================================================
-- CRM EXPANSION — Phase 1 schema
-- Run this in: Cloud → Database → SQL Editor
-- Safe to re-run (idempotent).
-- ============================================================================

-- ---------- JAY: deliverables extensions ------------------------------------
ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS assigned_to            UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS objective              TEXT,
  ADD COLUMN IF NOT EXISTS editor_notes           TEXT,
  ADD COLUMN IF NOT EXISTS expected_runtime_sec   INTEGER,
  ADD COLUMN IF NOT EXISTS due_at                 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority               TEXT DEFAULT 'med' CHECK (priority IN ('low','med','high')),
  ADD COLUMN IF NOT EXISTS revision_count         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_review_notes      TEXT;

CREATE INDEX IF NOT EXISTS deliverables_assigned_idx ON public.deliverables (assigned_to);
CREATE INDEX IF NOT EXISTS deliverables_due_idx ON public.deliverables (due_at);

DROP POLICY IF EXISTS "deliverables_editor_own" ON public.deliverables;
CREATE POLICY "deliverables_editor_own" ON public.deliverables
  FOR ALL TO authenticated
  USING (
    assigned_to = (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid())
    OR public.has_crm_role('admin')
    OR public.has_crm_role('jay')
  )
  WITH CHECK (
    assigned_to = (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid())
    OR public.has_crm_role('admin')
    OR public.has_crm_role('jay')
  );

-- ---------- JAY: calendar sync ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_sync (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type       TEXT NOT NULL CHECK (entity_type IN ('shoot','deliverable')),
  entity_id         UUID NOT NULL,
  google_event_id   TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL DEFAULT 'primary',
  last_synced_at    TIMESTAMPTZ DEFAULT NOW(),
  sync_direction    TEXT DEFAULT 'push' CHECK (sync_direction IN ('push','pull','both')),
  etag              TEXT,
  UNIQUE (entity_type, entity_id)
);
ALTER TABLE public.calendar_sync ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_sync_admin_jay" ON public.calendar_sync;
CREATE POLICY "calendar_sync_admin_jay" ON public.calendar_sync
  FOR ALL TO authenticated
  USING (public.has_crm_role('admin') OR public.has_crm_role('jay'))
  WITH CHECK (public.has_crm_role('admin') OR public.has_crm_role('jay'));

-- ---------- MIKE: distro intake extensions ----------------------------------
ALTER TABLE public.distro_artists
  ADD COLUMN IF NOT EXISTS dsp_title_approved  BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS dsp_title_custom    TEXT,
  ADD COLUMN IF NOT EXISTS description         TEXT,
  ADD COLUMN IF NOT EXISTS spotify_url         TEXT,
  ADD COLUMN IF NOT EXISTS apple_music_url     TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url         TEXT,
  ADD COLUMN IF NOT EXISTS chartmetric_url     TEXT;

CREATE TABLE IF NOT EXISTS public.distro_artist_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distro_artist_id    UUID NOT NULL REFERENCES public.distro_artists(id) ON DELETE CASCADE,
  member_role         TEXT NOT NULL CHECK (member_role IN ('artist','producer')),
  is_primary          BOOLEAN DEFAULT FALSE,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  stage_name          TEXT,
  pro_affiliation     TEXT CHECK (pro_affiliation IN ('BMI','ASCAP','SESAC','other','none')),
  pro_other           TEXT,
  ipi_number          TEXT,
  distro_email        TEXT,
  agreements_email    TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS distro_members_artist_idx ON public.distro_artist_members (distro_artist_id);
ALTER TABLE public.distro_artist_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "distro_members_admin_mike" ON public.distro_artist_members;
CREATE POLICY "distro_members_admin_mike" ON public.distro_artist_members
  FOR ALL TO authenticated
  USING (public.has_crm_role('admin') OR public.has_crm_role('mike'))
  WITH CHECK (public.has_crm_role('admin') OR public.has_crm_role('mike'));

CREATE TABLE IF NOT EXISTS public.streaming_metrics (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distro_artist_id  UUID NOT NULL REFERENCES public.distro_artists(id) ON DELETE CASCADE,
  platform          TEXT NOT NULL CHECK (platform IN ('spotify','apple','youtube','chartmetric','tiktok')),
  url               TEXT,
  monthly_listeners INTEGER,
  followers         INTEGER,
  streams_30d       BIGINT,
  recorded_at       TIMESTAMPTZ DEFAULT NOW(),
  notes             TEXT
);
CREATE INDEX IF NOT EXISTS streaming_metrics_artist_idx ON public.streaming_metrics (distro_artist_id, recorded_at DESC);
ALTER TABLE public.streaming_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "streaming_metrics_admin_mike" ON public.streaming_metrics;
CREATE POLICY "streaming_metrics_admin_mike" ON public.streaming_metrics
  FOR ALL TO authenticated
  USING (public.has_crm_role('admin') OR public.has_crm_role('mike'))
  WITH CHECK (public.has_crm_role('admin') OR public.has_crm_role('mike'));

-- ---------- STEVEN: full sponsor CRM ----------------------------------------
CREATE TABLE IF NOT EXISTS public.sponsor_brands (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  parent_company            TEXT,
  industry                  TEXT,
  logo_url                  TEXT,
  brand_colors              JSONB DEFAULT '[]'::jsonb,
  brand_guidelines_url      TEXT,
  hq_location               TEXT,
  regions                   TEXT[] DEFAULT '{}',
  annual_budget_estimate    BIGINT,
  fiscal_year_end_month     INTEGER CHECK (fiscal_year_end_month BETWEEN 1 AND 12),
  target_demo               JSONB DEFAULT '{}'::jsonb,
  previous_sponsorships     TEXT[] DEFAULT '{}',
  activation_style          TEXT[] DEFAULT '{}',
  status                    TEXT DEFAULT 'cold' CHECK (status IN ('cold','prospecting','pitched','negotiating','active','lapsed','dead')),
  tier                      TEXT DEFAULT 'tier_3' CHECK (tier IN ('tier_1','tier_2','tier_3')),
  source                    TEXT,
  owner_id                  UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sponsor_brands_status_idx ON public.sponsor_brands (status);
CREATE INDEX IF NOT EXISTS sponsor_brands_tier_idx   ON public.sponsor_brands (tier);

CREATE TABLE IF NOT EXISTS public.sponsor_contacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              UUID NOT NULL REFERENCES public.sponsor_brands(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  title                 TEXT,
  department            TEXT,
  email                 TEXT,
  phone                 TEXT,
  linkedin_url          TEXT,
  decision_power        TEXT CHECK (decision_power IN ('gatekeeper','influencer','signer')),
  reports_to_contact_id UUID REFERENCES public.sponsor_contacts(id) ON DELETE SET NULL,
  last_touch_at         TIMESTAMPTZ,
  next_touch_at         TIMESTAMPTZ,
  touch_cadence_days    INTEGER,
  comms_preference      TEXT,
  personal_notes        TEXT,
  birthday              DATE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sponsor_contacts_brand_idx ON public.sponsor_contacts (brand_id);
CREATE INDEX IF NOT EXISTS sponsor_contacts_next_touch_idx ON public.sponsor_contacts (next_touch_at);

CREATE TABLE IF NOT EXISTS public.sponsor_properties (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT NOT NULL,
  property_type            TEXT CHECK (property_type IN ('artist','tour','event','series','drop','other')),
  audience_size            INTEGER,
  demo_breakdown           JSONB DEFAULT '{}'::jsonb,
  geo_split                JSONB DEFAULT '{}'::jsonb,
  engagement_metrics       JSONB DEFAULT '{}'::jsonb,
  inventory                JSONB DEFAULT '[]'::jsonb,
  rate_card                JSONB DEFAULT '{}'::jsonb,
  exclusivity_restrictions TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sponsor_deals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              UUID NOT NULL REFERENCES public.sponsor_brands(id) ON DELETE CASCADE,
  contact_id            UUID REFERENCES public.sponsor_contacts(id) ON DELETE SET NULL,
  property_id           UUID REFERENCES public.sponsor_properties(id) ON DELETE SET NULL,
  stage                 TEXT DEFAULT 'intro' CHECK (stage IN ('intro','pitch_sent','deck_reviewed','term_sheet','contract','signed','activated','wrapped','lost')),
  value_cents           BIGINT,
  payment_terms         TEXT,
  payment_schedule      JSONB DEFAULT '[]'::jsonb,
  exclusivity_terms     TEXT,
  start_date            DATE,
  end_date              DATE,
  renewal_window        TEXT,
  renewal_probability   INTEGER CHECK (renewal_probability BETWEEN 0 AND 100),
  owner_id              UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  next_action           TEXT,
  next_action_due       DATE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sponsor_deals_brand_idx ON public.sponsor_deals (brand_id);
CREATE INDEX IF NOT EXISTS sponsor_deals_stage_idx ON public.sponsor_deals (stage);

CREATE TABLE IF NOT EXISTS public.sponsor_deliverables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID NOT NULL REFERENCES public.sponsor_deals(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  proof_urls      TEXT[] DEFAULT '{}',
  recap_status    TEXT DEFAULT 'pending' CHECK (recap_status IN ('pending','in_progress','delivered','approved')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sponsor_deliverables_deal_idx ON public.sponsor_deliverables (deal_id);

CREATE TABLE IF NOT EXISTS public.sponsor_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID REFERENCES public.sponsor_deals(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES public.sponsor_contacts(id) ON DELETE CASCADE,
  brand_id        UUID REFERENCES public.sponsor_brands(id) ON DELETE CASCADE,
  activity_type   TEXT NOT NULL CHECK (activity_type IN ('email','call','meeting','proposal','note','other')),
  summary         TEXT NOT NULL,
  occurred_at     TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES public.team_members(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS sponsor_activities_deal_idx ON public.sponsor_activities (deal_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS sponsor_activities_brand_idx ON public.sponsor_activities (brand_id, occurred_at DESC);

-- RLS + admin/steven policies for all sponsor_* tables
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sponsor_brands','sponsor_contacts','sponsor_properties',
    'sponsor_deals','sponsor_deliverables','sponsor_activities'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_admin_steven', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_crm_role(''admin'') OR public.has_crm_role(''steven'')) WITH CHECK (public.has_crm_role(''admin'') OR public.has_crm_role(''steven''));',
      t || '_admin_steven', t
    );
  END LOOP;
END $$;

-- updated_at triggers
DROP TRIGGER IF EXISTS sponsor_brands_updated_at ON public.sponsor_brands;
CREATE TRIGGER sponsor_brands_updated_at
  BEFORE UPDATE ON public.sponsor_brands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS sponsor_deals_updated_at ON public.sponsor_deals;
CREATE TRIGGER sponsor_deals_updated_at
  BEFORE UPDATE ON public.sponsor_deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Migrate existing sponsor_pipeline rows into sponsor_brands (idempotent)
INSERT INTO public.sponsor_brands (name, status, source, owner_id, notes, created_at)
SELECT
  sp.brand_name,
  CASE sp.stage
    WHEN 'lead' THEN 'cold'
    WHEN 'contacted' THEN 'prospecting'
    WHEN 'pitched' THEN 'pitched'
    WHEN 'negotiating' THEN 'negotiating'
    WHEN 'closed_won' THEN 'active'
    WHEN 'closed_lost' THEN 'dead'
    ELSE 'cold'
  END,
  COALESCE(sp.category, 'pipeline_migration'),
  sp.assigned_to,
  sp.notes,
  sp.created_at
FROM public.sponsor_pipeline sp
WHERE NOT EXISTS (
  SELECT 1 FROM public.sponsor_brands sb WHERE sb.name = sp.brand_name
);
