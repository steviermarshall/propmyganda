# /start — service blueprint and order state machine

Status: DRAFT FOR APPROVAL. No flow code changes until this is approved.
Source: "The PMG DSP Release Agreement Form: (Responses)", rows 2–16, read 2026-10-18.
Not yet read (to be supplied): the PMG Streaming Release Agreement, the last ten artists'
email threads, how each actually paid, the Google Form's required-field settings.

## 1. What the sheet says (row references are sheet rows; row 1 is the header)

| Row | Artist | Status | What actually happened |
| --- | --- | --- | --- |
| 2 | Zoe (Zoe Lewis) | Completed | Asked for alternate splits (U=Yes) but V holds the form's example text, not a split. L repeats herself as an "additional artist". |
| 3 | Malik English | Not Scheduled | Notes "?????". Self-produced (producer = artist). Nobody recorded a next step. |
| 4 | HDBeenDope | Not Scheduled | Signed via a PR team, referred to management, "Kim has not heard back". Distro emails N/A. Third party in the loop, no owner on PMG side. |
| 5 | Miss Gavri | Scheduled | Signed, in portal, "contacting UM on re-release process". A re-release of an existing track needs a different path. |
| 6–9 | $wipe (Stanley Bacone) | Stalled ×4 | One artist, four identical rows at 23:58:09. IPI "N/A". PRO "BMI, ASCAP," (multi-select). Producer PRO "BMI, ASCAP, SESAC". Splits "Will Discuss Futher:". |
| 10 | Nkiru Emelle | Not Scheduled | "?????". Contact email is `nkiruemelle@gmail.con` (typo, unreachable). Producer PRO and IPI both "overseas". |
| 11 | HBN Mitri | Not Scheduled | "?????". Producer IPI identical to artist IPI (copy error). Distro email belongs to a third party. |
| 12 | BUDAH | Not Scheduled | "?????". Producer fields: "I don't know" ×4. |
| 13 | Hammad | Completed | Clean. Overseas producer with BUMA STEMRA worked fine. |
| 14 | JPEEZ | Scheduled | Signed, in portal, "waiting on UM app answers". Proper split provided. Second producer typed into free text. |
| 15 | Stockz | Completed | "Additional artists" field holds "Anderson" (his own surname). |

Totals: 15 rows, 12 artists. Completed 3 (25% of artists), Scheduled 2, Not Scheduled 4, Stalled 1.
(Earlier I said 4 of 15 completed. It is 3 of 15 rows, 3 of 12 artists.)

### Concrete stall reasons, in order of frequency

1. **No owner, no next step.** Four rows (3, 10, 11, 12) carry "?????" as the entire status. Nothing in the process assigns a person or a date to the next action.
2. **Rights data arrives broken.** IPI missing or "N/A" (6–9), producer IPI copied from the artist (11), "overseas" and "I don't know" in numeric fields (10, 12), multi-select PRO answers (6–9). Each one becomes a manual email loop before the portal accepts the release.
3. **Splits are free text.** Rows 2 and 6–9 asked for alternate splits and gave none that could be used. Only row 14 gave percentages.
4. **Duplicate submissions.** Rows 6–9. The form has no dedupe by email, so one anxious click became four rows and a "Stalled" label.
5. **Third parties in the chain.** PR team and management (4), someone else's distro login (11). The form has one email field and no "who signs / who gets agreements / who holds the distro account" distinction.
6. **Portal dependency.** Rows 5 and 14 are waiting on the distributor (UM) for re-release questions and app answers. There is no state for "blocked on portal" with an SLA, so it reads the same as an artist who vanished.
7. **Unreachable contact.** Row 10's typo means every follow-up to the main email bounced. No validation on the one field that everything depends on.
8. **No date in the form.** The onboarding doc promised "three open slots, pick one", but the form never asks. Scheduling happened in email, which is where rows went quiet.

Side finding: the site's "Got a record?" and "Book a session" buttons linked to this very form (ID 1dXl9g…), so the public CTA was the release agreement, not onboarding.

### Form questions (from the response header) and what a distributor portal needs

Asked today: DSP title approval, email, first/last/stage name, PRO, IPI, distro email, agreements email, additional artists (free text), producer name/stage/PRO/IPI/emails, additional producers (free text), alternate splits (yes/no + free text), two confirmations, typed signature.

Not asked, but distributors (DistroKid, UnitedMasters) require or Spotify/Apple reject without: songwriter legal names per track, cover art at 3000×3000, primary genre, release date with lead time, explicit flag, whether the track was released before (ISRC/UPC exist), label/copyright line, audio spec (WAV 16/24-bit, 44.1 kHz). I could not read the portal; verify this list against the UM portal before the field list is final.

## 2. Service blueprint (one page)

