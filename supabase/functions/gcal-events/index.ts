// List all events from Google Calendar in a time window.
// Used by the SharedCalendar to show external bookings (not just PMG-tracked).
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAccessToken } from "../_shared/google-auth.ts";
import { corsHeaders, requireTeamMember } from "../_shared/auth.ts";

const GCAL_BASE = "https://www.googleapis.com/calendar/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SA_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!SA_JSON) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Reading the shared calendar is limited to CRM team members.
    const caller = await requireTeamMember(req, supabase);
    if (caller instanceof Response) return caller;

    const body = await req.json().catch(() => ({}));
    const timeMin = body.timeMin || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const timeMax = body.timeMax || new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString();

    const { data: settings } = await supabase
      .from("crm_settings").select("value").eq("key", "gcal").maybeSingle();
    const calendarId: string = settings?.value?.calendar_id || "primary";

    const accessToken = await getAccessToken(SA_JSON, "https://www.googleapis.com/auth/calendar.readonly");

    // Page through all events (recurring instances can easily exceed 250 per window)
    const items: any[] = [];
    let pageToken: string | undefined = undefined;
    do {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",        // expand recurring events into instances
        orderBy: "startTime",
        maxResults: "2500",
      });
      if (pageToken) params.set("pageToken", pageToken);

      const resp = await fetch(
        `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(`Google Calendar API [${resp.status}]: ${JSON.stringify(data)}`);

      items.push(...(data.items || []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    // Return just the fields the UI needs
    const events = items.map((ev: any) => ({
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
