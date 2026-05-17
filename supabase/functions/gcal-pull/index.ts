// Pull changes from Google Calendar into PMG shoots/deliverables.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GCAL_KEY = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!GCAL_KEY) throw new Error("GOOGLE_CALENDAR_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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
      `${GATEWAY_URL}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": GCAL_KEY } },
    );
    const data = await resp.json();
    if (!resp.ok) throw new Error(`Google Calendar API [${resp.status}]: ${JSON.stringify(data)}`);

    const events = data.items || [];
    let updated = 0, deleted = 0, skipped = 0;

    for (const ev of events) {
      // Match by google_event_id, or fall back to extendedProperties (orphaned PMG events)
      let { data: syncRow } = await supabase
        .from("calendar_sync").select("*").eq("google_event_id", ev.id).maybeSingle();

      const pmgSource = ev.extendedProperties?.private?.pmg_source as ("shoot"|"deliverable"|undefined);
      const pmgId = ev.extendedProperties?.private?.pmg_id as string | undefined;

      if (!syncRow && pmgSource && pmgId) {
        // Reconcile: PMG-originated event lost its sync row (e.g. cleared). Re-link.
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
        // Don't auto-delete PMG row; just clear sync link + mark
        await supabase.from("calendar_sync").update({
          last_error: "Event cancelled in Google", last_synced_at: new Date().toISOString(),
        }).eq("id", syncRow.id);
        deleted++;
        continue;
      }

      const newStart = ev.start?.dateTime || ev.start?.date;
      if (!newStart) { skipped++; continue; }

      if (syncRow.entity_type === "shoot") {
        await supabase.from("shoots")
          .update({ scheduled_at: new Date(newStart).toISOString() })
          .eq("id", syncRow.entity_id);
      } else if (syncRow.entity_type === "deliverable") {
        await supabase.from("deliverables")
          .update({ due_at: new Date(newStart).toISOString() })
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
