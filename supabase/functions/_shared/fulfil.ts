// What happens once an order is paid (or confirmed at $0): calendar events,
// sheet rows, confirmation email. Used by the Stripe webhook and by the
// $0 confirm path so both populations get the same treatment.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { GCAL_BASE, gcalHeaders } from "./gcal.ts";
import { appendRow, ensureHeader } from "./google.ts";
import { formatUsd, getTier } from "./tiers.ts";
import { EDITING_COLUMNS, SESSION_MINUTES, distributionRow, editingRow, type OrderRow } from "./onboarding.ts";
import { AGREEMENT_TEXT, AGREEMENT_VERSION, splitsLine } from "./agreement.ts";

const DEFAULT_DISTRO_SHEET = "1-lGUtKmwAL7SmfaAHXbbPZK7715Detj1M6Ts_r6-kls";

async function calendarEvent(calendarId: string, summary: string, description: string, startISO: string, hours: number, attendee: string): Promise<string | null> {
  const end = new Date(new Date(startISO).getTime() + hours * 3600_000).toISOString();
  const res = await fetch(`${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`, {
    method: "POST", headers: gcalHeaders(),
    body: JSON.stringify({ summary, description, start: { dateTime: startISO }, end: { dateTime: end }, attendees: [{ email: attendee }], colorId: "5" }),
  });
  if (!res.ok) throw new Error(`calendar ${res.status} ${await res.text()}`);
  return (await res.json()).id ?? null;
}

async function signedLinks(supabase: SupabaseClient, uploads: OrderRow["uploads"]) {
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
  const notify = Deno.env.get("NOTIFY_EMAIL");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], bcc: notify ? [notify] : undefined, subject, text }),
  });
  if (!res.ok) throw new Error(`email ${res.status} ${await res.text()}`);
}

function moneyLine(o: OrderRow, paidStatus: string): string {
  const tier = getTier(o.tier);
  if (tier?.revenueShare) return "DSP Release · $0 up front · split on streams";
  if (tier?.inviteOnly) return "Invited · $0";
  return `${formatUsd(o.total_cents)}${o.payment_plan === "deposit" ? ` (deposit ${formatUsd(o.due_now_cents)} paid, balance due before posting)` : ` (${paidStatus})`}`;
}

/** Runs every post-payment step independently and returns the patch for the row plus any errors. */
export async function fulfil(supabase: SupabaseClient, order: OrderRow, paidStatus: string): Promise<{ patch: Record<string, unknown>; errors: string[] }> {
  const errors: string[] = [];
  const patch: Record<string, unknown> = {};
  const tier = getTier(order.tier);
  const uploads = await signedLinks(supabase, order.uploads);
  const o: OrderRow = { ...order, uploads, status: paidStatus };

  try {
    const { data: settings } = await supabase.from("crm_settings").select("value").eq("key", "gcal").maybeSingle();
    const calendarId: string = (settings?.value as { calendar_id?: string })?.calendar_id || "primary";
    const base = [`${order.catalogue_no} · ${tier?.name ?? order.tier} · ${moneyLine(order, paidStatus)}`, `Email: ${order.email}`, order.phone && `Phone: ${order.phone}`, order.instagram_url && `IG: ${order.instagram_url}`, order.track_title && `Track: ${order.track_title}${order.explicit ? " (explicit)" : ""}`, uploads.length ? `Files:\n${uploads.map((u) => u.url).join("\n")}` : ""].filter(Boolean).join("\n");
    const row = order as unknown as { google_post_event_id?: string | null; google_session_event_id?: string | null };
    if (order.post_at && !row.google_post_event_id) patch.google_post_event_id = await calendarEvent(calendarId, `🚀 POST — ${order.artist_name}`, base, order.post_at, 1, order.email);
    if (order.session_at && !row.google_session_event_id) patch.google_session_event_id = await calendarEvent(calendarId, `🎬 SHOOT — ${order.artist_name}`, base, order.session_at, SESSION_MINUTES / 60, order.email);
    if (patch.google_post_event_id || patch.google_session_event_id) patch.status = "scheduled";
  } catch (e) { errors.push(`calendar: ${e instanceof Error ? e.message : e}`); }

  try {
    const editingId = Deno.env.get("EDITING_SHEET_ID");
    if (editingId) {
      const tab = Deno.env.get("EDITING_SHEET_TAB") ?? "Orders";
      await ensureHeader(editingId, tab, EDITING_COLUMNS);
      await appendRow(editingId, tab, editingRow({ ...o, status: String(patch.status ?? paidStatus) }));
    } else errors.push("editing sheet: EDITING_SHEET_ID not set");
    if (order.wants_distribution) {
      await appendRow(Deno.env.get("DISTRO_SHEET_ID") ?? DEFAULT_DISTRO_SHEET, Deno.env.get("DISTRO_SHEET_TAB") ?? "Form Responses 1", distributionRow(o));
    }
    patch.sheet_synced_at = new Date().toISOString();
  } catch (e) { errors.push(`sheets: ${e instanceof Error ? e.message : e}`); }

  try {
    const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "full", timeStyle: "short" }) : "—");
    await email(order.email, `PMG · ${order.catalogue_no} · you're in`, [
      `${order.artist_name} — you're in.`, "",
      `Plan: ${tier?.name ?? order.tier} · ${moneyLine(order, paidStatus)}`,
      `Posting date: ${when(order.post_at)}`, order.session_at ? `Session: ${when(order.session_at)}` : "",
      `Files received: ${uploads.length}`, "",
      "Before your date: accounts public, collab requests on, accept the invite when it lands.",
      "Read this before the shoot and the post: https://propmyganda.com/start/prep",
      "Reply to this email for anything. One thread, start to finish.", "", "— PMG",
      ...(order.wants_distribution ? [
        "", "────────", `Your signed copy · PMG Streaming Release Agreement · version ${AGREEMENT_VERSION}`,
        `Signed by ${order.signature ?? order.legal_name} on ${(order as unknown as { signed_at?: string }).signed_at ?? "—"}`,
        order.splits ? `Alternate master split requested: ${splitsLine(order.splits)}` : "Standard splits apply.",
        order.dsp_title ? `Requested title: ${order.dsp_title}` : `Title: "${order.artist_name}" Propmyganda Performance`,
        "", AGREEMENT_TEXT,
      ] : []),
    ].filter((l) => l !== "").join("\n"));
  } catch (e) { errors.push(`email: ${e instanceof Error ? e.message : e}`); }

  if (errors.length) patch.sync_errors = errors.join(" | ");
  return { patch, errors };
}
