# Phase 5 — Google Calendar Two-Way Sync (Jay)

Connect a shared "PMG Production" Google Calendar so Jay's shoots and deliverables stay in sync between the CRM and Google.

## Scope

- One shared Google Calendar account (workspace-level connector), not per-editor.
- Two-way sync for `shoots` and `deliverables` (those with `due_at`).
- Color-coding per editor via Google event `colorId`.
- Manual "Sync now" button + automatic background pull.

## Architecture

```text
PMG CRM  ──push──▶  Edge Fn: gcal-push  ──▶  Google Calendar API
                          │
                          ▼
                   calendar_sync table
                   (entity ↔ google_event_id)
                          ▲
                          │
PMG CRM  ◀──pull──  Edge Fn: gcal-pull  ◀──  Google events.list(updatedMin)
                   (cron every 5 min via pg_cron)
```

## Steps

1. **Connect Google Calendar** via `standard_connectors--connect` (`google_calendar`). Calendar = workspace owner's "PMG Production" calendar (the user selects/creates it; we store the calendar ID in a `crm_settings` row).

2. **Schema** (`calendar_sync` already drafted in Phase 1 plan — confirm it's in `crm_expansion_schema.sql`, add if missing):
   - `id`, `entity_type` ('shoot'|'deliverable'), `entity_id uuid`, `google_event_id text`, `google_calendar_id text`, `etag text`, `last_synced_at timestamptz`, `sync_direction text`, unique(entity_type, entity_id).
   - New `crm_settings` key/value table for `gcal_calendar_id`, `gcal_last_pull_at`.

3. **Edge function `gcal-push`** (`supabase/functions/gcal-push/index.ts`):
   - Input: `{ entity_type, entity_id }`.
   - Loads the entity, builds event payload (summary, description w/ objective + notes, start/end, `colorId` derived from `assigned_to`).
   - If `calendar_sync` row exists → `PATCH /events/{id}`; else → `POST /events` and insert sync row.
   - Uses gateway: `https://connector-gateway.lovable.dev/google_calendar/calendar/v3/calendars/{calId}/events`.

4. **Edge function `gcal-pull`** (`supabase/functions/gcal-pull/index.ts`):
   - Reads `gcal_last_pull_at` from `crm_settings`.
   - `GET events?updatedMin=...&showDeleted=true&singleEvents=true`.
   - For each event: match by `google_event_id` in `calendar_sync`; update the linked shoot/deliverable (start time, title, deletion). Skip events not originating from PMG (no sync row + no `extendedProperties.private.pmg_source`).
   - Update `gcal_last_pull_at`.

5. **Triggers / invocation**:
   - DB trigger on `shoots` and `deliverables` AFTER INSERT/UPDATE → calls `gcal-push` via `pg_net` (or simpler: client-side invoke in Jay dashboard on save).
   - Start with **client-side invoke** in Jay's "Assign Editor" + reschedule flows for v1 — simpler, no pg_net plumbing.
   - `gcal-pull` invoked via `pg_cron` every 5 min (`SELECT cron.schedule('gcal-pull', '*/5 * * * *', $$ select net.http_post(...) $$)`).

6. **Jay Dashboard UI** (`src/pages/admin/JayDashboard.tsx`):
   - Header: "Google Calendar: Connected ✓ — last sync 2m ago" + **Sync now** button (invokes `gcal-pull`).
   - When connector not linked, show a Connect CTA that triggers the connector flow (admin-only).
   - On shoot/deliverable save → call `supabase.functions.invoke('gcal-push', { body: { entity_type, entity_id } })` then refresh.
   - Calendar tab: badge each event with editor color matching Google's `colorId`.

7. **Failure handling**:
   - Push failures stored in `calendar_sync.last_error`; surface as a small warning chip on the row.
   - Pull is idempotent (matches by `google_event_id`).

## Out of scope for this phase
- Per-editor personal calendars (needs per-user OAuth).
- Push channels / webhooks for instant sync (cron is good enough for v1).
- Chartmetric auto-fetch (Phase 7).

## Deliverables
- Connector linked + `crm_settings` row with calendar ID
- Migration: `calendar_sync` (if not present) + `crm_settings`
- Edge functions: `gcal-push`, `gcal-pull`
- pg_cron schedule for `gcal-pull`
- Jay dashboard: sync status header, Sync now button, push-on-save wiring

Reply **go** to start, or tell me what to change (e.g. skip cron, use server-side trigger instead of client invoke, sync deliverables-only).
