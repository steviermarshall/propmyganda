-- ============================================================================
-- MIGRATION 016 — Sanity constraints on public intake tables
--
-- The public forms (bookings, newsletter) accept anonymous inserts with
-- WITH CHECK (true) and no length/format limits, so a script could insert
-- huge or junk rows. These constraints cap field lengths and enforce a
-- basic email shape.
--
-- Added NOT VALID so existing rows are NOT scanned (safe to run without
-- inspecting production data). New/updated rows are enforced immediately.
-- Once you've confirmed existing rows comply you may VALIDATE them (see
-- bottom) to also cover historical data.
-- ============================================================================

-- ---- bookings -------------------------------------------------------------
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_name_len  CHECK (char_length(name)  <= 200) NOT VALID;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_email_len CHECK (char_length(email) <= 320) NOT VALID;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_email_fmt CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') NOT VALID;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_phone_len CHECK (phone IS NULL OR char_length(phone) <= 40)   NOT VALID;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_notes_len CHECK (notes IS NULL OR char_length(notes) <= 5000) NOT VALID;

-- ---- newsletter_subscribers ----------------------------------------------
ALTER TABLE public.newsletter_subscribers
  ADD CONSTRAINT newsletter_email_len CHECK (char_length(email) <= 320) NOT VALID;
ALTER TABLE public.newsletter_subscribers
  ADD CONSTRAINT newsletter_email_fmt CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') NOT VALID;

-- ---- OPTIONAL: validate against existing rows -----------------------------
-- Run these once you've confirmed no historical row violates the checks:
--   ALTER TABLE public.bookings               VALIDATE CONSTRAINT bookings_email_fmt;
--   ALTER TABLE public.newsletter_subscribers VALIDATE CONSTRAINT newsletter_email_fmt;
--   (repeat for each constraint above)
--
-- NOTE: length/format limits do NOT stop volumetric abuse (many valid-looking
-- rows). Rate limiting / captcha still needs to be added at the edge — see
-- NEEDS_YOUR_HELP.md (H6).
