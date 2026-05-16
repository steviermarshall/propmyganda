-- ════════════════════════════════════════════════════════════════
-- PMG CRM — RLS FIX
-- Run this in Supabase SQL Editor if CRM dashboard routing is broken
-- ════════════════════════════════════════════════════════════════

-- Drop the old restrictive policies
DROP POLICY IF EXISTS "tm_admin_all"  ON public.team_members;
DROP POLICY IF EXISTS "tm_self_read"  ON public.team_members;

-- All authenticated users can read team_members (needed for role lookup)
CREATE POLICY "tm_authenticated_read" ON public.team_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Each member can update their own row (for auto-linking auth_user_id)
CREATE POLICY "tm_self_update" ON public.team_members
  FOR UPDATE USING (
    auth_user_id = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Admin can do everything
CREATE POLICY "tm_admin_all" ON public.team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members t
      WHERE (t.auth_user_id = auth.uid() OR t.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
      AND t.role = 'admin'
    )
  );

-- Also make sure Marshall's row has the right email
-- (update this if the email is different)
UPDATE public.team_members
SET email = 'steviermarshall@gmail.com'
WHERE name = 'Marshall' AND (email IS NULL OR email != 'steviermarshall@gmail.com');
