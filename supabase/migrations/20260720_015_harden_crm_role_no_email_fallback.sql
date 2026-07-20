-- ============================================================================
-- MIGRATION 015 — Harden CRM role checks: remove email-match fallback
--
-- ⚠️ REVIEW BEFORE RUNNING — this changes how CRM access is granted.
--
-- Previously has_crm_role() (and the team_members RLS policies) treated
-- "your login email == team_members.email" as proof of role. That means a
-- signup for an existing member's email could obtain their role at the
-- DATABASE level. This migration makes auth_user_id the only proof.
--
-- To avoid locking out current team members, STEP 1 backfills auth_user_id
-- for any team_members row whose email matches a CONFIRMED auth.users row.
-- Verify STEP 1 linked everyone you expect (query at the bottom) BEFORE
-- relying on STEP 2/3.
-- ============================================================================

-- STEP 1 — one-time backfill: link confirmed accounts by email.
UPDATE public.team_members tm
SET auth_user_id = u.id
FROM auth.users u
WHERE tm.auth_user_id IS NULL
  AND u.email_confirmed_at IS NOT NULL
  AND lower(tm.email) = lower(u.email);

-- STEP 2 — hardened role check: auth_user_id only, no email fallback.
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
      AND auth_user_id = auth.uid()
  );
END;
$$;

-- STEP 3 — team_members self/admin read + self-link policies without email match.
DROP POLICY IF EXISTS "tm_self_or_admin_read" ON public.team_members;
CREATE POLICY "tm_self_or_admin_read" ON public.team_members
  FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR public.has_crm_role('admin')
  );

DROP POLICY IF EXISTS "tm_self_link_update" ON public.team_members;
CREATE POLICY "tm_self_link_update" ON public.team_members
  FOR UPDATE
  USING (auth_user_id = auth.uid() OR public.has_crm_role('admin'))
  WITH CHECK (auth_user_id = auth.uid() OR public.has_crm_role('admin'));

-- VERIFY — run this after STEP 1 and confirm every active member has a UUID:
--   SELECT name, role, email, auth_user_id FROM public.team_members ORDER BY role;
-- Any member still showing NULL cannot access the CRM until an admin links
-- their auth_user_id (that member should sign up first).