| Step | Artist sees | PMG does | System does | Evidence it worked |
| --- | --- | --- | --- | --- |
| Tier | Three tiers, one total, deposit note | — | Quote computed server-side | Quote on receipt = Stripe line item |
| Details | One form; IG lookup; distro block appears only when ticked | — | Validates email (no `.con`), IPI format or explicit "none", single PRO, producer complete or flagged, splits as % totalling 100; dedupes by email: a second submission resumes the first order | Zero rows with "?????", "N/A", "overseas", example text |
| Upload | Drop zone, spec stated | — | Signed URL to private bucket, type and size checked | File listed on order, link in editing sheet |
| Schedule | Open posting dates and sessions | — | Free/busy from the PMG calendar, no two artists on one posting day, 7-day lead | Calendar event exists with artist invited |
| Pay | Stripe Checkout; full or deposit | — | Idempotent session; webhook marks paid once; balance invoice created, due T-7 | One charge per order in Stripe; order number on the charge |
| Sign (inside Details when distro ticked) | Full agreement text, scroll, type name | — | Stores agreement version, SHA-256, IP, timestamp; emails PDF to artist and PMG | PDF in both inboxes; hash matches stored text |
| Confirm | Email: date, what's needed by when | Jay confirms within 1 business day | State → confirmed; reminders scheduled | Reply in one thread |
| Run | Reminders at T-7, T-3, T-1, T-0, T+1 | Edits, post, report | Edit lock at T-3; post blocked until balance paid; report sent | Status reaches done; report preference honoured |

## 3. Order state machine

| State | Meaning | Owner | Deadline | Automatic reminder | Exit |
| --- | --- | --- | --- | --- | --- |
| draft | Tier picked, details not saved | artist | 72 h | none | details saved → intake |
| intake | Details saved, no payment | artist | 72 h | +24 h, +48 h "finish your order" | paid → paid / deposit_paid; 72 h → expired |
| paid / deposit_paid | Money in | PMG (Jay) | 1 business day | to Jay at 24 h | Jay confirms → confirmed |
| confirmed | Date held, work can start | PMG | T-7 | artist T-7: accounts public, collabs on; files missing → assets_pending | T-3 → locked |
| assets_pending | Paid, no master yet | artist | T-5 | T-10, T-7, T-5 | file received → confirmed; T-5 with no file → auto reschedule |
| rights_pending | Distro ticked, data incomplete or portal waiting | PMG | T-5 | to Jay daily; to artist when a field is theirs | resolved → confirmed |
| balance_due | Deposit plan, invoice open | artist | T-7 | T-14, T-10, T-7 | paid → confirmed; T-5 unpaid → auto reschedule |
| locked | Edit lock; no more file or copy changes | PMG | T-0 | T-1: accept the collab invite | posted → posted |
| posted | Live on the date | PMG | T+1 | — | report sent → done |
| done | Report delivered | — | — | — | — |
| rescheduled | Artist or PMG moved the date | both | new T | re-arms the T-7/T-3/T-1 reminders | → confirmed |
| no_show | Session missed by 15 min | artist | 7 days | one "rebook" email | rebooked → confirmed; 7 days → session forfeited, order continues |
| expired / cancelled / refunded | Closed | — | — | — | — |

Reschedule path: artist can move once, free, at 7+ days out; inside 7 days or a second move: $150 (decision 2). PMG-initiated moves are always free and come with the next three open slots. Both re-arm reminders.

Refund policy (proposed, decision 2): full refund minus Stripe fees before any file is received and before T-7; after that the deposit (or 50% of a full payment) is non-refundable; after T-3 (edit lock) nothing is refundable except where PMG cancels.

## 4. Money rules

- One Stripe Checkout Session per order, created with an idempotency key `order:{id}:{plan}`; a second click returns the same session.
- Webhook stores the event id; a replayed event is acknowledged and ignored.
- Deposit plan: on `deposit_paid`, create a Stripe Invoice for the balance with `due_date = post_at − 7 days`, metadata `order_id`; posting is blocked until `invoice.paid`.
- Every charge and invoice carries `order_id` and `catalogue_no` in metadata and in the statement descriptor suffix (`PMG R-012`) for bank reconciliation.
- Affirm only when Stripe's own eligibility says so (US, $50–$30,000) and only on Viral.
- Sales tax via Stripe Tax only once PMG is registered in NY (decision 3). Until then, no tax is collected and the receipt says so.

## 5. Decisions only you can make

| # | Decision | Recommendation |
| --- | --- | --- |
| 1 | Deposit policy | Basic: full pay. Mid: full or 50% deposit. Viral: 50% deposit with balance due T-7, or Affirm for the full amount. Post blocked until balance clears. |
| 2 | Refund and reschedule terms | As written in §3. Shown on the Pay step and in the confirmation email, not buried. |
| 3 | NY sales tax | Ask your accountant whether PMG's services (video production vs. advertising placement) are taxable in NY and whether you are registered. Turn Stripe Tax on only after that answer. |
| 4 | Default split | The sheet's example shows PMG 45 / Artist 35 / Producers 20. Confirm; it becomes the pre-filled split that must total 100. |
| 5 | Who owns "confirmed" | Jay, with a 1-business-day SLA and a daily digest of orders past deadline. |
| 6 | Can the agreement text be shown on the site before signing? | Yes is required for a defensible signature. Send me the document. |

## 6. What I still need from you

- The PMG Streaming Release Agreement (document or PDF).
- The last ten artists' email threads, or access to the mailbox they live in (the connected Gmail is marshall@getlamp.app; the threads are not there).
- How each of those ten paid, from Stripe, Zelle or the bank.
- The Google Form's required-field settings (edit view screenshots are enough).
- Confirmation of the UM portal's required fields.
