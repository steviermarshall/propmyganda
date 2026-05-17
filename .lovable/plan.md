## Why the error happens

`ERROR: 42703: column "client_id" does not exist` is not coming from anything in the Phase 6 script itself — there's no `client_id` anywhere in the repo. It's coming from an **existing RLS policy or trigger on `public.bookings`** (left over from an earlier experiment) that references a `client_id` column the table no longer has. As soon as Postgres re-evaluates that policy during the migration, it fails.

The fix is to **drop every existing policy on `public.bookings` first**, then recreate the ones we actually want. The script below is fully idempotent — safe to run repeatedly.

## File to replace

`supabase/crm_phase6_bookings.sql` — overwrite with the SQL below, then paste it into **Cloud → Database → SQL Editor** and run.

```sql
-- ============================================================================
-- PHASE 6 — Bookings expansion for CRM-wide scheduling  (defensive rewrite)
-- Safe to run multiple times. Drops stale policies that reference removed
-- columns (e.g. client_id) before recreating the team-wide policies.
-- ============================================================================

-- 1. Nuke ALL existing policies on public.bookings so leftover ones referencing
--    columns like client_id can't block the migration.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', pol.policyname);
  END LOOP;
END $$;

-- 2. Drop any stale triggers that might reference client_id
DO $$
DECLARE
  trg record;
BEGIN
  FOR trg IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'public.bookings'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.bookings', trg.tgname);
  END LOOP;
END $$;

-- 3. Broaden the service whitelist + add CRM-only services
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_service_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_service_check
  CHECK (service IN (
    'security','dj','venue','promoter',
    'event_recap','artist','bartender',
    'jv','distro'
  ));

-- 4. Add new columns used by JV / Distro / free-artist bookings + shared calendar
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_free          BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  -- JV
  ADD COLUMN IF NOT EXISTS partner_name     TEXT,
  ADD COLUMN IF NOT EXISTS deal_type        TEXT,
  ADD COLUMN IF NOT EXISTS revenue_split    TEXT,
  -- Distro
  ADD COLUMN IF NOT EXISTS artist_name      TEXT,
  ADD COLUMN IF NOT EXISTS release_title    TEXT,
  ADD COLUMN IF NOT EXISTS release_date     TEXT,
  ADD COLUMN IF NOT EXISTS platforms        TEXT,
  ADD COLUMN IF NOT EXISTS marketing_budget TEXT,
  -- Shared scheduling
  ADD COLUMN IF NOT EXISTS event_at         TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS bookings_event_at_idx ON public.bookings (event_at);
CREATE INDEX IF NOT EXISTS bookings_service_idx  ON public.bookings (service);

-- 5. Make sure RLS is on
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 6. Fallback has_crm_role(text) — only created if missing, so we never
--    fail on environments where it isn't deployed yet.
CREATE OR REPLACE FUNCTION public.has_crm_role(_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.auth_user_id = auth.uid()
      AND tm.role::text = _role
  );
$$;

-- 7. Team-wide policies (recreated cleanly)
CREATE POLICY "bookings_read_team" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    public.has_crm_role('admin')
    OR public.has_crm_role('mike')
    OR public.has_crm_role('steven')
    OR public.has_crm_role('jay')
    OR public.has_crm_role('editor')
  );

CREATE POLICY "bookings_insert_team" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_crm_role('admin')
    OR public.has_crm_role('mike')
    OR public.has_crm_role('steven')
    OR public.has_crm_role('jay')
    OR public.has_crm_role('editor')
  );

CREATE POLICY "bookings_update_team" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_crm_role('admin') OR public.has_crm_role('mike'));

-- 8. Public form still needs to insert booking inquiries from the website
CREATE POLICY "bookings_insert_public" ON public.bookings
  FOR INSERT TO anon
  WITH CHECK (true);
```

## After running

1. Paste the script above into the Supabase SQL Editor and run.
2. Reload the CRM — JV / Distro / free-artist bookings and the shared calendar should now read and write without the `client_id` error.

If after this you still hit a `client_id` error, it'll be coming from a different table — send me the new error and I'll patch that one the same way.