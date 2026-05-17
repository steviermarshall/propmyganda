-- Fix CRM staff lookup: the previous admin policy queried team_members from
-- inside a team_members policy, which caused Postgres error 42P17
-- "infinite recursion detected in policy for relation team_members".

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
