// Stripe → PMG. On a paid Checkout Session: mark the order paid, put the
// posting date and session on the Google Calendar, append the order to the
// editing sheet (and the distribution sheet when distro was requested), and
// email the artist. Each step is independent; failures are logged on the row.
//
// Secrets: STRIPE_WEBHOOK_SECRET, GOOGLE_SERVICE_ACCOUNT_JSON, EDITING_SHEET_ID,
// EDITING_SHEET_TAB (default "Orders"), DISTRO_SHEET_ID (defaults to the DSP
// Release Agreement responses sheet), DISTRO_SHEET_TAB (default "Form Responses 1"),
// optional RESEND_API_KEY + NOTIFY_EMAIL.
import { createClient } from "npm:@supabase/supabase-js@2";
import { GCAL_BASE, gcalHeaders } from "../_shared/gcal.ts";
import { appendRow, ensureHeader } from "../_shared/google.ts";
import { formatUsd, getTier } from "../_shared/tiers.ts";
import { EDITING_COLUMNS, distributionRow, editingRow, parseStripeSignature, type OrderRow } from "../_shared/onboarding.ts";

const DEFAULT_DISTRO_SHEET = "1-lGUtKmwAL7SmfaAHXbbPZK7715Detj1M6Ts_r6-kls";

async function verify(raw: string, header: string | null, secret: string): Promise<boolean> {
  const sig = parseStripeSignature(header);
  if (!sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(sig.t)) > 600) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${sig.t}.${raw}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sig.v1.includes(hex);
}

async function calendarEvent(calendarId: string, summary: string, description: string, startISO: string, hours: number, attendee: string): Promise<string | null> {
  const end = new Date(new Date(startISO).getTime() + hours * 3600_000).toISOString();
  const res = await fetch(`${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`, {
    method: "POST", headers: gcalHeaders(),
    body: JSON.stringify({ summary, description, start: { dateTime: startISO }, end: { dateTime: end }, attendees: [{ email: attendee }], colorId: "5" }),
  });
  if (!res.ok) throw new Error(`calendar ${res.status} ${await res.text()}`);
  return (await res.json()).id ?? null;
}

async function signedLinks(supabase: ReturnType<typeof createClient>, uploads: OrderRow["uploads"]) {
  const out = [] as NonNullable<OrderRow["uploads"]>;
  for (const u of uploads ?? []) {
    const { data } = await supabase.storage.from("onboarding-uploads").createSignedUrl(u.path, 60 * 60 * 24 * 30);
    out.push({ ...u, url: data?.signedUrl ?? u.path });
  }
  return out;
}

