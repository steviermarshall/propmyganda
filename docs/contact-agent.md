# The contact agent

`/contact` opens with a chat. The `contact-agent` edge function answers as PMG's front desk: it finds out what the visitor wants, asks the qualifying questions for distribution and for the free door, always comes back to the paid plans, and emails the team the moment money comes up. The rules, thresholds, system prompt and tool list live in `supabase/functions/_shared/agent.ts`.

## What it does

| Visitor wants | Agent does | Ends with |
|---|---|---|
| Paid push | explains Basic $550 / Mid $1,000 / Viral $15,000, points at `/start` | `notify_team` when they ask cost, a quote, deposits or Affirm |
| Distribution | asks Spotify link, monthly listeners, last-release streams, masters, producer/label; `lookup_spotify`; `record_lead` intent `dsp` | the paid plan that fits, plus "the team will review" |
| Free | says it is rare; `lookup_instagram`; asks likes+comments on the last five posts (engagement), Spotify listeners and streams; `record_lead` intent `free` | the paid plan that fits, plus "the team will review" |
| Press, booking, anything else | takes details, `notify_team` reason `question` | a person follows up |

When cost comes up the agent calls `notify_team`, which emails `NOTIFY_EMAIL` the summary and transcript, then tells the visitor to DM `@propmyganda_` on Instagram with the word **propworld** (or book straight at `/start`). The agent never says anyone qualifies, never quotes the thresholds, and never promises the private doors.

## Thresholds

In `THRESHOLDS` in `_shared/agent.ts`. Free: 10,000 Instagram followers, 3% engagement, 25,000 Spotify monthly listeners, all three. DSP: 50,000 Spotify monthly listeners (from the paid-artists onboarding doc). Change the numbers there; the agent reads the result of `record_lead` and steers, it does not see the numbers in its prompt.

## Setup

1. Run `supabase/migrations/20261104_018_agent_conversations.sql` in Lovable Cloud (SQL editor).
2. Add `ANTHROPIC_API_KEY` in Lovable Cloud secrets (console.anthropic.com). Email uses the existing `RESEND_API_KEY`, `NOTIFY_FROM`, `NOTIFY_EMAIL`; lookups use the existing `IG_ACCESS_TOKEN`/`IG_BUSINESS_ID` and `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET`. Each is optional; the agent asks for the numbers instead when a lookup is not set up.
3. Deploy: in the Lovable chat, "Deploy the edge function contact-agent from the current repo code exactly as it is." A GET on `https://gfqcmtslhwkcwfkqjfqw.supabase.co/functions/v1/contact-agent` shows the live version.

Model: `claude-opus-5-5` at low effort with server-side refusal fallback enabled, prompt caching on the system prompt. Limits: 1,500 characters a message, 30 visitor turns a conversation, 6 new conversations an hour from one address. Conversations are stored in `agent_conversations` and shown at `/admin/contact` under "Agent conversations" (admin and Jay roles).
