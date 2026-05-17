// Push a PMG shoot or deliverable to Google Calendar.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

const BodySchema = z.object({
  entity_type: z.enum(["shoot", "deliverable"]),
  entity_id: z.string().uuid(),
  delete: z.boolean().optional(),
});

// Map team_member.id (hash) → Google colorId (1..11)
function colorFor(id: string | null | undefined): string {
  if (!id) return "8";
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return String((h % 11) + 1);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GCAL_KEY = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!GCAL_KEY) throw new Error("GOOGLE_CALENDAR_API_KEY is not configured");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { entity_type, entity_id, delete: del } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up calendar id
    const { data: settings } = await supabase
      .from("crm_settings").select("value").eq("key", "gcal").maybeSingle();
    const calendarId: string = settings?.value?.calendar_id || "primary";

    // Existing sync row?
    const { data: syncRow } = await supabase
      .from("calendar_sync")
      .select("*")
      .eq("entity_type", entity_type)
      .eq("entity_id", entity_id)
      .maybeSingle();

    // Handle delete
    if (del) {
      if (syncRow?.google_event_id) {
        await fetch(`${GATEWAY_URL}/calendars/${encodeURIComponent(calendarId)}/events/${syncRow.google_event_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": GCAL_KEY },
        });
        await supabase.from("calendar_sync").delete().eq("id", syncRow.id);
      }
      return new Response(JSON.stringify({ ok: true, deleted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load entity
    let summary = "";
    let description = "";
    let startISO: string | null = null;
    let endISO: string | null = null;
    let assignee: string | null = null;

    if (entity_type === "shoot") {
      const { data: s } = await supabase.from("shoots").select("*").eq("id", entity_id).maybeSingle();
      if (!s) throw new Error("Shoot not found");
      summary = `🎬 ${s.title || "Shoot"}`;
      description = [s.location && `📍 ${s.location}`, s.notes].filter(Boolean).join("\n\n");
      startISO = s.scheduled_at || s.shoot_date;
      if (startISO) {
        const end = new Date(startISO); end.setHours(end.getHours() + (s.duration_hours || 2));
        endISO = end.toISOString();
      }
      assignee = s.assigned_editor_id || null;
    } else {
      const { data: d } = await supabase.from("deliverables").select("*, team_members:assigned_to(name)").eq("id", entity_id).maybeSingle();
      if (!d) throw new Error("Deliverable not found");
      summary = `✂️ ${d.title || "Deliverable"}`;
      description = [
        d.objective && `Objective: ${d.objective}`,
        d.expected_runtime_sec && `Expected: ${d.expected_runtime_sec}s`,
        d.priority && `Priority: ${d.priority}`,
        d.editor_notes,
      ].filter(Boolean).join("\n");
      startISO = d.due_at;
      if (startISO) {
        const end = new Date(startISO); end.setMinutes(end.getMinutes() + 30);
        endISO = end.toISOString();
      }
      assignee = d.assigned_to || null;
    }

    if (!startISO) {
      return new Response(JSON.stringify({ skipped: "no date" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventPayload = {
      summary,
      description,
      start: { dateTime: new Date(startISO).toISOString() },
      end: { dateTime: new Date(endISO || startISO).toISOString() },
      colorId: colorFor(assignee),
      extendedProperties: {
        private: { pmg_source: entity_type, pmg_id: entity_id },
      },
    };

    const isUpdate = !!syncRow?.google_event_id;
    const url = isUpdate
      ? `${GATEWAY_URL}/calendars/${encodeURIComponent(calendarId)}/events/${syncRow.google_event_id}`
      : `${GATEWAY_URL}/calendars/${encodeURIComponent(calendarId)}/events`;

    const resp = await fetch(url, {
      method: isUpdate ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GCAL_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventPayload),
    });
    const data = await resp.json();
    if (!resp.ok) {
      await supabase.from("calendar_sync").upsert({
        entity_type, entity_id,
        google_event_id: syncRow?.google_event_id || "pending",
        google_calendar_id: calendarId,
        last_error: `[${resp.status}] ${JSON.stringify(data).slice(0, 500)}`,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "entity_type,entity_id" });
      throw new Error(`Google Calendar API [${resp.status}]: ${JSON.stringify(data)}`);
    }

    await supabase.from("calendar_sync").upsert({
      entity_type,
      entity_id,
      google_event_id: data.id,
      google_calendar_id: calendarId,
      etag: data.etag,
      event_html_link: data.htmlLink,
      last_synced_at: new Date().toISOString(),
      sync_direction: "push",
      last_error: null,
    }, { onConflict: "entity_type,entity_id" });

    return new Response(JSON.stringify({ ok: true, event: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("gcal-push error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
