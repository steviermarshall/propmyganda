-- ════════════════════════════════════════════════════════════════════════════
-- PMG CRM — COMPLETE SCHEMA (Base + RLS Fix + Phase 1 Expansion + Phase 5 GCal)
-- Run this ONCE in: Cloud → Database → SQL Editor
-- Fully idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── PART 1/4: BASE CRM (team_members, deliverables, distro_artists, sponsor_pipeline) ───
-- ════════════════════════════════════════════════════════════════
-- PMG TEAM CRM — SCHEMA MIGRATION
-- Apply this in Supabase SQL Editor after all_migrations.sql
-- ════════════════════════════════════════════════════════════════
--
-- NAMING NOTE: The existing `bookings` table handles customer-facing
-- service bookings (DJ, security, venue, etc.) submitted via the
-- public site. The CRM shoot pipeline is stored in `crm_bookings`
-- to avoid collision. Lovable should reference `crm_bookings` for
-- Mike's pipeline, not the public `bookings` table.
--
-- ROLE NOTE: The existing `profiles` table uses roles
-- (admin/distribution/marketing/sponsorships) for the public site
-- auth. The new `team_members` table uses CRM roles (admin/mike/
-- steven/jay) and links to auth.users directly. Both coexist.
-- ════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════
-- TEAM MEMBERS (CRM identity + role routing)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.team_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'mike', 'steven', 'jay')),
  email         TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Seed team — auth_user_id linked after each person signs up
INSERT INTO public.team_members (name, role, email) VALUES
  ('Marshall', 'admin',  'marshall@propmyganda.com'),
  ('Mike',     'mike',   'mike@propmyganda.com'),
  ('Steven',   'steven', 'steven@propmyganda.com'),
  ('Jay',      'jay',    'jay@propmyganda.com')
ON CONFLICT DO NOTHING;

CREATE POLICY "tm_admin_all" ON public.team_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members t WHERE t.auth_user_id = auth.uid() AND t.role = 'admin')
  );

CREATE POLICY "tm_self_read" ON public.team_members
  FOR SELECT USING (auth_user_id = auth.uid());

-- ════════════════════════════════════════════
-- CRM BOOKINGS PIPELINE (Mike owns)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.crm_bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_name         TEXT NOT NULL,
  artist_contact      TEXT,
  song_or_project     TEXT,
  package             TEXT DEFAULT '550' CHECK (package IN ('550', '1000', '1500_premium')),
  amount_quoted       NUMERIC,
  status              TEXT NOT NULL DEFAULT 'inquiry' CHECK (status IN ('inquiry', 'quoted', 'booked', 'shot', 'delivered', 'paid', 'dead')),
  stripe_deposit_paid BOOLEAN DEFAULT false,
  shoot_date          DATE,
  source              TEXT CHECK (source IN ('inbound', 'outbound', 'repeat')),
  notes               TEXT,
  assigned_to         UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crm_bookings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER crm_bookings_updated_at
  BEFORE UPDATE ON public.crm_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX crm_bookings_status_idx   ON public.crm_bookings (status);
CREATE INDEX crm_bookings_assigned_idx ON public.crm_bookings (assigned_to);

CREATE POLICY "crm_bookings_admin_all" ON public.crm_bookings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "crm_bookings_mike_all" ON public.crm_bookings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'mike')
  );

-- Jay needs read access to bookings linked to his shoots
CREATE POLICY "crm_bookings_jay_read" ON public.crm_bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'jay')
  );

-- ════════════════════════════════════════════
-- ARTIST PROSPECTS / A&R (Mike owns)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.artist_prospects (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT NOT NULL,
  city                     TEXT,
  genre                    TEXT,
  spotify_monthly_listeners INT,
  ig_followers             INT,
  ig_handle                TEXT,
  contact_email            TEXT,
  contact_method           TEXT CHECK (contact_method IN ('dm', 'email', 'manager')),
  growth_velocity          NUMERIC,
  fit_score                INT CHECK (fit_score BETWEEN 1 AND 100),
  intended_lane            TEXT CHECK (intended_lane IN ('booking', 'distro_jv', 'distro_pure', 'media_agency')),
  outreach_status          TEXT NOT NULL DEFAULT 'cold' CHECK (outreach_status IN ('cold', 'pitched', 'replied', 'discovery_call', 'closed', 'dead')),
  last_contact_date        DATE,
  next_followup_date       DATE,
  notes                    TEXT,
  assigned_to              UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.artist_prospects ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER artist_prospects_updated_at
  BEFORE UPDATE ON public.artist_prospects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX artist_prospects_status_idx   ON public.artist_prospects (outreach_status);
CREATE INDEX artist_prospects_followup_idx ON public.artist_prospects (next_followup_date);

CREATE POLICY "artist_prospects_admin_all" ON public.artist_prospects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "artist_prospects_mike_all" ON public.artist_prospects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'mike')
  );

