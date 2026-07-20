# PROPMYGANDA (PMG)

Public marketing site + internal CRM for an independent music, content, and
distribution company based in Brooklyn, NY.

- **Public site** — homepage, artists, distribution, store, events, publication,
  and a WebGL "Propworld" experience.
- **CRM** (`/admin/*`) — role-based dashboards for the team (bookings pipeline,
  artist outreach, distribution roster, sponsorships, shoot/deliverable
  production, KPIs) with a shared Google Calendar and an append-only audit log.

## Tech stack

| Area | Choice |
|------|--------|
| Build | Vite 5 + React 18 + TypeScript |
| UI | Tailwind CSS 3, shadcn/ui (Radix), framer-motion, three.js / react-three-fiber |
| Data | Supabase (Postgres + Auth + Edge Functions) |
| Server state | TanStack Query v5 |
| Routing | react-router v6 |
| Tests | Vitest (unit), Playwright (config present) |

## Getting started

```bash
npm install
npm run dev        # http://localhost:8080
```

### Environment

The Supabase client falls back to the production project if no env vars are
set. To point at a different project (recommended for local/staging), create
`.env` from `.env.example`:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-or-publishable-key>
```

The anon/publishable key is safe to ship to the browser — data access is
governed by Row Level Security.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server (regenerates sitemap first) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest run |
| `npm run lint` | ESLint |

## Project layout

```
src/
  components/       Shared UI (crm/, dashboard/, ui/, webgl/, propworld/)
  hooks/            AuthProvider (single auth source) + useAuth/useCrmAuth/useRole
  integrations/     Supabase client + DB types
  lib/crm/          CRM helpers (dates, gcal, …)
  pages/            Route components (public, auth/, dashboard/, admin/)
supabase/
  migrations/       Numbered SQL migrations (source of truth — run in order)
  functions/        Edge functions (gcal-push / gcal-pull / gcal-events)
                    with _shared/ auth + Google OAuth helpers
```

## Database & migrations

Schema lives in `supabase/migrations/` as numbered SQL files. Apply new ones
in order via the Supabase SQL editor (or the Supabase CLI). Migrations are
written to be idempotent where practical.

See [`BUILD_NOTES.md`](./BUILD_NOTES.md) for schema decisions and naming
conventions (e.g. `crm_bookings` vs `bookings`, `team_members` vs `profiles`),
and [`AUDIT_REPORT.md`](./AUDIT_REPORT.md) for the current health review and
open follow-ups.

## Auth & roles

- **Public site** uses `profiles` (`admin` / `distribution` / `marketing` /
  `sponsorships`).
- **CRM** uses `team_members` (`admin` / `mike` / `steven` / `jay` / `editor`)
  linked to `auth.users` via `auth_user_id`. A member is granted CRM access
  when an admin links their `auth_user_id`.

Route access is enforced by `ProtectedRoute` / `CrmProtectedRoute` (fail-closed)
**and** by Postgres RLS.

## CI

`.github/workflows/ci.yml` runs typecheck → test → build on every PR and push
to `main` (lint is currently informational).
