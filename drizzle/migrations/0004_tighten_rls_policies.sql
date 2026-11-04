CREATE OR REPLACE FUNCTION public.my_role()
 RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION public.is_staff()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid()
                 OR (auth.email() IS NOT NULL AND lower(email) = lower(auth.email())))
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid());
$$;

DROP POLICY IF EXISTS rp_auth_read ON public.role_permissions;
CREATE POLICY rp_staff_read ON public.role_permissions FOR SELECT TO authenticated USING (public.is_staff());
DROP POLICY IF EXISTS publications_auth_read_all ON public.publications;
CREATE POLICY publications_staff_read_all ON public.publications FOR SELECT TO authenticated USING (public.is_staff());
DROP POLICY IF EXISTS kpi_targets_all_read ON public.kpi_targets;
CREATE POLICY kpi_targets_staff_read ON public.kpi_targets FOR SELECT TO authenticated USING (public.is_staff());
DROP POLICY IF EXISTS metrics_auth_read ON public.social_metrics;
CREATE POLICY metrics_staff_read ON public.social_metrics FOR SELECT TO authenticated USING (public.is_staff());
DROP POLICY IF EXISTS artists_auth_read_all ON public.artists;
CREATE POLICY artists_staff_read_all ON public.artists FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS releases_public_read ON public.releases;
CREATE POLICY releases_public_read ON public.releases FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.artists a WHERE a.id = artist_id AND a.active = true) OR public.is_staff());

DROP POLICY IF EXISTS "Team can create tasks" ON public.pmg_tasks;
DROP POLICY IF EXISTS "Team can read tasks" ON public.pmg_tasks;
DROP POLICY IF EXISTS "Team can update tasks" ON public.pmg_tasks;
DROP POLICY IF EXISTS "Team can delete tasks" ON public.pmg_tasks;
CREATE POLICY "Team can create tasks" ON public.pmg_tasks FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY "Team can read tasks" ON public.pmg_tasks FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Team can update tasks" ON public.pmg_tasks FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "Team can delete tasks" ON public.pmg_tasks FOR DELETE TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS bookings_insert_public ON public.bookings;
CREATE POLICY bookings_insert_public ON public.bookings FOR INSERT TO anon WITH CHECK (
  created_by IS NULL AND length(btrim(name)) BETWEEN 1 AND 200
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 255
  AND length(service) BETWEEN 1 AND 100 AND coalesce(length(notes),0) <= 5000);

DROP POLICY IF EXISTS dist_apps_insert_anon ON public.distribution_applications;
CREATE POLICY dist_apps_insert_anon ON public.distribution_applications FOR INSERT WITH CHECK (
  reviewed_by IS NULL AND reviewed_at IS NULL AND notes IS NULL
  AND length(btrim(artist_name)) BETWEEN 1 AND 200 AND length(btrim(contact_name)) BETWEEN 1 AND 200
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 255
  AND coalesce(length(message),0) <= 5000);

DROP POLICY IF EXISTS sponsors_insert_anon ON public.sponsorship_leads;
CREATE POLICY sponsors_insert_anon ON public.sponsorship_leads FOR INSERT WITH CHECK (
  assigned_to IS NULL AND value_estimate IS NULL
  AND length(btrim(company_name)) BETWEEN 1 AND 200 AND length(btrim(contact_name)) BETWEEN 1 AND 200
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 255
  AND coalesce(length(message),0) <= 5000);

DROP POLICY IF EXISTS newsletter_subs_insert_anon ON public.newsletter_subscribers;
CREATE POLICY newsletter_subs_insert_anon ON public.newsletter_subscribers FOR INSERT WITH CHECK (
  email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 255
  AND unsubscribed_at IS NULL AND coalesce(is_active, true) = true AND coalesce(length(source),0) <= 50);

DROP POLICY IF EXISTS contact_anyone_submit ON public.contact_submissions;
CREATE POLICY contact_anyone_submit ON public.contact_submissions FOR INSERT TO anon, authenticated WITH CHECK (
  handled = false AND length(btrim(name)) BETWEEN 1 AND 200
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 255
  AND length(btrim(subject)) BETWEEN 1 AND 300 AND length(btrim(message)) BETWEEN 1 AND 5000);