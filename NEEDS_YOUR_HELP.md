# What still needs you

I fixed everything I could safely do from code. The items below need a human
because they require **deploying**, **running SQL against production**,
**external accounts/infra**, or a **product decision** I shouldn't make on
your behalf. Ordered by priority.

Legend: 🔴 critical · 🟠 high · 🟢 nice-to-have

---

## 🔴 1. Deploy the edge functions (activates the C1 security fix)

The auth guards I added to `gcal-push`, `gcal-pull`, `gcal-events` only take
effect once the functions are **redeployed**. Until then the old, unauthenticated
versions are still live.

```bash
supabase functions deploy gcal-push
supabase functions deploy gcal-pull
supabase functions deploy gcal-events
```

Also set these function secrets (the guard needs the anon key; CORS is optional
but recommended):

```bash
supabase secrets set SUPABASE_ANON_KEY=<your anon/publishable key>
supabase secrets set CORS_ALLOW_ORIGIN=https://propmyganda.com
```

**Why it needs you:** I can't deploy to your Supabase project. **Please test
the shared calendar in each dashboard after deploying** — the functions now
reject callers who aren't a `team_members` row, and `gcal-pull` is admin-only.

---

## 🔴 2. Run the new migrations (in order) in the Supabase SQL editor

All are written to be safe, but they touch auth/data so you should run and
verify them yourself.

| File | What it does | Watch out for |
|------|--------------|---------------|
| `supabase/migrations/20260720_014_audit_activity_log.sql` | Audit-trail triggers (from the earlier task) | idempotent |
| `supabase/migrations/20260720_015_harden_crm_role_no_email_fallback.sql` | **Removes email-match role grants (C3).** Backfills `auth_user_id` for confirmed accounts first | ⚠️ **After STEP 1, run the verify query at the bottom.** Any active team member still showing `NULL` won't be able to access the CRM until you link them. Have each member sign up, then link. |
| `supabase/migrations/20260720_016_form_input_constraints.sql` | Length/format limits on `bookings` + `newsletter_subscribers` (H6) | Uses `NOT VALID`, so existing rows aren't scanned |

**Migration 015 is the one to be careful with** — it's the fix for the
"log in as mike@… and get Mike's role" hole, but if your team members aren't
linked by `auth_user_id` yet it can lock them out. Read the comments in the
file before running.

---

## 🟠 3. Consolidate the database schema into migrations (C4)

There's no single source of truth: CRM tables live only in loose paste-files
(`pmg_crm_schema.sql`, `crm_migration.sql`, `crm_expansion_schema.sql`,
`crm_phase*.sql`) that overlap and disagree, while `supabase/migrations/`
doesn't contain them at all.

**What I need from you:** run this against production and commit the result as a
baseline migration, so the schema can be rebuilt/verified:

```bash
supabase db pull                       # writes a baseline migration from prod
# then move the loose *.sql paste-files into supabase/archive/
```

Once this exists I can (or you can) regenerate types — see #4.

---

## 🟠 4. Generate DB types to retire the `as any` casts (H5)

There are 83 `as any` casts because `src/integrations/supabase/types.ts` is
hand-maintained and missing tables (`sponsor_deals`, `sponsor_brands`,
`calendar_sync`, …). Hand-writing them risks wrong types, so this should be
generated from the real schema:

```bash
supabase gen types typescript --project-id trwnqtgywfsalvismioi > src/integrations/supabase/types.ts
```

**What I need from you:** run this (needs your Supabase login/project access).
After it lands, tell me and I'll remove the casts file-by-file and flip ESLint
`no-explicit-any` back to an error + make lint a hard CI gate.

> The repo's one pre-existing `tsc` error is already fixed — typecheck is green
> now, so CI's typecheck step will pass today.

---

## 🟠 5. Confirm CI runs & protect `main` (H8 / N10)

I added `.github/workflows/ci.yml`. Please:
- confirm the first run goes green under Actions (it should — typecheck/test/
  build all pass locally), and
- turn on branch protection for `main`: require the CI check + PRs (history
  shows direct commits to `main`).

Both are in GitHub settings, which I can't change.

---

## 🟠 6. Rate limiting / captcha for public forms (H6, second half)

The length/format constraints (migration 016) and the honeypot I added stop
*junk* rows, but not *volume* — a bot can still submit many valid-looking
bookings/newsletter signups. Real protection needs one of:
- Supabase's built-in abuse/rate-limit controls, or
- moving form submission behind an edge function with per-IP rate limiting +
  a captcha (hCaptcha/Turnstile).

**Decision needed:** which approach you want; captcha needs an account/site key.
Say the word and I'll wire the client + edge function.

---

## 🟢 7. Fix public social metadata (N2)

`index.html` has leftover Lovable values I didn't want to guess at:
- `twitter:site` is `@Lovable` — should be PMG's X/Twitter handle (I don't know it).
- `og:image` / `twitter:image` point at `https://propmyganda.lovable.app/og-image-v2.jpg`
  — if you've moved to `propmyganda.com`, confirm the image URL that's actually
  hosted so link previews don't break.

**Give me:** the correct Twitter handle and the canonical OG image URL, and I'll
update it.

---

## 🟢 8. Two remaining npm vulnerabilities need a major bump (H9)

`npm audit fix` cleared 18 of 20. The last 2 (a dev-server `esbuild` issue) only
resolve by upgrading **Vite 5 → 8**, a breaking change I didn't want to do
blind. Same goes for the other majors (React 19, react-router 7, Tailwind 4,
zod 4, recharts 3). **Decision needed:** whether/when to schedule these — each
is its own migration effort. I can take them one at a time on your go-ahead.

---

## 🟢 9. Per-dashboard loading skeletons (rest of H2)

I made query failures visible everywhere (global error toast) and added
loading/error states to the shared calendar. The remaining polish — skeleton
placeholders per KPI card / list so dashboards don't flash misleading zeros
while loading — is safe but touches all 7 dashboards, and I'd want to verify it
against live data. **I can do this on request**; I left it out of the autonomous
batch because it's broad and best eyeballed against real loading behavior.

---

## 🟢 10. Product decision: the two dashboard systems (part of N5)

There are two parallel dashboards: the older `/dashboard/*` (profiles-based:
admin/distribution/marketing/sponsorships) and the newer `/admin/*` (CRM:
mike/steven/jay/editor). **Decision needed:** is `/dashboard/*` still a product,
or should it redirect into `/admin/*`? Tell me and I'll implement whichever.

---

## 🟢 11. Optional: e2e smoke test (rest of N12)

I added unit coverage for the date helpers. A true end-to-end smoke test
(home renders, login redirects, booking submits) needs the Playwright browser +
a running server in CI. The `playwright.config.ts` here uses a Lovable-specific
package — if you want real e2e, tell me whether to keep that harness or switch
to vanilla `@playwright/test`, and I'll write the specs + a CI job.

---

### Summary of what I already fixed (no action needed)

Fail-closed route guards · edge-function caller auth + shared OAuth helper ·
env-based Supabase config · verified-email CRM linking · single npm lockfile +
`npx` scripts · CI workflow · error boundary · route code-splitting (−475 KB
initial bundle) · shared AuthProvider · global query-error surfacing · booking
honeypot + email check · `npm audit fix` (20→2 vulns) · calendar caching ·
real README · dead-code removal · dev overlay · command-palette jumps ·
fixed the repo's one typecheck error · +10 unit tests.

See `AUDIT_REPORT.md` for the full findings and commit history for details.
