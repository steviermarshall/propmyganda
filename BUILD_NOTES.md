# PMG CRM — Build Notes

This file documents schema decisions for Lovable and for Marshall's review.
Last updated: 2026-05-16

---

## Schema decisions

### `bookings` naming conflict
The existing `bookings` table handles **public-facing service bookings** (DJ, security, venue, etc.)
submitted via the website booking form. It predates the CRM.

The CRM shoot pipeline is stored in **`crm_bookings`** to avoid a naming collision.
When building Mike's booking kanban, reference `crm_bookings`, not `bookings`.

The two tables can be linked in the future: a public `bookings` row can auto-create
a `crm_bookings` row via a Supabase Database Webhook or Edge Function trigger.

### `team_members` vs `profiles`
The existing `profiles` table uses roles `admin / distribution / marketing / sponsorships`
for the public site auth system.

The new `team_members` table uses CRM roles `admin / mike / steven / jay` and links
directly to `auth.users` via `auth_user_id`. Both tables coexist.

When a team member signs up, an admin must manually set their `auth_user_id` in
`team_members` to activate their CRM access. The seed rows have `auth_user_id = NULL`
until that step is done.

### `distro_artists` vs `distribution_applications`
- `distribution_applications` = public intake form (artists applying to PMG)
- `distro_artists` = live roster (artists who have been approved and onboarded)

Mike reviews `distribution_applications`, then creates a `distro_artists` row when
he moves someone to the live roster.

### `media_agency_projects` created before `shoots`
The `shoots` table has a FK to `media_agency_projects`, so `media_agency_projects`
must be created first in the migration. The SQL file reflects this order.

### RLS design
- `admin` role bypasses all RLS and can read/write every table
- Each team member only sees rows relevant to their function
- Jay gets read-only access to `crm_bookings` and `media_agency_projects` for scheduling
- Mike gets read-only access to `shoots` to track production status on his bookings
- Public newsletter signup is allowed without auth (`INSERT WITH CHECK (true)`)

### KPI targets
Stored in `kpi_targets` table so they can be updated without a code deploy.
Weekly targets seeded:
- Mike: 3 bookings, 10 outreaches, 2 distro onboards, 1 article
- Steven: 10 sponsor pitches (4 brand / 3 event / 3 pub), 1 discovery call
- Jay: 5 shoots, 20 deliverables, <72hr SLA, 5 BTS clips
- Admin/Marshall: 2 Media Agency closes/week, $50K MRR target

---

## Cron jobs to build (Phase 2 — after Lovable ships UI)

| Job | Schedule | Description |
|-----|----------|-------------|
| `weekly-kpi-snapshot` | Fridays 8am ET | Roll up each person's metrics → `weekly_kpi_snapshots` |
| `stale-entry-watcher` | Daily 7am ET | 7+ days no activity in discovery_call/proposal → flag red; 14+ days → auto Dead |
| `followup-digest` | Daily 8am ET | Build today's follow-up list per user from `next_followup_date` |
| `deal-close-telegram` | DB trigger on status write | Post to Telegram when status = 'closed' or 'paid' |
| `monthly-royalty-report` | 1st of month 9am ET | Aggregate streams → royalty_payments, email Marshall |
| `friday-master-report` | Fridays 8am ET | PDF of all KPIs + MRR → email team + Telegram |
| `sponsor-monday-digest` | Mondays 8am ET | Steven's weekly sponsor follow-up list |

All cron jobs will be Supabase Edge Functions scheduled via pg_cron or
Supabase's built-in cron scheduler.

---

## Artist outreach automation (Phase 2)

Auto-set `next_followup_date` rules:
- Status changes to `pitched` → D+3
- Status changes to `replied` → D+2
- Status changes to `discovery_call` → D+7
- No activity for 14 days in any non-terminal status → auto-move to `dead`

These should be enforced via Supabase Database Functions triggered on UPDATE.

---

## Inbound routing rules

When a public form is submitted, auto-assign:
- Booking inquiry → `crm_bookings`, `assigned_to` = Mike's `team_members.id`
- Media Agency inquiry → `media_agency_projects`, `sold_by` = Marshall's id
- Sponsor inquiry → `sponsor_pipeline`, `assigned_to` = Steven's id
- Distribution application → existing `distribution_applications` table (Mike reviews)

---

## Telegram alert format

When a deal closes, post to group:

```
🎯 [BOOKING CLOSED] Artist X — $1,000 — Mike
🤝 [SPONSOR CLOSED] Brand Y — $5,000 — Steven  
🎬 [MEDIA AGENCY CLOSED] Artist Z — $650 — Marshall
🎵 [DISTRO SIGNED] Artist W — JV 45% — Mike
```

Telegram bot token + chat ID stored in Supabase Vault secrets, never in code.

---

## Funding application wizard (1West-style flow)

Migration `20260720_014_funding_applications.sql`. A multi-step funding
application at `/apply` — 5 steps, progress bar, one question per screen,
account gate at the end. Replicates the 1West *flow and UX pattern*, not their
branding or copy.

### Core principle: progressive save from Q1
Every answer is written to `funding_applications` the moment it's given. A
merchant who bails on step 3 is still a lead with a name, phone, and funding
amount to nurture. Answers are also mirrored to `localStorage` so a refresh
resumes the UX without needing anonymous read access to the row.

### Two tables
- **`funding_applications`** — one row per applicant. Nullable answer columns
  (funding_amount, business_name, monthly_revenue, contact_name, …) plus funnel
  state (`current_step`, `completed_questions`, `status`) and first-touch
  attribution (utm_source/medium/campaign, referrer, landing_path).
- **`funding_events`** — append-only analytics stream (page_view,
  question_view, question_answered, step_complete, account_created, submitted).
  This is what powers the funnel report per traffic source.

### RLS design (doubles as the customer portal)
- Anonymous applicants may **INSERT** and **UPDATE** their own row only while it
  is *unclaimed* (`claimed_by IS NULL`). The client holds the row id.
- At the account gate the applicant creates a passwordless account (email OTP).
  `claim_funding_application(app_id)` — a `SECURITY DEFINER` function, the one
  privileged `NULL → auth.uid()` transition — attaches the row to their user.
- Once claimed, only the owner (`claimed_by = auth.uid()`) or an `admin` can
  read/update it. Each merchant sees only their own deal.
- `funding_events`: anyone may append; only `admin` may read.

### Frontend
- `src/lib/funding/steps.ts` — question config (one question per screen).
- `src/lib/funding/analytics.ts` — session id + first-touch UTM capture + event
  fire (fire-and-forget; never blocks or throws into the UI).
- `src/hooks/use-funding-application.ts` — progressive-save controller.
- `src/pages/Apply.tsx` + `src/components/funding/*` — the wizard UI.

### Not yet wired (next steps)
- Apply the migration to the Supabase project (`trwnqtgywfsalvismioi`).
- Document upload step after submission (drag-and-drop → Railway processor).
- Twilio SMS delivery + reply webhooks into the same events table.
- The funnel report view over `funding_events` for the admin dashboard.
