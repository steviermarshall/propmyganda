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
