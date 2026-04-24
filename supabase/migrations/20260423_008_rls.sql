-- Helper: get the calling user's role
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ── profiles ──────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.my_role() = 'admin');

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.my_role() = 'admin');

-- ── role_permissions ──────────────────────────────────────────────────────────
CREATE POLICY "rp_admin_all" ON public.role_permissions
  FOR ALL USING (public.my_role() = 'admin');

CREATE POLICY "rp_auth_read" ON public.role_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── artists ───────────────────────────────────────────────────────────────────
CREATE POLICY "artists_public_read" ON public.artists
  FOR SELECT USING (active = TRUE);

CREATE POLICY "artists_auth_read_all" ON public.artists
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "artists_write" ON public.artists
  FOR ALL USING (public.my_role() IN ('admin', 'distribution'));

-- ── releases ──────────────────────────────────────────────────────────────────
CREATE POLICY "releases_public_read" ON public.releases
  FOR SELECT USING (TRUE);

CREATE POLICY "releases_write" ON public.releases
  FOR ALL USING (public.my_role() IN ('admin', 'distribution'));

-- ── social_metrics ────────────────────────────────────────────────────────────
CREATE POLICY "metrics_auth_read" ON public.social_metrics
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "metrics_write" ON public.social_metrics
  FOR ALL USING (public.my_role() IN ('admin', 'marketing'));

-- ── events ────────────────────────────────────────────────────────────────────
CREATE POLICY "events_public_read" ON public.events
  FOR SELECT USING (status != 'cancelled' OR public.my_role() = 'admin');

CREATE POLICY "events_write" ON public.events
  FOR ALL USING (public.my_role() IN ('admin', 'marketing'));

-- ── publications ──────────────────────────────────────────────────────────────
CREATE POLICY "publications_public_read" ON public.publications
  FOR SELECT USING (published_at IS NOT NULL AND published_at <= NOW());

CREATE POLICY "publications_auth_read_all" ON public.publications
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "publications_write" ON public.publications
  FOR ALL USING (public.my_role() IN ('admin', 'marketing'));

-- ── distribution_applications ────────────────────────────────────────────────
-- Anyone can submit (INSERT), only staff can read
CREATE POLICY "dist_apps_insert_anon" ON public.distribution_applications
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "dist_apps_read_staff" ON public.distribution_applications
  FOR SELECT USING (public.my_role() IN ('admin', 'distribution'));

CREATE POLICY "dist_apps_update_staff" ON public.distribution_applications
  FOR UPDATE USING (public.my_role() IN ('admin', 'distribution'));

-- ── sponsorship_leads ─────────────────────────────────────────────────────────
CREATE POLICY "sponsors_insert_anon" ON public.sponsorship_leads
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "sponsors_read_staff" ON public.sponsorship_leads
  FOR SELECT USING (public.my_role() IN ('admin', 'sponsorships'));

CREATE POLICY "sponsors_update_staff" ON public.sponsorship_leads
  FOR UPDATE USING (public.my_role() IN ('admin', 'sponsorships'));

-- ── social_tokens ─────────────────────────────────────────────────────────────
CREATE POLICY "tokens_admin_only" ON public.social_tokens
  FOR ALL USING (public.my_role() = 'admin');

-- ── cron_logs ─────────────────────────────────────────────────────────────────
CREATE POLICY "cron_logs_admin_only" ON public.cron_logs
  FOR ALL USING (public.my_role() = 'admin');
