# PROPMYGANDA — Full Codebase Audit

**Date:** 2026-07-20 · **Branch audited:** `claude/propmyganda-repo-oxlz4g` (includes the audit-trail work; everything else reflects `main`)
**Scope:** Frontend/UX · Backend (edge functions/auth) · Database (Postgres/Supabase) · Dependencies · Repo hygiene

Effort key: **S** = under an hour · **M** = a few hours · **L** = a day or more

---

## 🔴 CRITICAL — security, data integrity, broken flows

### C1. Edge functions run with service-role power but never check who's calling
- **Where:** `supabase/functions/gcal-push/index.ts`, `gcal-pull/index.ts`, `gcal-events/index.ts` (all three `Deno.serve` handlers)
- **What:** Each function creates a Supabase client with `SUPABASE_SERVICE_ROLE_KEY` and performs its work for *any* request. None of them read the caller's `Authorization` JWT to verify the user or check their CRM role. CORS is `Access-Control-Allow-Origin: *`.
- **Why it matters:** The anon/publishable key is public (it's hardcoded in the shipped JS bundle — see C5). That means anyone can invoke:
  - `gcal-events` → **read the entire company Google Calendar** (titles, locations, descriptions of every event, PMG or not);
  - `gcal-push` with `delete: true` → **delete calendar events** and `calendar_sync` rows;
  - `gcal-pull` → trigger writes into CRM tables from calendar state.
- **Fix:** At the top of each function, extract the bearer token, call `supabase.auth.getUser(jwt)`, and confirm the user maps to a `team_members` row (role check for write endpoints). Return 401/403 otherwise. Tighten CORS to the production origin. Keep service-role client only for the DB work after the check passes.
- **Effort:** M (same ~20-line guard shared by all three)

### C2. Route guards fail **open** when the user has no role
- **Where:** `src/components/dashboard/ProtectedRoute.tsx:23`, `src/components/dashboard/CrmProtectedRoute.tsx:22`
- **What:** The check is `if (allowedRoles && role && !allowedRoles.includes(role))`. If `role`/`crmRole` is `null` (authenticated user with **no** profile/team_members row), the condition short-circuits and the protected page renders.
- **Why it matters:** Any person who creates an account sees every CRM dashboard's UI, including any data readable under permissive RLS. Combined with C3 it becomes a full bypass. Access checks must fail closed.
- **Fix:** Invert the logic: `if (allowedRoles && (!role || !allowedRoles.includes(role))) return <Navigate …/>`.
- **Effort:** S

### C3. CRM roles are granted by **email string match**
- **Where:** `supabase/migrations/20260517_011_fix_team_members_rls_recursion.sql` (`has_crm_role()` falls back to `lower(email) = lower(auth.email())`), and `src/hooks/use-crm-auth.ts:48-61` (auto-links `auth_user_id` on email match)
- **What:** RLS policies and the client both treat "your login email equals a team_members.email" as proof of role. BUILD_NOTES.md explicitly says the opposite design was intended ("an admin must manually set their `auth_user_id`").
- **Why it matters:** If email confirmation is ever disabled (or an address is recycled/compromised), signing up as `mike@propmyganda.com` instantly grants Mike's role at the **database policy level** — RLS itself honors the fallback, so this is not just a UI problem.
- **Fix:** Remove the email fallback from `has_crm_role()` and the `team_members` policies; require `auth_user_id = auth.uid()` only. Keep a one-time, admin-approved linking step (or keep the client auto-link but gate it on `email_confirmed_at`).
- **Effort:** M

### C4. No single source of truth for the database schema
- **Where:** `supabase/` — `pmg_crm_schema.sql`, `crm_migration.sql`, `all_migrations.sql`, `crm_expansion_schema.sql`, `crm_phase5_gcal.sql`, `crm_phase6_bookings.sql`, `crm_rls_fix.sql` **plus** `supabase/migrations/` (13 numbered files)
- **What:** The numbered migrations do **not** contain the CRM tables at all; those only exist in loose paste-into-SQL-editor files, several of which overlap and disagree (e.g. `pmg_crm_schema.sql` defines 9 tables that `crm_migration.sql` doesn't; both define `activity_log`).
- **Why it matters:** There is no reliable way to rebuild or stand up a second environment (staging, local dev), no record of what actually ran in production, and future edits to the "wrong" file silently diverge. This is the root cause of several past errors documented in `.lovable/plan.md` (the stale `client_id` policy incident).
- **Fix:** Adopt `supabase/migrations/` as the only source of truth. Snapshot production schema (`supabase db pull`) into a baseline migration, move the loose files to `supabase/archive/`, and add all future changes as numbered migrations (the new `20260720_014_audit_activity_log.sql` already follows this).
- **Effort:** M

### C5. Supabase URL/key hardcoded; `.env.example` is a decoy
- **Where:** `src/integrations/supabase/client.ts:4-5` vs `.env.example`
- **What:** The client ignores `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and hardcodes the production project URL and publishable key.
- **Why it matters:** The publishable key is *designed* to be public, so this is not a leak by itself — but it means (a) every developer and CI run points at **production data**, (b) staging is impossible, and (c) the entire security model rests on RLS being perfect (see C2/C3 for why that's currently not true).
- **Fix:** Read from `import.meta.env` with the current values as documented defaults; create a separate Supabase project for dev/staging.
- **Effort:** S (env wiring) + M (staging project)

---

## 🟠 HIGH IMPACT — UX wins, performance, reliability

### H1. 1.8 MB main JS bundle — no route-level code splitting
- **Where:** `src/App.tsx` (all ~25 pages statically imported); build output `dist/assets/index-*.js` = **1,827 KB** (only `PropworldScene` is lazy)
- **Why it matters:** A first-time visitor on a phone downloads the whole CRM, recharts, framer-motion, and admin code just to see the homepage. This is the single biggest UX/perf lever in the repo. Vite already warns about it on every build.
- **Fix:** `React.lazy` + `<Suspense>` per route group (public / auth / dashboard / admin). Splitting just the `/admin/*` and `/dashboard/*` trees will roughly halve the public bundle.
- **Effort:** M

### H2. CRM dashboards have zero loading & error states
- **Where:** every file in `src/pages/admin/` and `src/pages/dashboard/` — `grep isLoading|isError` finds 0 usages (public pages `Events.tsx`, `Publication.tsx` similarly render empty while fetching)
- **Why it matters:** On load, KPI cards show misleading zeros and sections render blank; if a query fails (RLS, network), the page **silently shows nothing** — the team can't tell "no data" from "broken". The new `AuditLog.tsx` and `DeliverablesReport.tsx` show the intended pattern.
- **Fix:** Handle `isLoading` (skeletons — `src/components/ui/skeleton.tsx` already exists, unused) and `isError` (inline banner + retry) in each dashboard, or extract a small `<QuerySection>` wrapper.
- **Effort:** M

### H3. No global error boundary
- **Where:** `src/App.tsx` / `src/main.tsx`; only `src/components/webgl/WebGLBoundary.tsx` exists (3D-only)
- **Why it matters:** Any render-time exception white-screens the whole app with no recovery path.
- **Fix:** Top-level `ErrorBoundary` with a branded fallback and a "reload" action; wrap route groups so one broken page doesn't take down navigation.
- **Effort:** S

### H4. Auth state is re-fetched by every consumer
- **Where:** `src/hooks/use-auth.ts`, `src/hooks/use-crm-auth.ts` — plain hooks, not context. Each `ProtectedRoute`, layout, palette, and dashboard mounts its own `getSession` + profile/team_members fetch and its own `onAuthStateChange` listener.
- **Why it matters:** 3-5 duplicate requests per navigation, visible loading flicker in nested guards, and the email auto-link `UPDATE` in `use-crm-auth.ts:57-61` can fire repeatedly and concurrently.
- **Fix:** Single `<AuthProvider>` (one for site, one for CRM or merged) exposing context; hooks read from context.
- **Effort:** M

### H5. Hand-maintained DB types + 83 `as any` casts
- **Where:** `src/integrations/supabase/types.ts` (29 tables, missing newer ones like `sponsor_deals`, `sponsor_brands`, `calendar_sync`); 83 `as any` across `src/`
- **Why it matters:** The typed Supabase client is fully defeated — column renames and wrong payloads compile fine and only fail at runtime (this is exactly how the silently-broken audit logging shipped). The pre-existing `tsc` error in `SharedCalendar.tsx:157` comes from the same gap.
- **Fix:** Generate types from the real schema (`supabase gen types typescript`) once C4 lands, then delete casts file-by-file and fix `SharedCalendar.tsx:157`.
- **Effort:** L (mechanical but wide)

### H6. Public forms accept unlimited anonymous inserts
- **Where:** `supabase/migrations/20260505_009_bookings.sql:32` (`bookings_insert_anon WITH CHECK (TRUE)`), `crm_migration.sql:454` (newsletter), plus `distribution_applications` / `sponsorship_leads`; client validation is name+email presence only (`src/components/BookingSheet.tsx:355`)
- **Why it matters:** Nothing stops a script from inserting millions of junk rows (DB bloat, polluted CRM pipeline, notification spam). No length limits, no email format constraint, no rate limiting, no captcha/honeypot.
- **Fix:** Add DB-level sanity constraints (length caps, basic email `CHECK`), a honeypot field client-side, and rate limiting (per-IP via edge function, or Supabase's built-in abuse controls). Consider moving form submission behind a small edge function with zod validation like `gcal-push` already does.
- **Effort:** M

### H7. `npm ci` is broken and there are three lockfiles
- **Where:** `package-lock.json` (out of sync — `npm ci` errors on missing `framer-motion@11.18.2` etc.), `bun.lock` + `bun.lockb` (pin a **Lovable-private registry** that 403s outside Lovable)
- **Why it matters:** No reproducible install exists outside the Lovable sandbox; CI (H8) is impossible until this is fixed.
- **Fix:** Pick npm (or bun with the public registry), regenerate one lockfile, delete the other two. Also `predev`/`prebuild` call `bunx tsx` (`package.json:14-15`), which fails in npm-only environments — switch to `npx tsx`.
- **Effort:** S

### H8. No CI at all
- **Where:** no `.github/` directory
- **Why it matters:** Tests (7 exist and pass), lint, and typecheck never run automatically; a known TS error sits on `main`; nothing gates a broken deploy.
- **Fix:** One GitHub Actions workflow: install → lint → `tsc --noEmit` → `vitest run` → `vite build`. Fix `SharedCalendar.tsx:157` first so typecheck can gate.
- **Effort:** S

### H9. Dependency debt & vulnerabilities
- **Where:** `package.json` / `npm audit`: **20 vulnerabilities (1 critical, 12 high)** — most in dev-only chains (jsdom 20 → flatted/form-data, esbuild dev server, glob CLI), but `@remix-run/router <=1.23.1` (react-router runtime) is **high** and fixed within the v6 line
- **Majors available (breaking):** React 18→19, react-router 6→7, Vite 5→8, Tailwind 3→4, zod 3→4, recharts 2→3, jsdom 20→29, react-day-picker 8→10
- **Fix now (S):** `npm audit fix` + in-range bumps (react-router-dom 6.30.4, playwright, radix patches, jsdom major is dev-only and safe).
- **Plan later (L):** the majors above — none urgent; Tailwind 4 and router 7 are the two with real migration cost.

### H10. Google Calendar fetch is heavy, uncached, and per-mount
- **Where:** `supabase/functions/gcal-events/index.ts` (pages through up to 2,500 events per request); called by `SharedCalendar` which is mounted on **every** dashboard
- **Why it matters:** Every dashboard visit = service-account OAuth handshake + full calendar scan → slow calendars, Google API quota burn.
- **Fix:** `staleTime` on the client query (e.g. 5 min) and/or short-lived cache in the function; request only the visible window.
- **Effort:** S

---

## 🟢 NICE TO HAVE — polish, refactors, cosmetics

| # | Item | Where | Fix | Effort |
|---|------|-------|-----|--------|
| N1 | README is a Lovable stub ("TODO: Document your project here") | `README.md` | Real docs: what PMG is, setup, env vars, migration workflow, deploy. Merge the excellent content from `BUILD_NOTES.md` | S |
| N2 | Wrong social metadata | `index.html:22` (`twitter:site` = `@Lovable`), `og:image` points at `propmyganda.lovable.app` | Point both at PMG's own handle/domain | S |
| N3 | ~70-line Google OAuth block duplicated 3× | all three `supabase/functions/*/index.ts` | Extract `supabase/functions/_shared/google-auth.ts` | S |
| N4 | 2 MB of PNG art shipped raw | `src/assets/graffiti-*.png` (436-520 KB each) | Convert to WebP/AVIF (~70-80% smaller), add `loading="lazy"` below the fold | S |
| N5 | Dead code | `src/components/crm/StaleDot.tsx`, `InlineInput.tsx` (0 imports); two parallel dashboard systems (`/dashboard/*` profiles-based vs `/admin/*` CRM) | Delete unused components; decide whether the old `/dashboard` tree is still a product or should redirect into `/admin` | S / M |
| N6 | Dev error overlay disabled | `vite.config.ts` `hmr.overlay:false` | Re-enable so dev errors aren't invisible | S |
| N7 | Low-contrast, tiny UI text in CRM | `text-white/30` at 9-10px uppercase throughout `src/components/crm/*`, `src/pages/admin/*` | Bump to ≥11px and ~50% opacity for non-decorative text; add `focus-visible` rings for keyboard users | M |
| N8 | ESLint `no-explicit-any` violated 83× | everywhere (see H5) | Once types are generated, re-enable enforcement per-directory | folds into H5 |
| N9 | Command palette (⌘K) unaware of most entities | `src/components/crm/CommandPalette.tsx` (searches 4 entity types, jumps to 5 pages) | Add sponsors/deliverables/audit search; add `/admin/reports/deliverables` jump | S |
| N10 | No branch protection / PR flow | history shows direct commits to `main` | Protect `main`, require the CI from H8 to pass, work via PRs | S |
| N11 | `.lovable/plan.md` is a stale one-off fix plan | `.lovable/plan.md` | Archive or delete now that Phase 6 shipped | S |
| N12 | Playwright configured but zero e2e specs | `playwright.config.ts`, `playwright-fixture.ts` | Either add a smoke test (home renders, login redirects, booking form submits) or remove the config | M |

---

## Suggested implementation order

1. **C2** (fail-closed guards) + **C1** (edge function auth) — the two real security holes, both quick.
2. **C3** (email-match roles) — DB migration + hook change.
3. **H7 → H8** (fix lockfile, add CI) — makes everything after this safer.
4. **C4** (schema consolidation) → unlocks **H5** (generated types).
5. **H1-H4** (code splitting, loading/error states, error boundary, auth context) — the visible UX wins.
6. **H6, H9, H10**, then the N-tier as time allows.

*No changes have been made to code as part of this audit — this report is the only new file.*
