-- ════════════════════════════════════════════════════════════════
-- PMG — CONTACT INBOX
-- Run this in Cloud → Database → SQL Editor.
-- Stores contact-form submissions; the team reads them in the CRM
-- at /admin/contact. Notifications are addressed to
-- workwithpmg@gmail.com.
-- Idempotent: safe to run more than once.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Anyone can submit; only the CRM team can read / manage.
GRANT INSERT ON public.contact_submissions TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_submissions TO authenticated;
GRANT ALL ON public.contact_submissions TO service_role;

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_anyone_submit" ON public.contact_submissions;
CREATE POLICY "contact_anyone_submit" ON public.contact_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "contact_team_read" ON public.contact_submissions;
CREATE POLICY "contact_team_read" ON public.contact_submissions
  FOR SELECT TO authenticated
  USING (public.has_crm_role('admin') OR public.has_crm_role('jay'));

DROP POLICY IF EXISTS "contact_team_update" ON public.contact_submissions;
CREATE POLICY "contact_team_update" ON public.contact_submissions
  FOR UPDATE TO authenticated
  USING (public.has_crm_role('admin') OR public.has_crm_role('jay'))
  WITH CHECK (public.has_crm_role('admin') OR public.has_crm_role('jay'));

DROP POLICY IF EXISTS "contact_team_delete" ON public.contact_submissions;
CREATE POLICY "contact_team_delete" ON public.contact_submissions
  FOR DELETE TO authenticated
  USING (public.has_crm_role('admin') OR public.has_crm_role('jay'));
