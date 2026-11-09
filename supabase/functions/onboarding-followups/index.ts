// Hourly: recovery emails for orders that stopped before paying, and reminders before the shoot and the release.
//   POST {}   run (pg_cron, see supabase/pmg_onboarding_cron.sql); optional CRON_SECRET via x-cron-secret
//   GET       { ok, version }
// Secrets: RESEND_API_KEY, NOTIFY_FROM, SITE_URL; optional CRON_SECRET.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";
import { dueFollowups, nyWhen, type FollowupKey, type FollowupOrder } from "../_shared/followups.ts";
import { getTier, formatUsd } from "../_shared/tiers.ts";

const VERSION = "2026-11-09.1";
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers });

interface Row extends FollowupOrder { artist_name: string; tier: string; client_token: string; payment_plan: string; total_cents: number; due_now_cents: number; catalogue_no: string | null }

function body(o: Row, key: FollowupKey, site: string): { subject: string; text: string } {
  const resume = `${site}/start?resume=${o.id}&token=${o.client_token}`;
  const prep = `${site}/start/prep`;
  const tier = getTier(o.tier)?.name ?? o.tier;
  const sign = "\n\nReply to this email for anything.\n— PMG";
  switch (key) {
    case "recovery1":
      return { subject: `${o.artist_name} — your PMG date is not held yet`, text: `You started a ${tier} booking and stopped before the payment step. Nothing is held until it is paid, and dates go to whoever books first.\n\nPick up where you left off: ${resume}\n\nIf something in the flow stopped you, reply and say what. A person reads this.${sign}` };
    case "recovery2":
      return { subject: `Still want the ${tier}? Your draft is here`, text: `Your PMG booking is still saved. Everything you filled in is there; only the date and the payment are left.\n\n${resume}\n\nIf the plan is not right, reply and say what you are trying to do and we will point you at the right one. If you are done with it, ignore this and the draft clears itself.${sign}` };
    case "shoot7":
      return { subject: `Shoot in one week · ${nyWhen(o.session_at!)}`, text: `${o.artist_name}, your shoot is ${nyWhen(o.session_at!)} at 81 Prospect Street, DUMBO. 30 minutes in the room.\n\nBefore then: upload the final master if you have not, know your hook cold, two outfits if you can, no fine stripes or small logos.\n\nParking at that hour is peak; the F to York Street is four minutes on foot. The full guide, with what is around the room: ${prep}\n\nNeed to move it? Reply now; after this week the slot is locked.${o.payment_plan === "deposit" ? `\n\nBalance of ${formatUsd(o.total_cents - o.due_now_cents)} is due before posting.` : ""}${sign}` };
    case "shoot48":
      return { subject: `Shoot in 48 hours · ${nyWhen(o.session_at!)}`, text: `${o.artist_name}, two days out. ${nyWhen(o.session_at!)}, 81 Prospect Street, DUMBO. Arrive ten minutes early; the slot after yours is real.\n\nBring the master on a drive even if you uploaded it. Bring water.\n\nGetting here and what to do after: ${prep}${sign}` };
    case "release7":
      return { subject: `Release in one week · ${nyWhen(o.post_at!)}`, text: `${o.artist_name}, your record goes out ${nyWhen(o.post_at!)}.\n\nThis week: accounts public on TikTok, Instagram and YouTube, collaboration requests on and set to accept. Tell your closest 20 people the date and time, as a message, not a story.\n\nThe first five minutes decide the post. The whole playbook: ${prep}${o.payment_plan === "deposit" ? `\n\nBalance of ${formatUsd(o.total_cents - o.due_now_cents)} is due before posting. Reply if you have not received the payment link.` : ""}${sign}` };
    case "release48":
      return { subject: `Release in 48 hours · ${nyWhen(o.post_at!)}`, text: `${o.artist_name}, two days out. ${nyWhen(o.post_at!)}.\n\nBe on your phone, charged, logged in, from ten minutes before. Accept the collab invite the second it lands. Reply to every comment for the first hour. Share it to your story with a line. Pin it. Don't post anything else for 24 hours.\n\n${prep}${sign}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "GET") return json({ ok: true, function: "onboarding-followups", version: VERSION });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) return json({ error: "forbidden" }, 403);
  const site = (Deno.env.get("SITE_URL") ?? "https://propmyganda.com").replace(/\/$/, "");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const since = new Date(Date.now() - 8 * 86400_000).toISOString();
  const until = new Date(Date.now() + 8 * 86400_000).toISOString();
  const [drafts, booked] = await Promise.all([
    supabase.from("onboarding_orders").select("*").in("status", ["draft", "pending_payment"]).is("paid_at", null).not("email", "is", null).gte("created_at", since),
    supabase.from("onboarding_orders").select("*").in("status", ["paid", "deposit_paid", "scheduled"]).or(`session_at.lte.${until},post_at.lte.${until}`),
  ]);
  if (drafts.error) return json({ error: drafts.error.message }, 500);
  if (booked.error) return json({ error: booked.error.message }, 500);

  const rows = [...(drafts.data ?? []), ...(booked.data ?? [])] as Row[];
  const sent: string[] = [], errors: string[] = [];
  const now = new Date();
  for (const o of rows) {
    for (const key of dueFollowups(o, now)) {
      try {
        const { subject, text } = body(o, key, site);
        const ok = o.email ? await sendEmail(o.email, subject, text, { bccTeam: key.startsWith("recovery") ? false : true }) : false;
        const followups = { ...(o.followups ?? {}), [key]: now.toISOString() };
        await supabase.from("onboarding_orders").update({ followups }).eq("id", o.id);
        o.followups = followups;
        sent.push(`${key}:${o.id}${ok ? "" : ":no-email-config"}`);
      } catch (e) {
        errors.push(`${key}:${o.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return json({ ok: true, version: VERSION, checked: rows.length, sent, errors });
});
