// Artist onboarding API for propmyganda.com/start.
// One function, several actions, all keyed by order id + client_token so the
// public site never touches the table directly.
//
//   create        intake form → order row                       { tier, adBudgetCents, plan, ...details }
//   update        patch details / schedule / uploads            { orderId, token, patch }
//   ig-lookup     Instagram profile (Graph API business discovery; falls back to a link)
//   upload-url    signed upload URL into the private bucket     { orderId, token, filename, size, type }
//   upload-done   record the uploaded file                      { orderId, token, name, path, size }
//   availability  open posting dates and session slots          { orderId, token, kind: 'post'|'session' }
//   checkout      Stripe Checkout Session (card; Affirm on Viral){ orderId, token, plan }
//   status        the order, for the done page                  { orderId, token }
//
// Secrets: STRIPE_SECRET_KEY, SITE_URL (https://propmyganda.com), optional
// IG_ACCESS_TOKEN + IG_BUSINESS_ID, plus LOVABLE_API_KEY + GOOGLE_CALENDAR_API_KEY (already set for the CRM).
import { createClient } from "npm:@supabase/supabase-js@2";
import { GCAL_BASE, gcalHeaders } from "../_shared/gcal.ts";
import { TIERS, formatUsd, getTier, quote, type PaymentPlan } from "../_shared/tiers.ts";
import { catalogueNo, formEncode, postSlots, sessionSlots, type Busy } from "../_shared/onboarding.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const BUCKET = "onboarding-uploads";
const NY_OFFSET_MIN = -240; // America/New_York, EDT. Good enough for slot generation.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function bad(message: string, status = 400) {
  return json({ error: message }, status);
}

const db = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function loadOrder(orderId: string, token: string) {
  if (!orderId || !token) return null;
  const { data } = await db().from("onboarding_orders").select("*").eq("id", orderId).eq("client_token", token).maybeSingle();
  return data;
}

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const email = (v: unknown) => { const s = str(v, 200).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : ""; };
const url = (v: unknown) => { const s = str(v, 500); if (!s) return null; try { const u = new URL(s.startsWith("http") ? s : `https://${s}`); return u.toString(); } catch { return null; } };
const igHandle = (v: unknown) => str(v, 60).replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/[/?#].*$/, "").toLowerCase();

const DETAIL_FIELDS = [
  "artist_name", "legal_name", "phone", "instagram_handle", "tiktok_url", "youtube_url", "track_title", "explicit",
  "wants_distribution", "pro_affiliation", "ipi_number", "distro_email", "producer_name", "producer_stage_name",
  "producer_pro", "producer_ipi", "producer_email", "report_preference", "notes", "agreement_accepted", "signature",
] as const;

function cleanDetails(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of DETAIL_FIELDS) {
    if (!(f in input)) continue;
    const v = input[f];
    if (f === "explicit" || f === "wants_distribution" || f === "agreement_accepted") out[f] = v === true || v === "true";
    else if (f === "tiktok_url" || f === "youtube_url") out[f] = url(v);
    else if (f === "instagram_handle") { const h = igHandle(v); out.instagram_handle = h || null; out.instagram_url = h ? `https://www.instagram.com/${h}/` : null; }
    else if (f === "distro_email" || f === "producer_email") out[f] = email(v) || null;
    else if (f === "report_preference") out[f] = ["email", "dashboard", "both"].includes(String(v)) ? v : null;
    else out[f] = str(v, f === "notes" ? 2000 : 200) || null;
  }
  return out;
}

