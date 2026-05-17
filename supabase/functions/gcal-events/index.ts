// List all events from Google Calendar in a time window.
// Used by the SharedCalendar to show external bookings (not just PMG-tracked).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GCAL_BASE = "https://www.googleapis.com/calendar/v3";

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar.readonly",
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

    const body = await req.json().catch(() => ({}));
    const timeMin = body.timeMin || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const timeMax = body.timeMax || new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("crm_settings").select("value").eq("key", "gcal").maybeSingle();
    const calendarId: string = settings?.value?.calendar_id || "primary";

    const accessToken = await getAccessToken(SA_JSON);

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    const resp = await fetch(
      `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await resp.json();
    if (!resp.ok) throw new Error(`Google Calendar API [${resp.status}]: ${JSON.stringify(data)}`);

    // Return just the fields the UI needs
    const events = (data.items || []).map((ev: any) => ({
      id: ev.id,
      summary: ev.summary || "(no title)",
      description: ev.description || null,
      location: ev.location || null,
      start: ev.start?.dateTime || ev.start?.date,
      end: ev.end?.dateTime || ev.end?.date,
      htmlLink: ev.htmlLink,
      isPmg: !!ev.extendedProperties?.private?.pmg_source,
      pmgSource: ev.extendedProperties?.private?.pmg_source || null,
      pmgId: ev.extendedProperties?.private?.pmg_id || null,
      colorId: ev.colorId || null,
    }));

    return new Response(JSON.stringify({ ok: true, events }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("gcal-events error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