-- ════════════════════════════════════════════
-- DISTRO ARTISTS (Mike onboards)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.distro_artists (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_name       TEXT NOT NULL,
  artist_contact    TEXT,
  side              TEXT NOT NULL CHECK (side IN ('jv_owned', 'pure_service')),
  onboarding_status TEXT NOT NULL DEFAULT 'intake' CHECK (onboarding_status IN ('intake', 'docs_pending', 'docs_signed', 'live', 'churned')),
  monthly_streams   INT,
  pmg_share_percent NUMERIC CHECK (pmg_share_percent IN (20, 45)),
  publishing_owned  BOOLEAN DEFAULT false,
  admin_rights      BOOLEAN DEFAULT false,
  contract_url      TEXT,
  notes             TEXT,
  onboarded_by      UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  onboarded_at      TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.distro_artists ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER distro_artists_updated_at
  BEFORE UPDATE ON public.distro_artists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX distro_artists_status_idx ON public.distro_artists (onboarding_status);
CREATE INDEX distro_artists_side_idx   ON public.distro_artists (side);

CREATE POLICY "distro_artists_admin_all" ON public.distro_artists
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "distro_artists_mike_all" ON public.distro_artists
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'mike')
  );

-- ════════════════════════════════════════════
-- ROYALTY PAYMENTS
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.royalty_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID REFERENCES public.distro_artists(id) ON DELETE CASCADE,
  period_month    DATE NOT NULL,
  gross_royalty   NUMERIC NOT NULL DEFAULT 0,
  pmg_share       NUMERIC NOT NULL DEFAULT 0,
  paid_to_artist  NUMERIC NOT NULL DEFAULT 0,
  source          TEXT CHECK (source IN ('spotify', 'apple', 'youtube', 'tidal', 'amazon', 'other')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.royalty_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX royalty_payments_artist_idx ON public.royalty_payments (artist_id, period_month DESC);

CREATE POLICY "royalty_payments_admin_all" ON public.royalty_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role IN ('admin', 'mike'))
  );

-- ════════════════════════════════════════════
-- SPONSOR PIPELINE (Steven owns)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.sponsor_pipeline (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name         TEXT NOT NULL,
  category           TEXT NOT NULL DEFAULT 'brand' CHECK (category IN ('brand', 'event', 'publication')),
  contact_name       TEXT,
  contact_email      TEXT,
  contact_role       TEXT,
  industry           TEXT,
  pitch_amount       NUMERIC,
  stage              TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'pitched', 'replied', 'discovery_call', 'proposal', 'closed', 'lost')),
  last_contact_date  DATE,
  next_followup_date DATE,
  proposal_url       TEXT,
  contract_url       TEXT,
  closed_amount      NUMERIC,
  notes              TEXT,
  assigned_to        UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sponsor_pipeline ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER sponsor_pipeline_updated_at
  BEFORE UPDATE ON public.sponsor_pipeline
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX sponsor_pipeline_stage_idx    ON public.sponsor_pipeline (stage);
CREATE INDEX sponsor_pipeline_category_idx ON public.sponsor_pipeline (category);
CREATE INDEX sponsor_pipeline_followup_idx ON public.sponsor_pipeline (next_followup_date);

CREATE POLICY "sponsor_pipeline_admin_all" ON public.sponsor_pipeline
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "sponsor_pipeline_steven_all" ON public.sponsor_pipeline
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'steven')
  );