async function email(to: string, subject: string, text: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  const from = Deno.env.get("NOTIFY_FROM") ?? "PMG <no-reply@propmyganda.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], bcc: Deno.env.get("NOTIFY_EMAIL") ? [Deno.env.get("NOTIFY_EMAIL")] : undefined, subject, text }),
  });
  if (!res.ok) throw new Error(`email ${res.status} ${await res.text()}`);
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return new Response("STRIPE_WEBHOOK_SECRET missing", { status: 500 });
  const raw = await req.text();
  if (!(await verify(raw, req.headers.get("stripe-signature"), secret))) return new Response("Bad signature", { status: 400 });
  const event = JSON.parse(raw);
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return new Response(JSON.stringify({ received: true, ignored: event.type }), { headers: { "Content-Type": "application/json" } });
  }
  const session = event.data.object;
  if (session.payment_status !== "paid") return new Response(JSON.stringify({ received: true, pending: true }), { headers: { "Content-Type": "application/json" } });
  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: order } = await supabase.from("onboarding_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return new Response("Order not found", { status: 404 });
  if (order.paid_at) return new Response(JSON.stringify({ received: true, duplicate: true }), { headers: { "Content-Type": "application/json" } });

  const paidStatus = order.payment_plan === "deposit" ? "deposit_paid" : "paid";
  const errors: string[] = [];
  const patch: Record<string, unknown> = {
    status: paidStatus, paid_at: new Date().toISOString(), stripe_payment_intent: session.payment_intent ?? null, stripe_session_id: session.id,
  };
  await supabase.from("onboarding_orders").update(patch).eq("id", order.id);

  const tier = getTier(order.tier);
  const uploads = await signedLinks(supabase, order.uploads);
  const o: OrderRow = { ...order, uploads, status: paidStatus };

  // Calendar: posting date + session.
  try {
    const { data: settings } = await supabase.from("crm_settings").select("value").eq("key", "gcal").maybeSingle();
    const calendarId: string = (settings?.value as { calendar_id?: string })?.calendar_id || "primary";
    const base = [`${order.catalogue_no} · ${tier?.name ?? order.tier} · ${formatUsd(order.total_cents)} (${paidStatus})`, `Email: ${order.email}`, order.phone && `Phone: ${order.phone}`, order.instagram_url && `IG: ${order.instagram_url}`, order.track_title && `Track: ${order.track_title}${order.explicit ? " (explicit)" : ""}`, uploads.length ? `Files:\n${uploads.map((u) => u.url).join("\n")}` : ""].filter(Boolean).join("\n");
    if (order.post_at && !order.google_post_event_id) {
      patch.google_post_event_id = await calendarEvent(calendarId, `🚀 POST — ${order.artist_name}`, base, order.post_at, 1, order.email);
    }
    if (order.session_at && !order.google_session_event_id) {
      patch.google_session_event_id = await calendarEvent(calendarId, `🎬 SESSION — ${order.artist_name}`, base, order.session_at, 2, order.email);
    }
    if (patch.google_post_event_id || patch.google_session_event_id) patch.status = "scheduled";
  } catch (e) { errors.push(`calendar: ${e instanceof Error ? e.message : e}`); }

  // Sheets: editing sheet always, distribution sheet when asked for.
  try {
    const editingId = Deno.env.get("EDITING_SHEET_ID");
    if (editingId) {
      const tab = Deno.env.get("EDITING_SHEET_TAB") ?? "Orders";
      await ensureHeader(editingId, tab, EDITING_COLUMNS);
      await appendRow(editingId, tab, editingRow({ ...o, status: String(patch.status) }));
    } else errors.push("editing sheet: EDITING_SHEET_ID not set");
    if (order.wants_distribution) {
      await appendRow(Deno.env.get("DISTRO_SHEET_ID") ?? DEFAULT_DISTRO_SHEET, Deno.env.get("DISTRO_SHEET_TAB") ?? "Form Responses 1", distributionRow(o));
    }
    patch.sheet_synced_at = new Date().toISOString();
  } catch (e) { errors.push(`sheets: ${e instanceof Error ? e.message : e}`); }

  // Confirmation to the artist (one thread, start to finish).
  try {
    const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "full", timeStyle: "short" }) : "—");
    await email(order.email, `PMG · ${order.catalogue_no} · you're in`, [
      `${order.artist_name} — you're in.`, "",
      `Tier: ${tier?.name ?? order.tier} · ${formatUsd(order.total_cents)}${order.payment_plan === "deposit" ? ` (deposit ${formatUsd(order.due_now_cents)} paid, balance due before posting)` : " (paid)"}`,
      `Posting date: ${when(order.post_at)}`, order.session_at ? `Session: ${when(order.session_at)}` : "",
      `Files received: ${uploads.length}`, "",
      "Before your date: accounts public, collab requests on, accept the invite when it lands.",
      "Reply to this email for anything. One thread, start to finish.", "", "— PMG",
    ].filter((l) => l !== "").join("\n"));
  } catch (e) { errors.push(`email: ${e instanceof Error ? e.message : e}`); }

  if (errors.length) patch.sync_errors = errors.join(" | ");
  await supabase.from("onboarding_orders").update(patch).eq("id", order.id);
  return new Response(JSON.stringify({ received: true, errors }), { headers: { "Content-Type": "application/json" } });
});
