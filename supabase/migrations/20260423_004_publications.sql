CREATE TABLE public.publications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  excerpt      TEXT,
  body         TEXT,
  cover_url    TEXT,
  category     TEXT NOT NULL DEFAULT 'Culture' CHECK (category IN ('Business','Artists','Culture','Milestones','Industry')),
  author       TEXT,
  featured     BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER publications_updated_at
  BEFORE UPDATE ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX publications_published_idx ON public.publications (published_at DESC NULLS LAST);
CREATE INDEX publications_category_idx  ON public.publications (category);

-- Seed from static newsArticles in data.ts
INSERT INTO public.publications (title, slug, excerpt, category, featured, published_at) VALUES
  (
    'PMG Announces New Distribution Partnership',
    'pmg-distribution-partnership',
    'Expanding reach across all major digital platforms with a new strategic alliance.',
    'Business', TRUE, NOW() - INTERVAL '2 days'
  ),
  (
    'ElCamino Signs Exclusive Content Deal with PMG',
    'elcamino-content-deal',
    'A new chapter in independent hip-hop distribution.',
    'Artists', FALSE, NOW() - INTERVAL '5 days'
  ),
  (
    'Inside the PMG Studio: Brooklyn''s Independent Powerhouse',
    'inside-pmg-studio',
    'A look behind the scenes at the heart of independent music.',
    'Culture', FALSE, NOW() - INTERVAL '10 days'
  ),
  (
    'Max B Catalog Surpasses 100M Streams',
    'max-b-100m-streams',
    'The wave continues to grow across all platforms.',
    'Milestones', FALSE, NOW() - INTERVAL '14 days'
  );
