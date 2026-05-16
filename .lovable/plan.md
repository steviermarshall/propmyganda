# PMG Team CRM — Interactive Dashboard Build Plan

Scope: replace the four existing dashboard shells (`/admin/stevie`, `/admin/mike`, `/admin/steven`, `/admin/jay`) with fully wired, data-driven UIs on top of the existing Supabase schema. Add shared infra (command palette, floating quick-add, activity log writes, stale warnings, optimistic updates).

Will NOT touch: `use-crm-auth.ts`, `pages/dashboard/index.tsx`, migrations, `BUILD_NOTES.md`.

---

## Phase 0 — Shared foundation (build first, all dashboards depend on it)

**Design tokens** (`src/index.css`, `tailwind.config.ts`)
- Add CSS vars: `--bg #0a0a0a`, `--surface #1a1a1a`, `--border white/10`
- Member color tokens: `--c-mike #00F0FF`, `--c-steven #d97000`, `--c-jay #b366ff`, `--c-stevie #F5FF00`
- Bebas Neue for display/numbers, IBM Plex Mono for body — load via Google Fonts in `index.html`
- Tailwind utilities: `font-display`, `font-mono`, `text-c-mike`, etc.

**Shared lib** (`src/lib/crm/`)
- `dates.ts` — `startOfWeek()` (Mon), `today()`, `daysSince()`, `addDays()`
- `activity.ts` — `logActivity(entity_type, entity_id, action, payload)` writes to `activity_log` using current `team_members.id`
- `optimistic.ts` — small helper wrapping `useMutation`-style optimistic updates with rollback + sonner toast on error
- `kpi.ts` — query helpers for MRR lanes, weekly counts, fallbacks when `weekly_kpi_snapshots` missing

**Shared components** (`src/components/crm/`)
- `KpiCard.tsx` — huge Bebas number, label, target, color prop
- `KanbanBoard.tsx` — generic columns + `KanbanCard` with drag (dnd-kit), optimistic stage update, stale red border (>7 days in discovery_call/proposal)
- `DetailSheet.tsx` — slide-out (shadcn Sheet) with inline fields that auto-save on blur, "saved" flash
- `InlineSelect.tsx`, `InlineInput.tsx`, `InlineDate.tsx` — auto-save primitives
- `StatusDot.tsx` — green/yellow/red based on actual/target
- `QuickAddButton.tsx` — floating + bottom-right, opens entity-aware modal (context provider per page registers schema)
- `CommandPalette.tsx` — Cmd+K, shadcn Command, searches `artist_prospects`, `crm_bookings`, `sponsor_pipeline`, `shoots`; jump-to-dashboard; create-entity actions
- `StaleDot.tsx` — pulsing red dot + tooltip

**Layout** (`src/components/crm/CrmLayout.tsx`) — wraps each `/admin/*` page: top bar (logo + member-colored badge + sign out), mounts CommandPalette + QuickAddButton, accepts `quickAddSchema` and `searchScope` props.

