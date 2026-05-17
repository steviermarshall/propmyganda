## Goal

Massively level up Jay, Mike, and Steven's CRM workstations so each becomes a true ops cockpit — Jay for content production + scheduling with Google Calendar two-way sync and editor assignments; Mike for full DSP/distro intake + streaming metrics; Steven for deep sponsor/brand/deal/contact/activation tracking.

---

## 1. Jay — Content Production + Calendar + Editors

### Schema additions
- New role on `team_members`: `editor` (alongside `admin`, `mike`, `steven`, `jay`).
- Extend `deliverables`:
  - `assigned_to uuid` → team_members.id (editor)
  - `objective text`, `notes text`, `expected_runtime_seconds int`
  - `due_at timestamptz`, `priority text` (low/med/high)
  - `revision_count int default 0`, `last_review_notes text`
- New table `editor_assignments` (optional log) for activity history per editor; or rely on existing `activity_log`.
- New table `calendar_sync`:
  - `entity_type` (shoot | deliverable), `entity_id`
  - `google_event_id`, `google_calendar_id`, `last_synced_at`, `sync_direction`

### Google Calendar two-way sync
- Connect **Google Calendar** connector via `standard_connectors--connect` (scoped to Jay/admin).
- Edge functions:
  - `gcal-push` — on shoot/deliverable create/update, push to Google.
  - `gcal-pull` — cron (pg_cron) every 5 min, pulls changes via Google's `events.list?updatedMin=` and reconciles into PMG tables.
  - `gcal-webhook` (optional Phase 2) — Google push notifications channel for instant sync.
- Per-user OAuth note: shared "PMG Production" Google Calendar (single connector account), not per-editor. Editors see assignments in PMG; calendar is the single source.

### Jay Dashboard UI (rewrite `src/pages/admin/JayDashboard.tsx`)
- Tabs: **Calendar | Shoots | Deliverables | Editor Workload | Upload Queue**
- Calendar tab: month/week toggle, drag to reschedule (writes back to Google), color-coded by editor.
- Deliverable card expanded: assignee avatar, objective, expected length, due countdown, notes textarea, status, revision count.
- "Assign Editor" modal with editor list, objective, expected length, due date, priority, notes.
- Editor Workload section: per-editor list of open deliverables + load count.

### Editor experience
- New route `/admin/editor` (dashboard for `role='editor'`): only sees `deliverables WHERE assigned_to = self`. Can update status, add review notes, mark complete.
- RLS: editors can `SELECT/UPDATE` only their own deliverable rows.

---

## 2. Mike — Full DSP / Distro Intake

### Schema additions
- Extend `distro_artists` with all intake fields (or new `distro_intake_submissions` table linked to `distro_artists`):
  - `dsp_title_approved bool`, `dsp_title_custom text`
  - `pro_affiliation text` (BMI | ASCAP | SESAC | other), `pro_other text`, `ipi_number text`
  - `distro_email text`, `agreements_email text`, `description text`
- New table `distro_artist_members`:
  - `distro_artist_id`, `role` (artist | producer), `first_name`, `last_name`, `stage_name`, `pro_affiliation`, `pro_other`, `ipi_number`, `distro_email`, `agreements_email`, `is_primary bool`
- New table `streaming_metrics`:
  - `distro_artist_id`, `platform` (spotify | apple | youtube | chartmetric), `url`, `monthly_listeners`, `followers`, `last_fetched`

### Mike Quick Add — multi-step wizard
- Replace the simple booking modal in `QuickAddButton` (when `entity === 'distro'`) with a stepper:
  1. **Title approval** — radio Yes/Other + custom text
  2. **Primary artist** — first/last/stage, PRO + other, IPI, distro email, agreements email
  3. **Additional artists** — repeatable rows
  4. **Producers** — repeatable rows with same fields
  5. **Streaming links** — Spotify URL, Apple URL, Chartmetric URL, YouTube channel
  6. **Review & submit** — creates `distro_artists` + `distro_artist_members[]` + `streaming_metrics[]` in a transaction (edge function `create-distro-intake`).

