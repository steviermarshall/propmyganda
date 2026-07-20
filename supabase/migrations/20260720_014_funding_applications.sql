-- ─────────────────────────────────────────────────────────────────────────────
-- Funding application wizard (1West-style flow, replicated as PMG/Tip Top intake)
--
-- Two tables:
--   funding_applications — one row per applicant, written PROGRESSIVELY from Q1.
--                          A half-finished application is still a lead.
--   funding_events       — append-only analytics stream for the funnel report.
--
-- Anonymous applicants create + update their own (unclaimed) row via the anon
-- key. When they create an account at the gate, `claimed_by` is set to their
-- auth.uid() and the row becomes private to them (customer-portal RLS).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.funding_applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- anonymous browser session that owns this row before an account exists
  session_id          TEXT NOT NULL,
  -- set at the account gate; NULL means the row is still unclaimed/anonymous
  claimed_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- ── Step 1: Funding need ──
  funding_amount      NUMERIC,
  use_of_funds        TEXT,

  -- ── Step 2: Your business ──
  business_name       TEXT,
  industry            TEXT,
  business_state      TEXT,
  time_in_business    TEXT,

  -- ── Step 3: Revenue ──
  monthly_revenue     NUMERIC,
  accepts_cards       BOOLEAN,

  -- ── Step 4: About you ──
  contact_name        TEXT,
  email               TEXT,
  phone               TEXT,
  credit_score_range  TEXT,

  -- ── Progress / funnel state ──
  current_step        INTEGER NOT NULL DEFAULT 0,
  completed_questions TEXT[] NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'started'
                        CHECK (status IN ('started','questions_complete','account_created','submitted','docs_uploaded')),

  -- ── First-touch attribution (saved on Q1) ──
  utm_source          TEXT,
  utm_medium          TEXT,
  utm_campaign        TEXT,
  utm_content         TEXT,
  utm_term            TEXT,
  referrer            TEXT,
  landing_path        TEXT,

  -- ── Staff review ──
  underwriting_result TEXT,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at        TIMESTAMPTZ
);

CREATE INDEX funding_apps_session_idx   ON public.funding_applications (session_id);
CREATE INDEX funding_apps_claimed_idx   ON public.funding_applications (claimed_by);
CREATE INDEX funding_apps_status_idx    ON public.funding_applications (status);
CREATE INDEX funding_apps_created_idx   ON public.funding_applications (created_at DESC);
CREATE INDEX funding_apps_utm_src_idx   ON public.funding_applications (utm_source);

-- keep updated_at fresh on every progressive write
CREATE OR REPLACE FUNCTION public.funding_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER funding_apps_touch
  BEFORE UPDATE ON public.funding_applications
  FOR EACH ROW EXECUTE FUNCTION public.funding_touch_updated_at();

-- ── Analytics: append-only funnel stream ────────────────────────────────────
CREATE TABLE public.funding_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.funding_applications(id) ON DELETE SET NULL,
  session_id     TEXT NOT NULL,
  event_type     TEXT NOT NULL,   -- page_view | question_view | question_answered | step_complete | account_created | submitted | drop_off
  question_key   TEXT,
  payload        JSONB,
  page           TEXT,
  referrer       TEXT,
  utm_source     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX funding_events_app_idx     ON public.funding_events (application_id);
CREATE INDEX funding_events_session_idx ON public.funding_events (session_id);
CREATE INDEX funding_events_type_idx    ON public.funding_events (event_type);
CREATE INDEX funding_events_created_idx ON public.funding_events (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.funding_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_events       ENABLE ROW LEVEL SECURITY;

-- Anonymous applicant may CREATE a new (unclaimed) application …
CREATE POLICY "funding_apps_anon_insert" ON public.funding_applications
  FOR INSERT WITH CHECK (claimed_by IS NULL);

-- … and progressively UPDATE it while it stays unclaimed. The client holds the
-- row id; once claimed_by is set the anon key can no longer touch it. The update
-- must not claim the row on behalf of someone else, hence the WITH CHECK.
CREATE POLICY "funding_apps_anon_update" ON public.funding_applications
  FOR UPDATE USING (claimed_by IS NULL) WITH CHECK (claimed_by IS NULL);

-- Once an account exists, the applicant sees & edits only their own row.
CREATE POLICY "funding_apps_owner_select" ON public.funding_applications
  FOR SELECT USING (claimed_by = auth.uid());

CREATE POLICY "funding_apps_owner_update" ON public.funding_applications
  FOR UPDATE USING (claimed_by = auth.uid()) WITH CHECK (claimed_by = auth.uid());

-- Staff (admin) full access to review / underwrite.
CREATE POLICY "funding_apps_admin_all" ON public.funding_applications
  FOR ALL USING (public.my_role() = 'admin');

-- Anyone (anon or authed) may APPEND analytics events; only staff read them.
CREATE POLICY "funding_events_insert" ON public.funding_events
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "funding_events_admin_read" ON public.funding_events
  FOR SELECT USING (public.my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- Claiming an application
--
-- Moving claimed_by from NULL → auth.uid() is the one privileged transition:
-- the anon policy forbids setting claimed_by, and the owner policy requires it
-- to already equal auth.uid(). This SECURITY DEFINER function performs the
-- hand-off when the applicant creates an account at the gate. It only ever
-- claims a still-unclaimed row, so it can't steal someone else's application.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_funding_application(app_id UUID)
RETURNS public.funding_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result public.funding_applications;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'must be authenticated to claim an application';
  END IF;

  UPDATE public.funding_applications
     SET claimed_by = auth.uid(),
         status = CASE WHEN status IN ('submitted','docs_uploaded')
                       THEN status ELSE 'account_created' END
   WHERE id = app_id AND claimed_by IS NULL
   RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_funding_application(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_funding_application(UUID) TO authenticated;