async function igLookup(handle: string) {
  const token = Deno.env.get("IG_ACCESS_TOKEN");
  const businessId = Deno.env.get("IG_BUSINESS_ID");
  const profileUrl = `https://www.instagram.com/${handle}/`;
  if (!token || !businessId) return { handle, url: profileUrl, verified: false };
  const fields = `business_discovery.username(${handle}){username,name,followers_count,media_count,profile_picture_url,biography}`;
  const res = await fetch(`https://graph.facebook.com/v21.0/${businessId}?fields=${encodeURIComponent(fields)}&access_token=${token}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return { handle, url: profileUrl, verified: false, error: `IG ${res.status}` };
  const data = await res.json();
  const p = data.business_discovery;
  if (!p) return { handle, url: profileUrl, verified: false };
  return { handle: p.username, url: `https://www.instagram.com/${p.username}/`, verified: true, name: p.name, followers: p.followers_count, posts: p.media_count, picture: p.profile_picture_url, bio: p.biography };
}

async function calendarBusy(fromISO: string, toISO: string): Promise<Busy[]> {
  try {
    const { data: settings } = await db().from("crm_settings").select("value").eq("key", "gcal").maybeSingle();
    const calendarId: string = (settings?.value as { calendar_id?: string })?.calendar_id || "primary";
    const res = await fetch(`${GCAL_BASE}/freeBusy`, {
      method: "POST", headers: gcalHeaders(),
      body: JSON.stringify({ timeMin: fromISO, timeMax: toISO, items: [{ id: calendarId }] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`freeBusy ${res.status}`);
    const data = await res.json();
    return (data.calendars?.[calendarId]?.busy ?? []) as Busy[];
  } catch (e) {
    console.error("calendar busy failed, offering slots without it", e instanceof Error ? e.message : e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  let body: Record<string, unknown> = {};
  try { body = (await req.json()) ?? {}; } catch { return bad("Invalid JSON"); }
  const action = str(body.action, 40);
  const supabase = db();

  try {
    if (action === "tiers") return json({ tiers: TIERS });

    if (action === "create") {
      const tier = getTier(str(body.tier, 20));
      if (!tier) return bad("Pick a tier");
      const details = cleanDetails(body);
      if (!details.artist_name || !details.legal_name) return bad("Artist name and legal name are required");
      const mail = email(body.email);
      if (!mail) return bad("A valid email is required");
      const q = quote(tier.id, Number(body.adBudgetCents ?? 0), (str(body.plan, 10) as PaymentPlan) || "full");
      const { count } = await supabase.from("onboarding_orders").select("id", { count: "exact", head: true });
      const { data, error } = await supabase.from("onboarding_orders").insert({
        ...details, email: mail, tier: tier.id, ad_budget_cents: q.adBudgetCents, total_cents: q.totalCents,
        payment_plan: q.plan, due_now_cents: q.dueNowCents, catalogue_no: catalogueNo((count ?? 0) + 1), status: "draft",
      }).select("id, client_token, catalogue_no").single();
      if (error) throw error;
      return json({ orderId: data.id, token: data.client_token, catalogueNo: data.catalogue_no, quote: q });
    }

    const order = await loadOrder(str(body.orderId, 40), str(body.token, 40));
    if (action === "ig-lookup") {
      const handle = igHandle(body.handle);
      if (!handle) return bad("Enter an Instagram handle");
      return json(await igLookup(handle));
    }
    if (!order) return bad("Order not found", 404);

    if (action === "update") {
      const patch = cleanDetails((body.patch as Record<string, unknown>) ?? {});
      const p = body.patch as Record<string, unknown>;
      if (p?.email) { const m = email(p.email); if (m) patch.email = m; }
      if ("post_at" in p) patch.post_at = p.post_at ? new Date(String(p.post_at)).toISOString() : null;
      if ("session_at" in p) patch.session_at = p.session_at ? new Date(String(p.session_at)).toISOString() : null;
      if ("plan" in p || "adBudgetCents" in p) {
        const q = quote(order.tier, Number(p.adBudgetCents ?? order.ad_budget_cents), (str(p.plan, 10) as PaymentPlan) || order.payment_plan);
        Object.assign(patch, { ad_budget_cents: q.adBudgetCents, total_cents: q.totalCents, payment_plan: q.plan, due_now_cents: q.dueNowCents });
      }
      if (order.status !== "draft" && order.status !== "pending_payment") {
        // After payment only the schedule can still move.
        for (const k of Object.keys(patch)) if (k !== "post_at" && k !== "session_at") delete patch[k];
      }
      patch.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from("onboarding_orders").update(patch).eq("id", order.id).select().single();
      if (error) throw error;
      return json({ ok: true, order: data });
    }

    if (action === "upload-url") {
      const name = str(body.filename, 160).replace(/[^\w.\- ()]+/g, "_");
      if (!name) return bad("Filename required");
      const path = `orders/${order.id}/${Date.now()}-${name}`;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error) throw error;
      return json({ path, signedUrl: data.signedUrl, token: data.token });
    }

    if (action === "upload-done") {
      const entry = { name: str(body.name, 160), path: str(body.path, 300), size: Number(body.size ?? 0), type: str(body.type, 80) };
      if (!entry.path.startsWith(`orders/${order.id}/`)) return bad("Bad path");
      const uploads = [...((order.uploads as unknown[]) ?? []), entry];
      const { error } = await supabase.from("onboarding_orders").update({ uploads, updated_at: new Date().toISOString() }).eq("id", order.id);
      if (error) throw error;
      return json({ ok: true, uploads });
    }

    if (action === "availability") {
      const kind = str(body.kind, 10) === "session" ? "session" : "post";
      const now = new Date();
      const days = kind === "session" ? 21 : 45;
      if (kind === "session") {
        const to = new Date(now.getTime() + (days + 1) * 86400_000);
        const busy = await calendarBusy(now.toISOString(), to.toISOString());
        const { data: taken } = await supabase.from("onboarding_orders").select("session_at").not("session_at", "is", null).neq("id", order.id).gte("session_at", now.toISOString());
        const takenBusy: Busy[] = (taken ?? []).map((r) => ({ start: r.session_at, end: new Date(new Date(r.session_at).getTime() + 2 * 3600_000).toISOString() }));
        return json({ kind, slots: sessionSlots(now, days, [...busy, ...takenBusy], NY_OFFSET_MIN).slice(0, 60) });
      }
      const { data: taken } = await supabase.from("onboarding_orders").select("post_at").not("post_at", "is", null).neq("id", order.id).in("status", ["pending_payment", "paid", "deposit_paid", "scheduled"]);
      return json({ kind, slots: postSlots(now, days, (taken ?? []).map((r) => r.post_at), NY_OFFSET_MIN) });
    }

    if (action === "checkout") {
      const key = Deno.env.get("STRIPE_SECRET_KEY");
      if (!key) return json({ error: "Payments are not switched on yet (STRIPE_SECRET_KEY missing)", configured: false }, 503);
      const site = Deno.env.get("SITE_URL") ?? "https://propmyganda.com";
      const q = quote(order.tier, order.ad_budget_cents, (str(body.plan, 10) as PaymentPlan) || order.payment_plan);
      await supabase.from("onboarding_orders").update({ payment_plan: q.plan, due_now_cents: q.dueNowCents, total_cents: q.totalCents, status: "pending_payment" }).eq("id", order.id);
      const label = q.plan === "deposit" ? `${q.tier.name} — 50% deposit` : `${q.tier.name} tier`;
      const description = [`PMG ${q.tier.name} · ${order.catalogue_no}`, q.adBudgetCents ? `incl. ${formatUsd(q.adBudgetCents)} extra ad budget` : "", q.plan === "deposit" ? `Balance ${formatUsd(q.balanceCents)} due before posting` : ""].filter(Boolean).join(" · ");
      const methods = ["card", ...(q.tier.financing && q.dueNowCents >= 5_000 && q.dueNowCents <= 3_000_000 ? ["affirm"] : [])];
      const params = {
        mode: "payment",
        customer_email: order.email,
        client_reference_id: order.id,
        payment_method_types: methods,
        line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: q.dueNowCents, product_data: { name: label, description } } }],
        metadata: { order_id: order.id, tier: order.tier, plan: q.plan, catalogue_no: order.catalogue_no ?? "" },
        payment_intent_data: { description: `${order.artist_name} · ${label}`, metadata: { order_id: order.id } },
        success_url: `${site}/start/done?order=${order.id}&token=${order.client_token}`,
        cancel_url: `${site}/start?resume=${order.id}&token=${order.client_token}`,
      };
      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" }, body: formEncode(params),
      });
      const session = await res.json();
      if (!res.ok) return json({ error: session.error?.message ?? "Stripe error" }, 502);
      await supabase.from("onboarding_orders").update({ stripe_session_id: session.id }).eq("id", order.id);
      return json({ url: session.url, dueNowCents: q.dueNowCents });
    }

    if (action === "status") {
      const { client_token: _t, ...safe } = order;
      return json({ order: safe, tier: getTier(order.tier) });
    }

    return bad("Unknown action");
  } catch (e) {
    console.error(action, e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
