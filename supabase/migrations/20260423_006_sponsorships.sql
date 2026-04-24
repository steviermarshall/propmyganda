CREATE TABLE public.sponsorship_leads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name   TEXT NOT NULL,
  contact_name   TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  website        TEXT,
  budget_range   TEXT,
  campaign_type  TEXT,
  message        TEXT,
  stage          TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new','contacted','proposal','negotiating','closed_won','closed_lost')),
  assigned_to    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  value_estimate NUMERIC(12,2),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sponsorship_leads ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER sponsorship_leads_updated_at
  BEFORE UPDATE ON public.sponsorship_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX sponsorship_stage_idx ON public.sponsorship_leads (stage);
