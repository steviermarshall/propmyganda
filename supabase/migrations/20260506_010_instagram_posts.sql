CREATE TABLE public.instagram_posts (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  instagram_url text        NOT NULL UNIQUE,
  label         text,                        -- optional human label e.g. "Summer Jam 2025"
  display_order integer     DEFAULT 0,
  active        boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ig_posts_public_read" ON public.instagram_posts
  FOR SELECT USING (active = true);

CREATE POLICY "ig_posts_admin_write" ON public.instagram_posts
  FOR ALL USING (public.my_role() = 'admin');