### Mike Dashboard additions
- New "Streaming" section per artist row: clickable Spotify/Chartmetric chips, monthly listener trend (manual entry for v1; auto-fetch via Chartmetric API in Phase 2).
- "Manage Artist" detail modal showing all members, IPIs, emails, links — fully editable.

---

## 3. Steven — Sponsor / Brand / Deal CRM

### Schema (new tables, replacing thin `sponsor_pipeline` with proper relational model)
- `sponsor_brands` — company record: name, parent_company, industry, logo_url, brand_colors jsonb, brand_guidelines_url, hq_location, regions text[], annual_budget_estimate, fiscal_year_end_month, target_demo jsonb, previous_sponsorships text[], activation_style text[], status, tier, source, owner_id.
- `sponsor_contacts` — humans: brand_id, name, title, department, email, phone, linkedin_url, decision_power (gatekeeper|influencer|signer), reports_to_contact_id, last_touch_at, next_touch_at, touch_cadence_days, comms_preference, personal_notes, birthday.
- `sponsor_properties` — what we sell: name, type (artist|tour|event|series|drop), audience_size, demo_breakdown jsonb, geo_split jsonb, engagement_metrics jsonb, inventory jsonb (assets array w/ rates), blackout_dates daterange[], exclusivity_restrictions text.
- `sponsor_deals` — brand_id, contact_id, property_id, stage (intro→pitch_sent→deck_reviewed→term_sheet→contract→signed→activated→wrapped), value_cents, payment_terms, payment_schedule jsonb, exclusivity_terms, start_date, end_date, renewal_window, renewal_probability, owner_id, next_action, next_action_due.
- `sponsor_deliverables` — deal_id, description, due_date, completed_at, proof_urls text[], recap_status.
- `sponsor_activities` — deal_id/contact_id, type (email|call|meeting|proposal), summary, occurred_at, created_by.
- Migrate existing `sponsor_pipeline` rows into `sponsor_brands` (idempotent script).

### Steven Dashboard rewrite
- Tabs: **Pipeline (kanban by stage) | Brands | Contacts | Properties | Deals | Activations | Activity Feed**
- Brand detail page: company card + contacts list + properties pitched + deals + activity timeline.
- Deal detail: stage progress bar, deliverables checklist, payment schedule, activity log, "Log activity" quick action.
- "Touch reminders" widget on overview: contacts with `next_touch_at <= today`.
- Filters: tier, stage, owner, fiscal year, activation style.

### Steven Quick Add expansion
- Choose: New Brand | New Contact | New Deal | Log Activity. Each opens a dedicated form (multi-step where needed).

---

## 4. RLS & Roles
- Add `editor` to `crm_role` enum. Update `has_crm_role()` to accept it.
- Policies:
  - Editors: read/write own `deliverables` only.
  - Jay (+ admin): full deliverable + shoot + calendar_sync access.
  - Mike (+ admin): full distro_* + streaming_metrics.
  - Steven (+ admin): full sponsor_* tables.
  - Admin: all of the above.

---

## 5. Tech tasks / order of implementation

```text
Phase 1  Schema + RLS migrations (Jay, Mike, Steven tables in parallel)
Phase 2  Jay UI rewrite + editor role + /admin/editor dashboard
Phase 3  Mike multi-step intake wizard + streaming chips
Phase 4  Steven full CRM (brands → contacts → properties → deals → activations)
Phase 5  Google Calendar connector + gcal-push edge function
Phase 6  gcal-pull cron + reconciliation
Phase 7  Polish: filters, activity feeds, touch reminders, Chartmetric fetch
```

Each phase is independently shippable.

---

## Open items I'll handle as I build
- Editor invite flow (you create a `team_members` row with `role='editor'` + email; they sign in with Google / magic link, auto-link via existing `fetchMember` logic).
- Google Calendar: uses the workspace's single connected Google account as the "PMG Production" calendar. If you later want each editor's personal calendar synced, that needs per-user OAuth (separate plan).
- Chartmetric API requires a paid key — Phase 1 will be manual URL entry + monthly_listener number; auto-pull deferred.

This is a large build. I'll start with Phase 1 (migrations) and Phase 2 (Jay) once you approve.