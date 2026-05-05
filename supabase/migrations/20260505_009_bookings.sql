CREATE TABLE public.bookings (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  service       text        NOT NULL CHECK (service IN ('security','dj','venue','promoter')),
  -- common
  name          text        NOT NULL,
  email         text        NOT NULL,
  phone         text,
  event_date    text,
  location      text,
  notes         text,
  -- dj
  set_length    text,
  genre         text,
  equipment     text,
  -- security
  staff_count   text,
  -- venue
  capacity      text,
  event_type    text,
  amenities     text,
  -- promoter
  budget_range  text,
  marketing_goals text,
  -- shared optional
  indoor_outdoor  text,
  expected_attendance text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_insert_anon" ON public.bookings
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "bookings_read_admin" ON public.bookings
  FOR SELECT USING (public.my_role() = 'admin');
