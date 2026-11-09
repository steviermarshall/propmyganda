# Artist onboarding flow — `/start`

Replaces the "PROPMYGANDA — Release Onboarding" Google Doc. An artist picks a
tier, fills in one form, uploads the master, picks a posting date (and a
session for Mid/Viral), pays, and is done. Payment triggers the calendar,
the sheets and the confirmation email.

## Flow

| Step | What happens | Where |
| --- | --- | --- |
| 1 Tier | Public `/start` shows Basic $550 (+ optional extra ad budget), Mid $1,000, Viral $15,000 only. DSP Release ($0 up front, split on streams, agreement required) and Invited ($0, everything in Mid) are never shown next to the paid tiers: each opens only from its own `/start?invite=CODE` link, which shows that one card | `supabase/functions/_shared/tiers.ts` |
| 2 Details | Contact, Instagram lookup, TikTok/YouTube, track, explicit, ad-report preference, optional distribution block with PRO/IPI/producer + e-signature | `src/pages/Start.tsx` → `onboarding` function `create` |
| 3 Upload | Files go straight to the private `onboarding-uploads` bucket via signed URLs | `upload-url` / `upload-done` |
| 4 Schedule | Release: a date 7+ days out and one of three New York times, 3, 4 or 6pm; a time already taken that day is struck out. Shoot: Monday–Friday, 30 minutes, starts 2, 3, 4, 5, 6 or 7pm; each booking blocks the full hour (30 min shoot + 30 min gap) and anything on the PMG Google Calendar in that hour hides the slot. All times are true New York time across DST | `availability` |
| 5 Pay | Stripe Checkout; card everywhere, Affirm on Viral; full pay or 50% deposit on Mid/Viral. $0 plans skip Stripe: `confirm` marks the order paid and runs the same fulfilment | `checkout` / `confirm` |
| Done | Webhook marks the order paid, books both calendar events, appends the editing sheet row and (if chosen) the distribution sheet row, emails the artist | `stripe-webhook` |

Everything is stored in `public.onboarding_orders` (migration
`20261018_014_onboarding.sql`). The public site never reads the table
directly; the function does, keyed by `id` + `client_token`.

## The prep page

`/start/prep` tells the artist what to do before and in the first five minutes after the collab posts, how to get to 81 Prospect Street (F to York St, A/C to High St, ferry to Pier 1), that 1–8pm parking is peak with garages on Jay and Front, and what's around to make a day of it (Pebble Beach, Time Out Market, Washington Street, Jane's Carousel, Empire Stores, St. Ann's). Linked from the schedule step, the done page and the confirmation email. Check the parking lines against what you'd tell someone yourself; I wrote them from the neighbourhood, not from a garage's own listing.

## Three populations

| Who | How they get in | What they see | Agreement |
| --- | --- | --- | --- |
| Paying artists | `/start`, pick Basic / Mid / Viral | prices, Stripe | optional distribution block |
| DSP artists | `/start`, pick DSP Release (first card) | "$0 up front · split on streams" | required: PRO, IPI, producer, e-signature |
| Free artists | a single-use link from `/admin/invites`, plan "Invited" (`/start?invite=CODE`) | only the Invited card, $0, no agreement | optional |
| DSP artists | a link from `/admin/invites`, plan "DSP Release" (give it many uses to hand out broadly) | only the DSP Release card, $0 up front | required, signed in the flow |

Invite codes live in `onboarding_invites` (migration `20261104_015`); a code is consumed when the order is confirmed. The public page never offers a $0 option, so nobody can pick the free door to dodge the paid one.

## The release agreement

