-- Fix broken top-left Instagram post on the events page.
-- Updates any row whose URL contains the old/broken value for DDFwiTKSdWm,
-- or inserts it fresh if it doesn't exist yet.

INSERT INTO public.instagram_posts (instagram_url, label, display_order, active)
VALUES ('https://www.instagram.com/p/DDFwiTKSdWm/', NULL, 0, true)
ON CONFLICT (instagram_url) DO UPDATE
  SET active = true,
      display_order = 0;
