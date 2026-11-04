alter table public.onboarding_orders

  add column if not exists agreement_version text,

  add column if not exists agreement_hash text,

  add column if not exists signed_at timestamptz,

  add column if not exists signed_ip text,

  add column if not exists splits jsonb,

  add column if not exists dsp_title text,

  add column if not exists self_produced boolean not null default false;