The DSP path shows the full PMG Streaming Release Agreement (`supabase/functions/_shared/agreement.ts`, the text from the DSP Release Agreement Google Form) and collects what the form made required: PRO, IPI (9 to 11 digits or "none"), distro email, producer legal/stage name, PRO, IPI and email (or "self-produced", which copies the artist's details), an optional different DSP title, and an optional alternate master split that must total 100. Standard splits: master PMG 45 / Artist 45 / Producer 10; publishing PMG 100 / Artist 50 / Producer 50 (of 200). Distribution is via UnitedMasters.

The signature is the typed legal name and must match the legal name on the order. The server stamps the order with `agreement_version`, `agreement_hash` (SHA-256 of the exact text shown), `signed_at` and `signed_ip` (migration `20261104_017`), so a signed version can be proven later. Bump `AGREEMENT_VERSION` whenever the text changes. The confirmation email carries the full signed copy; the distro sheet row records the requested title and any alternate split. A second submission from the same email resumes the open order instead of creating a duplicate row.

## Secrets to set in Lovable Cloud

| Secret | Used for | Notes |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | creating Checkout Sessions | `sk_live_…` from Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | verifying webhooks | Stripe → Developers → Webhooks → add endpoint `https://gfqcmtslhwkcwfkqjfqw.supabase.co/functions/v1/stripe-webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded` |
| `SITE_URL` | redirect back after payment | `https://propmyganda.com` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | writing to the sheets | Google Cloud → create a service account → JSON key → paste the whole file. Share both sheets with its `client_email` as Editor |
| `EDITING_SHEET_ID` | the video editing sheet | the long ID in the sheet URL; a tab called `Orders` is created with a header row on first write (change with `EDITING_SHEET_TAB`) |
| `DISTRO_SHEET_ID` | the distribution sheet | defaults to the DSP Release Agreement responses sheet (`1-lGUtKmwAL7SmfaAHXbbPZK7715Detj1M6Ts_r6-kls`, tab `Form Responses 1`); rows land in columns A–Z in that sheet's order |
| `IG_ACCESS_TOKEN`, `IG_BUSINESS_ID` | Instagram profile lookup | Meta Graph API with the PMG business account (Business Discovery). Without them the handle is still linked, just not verified |
| `RESEND_API_KEY`, `NOTIFY_FROM`, `NOTIFY_EMAIL` | confirmation email + BCC to the team | optional; the flow works without email |
| `LOVABLE_API_KEY`, `GOOGLE_CALENDAR_API_KEY` | calendar | already set for the CRM; the flow uses the same calendar as the CRM (`crm_settings.gcal.calendar_id`) |

Affirm: enable it in Stripe → Settings → Payment methods. It only shows on
Viral and for amounts Stripe allows ($50–$30,000, US).

## The open question: deposit vs. full pay

Both are built. Mid and Viral offer "Pay in full" or "50% deposit, balance
before posting"; Basic is full pay only. To change it, edit
`supabase/functions/_shared/tiers.ts`: `depositAllowed` per tier and
`DEPOSIT_SHARE` (set to `1` to remove deposits). Collecting the balance is
manual for now (a Stripe payment link or invoice from the order's
`balance`); the order sits in `deposit_paid` until you mark it.

## Ad reporting (Meta + Google)

The form records how the client wants results (`report_preference`:
email, dashboard, both). The reports themselves are set up in the ad
platforms, once per client:

- Meta: Ads Manager → Reports → create a report filtered to the client's campaign → Schedule → weekly → add the client's email.
- Google Ads: Reports → Dashboards → create → Schedule email → weekly → client's email. For a live link, share a Looker Studio dashboard connected to the account.

## Testing end to end

1. Stripe in test mode: set `STRIPE_SECRET_KEY` to `sk_test_…` and the webhook secret from a test endpoint.
2. Open `/start`, run through with a real file, pay with card `4242 4242 4242 4242`.
3. Check: the order row is `scheduled`, two events on the calendar, a row in the editing sheet (and the distribution sheet if ticked), the email arrived. `sync_errors` on the row names anything that failed.


## Measurement and follow-ups

- Every step view posts a `track` event (anonymous per-device id) to `funnel_events`; every order carries `last_step`, the furthest step reached. `/admin/funnel` shows visitors per step, paid, by plan, and who stopped before paying, for 7, 30 or 90 days.
- `onboarding-followups` runs hourly from pg_cron (`supabase/pmg_onboarding_cron.sql`): a recovery email 1 hour and 24 hours after an order stops before paying (with the resume link), and reminders 7 days and 48 hours before the shoot and before the release. Sent emails are recorded in `followups` on the order so nothing goes twice. Optional `CRON_SECRET` secret, checked against the `x-cron-secret` header.
- Pay over time: Affirm is on for Basic, Mid and Viral; the Tier cards show "from about $X/mo" as twelve equal payments before interest.
- Legal name is only asked on the distribution path. Paid plans take the cardholder name from Stripe at payment.
- Add-ons are shown only after a booking is complete: on the done page and the prep page, after the area guide and the tips, and in the confirmation email. Never inside the booking steps. Data in `_shared/addons.ts` and `src/lib/addons.ts`.

Deploy after these changes: `onboarding`, `stripe-webhook`, `onboarding-followups`, `contact-agent`. Run migration `20261109_019` and `supabase/pmg_onboarding_cron.sql`.


## Deposits and balances

Every paid plan offers a 50% deposit, shown first. The deposit checkout saves the card (Stripe `setup_future_usage: off_session`, consent text on the checkout) and the webhook stores the customer and payment method. The hourly follow-ups job charges the balance once inside 36 hours of the shoot (or the release if there is no shoot); if the charge fails or no card was saved, the artist gets a pay link (`/start/balance?order=&token=`, the `balance-link` action) and the reminder emails carry the same link. Staff mark cash at `/admin/funnel` → Balances open, which stops any charge. Affirm is full-pay only, since Stripe cannot save it.

Also in this round: no Explicit flag; ad-results preference only on Viral or when an ad budget is added; the distribution toggle is gone from paid plans (DSP Release is the only distribution path); the schedule step books the shoot first and the release can be skipped ("place me by email"); the prep guide is in the confirmation email and under Pay, the done page shows the receipt, next steps and the add-ons.

Deploy after these changes: `onboarding`, `stripe-webhook`, `onboarding-followups`. Run migration `20261109_020`.