**Deps to add**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@tanstack/react-query` (likely already present — confirm), `date-fns` (confirm). Use existing shadcn Sheet/Command/Dialog/Popover.

---

## Phase 1 — `/admin/stevie` (CEO)

`src/pages/admin/StevieDashboard.tsx`

1. **MRR section** — progress bar vs $50K, 4 lane cards. Single query per lane (sum aggregates, `gte` start-of-month). Combine in React Query.
2. **Team KPI grid** — read latest `weekly_kpi_snapshots` for current `week_ending`; if missing for a member, compute live from source tables. Row per member with status dot.
3. **Media Agency kanban** — `media_agency_projects` table, 6 columns. Drag → optimistic `status` update + activity log.
4. **UM JV signing queue** — `distro_artists` where `side=jv_owned` and `onboarding_status=docs_pending`. Approve button → `docs_signed`.
5. **Inbox** — three queries unioned in UI: articles where `status=stevie_review` (approve/reject), JV awaiting signing, bookings/projects with `updated_at < now-7d`.

---

## Phase 2 — `/admin/mike`

`src/pages/admin/MikeDashboard.tsx`

1. **5 KPI cards** (cyan) — week-scoped counts/sums per spec. Use `activity_log` for "outreach sent this week".
2. **Today** — prospects + sponsor rows assigned to Mike with `next_followup_date = today`. One-tap status update writes activity + auto-bumps follow-up date.
3. **Bookings kanban** — 7 columns. Card detail sheet with auto-save. New booking defaults: `package=550`, `status=inquiry`, `assigned_to=Mike`.
4. **Artist outreach table** — sortable by `fit_score desc`. Inline status select with auto follow-up date rules:
   - `pitched` → +3d, `replied` → +2d, `discovery_call` → +7d.
5. **Distro onboarding** — tabs JV / Pure, inline status, quick add.

Cmd+N triggers QuickAdd modal (booking by default on this page).

---

## Phase 3 — `/admin/steven`

`src/pages/admin/StevenDashboard.tsx`

1. **5 KPI cards** (orange) — weekly counts from `sponsor_pipeline` + `store_orders`.
2. **Follow-ups due today** — `sponsor_pipeline` assigned Steven, `next_followup_date=today`. Mark contacted → `last_contact_date=today`, `next_followup=today+3`.
3. **Sponsor pipeline** — 3 tabs (brand/event/publication), each a kanban with stage rules. Auto follow-up on drag: pitched+3, replied+2, discovery_call+7, proposal+5. Red border for `discovery_call|proposal` stale >7d.
4. **Store fulfillment** — "To Ship" list (sorted asc by `ordered_at`) + "Shipped Today" list. Mark-shipped modal collects `tracking_number` + `shipping_carrier`.

---

## Phase 4 — `/admin/jay`

`src/pages/admin/JayDashboard.tsx`

1. **4 KPI cards** (purple) — shoots, deliverables done, avg SLA (hours between `filmed_at` and `delivered_at`), BTS count (editable, persisted to `weekly_kpi_snapshots`).
2. **Shoot calendar** — 4 columns Wed–Sat for current week. Click shoot → DetailSheet with deliverables.
3. **Add shoot modal** — on create, insert 4 deliverable rows. Format set based on `shoot_type`:
   - PMG booking → 1 Mic Performance, Crazy Story, Show & Tell, Long-form YouTube
   - Media Agency → Music Video, Creative Content, Short-form, Interview
4. **Deliverable tracker** — current-week shoots expanded with their deliverables, inline status select.
5. **Upload queue** — `deliverables.status=reviewed`. Mark uploaded → modal collects per-platform URLs → write `upload_urls` JSONB + `status=uploaded`.

---

## Phase 5 — Polish & cross-cutting

- Wire `logActivity` into every mutation across phases 1–4 (status changes, creates, updates).
- Mobile: kanbans become horizontal swipe; status edits via bottom sheet (shadcn Drawer).
- Verify routes are mounted (App.tsx) and protected by `CrmProtectedRoute` with the right `allowedRoles`.
- Smoke test by reading each dashboard route in preview, fix runtime errors.

---

## Technical details

- **Data layer**: TanStack Query for fetch + invalidation. Each mutation does optimistic update via `queryClient.setQueryData` then `invalidateQueries` on settle.
- **Types**: use generated `Database["public"]["Tables"][...]` from existing `types.ts`. No schema changes.
- **Activity log payload**: `{ before, after, fields_changed }` for updates; full row for creates.
- **Realtime**: out of scope (not requested). Polling not needed — optimistic + invalidate on focus is sufficient.
- **Stale detection**: derived in selector (`daysSince(updated_at) > 7 && ['discovery_call','proposal'].includes(stage)`).
- **No backend changes**: no edge functions, no migrations, no cron, no email.

---

## Build order

Foundation → Stevie → Mike → Steven → Jay → cross-cutting polish.

This is large (~25–30 new files, ~3–4K LOC). I'll build phase-by-phase, verifying each compiles cleanly before moving on, and report progress between phases.