-- ════════════════════════════════════════════
-- STORE ORDERS (Steven fulfills)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.store_orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number       TEXT UNIQUE,
  customer_name      TEXT,
  customer_email     TEXT,
  product_name       TEXT,
  variant            TEXT,
  quantity           INT DEFAULT 1,
  amount             NUMERIC,
  fulfillment_status TEXT NOT NULL DEFAULT 'paid' CHECK (fulfillment_status IN ('paid', 'to_ship', 'shipped', 'delivered', 'returned')),
  tracking_number    TEXT,
  shipping_carrier   TEXT,
  ordered_at         TIMESTAMPTZ DEFAULT now(),
  shipped_at         TIMESTAMPTZ,
  source             TEXT CHECK (source IN ('shopify', 'stripe', 'manual'))
);

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX store_orders_status_idx  ON public.store_orders (fulfillment_status);
CREATE INDEX store_orders_ordered_idx ON public.store_orders (ordered_at DESC);

CREATE POLICY "store_orders_admin_all" ON public.store_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "store_orders_steven_all" ON public.store_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'steven')
  );

-- ════════════════════════════════════════════
-- MEDIA AGENCY PROJECTS (Marshall/Stevie sells)
-- Created before shoots so shoots can FK to it
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.media_agency_projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_name   TEXT NOT NULL,
  artist_contact TEXT,
  tier          TEXT CHECK (tier IN ('starter_350', 'release_650', 'campaign_1000')),
  amount        NUMERIC,
  travel_addon  NUMERIC DEFAULT 0,
  scope_notes   TEXT,
  status        TEXT NOT NULL DEFAULT 'inquiry' CHECK (status IN ('inquiry', 'quoted', 'booked', 'in_production', 'delivered', 'paid', 'dead')),
  stripe_paid   BOOLEAN DEFAULT false,
  shoot_date    DATE,
  notes         TEXT,
  sold_by       UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.media_agency_projects ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER media_agency_projects_updated_at
  BEFORE UPDATE ON public.media_agency_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX media_agency_status_idx ON public.media_agency_projects (status);

CREATE POLICY "media_agency_admin_all" ON public.media_agency_projects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

-- Jay needs read for production scheduling
CREATE POLICY "media_agency_jay_read" ON public.media_agency_projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'jay')
  );

-- ════════════════════════════════════════════
-- SHOOTS (Jay owns)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.shoots (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id              UUID REFERENCES public.crm_bookings(id) ON DELETE SET NULL,
  media_agency_project_id UUID REFERENCES public.media_agency_projects(id) ON DELETE SET NULL,
  artist_name             TEXT NOT NULL,
  shoot_date              DATE NOT NULL,
  shoot_window            TEXT,
  shoot_type              TEXT NOT NULL CHECK (shoot_type IN ('pmg_booking', 'media_agency')),
  location                TEXT,
  status                  TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'filming', 'edit', 'review', 'delivered')),
  notes                   TEXT,
  shooter                 UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shoots ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER shoots_updated_at
  BEFORE UPDATE ON public.shoots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX shoots_date_idx   ON public.shoots (shoot_date DESC);
CREATE INDEX shoots_status_idx ON public.shoots (status);

CREATE POLICY "shoots_admin_all" ON public.shoots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "shoots_jay_all" ON public.shoots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'jay')
  );

CREATE POLICY "shoots_mike_read" ON public.shoots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'mike')
  );

-- ════════════════════════════════════════════
-- DELIVERABLES (per shoot, multiple formats)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.deliverables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shoot_id    UUID NOT NULL REFERENCES public.shoots(id) ON DELETE CASCADE,
  format      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'filmed' CHECK (status IN ('filmed', 'editing', 'reviewed', 'uploaded', 'published')),
  platform    TEXT[],
  upload_urls JSONB DEFAULT '{}',
  edited_by   UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  filmed_at   TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER deliverables_updated_at
  BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX deliverables_shoot_idx  ON public.deliverables (shoot_id);
CREATE INDEX deliverables_status_idx ON public.deliverables (status);

CREATE POLICY "deliverables_admin_all" ON public.deliverables
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "deliverables_jay_all" ON public.deliverables
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'jay')
  );

-- ════════════════════════════════════════════
-- ARTICLES (Mike drafts, Marshall approves)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.articles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  ai_draft      TEXT,
  edited_draft  TEXT,
  final_text    TEXT,
  status        TEXT NOT NULL DEFAULT 'ai_drafted' CHECK (status IN ('ai_drafted', 'mike_editing', 'stevie_review', 'approved', 'published')),
  artist_tags   TEXT[] DEFAULT '{}',
  genre_tags    TEXT[] DEFAULT '{}',
  city_tags     TEXT[] DEFAULT '{}',
  hero_image_url TEXT,
  published_url  TEXT,
  written_by    UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  approved_by   UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX articles_status_idx ON public.articles (status);

