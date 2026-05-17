# Calendar + Booking Expansion Plan

## 1. Fix the Google Calendar edge function error

When the "Sync now" button is clicked on Jay's dashboard, `gcal-pull` is invoked but throws (likely "GOOGLE_CALENDAR_API_KEY is not configured" or similar) because the edge function hasn't been re-deployed since the connection was linked.

**Actions**
- Re-deploy `gcal-pull` and `gcal-push` so they pick up the new `GOOGLE_CALENDAR_API_KEY` + `LOVABLE_API_KEY` env vars.
- Add a friendlier error path in `src/lib/crm/gcal.ts` — surface the real edge function message in the toast instead of just "Sync failed".
- Verify the connection with the gateway `verify_credentials` endpoint as part of the sync click, so we can tell the user "reconnect Google Calendar" vs "transient error".

## 2. Shared full calendar on every dashboard

Today only Jay sees the calendar context (via the gcal sync bar + deliverables board). We will create one reusable component used by Stevie, Mike, Steven, Jay and Editors.

**New component:** `src/components/crm/SharedCalendar.tsx`
- Month + week view (lightweight — `react-day-picker` for month grid we already have, plus a week-strip), color-coded by source:
  - Shoots (Jay)
  - Deliverable due dates (Jay)
  - Bookings — DJ / Security / Venue / Promoter / Recap / Artist / Bartender (Mike)
  - JV / Distro opportunities (Mike) — new type, see §3
  - Sponsor activations (Steven)
- Click an event → side panel with details + "Open in Google Calendar" link (uses the `event_html_link` we already store in `calendar_sync`).
- "Add to my calendar" button on every event (writes through `gcal-push`).
- Sync-now button + last-pulled timestamp moved into this component so every dashboard gets it.

**Wire-in**
- Add `<SharedCalendar />` tab/section to: `StevieDashboard`, `MikeDashboard`, `StevenDashboard`, `JayDashboard`, `EditorDashboard`.
- Each dashboard passes an `accent` color + optional `defaultFilter` (e.g. Mike defaults to bookings, Jay to shoots).

## 3. Mike — add JV & Distro opportunities like a booking

Today `BookingSheet` covers DJ/Security/Venue/Promoter/Recap/Artist/Bartender. We extend it so Mike (and the team) can also schedule:
- **JV Opportunity** (joint-venture event) — fields: partner name, deal type, revenue split, event date, location, deliverables, notes.
- **Distro Opportunity** — fields: artist, release title, release date, platforms, marketing budget, notes. (Mirrors the existing `DistroIntakeWizard` but lighter, calendar-first.)

**Schema (migration)**
- Extend `bookings.service` enum / check constraint to include `jv` and `distro`.
- Add nullable columns: `partner_name`, `deal_type`, `revenue_split`, `release_title`, `release_date`, `platforms`, `marketing_budget`.

**UI**
- Add two new tabs ("JV", "Distro") to `BookingSheet` with the field components above.
- Add a "+ New" button on Mike's dashboard that opens `BookingSheet` pre-set to JV or Distro.
- After insert, automatically `pushToGcal("booking", id)` so it shows up on the shared calendar.

## 4. Free Artist Bookings — available to everyone

The Artist tab already exists in `BookingSheet` but is tucked inside the public site. We will expose it inside the CRM for every team role.

**Actions**
- Add a global "+ Book Artist (free)" quick-add button to `CrmLayout` (next to the existing QuickAddButton) — opens `BookingSheet` with `initialService="artist"` and a `free=true` flag.
- Add `is_free BOOLEAN DEFAULT false` to `bookings`; default `true` for the in-CRM artist quick-add.
- RLS: any authenticated team member can insert bookings (already true), so no policy change needed beyond the new column.

## 5. Verification

- Manual: open each dashboard, confirm the shared calendar renders with mixed event types.
- Click "Sync now" → confirm success toast with counts (or actionable error).
- Mike: create a JV and a Distro booking → confirm both appear on the calendar and in Google Calendar.
- Any user: click "+ Book Artist (free)" → submit → confirm row in `bookings` with `service='artist'`, `is_free=true`, and a calendar event created.

## Technical notes

- Files created: `src/components/crm/SharedCalendar.tsx`, `src/components/crm/CalendarEventDetail.tsx`, migration file for `bookings` extensions.
- Files edited: `src/components/BookingSheet.tsx` (new tabs + free flag), `src/lib/crm/gcal.ts` (better errors), `src/pages/admin/{Stevie,Mike,Steven,Jay,Editor}Dashboard.tsx` (mount calendar), `src/components/crm/CrmLayout.tsx` (free-artist quick-add).
- Edge functions to re-deploy: `gcal-pull`, `gcal-push`.
- No breaking changes to existing data.
