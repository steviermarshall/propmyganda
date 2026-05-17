// Pull changes from Google Calendar into PMG records.
// Uses a Google service account — no third-party gateway required.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GCAL_BASE = "https://www.googleapis.com/calendar/v3";

// Exchange a service account JSON for a short-lived OAuth2 access token
async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const signingInput = `${b64url(header)}.${b64url(claim)}`;

  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResp.json();
  if (!tokenResp.ok) throw new Error(`OAuth token error: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!SA_JSON) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const accessToken = await getAccessToken(SA_JSON);

    const { data: settings } = await supabase
      .from("crm_settings").select("value").eq("key", "gcal").maybeSingle();
    const calendarId: string = settings?.value?.calendar_id || "primary";
    const lastPull: string | null = settings?.value?.last_pull_at || null;
    const updatedMin = lastPull || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      updatedMin,
      showDeleted: "true",
      singleEvents: "true",
      maxResults: "250",
    });

    const resp = await fetch(
      `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await resp.json();
    if (!resp.ok) throw new Error(`Google Calendar API [${resp.status}]: ${JSON.stringify(data)}`);

    const events = data.items || [];
    let updated = 0, deleted = 0, skipped = 0;

    for (const ev of events) {
      let { data: syncRow } = await supabase
        .from("calendar_sync").select("*").eq("google_event_id", ev.id).maybeSingle();

      const pmgSource = ev.extendedProperties?.private?.pmg_source as
        ("shoot" | "deliverable" | "booking" | "crm_booking" | undefined);
      const pmgId = ev.extendedProperties?.private?.pmg_id as string | undefined;

      // Reconcile orphaned PMG events (sync row was cleared but event still has our metadata)
      if (!syncRow && pmgSource && pmgId) {
        const { data: relinked } = await supabase.from("calendar_sync").upsert({
          entity_type: pmgSource, entity_id: pmgId,
          google_event_id: ev.id,
          google_calendar_id: calendarId,
          etag: ev.etag,
          sync_direction: "pull",
          last_synced_at: new Date().toISOString(),
        }, { onConflict: "entity_type,entity_id" }).select().maybeSingle();
        syncRow = relinked;
      }

      if (!syncRow) { skipped++; continue; }

      if (ev.status === "cancelled") {
        await supabase.from("calendar_sync").update({
          last_error: "Event cancelled in Google",
          last_synced_at: new Date().toISOString(),
        }).eq("id", syncRow.id);
        deleted++;
        continue;
      }

      const newStart = ev.start?.dateTime || ev.start?.date;
      if (!newStart) { skipped++; continue; }

      // Write the new date back to the source table
      if (syncRow.entity_type === "shoot") {
        await supabase.from("shoots")
          .update({ scheduled_at: new Date(newStart).toISOString() })
          .eq("id", syncRow.entity_id);
      } else if (syncRow.entity_type === "deliverable") {
        await supabase.from("deliverables")
          .update({ due_at: new Date(newStart).toISOString() })
          .eq("id", syncRow.entity_id);
      } else if (syncRow.entity_type === "booking") {
        await supabase.from("bookings")
          .update({ event_at: new Date(newStart).toISOString() })
          .eq("id", syncRow.entity_id);
      } else if (syncRow.entity_type === "crm_booking") {
        await supabase.from("crm_bookings")
          .update({ shoot_date: new Date(newStart).toISOString().slice(0, 10) })
          .eq("id", syncRow.entity_id);
      }

      await supabase.from("calendar_sync").update({
        etag: ev.etag,
        last_synced_at: new Date().toISOString(),
        sync_direction: "pull",
        last_error: null,
      }).eq("id", syncRow.id);

      updated++;
    }

    // Record the pull timestamp
    await supabase.from("crm_settings").update({
      value: { ...(settings?.value || {}), calendar_id: calendarId, last_pull_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq("key", "gcal");

    return new Response(JSON.stringify({ ok: true, updated, deleted, skipped, total: events.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("gcal-pull error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