CREATE POLICY "articles_admin_all" ON public.articles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "articles_mike_all" ON public.articles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'mike')
  );

-- ════════════════════════════════════════════
-- NEWSLETTER
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  source          TEXT CHECK (source IN ('site', 'event', 'store', 'discord', 'manual')),
  subscribed_at   TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE INDEX newsletter_subs_active_idx ON public.newsletter_subscribers (is_active);

CREATE POLICY "newsletter_subs_insert_anon" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "newsletter_subs_admin_all" ON public.newsletter_subscribers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS public.newsletter_sends (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject          TEXT,
  body             TEXT,
  sent_at          TIMESTAMPTZ,
  recipients_count INT DEFAULT 0,
  open_rate        NUMERIC,
  click_rate       NUMERIC,
  composed_by      UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "newsletter_sends_admin_all" ON public.newsletter_sends
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

-- ════════════════════════════════════════════
-- WEEKLY KPI SNAPSHOTS (auto-generated Fridays)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.weekly_kpi_snapshots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_ending    DATE NOT NULL,
  team_member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  metric_name    TEXT NOT NULL,
  target_value   NUMERIC,
  actual_value   NUMERIC,
  status         TEXT CHECK (status IN ('green', 'yellow', 'red')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (week_ending, team_member_id, metric_name)
);

ALTER TABLE public.weekly_kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE INDEX kpi_snapshots_week_idx   ON public.weekly_kpi_snapshots (week_ending DESC);
CREATE INDEX kpi_snapshots_member_idx ON public.weekly_kpi_snapshots (team_member_id);

CREATE POLICY "kpi_snapshots_admin_all" ON public.weekly_kpi_snapshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "kpi_snapshots_member_read" ON public.weekly_kpi_snapshots
  FOR SELECT USING (
    team_member_id IN (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid())
  );

-- ════════════════════════════════════════════
-- ACTIVITY LOG (audit trail for all writes)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.activity_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  entity_type    TEXT NOT NULL CHECK (entity_type IN (
    'crm_booking', 'artist_prospect', 'distro_artist', 'royalty_payment',
    'sponsor_pipeline', 'store_order', 'shoot', 'deliverable',
    'media_agency_project', 'article', 'newsletter_send'
  )),
  entity_id      UUID NOT NULL,
  action         TEXT NOT NULL CHECK (action IN (
    'created', 'updated', 'status_changed', 'closed',
    'contacted', 'pitched', 'assigned', 'deleted'
  )),
  payload        JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX activity_log_entity_idx  ON public.activity_log (entity_type, entity_id);
CREATE INDEX activity_log_member_idx  ON public.activity_log (team_member_id, created_at DESC);
CREATE INDEX activity_log_created_idx ON public.activity_log (created_at DESC);

CREATE POLICY "activity_log_admin_all" ON public.activity_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "activity_log_member_read" ON public.activity_log
  FOR SELECT USING (
    team_member_id IN (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "activity_log_member_insert" ON public.activity_log
  FOR INSERT WITH CHECK (
    team_member_id IN (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid())
  );

-- ════════════════════════════════════════════
-- KPI TARGETS CONFIG (reference table)
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.kpi_targets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_role  TEXT NOT NULL,
  metric_name       TEXT NOT NULL,
  weekly_target     NUMERIC NOT NULL,
  unit              TEXT CHECK (unit IN ('count', 'dollars', 'hours')),
  description       TEXT,
  UNIQUE (team_member_role, metric_name)
);

ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.kpi_targets (team_member_role, metric_name, weekly_target, unit, description) VALUES
  ('mike',   'bookings_closed',       3, 'count',   'Bookings moved to paid/delivered this week'),
  ('mike',   'cold_outreach_sent',   10, 'count',   'New artist prospect DMs or emails sent'),
  ('mike',   'distro_onboarded',      2, 'count',   'Distro artists signed and set to live'),
  ('mike',   'articles_cowritten',    1, 'count',   'AI-assisted articles submitted for review'),
  ('steven', 'sponsor_pitches',      10, 'count',   'Total sponsor outreach messages sent'),
  ('steven', 'sponsor_pitches_brand', 4, 'count',   'Brand-category sponsor pitches'),
  ('steven', 'sponsor_pitches_event', 3, 'count',   'Event-category sponsor pitches'),
  ('steven', 'sponsor_pitches_pub',   3, 'count',   'Publication-category sponsor pitches'),
  ('steven', 'discovery_calls',       1, 'count',   'Sponsor discovery calls booked'),
  ('jay',    'shoots_executed',       5, 'count',   'Shoots completed Wed-Sat'),
  ('jay',    'deliverables_done',    20, 'count',   'Deliverables uploaded (4 formats × 5 shoots)'),
  ('jay',    'edit_sla_hours',       72, 'hours',   'Max hours from shoot to delivery'),
  ('jay',    'bts_captured',          5, 'count',   'BTS clips for Discord/IG'),
  ('admin',  'media_agency_closes',   2, 'count',   'Media Agency projects closed per week'),
  ('admin',  'mrr_target',        50000, 'dollars', 'Monthly recurring revenue target')
ON CONFLICT (team_member_role, metric_name) DO NOTHING;

CREATE POLICY "kpi_targets_all_read" ON public.kpi_targets
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "kpi_targets_admin_write" ON public.kpi_targets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

-- ════════════════════════════════════════════
-- HELPER: get the calling user's CRM role
-- (mirrors my_role() for the new team_members table)
-- ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.my_crm_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.team_members WHERE auth_user_id = auth.uid();
$$;

-- ─── PART 2/4: RLS FIX (has_crm_role, my_crm_role, non-recursive policies) ───
-- ════════════════════════════════════════════════════════════════
-- PMG CRM — RLS FIX
-- Run this in Cloud → Database → SQL Editor if CRM dashboard routing
-- falls back to Marketing or team_members returns error 42P17.
-- ════════════════════════════════════════════════════════════════

-- The old policy queried public.team_members from inside a policy on
-- public.team_members, which causes:
-- infinite recursion detected in policy for relation "team_members"

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

UPDATE public.team_members
SET email = 'steviermarshall@gmail.com',
    name = 'Stevie Marshall',
    auth_user_id = '6d72ebb5-7251-47c9-89d8-e3668b4a47a1'
WHERE role = 'admin';

-- ─── PART 3/4: PHASE 1 EXPANSION (calendar_sync, distro members, sponsor CRM) ───
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
    EXECUTE format('DROP POLICY IF EXISTS %L ON public.%I;', t || '_admin_steven', t);
    EXECUTE format(
      'CREATE POLICY %L ON public.%I FOR ALL TO authenticated USING (public.has_crm_role(''admin'') OR public.has_crm_role(''steven'')) WITH CHECK (public.has_crm_role(''admin'') OR public.has_crm_role(''steven''));',
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

-- ─── PART 4/4: PHASE 5 GOOGLE CALENDAR SYNC (crm_settings, sync extensions) ───
-- ============================================================================
-- PHASE 5 — Google Calendar Sync support
-- Run in: Cloud → Database → SQL Editor (idempotent)
-- ============================================================================

ALTER TABLE public.calendar_sync
  ADD COLUMN IF NOT EXISTS last_error      TEXT,
  ADD COLUMN IF NOT EXISTS event_html_link TEXT;

CREATE TABLE IF NOT EXISTS public.crm_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_settings_read" ON public.crm_settings;
CREATE POLICY "crm_settings_read" ON public.crm_settings
  FOR SELECT TO authenticated
  USING (
    public.has_crm_role('admin')
    OR public.has_crm_role('jay')
    OR public.has_crm_role('mike')
    OR public.has_crm_role('steven')
  );

DROP POLICY IF EXISTS "crm_settings_write" ON public.crm_settings;
CREATE POLICY "crm_settings_write" ON public.crm_settings
  FOR ALL TO authenticated
  USING (public.has_crm_role('admin') OR public.has_crm_role('jay'))
  WITH CHECK (public.has_crm_role('admin') OR public.has_crm_role('jay'));

INSERT INTO public.crm_settings (key, value)
VALUES ('gcal', '{"calendar_id": "primary", "last_pull_at": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Optional: schedule pull every 5 min via pg_cron (uncomment if pg_cron + pg_net installed)
--
-- SELECT cron.schedule('gcal-pull', '*/5 * * * *', $$
--   SELECT net.http_post(
--     url:='https://trwnqtgywfsalvismioi.supabase.co/functions/v1/gcal-pull',
--     headers:='{"Content-Type":"application/json"}'::jsonb,
--     body:='{}'::jsonb
--   );
-- $$);
